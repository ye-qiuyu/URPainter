import { Message } from '@/types/conversation';
import { MemoryStorage, CreativeElements } from './storage';
import { MemoryFormatter } from './formatter';
import { MemoryController, ProcessedMemory } from './controller';

/**
 * MemoryManager - 记忆管理器
 * 
 * 负责协调记忆的处理和格式化，是应用程序与记忆系统交互的主要接口。
 * 处理从外部传入的消息历史，应用记忆策略，并返回处理后的数据。
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private storage: MemoryStorage;
  private formatter: MemoryFormatter;
  private controller: MemoryController;
  
  private constructor() {
    this.storage = new MemoryStorage();
    this.formatter = new MemoryFormatter();
    this.controller = MemoryController.getInstance();
  }
  
  /**
   * 获取MemoryManager的单例实例
   */
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }
  
  /**
   * 处理消息历史
   * 
   * 处理从外部传入的消息历史，应用窗口策略，并返回处理后的数据
   * 
   * @param messages 消息历史
   * @param conversationId 会话ID
   * @param options 选项，如窗口大小
   * @returns 处理后的记忆数据
   */
  processHistory(
    messages: Message[], 
    conversationId: string,
    options?: { windowSize?: number }
  ): ProcessedMemory {
    console.log(`处理会话记忆 - ID: ${conversationId}, 消息数: ${messages.length}`);
    
    // 验证和清理消息
    const validMessages = this.storage.processMessages(messages);
    
    // 应用记忆处理策略
    const windowSize = options?.windowSize ?? 20;
    return this.controller.processMessageHistory(validMessages, windowSize);
  }
  
  /**
   * 格式化消息历史
   * 
   * 将消息历史格式化为提示词可用的文本
   * 
   * @param messages 消息历史
   * @returns 格式化后的文本
   */
  formatMessages(messages: Message[]): string {
    return this.formatter.formatMessages(messages);
  }
  
  /**
   * 从消息中提取创意元素
   * 
   * @param messages 消息历史
   * @returns 提取的创意元素
   */
  extractCreativeElements(messages: Message[]): Partial<CreativeElements> {
    return this.formatter.extractCreativeElements(messages);
  }
} 