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

export class ConversationManager {
  private static instance: ConversationManager;
  private memoryManager: MemoryManager;
  private stageManager: StageManager;
  private themeManager: ThemeManager;
  
  private constructor() {
    this.memoryManager = MemoryManager.getInstance();
    this.stageManager = StageManager.getInstance();
    this.themeManager = ThemeManager.getInstance();
  }
  
  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }
  
  // 创建新对话
  createConversation(): Conversation {
    const now = Date.now();
    const conversation: Conversation = {
      id: uuidv4(),
      messages: [],
      currentStage: 'A', // 初始阶段
      createdAt: now,
      updatedAt: now
    };
    
    return conversation;
  }
  
  // 添加消息到对话
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
    
    // 更新对话
    const updatedConversation: Conversation = {
      ...conversation,
      messages: [...conversation.messages, message],
      updatedAt: Date.now()
    };
    
    // 添加到记忆管理器
    this.memoryManager.addMessage(message, conversation.id);
    
    // 如果是AI消息，检查是否需要更新阶段
    if (role === 'assistant') {
      return await this.updateConversationStage(updatedConversation);
    }
    
    return updatedConversation;
  }
  
  // 更新对话阶段
  async updateConversationStage(conversation: Conversation): Promise<Conversation> {
    // 检测主题（如果尚未检测到）
    let updatedConversation = { ...conversation };
    
    if (!updatedConversation.detectedTheme && updatedConversation.messages.length >= 2) {
      const detectedTheme = await this.themeManager.detectTheme(updatedConversation.messages);
      
      if (detectedTheme) {
        updatedConversation = {
          ...updatedConversation,
          detectedTheme
        };
      }
    }
    
    // 确定下一个阶段
    const nextStage = await this.stageManager.determineNextStage(updatedConversation);
    
    // 如果阶段发生变化，更新对话
    if (nextStage !== updatedConversation.currentStage) {
      updatedConversation = {
        ...updatedConversation,
        currentStage: nextStage
      };
    }
    
    return updatedConversation;
  }
  
  // 获取对话
  getConversation(conversationId: string, conversations: Conversation[]): Conversation | null {
    return conversations.find(conv => conv.id === conversationId) || null;
  }
  
  // 获取对话的创作元素
  getConversationCreativeElements(conversationId: string): any {
    return this.memoryManager.getCreativeElements(conversationId);
  }
  
  // 手动设置对话阶段
  setConversationStage(conversation: Conversation, stage: ConversationStage): Conversation {
    return this.stageManager.setStage(conversation, stage);
  }
  
  // 手动设置对话主题
  setConversationTheme(conversation: Conversation, theme: ThemeCategory): Conversation {
    return {
      ...conversation,
      detectedTheme: theme
    };
  }
} 