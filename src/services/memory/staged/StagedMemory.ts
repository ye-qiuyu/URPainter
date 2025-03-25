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
}

/**
 * 分阶段记忆管理器
 * 负责管理各阶段的记忆内容，实现记忆总结、提取和格式化功能
 */
export class StagedMemory {
  private static instance: StagedMemory;
  private ollamaService: OllamaService;
  private memoriesByConversation: Map<string, Map<ConversationStage, StagedMemoryItem>>;
  
  // 私有构造函数
  private constructor() {
    this.ollamaService = OllamaService.getInstance();
    this.memoriesByConversation = new Map();
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
    console.log(`[StagedMemory] 开始总结阶段${prevStage}的记忆`);
    
    // 提取该阶段的消息
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
   * 提取指定阶段的消息
   */
  private extractStageMessages(conversation: Conversation, stage: ConversationStage): Message[] {
    // 获取所有阶段转换点
    const stageTransitionPoints: number[] = [];
    let currentStage = 'A' as ConversationStage;
    
    // 标记所有阶段转换的消息索引
    conversation.messages.forEach((message, index) => {
      if (message.role === 'assistant' && 
          message.content.includes('阶段更新') && 
          message.content.includes('->')) {
        stageTransitionPoints.push(index);
        // 这里简化处理，实际应从消息中解析出确切的阶段信息
      }
    });
    
    // 如果没有转换点，返回所有消息
    if (stageTransitionPoints.length === 0) {
      return conversation.messages;
    }
    
    // 找到当前阶段的开始和结束索引
    let startIndex = 0;
    let endIndex = conversation.messages.length - 1;
    
    // 根据转换点确定阶段的消息范围
    // 这里简化实现，实际可能需要更精确的阶段边界判定
    
    return conversation.messages.slice(startIndex, endIndex + 1);
  }
  
  /**
   * 生成阶段记忆总结
   */
  private async generateStageSummary(messages: Message[], stage: ConversationStage): Promise<string> {
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
  private async extractKeywords(messages: Message[], stage: ConversationStage): Promise<string[]> {
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
   * 存储记忆项
   */
  private storeMemory(conversationId: string, memory: StagedMemoryItem): void {
    // 获取会话的记忆Map，如果不存在则创建
    if (!this.memoriesByConversation.has(conversationId)) {
      this.memoriesByConversation.set(conversationId, new Map());
    }
    
    const conversationMemories = this.memoriesByConversation.get(conversationId)!;
    conversationMemories.set(memory.stage, memory);
  }
  
  /**
   * 获取会话的所有阶段记忆
   */
  public getConversationMemories(conversationId: string): Map<ConversationStage, StagedMemoryItem> | null {
    return this.memoriesByConversation.get(conversationId) || null;
  }
  
  /**
   * 获取特定阶段的记忆
   */
  public getStageMemory(conversationId: string, stage: ConversationStage): StagedMemoryItem | null {
    const conversationMemories = this.memoriesByConversation.get(conversationId);
    if (!conversationMemories) return null;
    
    return conversationMemories.get(stage) || null;
  }
  
  /**
   * 获取格式化的记忆，适用于提示词构建
   */
  public formatMemoriesForPrompt(conversationId: string): string {
    const conversationMemories = this.memoriesByConversation.get(conversationId);
    if (!conversationMemories || conversationMemories.size === 0) {
      return '尚无历史记忆';
    }
    
    // 将所有记忆按阶段顺序排列并格式化
    const orderedStages: ConversationStage[] = ['A', 'B1', 'B2', 'C1', 'C2', 'D'];
    
    const formattedMemories = orderedStages
      .filter(stage => conversationMemories.has(stage))
      .map(stage => {
        const memory = conversationMemories.get(stage)!;
        return `## 阶段${stage}记忆\n${memory.summary}\n\n关键词: ${memory.keywords.join(', ')}`;
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
} 