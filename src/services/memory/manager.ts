import { Message } from '@/types/conversation';
import { MemoryStorage, CreativeElements } from './storage';
import { MemoryFormatter } from './formatter';

export class MemoryManager {
  private static instance: MemoryManager;
  private storage: MemoryStorage;
  private formatter: MemoryFormatter;
  
  private constructor() {
    this.storage = new MemoryStorage();
    this.formatter = new MemoryFormatter();
  }
  
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }
  
  // 添加消息到记忆
  addMessage(message: Message, conversationId: string): void {
    this.storage.addMessage(message, conversationId);
    
    // 分析消息并提取创作元素
    if (message.role === 'assistant') {
      const newElements = this.formatter.extractCreativeElements([message]);
      if (Object.keys(newElements).length > 0) {
        this.updateCreativeElements(conversationId, newElements);
      }
    }
  }
  
  // 获取对话的所有消息
  getMessages(conversationId: string): Message[] {
    return this.storage.getMessages(conversationId);
  }
  
  // 获取格式化的记忆
  getFormattedMemory(conversationId: string): string {
    const messages = this.getMessages(conversationId);
    return this.formatter.formatMessages(messages);
  }
  
  // 获取创作元素
  getCreativeElements(conversationId: string): CreativeElements {
    return this.storage.getCreativeElements(conversationId);
  }
  
  // 获取格式化的创作元素
  getFormattedCreativeElements(conversationId: string): string {
    const elements = this.getCreativeElements(conversationId);
    return this.formatter.formatCreativeElements(elements);
  }
  
  // 更新创作元素
  updateCreativeElements(conversationId: string, elements: Partial<CreativeElements>): void {
    this.storage.updateCreativeElements(conversationId, elements);
  }
  
  // 清除特定对话的记忆
  clearMemory(conversationId: string): void {
    this.storage.clearMemory(conversationId);
  }
  
  // 清除所有记忆
  clearAllMemory(): void {
    this.storage.clearAllMemory();
  }
  
  // 分析整个对话历史，提取创作元素
  analyzeConversationHistory(conversationId: string): void {
    const messages = this.getMessages(conversationId);
    const extractedElements = this.formatter.extractCreativeElements(messages);
    
    if (Object.keys(extractedElements).length > 0) {
      this.updateCreativeElements(conversationId, extractedElements);
    }
  }
} 