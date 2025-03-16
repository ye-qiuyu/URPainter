import { v4 as uuidv4 } from 'uuid';
import { 
  Conversation, 
  Message, 
  ConversationStage, 
  ThemeCategory 
} from '@/types/conversation';
import { MemoryManager } from '../memory/manager';
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
  
  private constructor() {
    this.memoryManager = MemoryManager.getInstance();
    this.stageManager = StageManager.getInstance();
    this.themeManager = ThemeManager.getInstance();
    this.themeDetector = new ThemeDetector();
    this.aiTextService = AITextService.getInstance();
    this.promptBuilder = PromptBuilderService.getInstance();
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
    conversation.currentStage = this.determineNextStage(conversation);
    
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
  private determineNextStage(conversation: Conversation): ConversationStage {
    // 暂时不实现阶段转换功能，始终返回固定阶段
    return 'A';
    
    // 注释掉原有的阶段判断逻辑，以便后续恢复
    /*
    // 当前阶段
    const currentStage = conversation.currentStage;
    
    // 消息数量
    const messageCount = conversation.messages.length;
    
    // 简单的阶段推进逻辑
    // 这里可以根据实际需求实现更复杂的逻辑
    if (currentStage === 'A' && messageCount >= 4) {
      return 'B';
    } else if (currentStage === 'B' && messageCount >= 8) {
      return 'C';
    } else if (currentStage === 'C' && messageCount >= 12) {
      return 'D';
    } else if (currentStage === 'D' && messageCount >= 16) {
      return 'E';
    } else if (currentStage === 'E' && messageCount >= 20) {
      return 'F';
    }
    
    // 默认保持当前阶段
    return currentStage;
    */
  }
  
  // 添加新方法：处理带有记忆的消息
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
      
      // 检查是否是记忆相关的查询
      const memoryController = MemoryController.getInstance();
      const relevantMemory = memoryController.retrieveRelevantMemory(conversation.messages, userMessage);
      
      // 如果是记忆相关的查询，添加相关记忆到提示词
      let enhancedMemory = formattedMemory;
      if (relevantMemory) {
        enhancedMemory = `${formattedMemory}\n\n特别注意以下与用户问题相关的记忆:\n${relevantMemory}`;
        console.log(`检测到记忆相关查询，添加相关记忆到提示词`);
      }
      
      // 构建提示词
      const prompt = this.promptBuilder.buildConversationPrompt(
        userMessage,
        conversation.id,
        conversation.currentStage,
        detectedTheme,
        enhancedMemory,
        creativeElements
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
      
      // 确定下一阶段
      const nextStage = this.determineNextStage(conversation);
      if (nextStage !== conversation.currentStage) {
        console.log(`阶段变更: ${conversation.currentStage} -> ${nextStage}`);
        conversation.currentStage = nextStage;
      }
      
      // 在开发环境中，将prompt添加到响应中，以便前端可以在控制台查看
      if (process.env.NODE_ENV === 'development') {
        return JSON.stringify({
          response: aiResponse,
          _debug: {
            prompt: prompt,
            promptLength: prompt.length
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