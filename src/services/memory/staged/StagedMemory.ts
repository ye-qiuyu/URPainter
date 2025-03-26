import { ConversationStage, Message, Conversation } from '@/types/conversation';
import { OllamaService } from '../../ai/ollama';

/**
 * 阶段记忆接口，包含阶段记忆的主要属性
 */
interface StagedMemoryItem {
  stage: ConversationStage;    // 记忆所属阶段 
  summary: string;             // 阶段记忆总结内容
  keywords: string[];          // 阶段关键词
  timestamp: number;           // 记忆创建时间
  lastUpdated?: number;        // 最后更新时间
  isGroupMemory?: boolean;     // 是否为合并阶段的记忆
  groupName?: string;          // 阶段组名称（如果是合并阶段）
}

// 阶段组配置，定义哪些阶段可以合并为一组
type StageGroupConfig = {
  [key: string]: ConversationStage[]
}

/**
 * 分阶段记忆管理器
 * 负责管理各阶段的记忆内容，实现记忆总结、提取和格式化功能
 */
export class StagedMemory {
  private static instance: StagedMemory;
  private ollamaService: OllamaService;
  private memoriesByConversation: Map<string, Map<ConversationStage | string, StagedMemoryItem>>;
  private stageGroups: StageGroupConfig;
  
  // 私有构造函数
  private constructor() {
    this.ollamaService = OllamaService.getInstance();
    this.memoriesByConversation = new Map();
    
    // 定义阶段组配置
    this.stageGroups = {
      'B': ['B1', 'B2'] as ConversationStage[],
      // 可以在未来添加更多组合，例如 'C': ['C1', 'C2']
    };
  }
  
  /**
   * 获取StagedMemory单例
   */
  public static getInstance(): StagedMemory {
    if (!StagedMemory.instance) {
      StagedMemory.instance = new StagedMemory();
    }
    return StagedMemory.instance;
  }
  
  /**
   * 检查是否是最后一个组内阶段
   * @param stage 当前阶段
   * @param nextStage 下一阶段
   */
  public isLastStageInGroup(stage: ConversationStage, nextStage: ConversationStage): boolean {
    // 检查所有阶段组
    for (const [groupName, stages] of Object.entries(this.stageGroups)) {
      const isInGroup = stages.includes(stage);
      const leavingGroup = !stages.includes(nextStage);
      
      // 如果当前阶段在组内，且下一阶段不在同一组内，则表示离开组
      if (isInGroup && leavingGroup) {
        console.log(`[StagedMemory] 检测到离开阶段组${groupName}: ${stage} -> ${nextStage}`);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 获取阶段所属的组
   * @param stage 阶段
   */
  public getStageGroup(stage: ConversationStage): string | null {
    for (const [groupName, stages] of Object.entries(this.stageGroups)) {
      if (stages.includes(stage)) {
        return groupName;
      }
    }
    return null;
  }
  
  /**
   * 在阶段转换时总结前一阶段记忆
   * @param conversation 当前会话
   * @param prevStage 前一阶段
   * @param currentStage 当前阶段
   */
  public async summarizeStageMemory(
    conversation: Conversation,
    prevStage: ConversationStage,
    currentStage: ConversationStage
  ): Promise<StagedMemoryItem | null> {
    // 跳过A阶段总结，因为A阶段已经通过创意元素提取实现了记忆
    if (prevStage === 'A') {
      console.log(`[StagedMemory] 跳过阶段A的记忆总结，因为已通过创意元素提取`);
      return null;
    }
    
    console.log(`[StagedMemory] 开始总结阶段${prevStage}的记忆`);
    
    // 检查是否是特殊阶段组的最后一个阶段
    const isLastInGroup = this.isLastStageInGroup(prevStage, currentStage);
    
    if (isLastInGroup) {
      // 如果是组内最后一个阶段，则进行组合总结
      const groupName = this.getStageGroup(prevStage);
      if (groupName) {
        console.log(`[StagedMemory] 检测到阶段${prevStage}是${groupName}组的最后阶段，准备合并总结`);
        return await this.summarizeStageGroup(conversation, groupName, currentStage);
      }
    }
    
    // 常规单阶段总结
    const stageMessages = this.extractStageMessages(conversation, prevStage);
    
    if (stageMessages.length === 0) {
      console.log(`[StagedMemory] 阶段${prevStage}没有消息，跳过总结`);
      return null;
    }
    
    // 生成阶段记忆总结
    const summary = await this.generateStageSummary(stageMessages, prevStage);
    
    // 提取关键词
    const keywords = await this.extractKeywords(stageMessages, prevStage);
    
    // 创建记忆项
    const memoryItem: StagedMemoryItem = {
      stage: prevStage,
      summary,
      keywords,
      timestamp: Date.now()
    };
    
    // 存储记忆
    this.storeMemory(conversation.id, memoryItem);
    
    console.log(`[StagedMemory] 阶段${prevStage}记忆总结完成，长度: ${summary.length}`);
    return memoryItem;
  }
  
  /**
   * 合并总结整个阶段组的记忆
   * @param conversation 当前会话
   * @param groupName 组名
   * @param currentStage 当前阶段
   */
  private async summarizeStageGroup(
    conversation: Conversation,
    groupName: string,
    currentStage: ConversationStage
  ): Promise<StagedMemoryItem | null> {
    console.log(`[StagedMemory] 开始合并总结${groupName}组的记忆`);
    
    const stages = this.stageGroups[groupName];
    if (!stages || stages.length === 0) {
      console.log(`[StagedMemory] 找不到阶段组${groupName}的配置`);
      return null;
    }
    
    // 收集该组所有阶段的消息
    let allGroupMessages: Message[] = [];
    for (const stage of stages) {
      const stageMessages = this.extractStageMessages(conversation, stage);
      allGroupMessages = [...allGroupMessages, ...stageMessages];
    }
    
    if (allGroupMessages.length === 0) {
      console.log(`[StagedMemory] 阶段组${groupName}没有消息，跳过总结`);
      return null;
    }
    
    // 生成组合记忆总结
    const summary = await this.generateStageSummary(allGroupMessages, groupName as any);
    
    // 提取关键词
    const keywords = await this.extractKeywords(allGroupMessages, groupName as any);
    
    // 创建组合记忆项
    const memoryItem: StagedMemoryItem = {
      stage: stages[0], // 使用组内第一个阶段作为标识
      summary,
      keywords,
      timestamp: Date.now(),
      isGroupMemory: true,
      groupName
    };
    
    // 以组名为键存储记忆
    this.storeGroupMemory(conversation.id, groupName, memoryItem);
    
    console.log(`[StagedMemory] 阶段组${groupName}记忆总结完成，长度: ${summary.length}`);
    return memoryItem;
  }
  
  /**
   * 提取指定阶段的消息
   */
  private extractStageMessages(conversation: Conversation, stage: ConversationStage): Message[] {
    // 获取所有阶段转换点
    const stageTransitionPoints: {index: number, stage: ConversationStage}[] = [];
    let currentStage = 'A' as ConversationStage;
    
    // 标记所有阶段转换的消息索引
    conversation.messages.forEach((message, index) => {
      if (message.role === 'assistant' && 
          message.content.includes('阶段更新') && 
          message.content.includes('->')) {
        
        // 尝试从消息中提取确切的阶段信息
        const stageMatch = message.content.match(/阶段更新.*?(\w+)\s*->\s*(\w+)/i);
        if (stageMatch && stageMatch[2]) {
          const newStage = stageMatch[2] as ConversationStage;
          stageTransitionPoints.push({index, stage: newStage});
          console.log(`[StagedMemory] 检测到阶段转换点: 索引=${index}, 阶段=${newStage}`);
        }
      }
    });
    
    // 如果没有转换点，尝试基于消息内容和当前阶段进行推断
    if (stageTransitionPoints.length === 0) {
      // 根据当前阶段返回最近的几条消息
      const recentMessages = conversation.messages.slice(-5);
      console.log(`[StagedMemory] 未检测到转换点，返回最近${recentMessages.length}条消息用于阶段${stage}总结`);
      return recentMessages;
    }
    
    // 找到指定阶段的消息范围
    let startIndex = 0;
    let endIndex = conversation.messages.length - 1;
    
    // 寻找指定阶段的开始点
    for (let i = 0; i < stageTransitionPoints.length; i++) {
      if (stageTransitionPoints[i].stage === stage) {
        startIndex = stageTransitionPoints[i].index;
        // 寻找该阶段的结束点(下一个阶段的开始点-1)
        if (i < stageTransitionPoints.length - 1) {
          endIndex = stageTransitionPoints[i + 1].index - 1;
        }
        break;
      }
    }
    
    console.log(`[StagedMemory] 提取阶段${stage}消息: 索引范围 ${startIndex} - ${endIndex}`);
    return conversation.messages.slice(startIndex, endIndex + 1);
  }
  
  /**
   * 生成阶段记忆总结
   */
  private async generateStageSummary(messages: Message[], stage: ConversationStage | string): Promise<string> {
    // 构建提示词
    const messagesText = messages.map(m => 
      `${m.role === 'user' ? '儿童' : 'AI'}: ${m.content}`
    ).join('\n\n');
    
    const prompt = `
你是URPainter系统的记忆总结助手。请总结以下对话中阶段${stage}的关键信息。
这是一段4-6岁儿童与AI进行创作绘画的对话。

对话内容:
${messagesText}

请以第三人称简洁总结这个阶段的主要内容，重点关注:
1. 主题和主角信息（如果是A或B阶段）
2. 添加的元素和它们的特征（如果是C1或C2阶段）
3. 作品的整体描述和命名（如果是D阶段）

总结格式应该是一个段落，不超过100字。
总结:
`;
    
    // 调用AI服务生成总结
    try {
      const response = await this.ollamaService.chat([
        { role: 'user', content: prompt }
      ]);
      
      return response.trim();
    } catch (error) {
      console.error('[StagedMemory] 生成记忆总结失败:', error);
      return `阶段${stage}没有可用的总结`;
    }
  }
  
  /**
   * 提取阶段关键词
   */
  private async extractKeywords(messages: Message[], stage: ConversationStage | string): Promise<string[]> {
    // 构建提示词提取关键词
    const messagesText = messages.map(m => 
      `${m.role === 'user' ? '儿童' : 'AI'}: ${m.content}`
    ).join('\n\n');
    
    const prompt = `
你是URPainter系统的关键词提取助手。请从以下对话中提取阶段${stage}的关键词，这些词将用于图像生成。
这是一段4-6岁儿童与AI进行创作绘画的对话。

对话内容:
${messagesText}

请提取5-10个关键词，每个关键词应该是简短的名词或形容词短语：
1. 描述主要元素和特征（如"蓝色恐龙"、"闪亮的星星"）
2. 描述场景和背景（如"绿色草地"、"宇宙太空"）
3. 描述动作和状态（如"飞行"、"笑着的"）

只返回关键词列表，用逗号分隔，不要有其他任何内容:
`;
    
    // 调用AI服务提取关键词
    try {
      const response = await this.ollamaService.chat([
        { role: 'user', content: prompt }
      ]);
      
      // 分割、清理并去重关键词
      const keywords = response
        .split(',')
        .map(kw => kw.trim())
        .filter(kw => kw.length > 0);
      
      return [...new Set(keywords)]; // 去重
    } catch (error) {
      console.error('[StagedMemory] 提取关键词失败:', error);
      return [];
    }
  }
  
  /**
   * 存储记忆项到指定会话
   * 
   * @param conversationId 会话ID
   * @param memory 要存储的记忆项
   */
  private storeMemory(conversationId: string, memory: StagedMemoryItem): void {
    console.log(`[StagedMemory] 存储阶段${memory.stage}的记忆：${memory.summary.substring(0, 50)}...`);
    
    // 确保记忆Map存在
    let memories = this.memoriesByConversation.get(conversationId);
    if (!memories) {
      memories = new Map();
      this.memoriesByConversation.set(conversationId, memories);
    }
    
    // 如果是阶段组记忆，做特殊处理
    if (memory.isGroupMemory && memory.groupName) {
      // 存储到对应的组键下
      memories.set(memory.groupName, memory);
      console.log(`[StagedMemory] 存储${memory.groupName}组记忆成功`);
      
      // 移除被组记忆替代的单一阶段记忆
      const groupStages = this.stageGroups[memory.groupName] || [];
      for (const stage of groupStages) {
        if (memories.has(stage)) {
          console.log(`[StagedMemory] 删除被${memory.groupName}组记忆替代的单一阶段${stage}记忆`);
          memories.delete(stage);
        }
      }
    } else {
      // 普通阶段记忆，直接存储
      memories.set(memory.stage, memory);
      console.log(`[StagedMemory] 存储阶段${memory.stage}记忆成功`);
      
      // 特别为阶段A添加日志
      if (memory.stage === 'A') {
        console.log(`[StagedMemory] 阶段A记忆已存储，内容: ${memory.summary}`);
        console.log(`[StagedMemory] 阶段A记忆关键词: ${memory.keywords.join(', ')}`);
      }
    }
  }
  
  /**
   * 存储阶段组记忆
   */
  private storeGroupMemory(conversationId: string, groupName: string, memory: StagedMemoryItem): void {
    // 获取会话的记忆Map，如果不存在则创建
    if (!this.memoriesByConversation.has(conversationId)) {
      this.memoriesByConversation.set(conversationId, new Map());
    }
    
    const conversationMemories = this.memoriesByConversation.get(conversationId)!;
    
    // 使用组名作为键存储
    conversationMemories.set(groupName, memory);
    
    // 可选：删除该组中各个阶段的单独记忆，避免重复
    const stages = this.stageGroups[groupName];
    if (stages) {
      for (const stage of stages) {
        if (conversationMemories.has(stage)) {
          console.log(`[StagedMemory] 删除单独的阶段${stage}记忆，已被组${groupName}记忆替代`);
          conversationMemories.delete(stage);
        }
      }
    }
  }
  
  /**
   * 获取会话的所有阶段记忆
   */
  public getConversationMemories(conversationId: string): Map<ConversationStage | string, StagedMemoryItem> | null {
    return this.memoriesByConversation.get(conversationId) || null;
  }
  
  /**
   * 获取特定阶段的记忆
   */
  public getStageMemory(conversationId: string, stage: ConversationStage): StagedMemoryItem | null {
    const conversationMemories = this.memoriesByConversation.get(conversationId);
    if (!conversationMemories) return null;
    
    // 先检查是否有直接匹配的阶段记忆
    if (conversationMemories.has(stage)) {
      return conversationMemories.get(stage) || null;
    }
    
    // 如果没有直接匹配，检查是否有包含该阶段的组记忆
    const groupName = this.getStageGroup(stage);
    if (groupName && conversationMemories.has(groupName)) {
      return conversationMemories.get(groupName) || null;
    }
    
    return null;
  }
  
  /**
   * 获取格式化的记忆，适用于提示词构建
   * 排除当前阶段的记忆，只包含已完成阶段的记忆
   * 
   * @param conversationId 会话ID
   * @param currentStage 当前阶段，用于排除当前阶段的记忆
   * @returns 格式化的记忆文本
   */
  public formatMemoriesForPrompt(conversationId: string, currentStage?: ConversationStage): string {
    const conversationMemories = this.memoriesByConversation.get(conversationId);
    if (!conversationMemories || conversationMemories.size === 0) {
      return '尚无历史记忆';
    }
    
    // 阶段顺序定义
    const stageOrder: (ConversationStage | string)[] = ['A', 'B', 'B1', 'B2', 'C1', 'C2', 'D'];
    
    // 转换为数组并按阶段顺序排序
    const memoriesArray: [ConversationStage | string, StagedMemoryItem][] = [...conversationMemories.entries()];
    memoriesArray.sort((a, b) => {
      const aIndex = stageOrder.indexOf(a[0]);
      const bIndex = stageOrder.indexOf(b[0]);
      
      // 如果找不到索引，放到最后
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
    
    // 优先使用阶段组记忆，过滤掉被组记忆替代的单一阶段记忆
    // 同时过滤掉当前阶段的记忆
    const filteredMemories = memoriesArray.filter(([stageKey, memory]) => {
      // 如果提供了当前阶段，排除当前阶段及其所属的组
      if (currentStage) {
        // 排除当前阶段的直接记忆
        if (memory.stage === currentStage) {
          console.log(`[StagedMemory] 排除当前阶段${currentStage}的记忆`);
          return false;
        }
        
        // 排除包含当前阶段的组记忆
        if (memory.isGroupMemory && memory.groupName) {
          const stages = this.stageGroups[memory.groupName];
          if (stages && stages.includes(currentStage)) {
            console.log(`[StagedMemory] 排除包含当前阶段${currentStage}的组记忆: ${memory.groupName}`);
            return false;
          }
        }
        
        // 确保当前阶段的组不被包含
        const currentStageGroup = this.getStageGroup(currentStage);
        if (currentStageGroup && stageKey === currentStageGroup) {
          console.log(`[StagedMemory] 排除当前阶段${currentStage}所属的组记忆: ${currentStageGroup}`);
          return false;
        }
      }
      
      // 保留所有其他组记忆
      if (memory.isGroupMemory) return true;
      
      // 检查该阶段是否属于某个组，且该组的记忆是否存在
      const groupName = this.getStageGroup(memory.stage as ConversationStage);
      if (groupName && memoriesArray.some(([key]) => key === groupName)) {
        console.log(`[StagedMemory] 过滤掉阶段${memory.stage}的单独记忆，使用${groupName}组记忆代替`);
        return false;
      }
      
      return true;
    });
    
    // 如果过滤后没有记忆，返回无记忆提示
    if (filteredMemories.length === 0) {
      return '尚无历史记忆';
    }
    
    // 格式化记忆内容，避免重复
    let previousKeywords = new Set<string>();
    const formattedMemories = filteredMemories
      .map(([key, memory]) => {
        // 确定显示的阶段标签
        const stageLabel = memory.isGroupMemory ? memory.groupName! : memory.stage;
        
        // 过滤掉与前面阶段重复的关键词
        const uniqueKeywords = memory.keywords.filter(keyword => !previousKeywords.has(keyword));
        
        // 将当前关键词添加到已使用集合
        memory.keywords.forEach(keyword => previousKeywords.add(keyword));
        
        // 格式化记忆内容
        return `## 阶段${stageLabel}记忆
${memory.summary}

关键词: ${uniqueKeywords.length > 0 ? uniqueKeywords.join(', ') : '(无新增关键词)'}`;
      })
      .join('\n\n');
    
    return formattedMemories;
  }
  
  /**
   * 清除会话的记忆
   */
  public clearMemories(conversationId: string): void {
    this.memoriesByConversation.delete(conversationId);
  }

  /**
   * 获取已总结的阶段列表
   * @param conversationId 会话ID
   * @returns 已总结的阶段ID数组
   */
  public getSummarizedStages(conversationId: string): string[] {
    const memories = this.getConversationMemories(conversationId);
    if (!memories) return [];
    
    // 返回所有已存储记忆的阶段名称，包括阶段组
    const stages = Array.from(memories.keys()).map(key => String(key));
    console.log(`[StagedMemory] 获取已总结阶段: ${stages.join(', ') || '无'}`);
    return stages;
  }

  /**
   * 总结A阶段内容，提取创作元素
   * @param conversation 当前会话
   * @returns 提取的阶段记忆项
   */
  public async summarizeAStage(conversation: Conversation): Promise<StagedMemoryItem | null> {
    console.log(`[StagedMemory] 开始总结A阶段的创作元素`);
    
    try {
      // 构建对话历史文本
      const dialogHistory = conversation.messages
        .map(m => `${m.role === 'user' ? '用户' : 'AI助手'}: ${m.content}`)
        .join('\n');
      
      // 构建提取创作元素的提示词
      const prompt = `
你是一位儿童绘画分析师，需要从以下4-6岁儿童与AI的对话中提取关键创作信息。

对话历史:
${dialogHistory}

根据上面的对话，请分析:
1. 这个故事或绘画的主题是什么？（简洁描述整体创作方向）
2. 这个故事中的主角(主要角色或物体)是什么？（提取核心角色或物体名称）
3. 可能的辅助元素有哪些？（提取故事中除主角外的其他元素）

只需返回以下JSON格式，不要有其他任何文字:
{
  "theme": "故事/绘画主题",
  "mainCharacter": "主角名称",
  "supportElements": ["辅助元素1", "辅助元素2"]
}`;

      // 调用AI服务获取响应
      const response = await this.ollamaService.chat([
        { role: 'user', content: prompt }
      ]);
      
      // 解析响应JSON
      try {
        let extractedElements;
        try {
          extractedElements = JSON.parse(response);
        } catch (parseError) {
          // 如果直接解析失败，尝试从文本中提取JSON部分
          console.log(`[StagedMemory] 直接解析JSON失败，尝试提取JSON部分`);
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedElements = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('无法从响应中提取JSON');
          }
        }
        
        // 更新会话的创意元素（保持原有功能）
        if (!conversation.creativeElements) {
          conversation.creativeElements = {};
        }
        
        if (extractedElements.theme) {
          conversation.creativeElements.theme = extractedElements.theme;
          console.log(`[StagedMemory] 提取到主题: ${extractedElements.theme}`);
        }
        
        if (extractedElements.mainCharacter) {
          conversation.creativeElements.mainCharacter = extractedElements.mainCharacter;
          console.log(`[StagedMemory] 提取到主角: ${extractedElements.mainCharacter}`);
        }
        
        if (extractedElements.supportElements && Array.isArray(extractedElements.supportElements)) {
          conversation.creativeElements.supportElements = extractedElements.supportElements;
          console.log(`[StagedMemory] 提取到辅助元素: ${extractedElements.supportElements.join(', ')}`);
        }
        
        // 创建阶段记忆项
        const keywords = [];
        if (extractedElements.mainCharacter) keywords.push(extractedElements.mainCharacter);
        if (extractedElements.theme) keywords.push(extractedElements.theme);
        if (extractedElements.supportElements) keywords.push(...extractedElements.supportElements);
        
        // 构建阶段A的总结文本
        const summary = `本次创作的主题是"${extractedElements.theme || '未确定'}"，主角是"${extractedElements.mainCharacter || '未确定'}"${
          extractedElements.supportElements && extractedElements.supportElements.length > 0 
            ? `，包含元素：${extractedElements.supportElements.join('、')}` 
            : ''
        }。`;
        
        // 创建并存储阶段记忆
        const memoryItem: StagedMemoryItem = {
          stage: 'A',
          summary,
          keywords,
          timestamp: Date.now()
        };
        
        this.storeMemory(conversation.id, memoryItem);
        
        console.log(`[StagedMemory] A阶段记忆总结完成，长度: ${summary.length}`);
        return memoryItem;
        
      } catch (error) {
        console.error('[StagedMemory] 解析A阶段总结响应失败:', error);
        return this.fallbackAStageSummary(conversation);
      }
    } catch (error) {
      console.error('[StagedMemory] 总结A阶段记忆时出错:', error);
      return null;
    }
  }

  /**
   * A阶段总结备用方法
   */
  private fallbackAStageSummary(conversation: Conversation): StagedMemoryItem | null {
    // 简单提取最后一条消息作为关键内容
    const lastUserMessage = conversation.messages
      .filter(m => m.role === 'user')
      .pop();
      
    if (!lastUserMessage) return null;
    
    // 创建简单的记忆项
    const memoryItem: StagedMemoryItem = {
      stage: 'A',
      summary: `用户表达的创作意向: ${lastUserMessage.content}`,
      keywords: [lastUserMessage.content.substring(0, 20)],
      timestamp: Date.now()
    };
    
    this.storeMemory(conversation.id, memoryItem);
    console.log(`[StagedMemory] A阶段备用总结完成`);
    return memoryItem;
  }
} 