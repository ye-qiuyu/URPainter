import { v4 as uuidv4 } from 'uuid';
import { 
  Conversation, 
  Message, 
  ConversationStage, 
  ThemeCategory 
} from '@/types/conversation';
import { MemoryManager } from '../memory/manager';
import { StagedMemory, StageTransitionTrigger } from '../memory/index';
import { StageManager } from '../stages/manager';
import { ThemeManager } from '../themes/manager';
import { ThemeDetector } from '../themes/detector';
import { AITextService } from '../ai/aiTextService';
import { PromptBuilderService } from '../prompt/builder';
import { MemoryController } from '../memory/controller';
 
export class ConversationManager {
  private static instance: ConversationManager;
  private memoryManager: MemoryManager;
  private stageManager: StageManager;
  private themeManager: ThemeManager;
  private themeDetector: ThemeDetector;
  private aiTextService: AITextService;
  private promptBuilder: PromptBuilderService;
  private stagedMemory: StagedMemory;
  private stageTransitionTrigger: StageTransitionTrigger;
  
  private constructor() {
    this.memoryManager = MemoryManager.getInstance();
    this.stageManager = StageManager.getInstance();
    this.themeManager = ThemeManager.getInstance();
    this.themeDetector = new ThemeDetector();
    this.aiTextService = AITextService.getInstance();
    this.promptBuilder = PromptBuilderService.getInstance();
    this.stagedMemory = StagedMemory.getInstance();
    this.stageTransitionTrigger = StageTransitionTrigger.getInstance();
  }
  
  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }
  
  // 创建新会话
  createConversation(): Conversation {
    return {
      id: uuidv4(),
      messages: [],
      currentStage: 'A',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
  
  // 添加消息到会话
  async addMessage(
    conversation: Conversation, 
    content: string, 
    role: 'user' | 'assistant',
    images?: string[]
  ): Promise<Conversation> {
    const message: Message = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      images
    };
    
    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
    
    // 不再调用MemoryManager.addMessage，因为我们现在使用ClientMemory
    
    return conversation;
  }
  
  // 更新会话阶段
  async updateConversationStage(conversation: Conversation): Promise<Conversation> {
    try {
      const nextStage = await this.stageManager.determineNextStage(conversation);
      
      if (nextStage !== conversation.currentStage) {
        console.log(`阶段变更: ${conversation.currentStage} -> ${nextStage} - 会话ID: ${conversation.id}`);
        conversation.currentStage = nextStage;
        conversation.updatedAt = Date.now();
      }
      
      return conversation;
    } catch (error) {
      console.error('更新会话阶段失败:', error);
      return conversation;
    }
  }
  
  // 获取会话
  getConversation(conversationId: string, conversations: Conversation[]): Conversation | null {
    return conversations.find(conv => conv.id === conversationId) || null;
  }
  
  // 获取会话创作元素
  getConversationCreativeElements(conversationId: string): any {
    // 使用MemoryManager的processHistory方法处理消息历史
    // 这个方法会返回提取的创意元素
    const messages = this.getConversationMessages(conversationId);
    if (!messages || messages.length === 0) {
      return {};
    }
    
    const { creativeElements } = this.memoryManager.processHistory(messages, conversationId);
    return creativeElements;
  }
  
  // 获取会话消息
  getConversationMessages(conversationId: string): Message[] {
    // 这个方法应该从外部传入消息，不再从MemoryManager获取
    // 在实际使用时，应该从ClientMemory或其他存储中获取
    return [];
  }
  
  // 设置会话阶段
  setConversationStage(conversation: Conversation, stage: ConversationStage): Conversation {
    return this.stageManager.setStage(conversation, stage);
  }
  
  // 设置会话主题
  setConversationTheme(conversation: Conversation, theme: ThemeCategory): Conversation {
    return {
      ...conversation,
      detectedTheme: theme,
      updatedAt: Date.now()
    };
  }
  
  // 处理消息
  async processMessage(conversation: Conversation, userMessage: string, sessionId?: string): Promise<Conversation> {
    console.log(`处理消息 - 会话ID: ${conversation.id}, 当前阶段: ${conversation.currentStage}`);
    
    // 创建用户消息对象
    const userMessageObj: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      sessionId: sessionId // 设置sessionId
    };
    
    // 添加用户消息到会话
    conversation.messages.push(userMessageObj);
    
    // 不再调用MemoryManager.addMessage
    
    // 检测主题（如果尚未检测且有足够的消息）
    if (!conversation.detectedTheme && conversation.messages.length >= 2) {
      try {
        const detectedTheme = await this.themeDetector.detectTheme(conversation.messages);
        
        if (detectedTheme) {
          console.log(`检测到主题: ${detectedTheme} - 会话ID: ${conversation.id}`);
          conversation.detectedTheme = detectedTheme;
        }
      } catch (error) {
        console.error('主题检测失败:', error);
      }
    }
    
    // 获取AI响应
    const aiResponse = await this.aiTextService.getResponse(conversation);
    console.log(`获取到AI响应 - 长度: ${aiResponse.length} 字符`);
    
    // 创建AI消息对象
    const aiMessageObj: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now(),
      sessionId: sessionId // 设置sessionId
    };
    
    // 添加AI消息到会话
    conversation.messages.push(aiMessageObj);
    
    // 不再调用MemoryManager.addMessage
    
    // 更新会话的最后更新时间
    conversation.updatedAt = Date.now();
    
    // 确定下一个阶段
    const previousStage = conversation.currentStage;
    conversation.currentStage = await this.determineNextStage(conversation);
    
    if (previousStage !== conversation.currentStage) {
      console.log(`阶段变更: ${previousStage} -> ${conversation.currentStage} - 会话ID: ${conversation.id}`);
    }
    
    return conversation;
  }
  
  /**
   * 确定会话的下一个阶段
   * 
   * @param conversation 当前会话
   * @returns 下一个会话阶段
   */
  private async determineNextStage(conversation: Conversation): Promise<ConversationStage> {
    // 使用StageManager进行智能判断
    try {
      console.log(`[阶段判断] 开始判断 - 会话ID: ${conversation.id}, 当前阶段: ${conversation.currentStage}`);
      console.log(`[阶段判断] 消息数量: ${conversation.messages.length}`);
      
      // 记录当前阶段
      const currentStage = conversation.currentStage;
      
      // 调用StageManager的determineNextStage方法
      const nextStage = await this.stageManager.determineNextStage(conversation);
      
      if (nextStage !== currentStage) {
        console.log(`[阶段判断] 阶段变更: ${currentStage} -> ${nextStage}`);
        console.log(`[阶段判断] 变更原因: 满足阶段转换条件`);
        
        // 触发阶段转换记忆处理
        const previousStage = conversation.currentStage;
        // 先更新会话的阶段
        conversation.currentStage = nextStage;
        
        // 然后触发记忆总结
        await this.stageTransitionTrigger.checkAndHandleTransition(conversation);
        
        console.log(`[阶段判断] 阶段记忆处理完成: ${previousStage} -> ${nextStage}`);
      } else {
        console.log(`[阶段判断] 保持当前阶段: ${currentStage}`);
      }
      
      return nextStage;
    } catch (error) {
      console.error('[阶段判断] 错误:', error);
      // 出错时保持当前阶段
      console.log(`[阶段判断] 由于错误，保持当前阶段: ${conversation.currentStage}`);
      return conversation.currentStage;
    }
  }
  
  // 修改处理带有记忆的消息方法，集成分阶段记忆
  async processMessageWithMemory(
    conversation: Conversation, 
    userMessage: string,
    formattedMemory: string,
    creativeElements: any
  ): Promise<string> {
    try {
      console.log(`处理消息 - 会话ID: ${conversation.id}, 消息长度: ${userMessage.length}`);
      
      // 检测主题（如果尚未检测）
      let detectedTheme = conversation.detectedTheme;
      if (!detectedTheme && conversation.messages.length >= 2) {
        console.log('尝试检测主题...');
        detectedTheme = await this.themeDetector.detectTheme(conversation.messages);
        console.log(`主题检测结果: ${detectedTheme || '未检测到'}`);
      }
      
      // 先确定下一阶段（这一步移到提示词构建前）
      const previousStage = conversation.currentStage;
      const nextStage = await this.determineNextStage(conversation);
      
      if (nextStage !== previousStage) {
        console.log(`阶段变更: ${previousStage} -> ${nextStage}`);
        conversation.currentStage = nextStage;
        
        // 当阶段发生变化时，通知阶段转换触发器
        await this.stageTransitionTrigger.checkAndHandleTransition(conversation);
      }
      
      // 创建一个可修改的副本
      const mutableCreativeElements = {
        ...creativeElements,
        ...(conversation.creativeElements || {})
      };
      
      // 将可能修改过的 creativeElements 更新回 conversation 对象
      if (!conversation.creativeElements) {
        conversation.creativeElements = {};
      }
      
      if (conversation.creativeElements && conversation.creativeElements.mainCharacter) {
        console.log(`使用从会话中提取的主角: ${conversation.creativeElements.mainCharacter}`);
      }
      
      // 确保主角和主题信息保留
      if (mutableCreativeElements.mainCharacter && !conversation.creativeElements.mainCharacter) {
        conversation.creativeElements.mainCharacter = mutableCreativeElements.mainCharacter;
        console.log(`[Manager] 保存主角信息: ${conversation.creativeElements.mainCharacter}`);
      }
      
      if (mutableCreativeElements.theme && !conversation.creativeElements.theme) {
        conversation.creativeElements.theme = mutableCreativeElements.theme;
        console.log(`[Manager] 保存主题信息: ${conversation.creativeElements.theme}`);
      }
      
      // 获取阶段记忆总结 - 不再合并到formattedMemory中，而是直接传递给PromptBuilder
      let stagedMemories = '';
      try {
        // 传递当前阶段参数，确保不包含当前阶段的记忆
        stagedMemories = this.stagedMemory.formatMemoriesForPrompt(conversation.id, conversation.currentStage);
        if (stagedMemories && stagedMemories !== '尚无历史记忆') {
          console.log(`[Manager] 获取到阶段记忆总结，长度: ${stagedMemories.length}字符`);
        }
      } catch (error) {
        console.error('[Manager] 获取阶段记忆总结失败:', error);
      }
      
      // 检查是否是记忆相关的查询
      const memoryController = MemoryController.getInstance();
      
      const relevantMemory = memoryController.retrieveRelevantMemory(conversation.messages, userMessage);
      
      // 如果是记忆相关的查询，添加相关记忆到阶段记忆中
      if (relevantMemory) {
        if (stagedMemories && stagedMemories !== '尚无历史记忆') {
          stagedMemories = `${stagedMemories}\n\n## 当前问题相关记忆\n${relevantMemory}`;
        } else {
          stagedMemories = `## 当前问题相关记忆\n${relevantMemory}`;
        }
        console.log(`[Manager] 检测到记忆相关查询，添加相关记忆到阶段记忆`);
      }
      
      // 获取已总结的阶段列表，用于消息过滤
      const summarizedStages = this.stagedMemory.getSummarizedStages ? 
        this.stagedMemory.getSummarizedStages(conversation.id) : [];
      console.log(`[Manager] 已总结的阶段: ${summarizedStages.join(', ') || '无'}`);
      
      // 构建提示词（传入阶段记忆作为独立参数，同时传入已总结阶段列表）
      const prompt = this.promptBuilder.buildConversationPrompt(
        userMessage,
        conversation.id,
        conversation.currentStage,  // 使用可能已更新的阶段
        detectedTheme,
        conversation.messages,      // 直接传递消息数组，让PromptBuilder处理过滤
        mutableCreativeElements,
        stagedMemories,             // 传入阶段记忆作为独立参数
        summarizedStages            // 传入已总结的阶段列表，用于过滤
      );
      
      // 添加详细的prompt日志
      console.log(`完整提示词内容:\n${'-'.repeat(80)}\n${prompt}\n${'-'.repeat(80)}`);
      
      // 在开发环境中，将prompt保存到conversation对象中，以便前端可以访问
      if (process.env.NODE_ENV === 'development') {
        (conversation as any)._lastPrompt = prompt;
      }
      
      // 获取AI响应
      console.log('请求AI响应...');
      const aiResponse = await this.aiTextService.getResponse(prompt);
      console.log(`收到AI响应 - 长度: ${aiResponse.length}`);
      
      // 在开发环境中，将prompt添加到响应中，以便前端可以在控制台查看
      if (process.env.NODE_ENV === 'development') {
        return JSON.stringify({
          response: aiResponse,
          _debug: {
            prompt: prompt,
            promptLength: prompt.length,
            stagedMemoriesLength: stagedMemories ? stagedMemories.length : 0
          }
        });
      }
      
      return aiResponse;
    } catch (error) {
      console.error('处理消息时出错:', error);
      return '抱歉，我现在无法回答您的问题。请稍后再试。';
    }
  }
} 