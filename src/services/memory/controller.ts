import { Message } from '@/types/conversation';
import { MemoryFormatter } from './formatter';
import { CreativeElements } from './storage';

/**
 * 处理后的记忆数据结构
 */
export interface ProcessedMemory {
  // 经过窗口处理后的消息
  messages: Message[];
  // 格式化后的记忆文本
  formattedMemory: string;
  // 提取的创意元素
  creativeElements: Partial<CreativeElements>;
}

/**
 * MemoryController - 记忆控制器
 * 
 * 负责记忆的核心处理逻辑，包括：
 * 1. 应用窗口记忆策略
 * 2. 处理消息历史
 * 3. 提取创意元素
 * 
 * 这个类不直接管理存储，而是处理传入的消息数据
 */
export class MemoryController {
  private static instance: MemoryController;
  private formatter: MemoryFormatter;
  
  private constructor() {
    this.formatter = new MemoryFormatter();
  }
  
  /**
   * 获取MemoryController的单例实例
   */
  public static getInstance(): MemoryController {
    if (!MemoryController.instance) {
      MemoryController.instance = new MemoryController();
    }
    return MemoryController.instance;
  }
  
  /**
   * 应用记忆窗口策略
   * 
   * @param messages 原始消息列表
   * @param windowSize 窗口大小，默认为20条消息
   * @returns 应用窗口策略后的消息列表
   */
  applyMemoryWindow(messages: Message[], windowSize: number = 20): Message[] {
    if (!messages || !Array.isArray(messages)) {
      console.warn('应用窗口策略时收到无效消息列表');
      return [];
    }
    
    // 简单的窗口策略：保留最近的N条消息
    return messages.slice(-windowSize);
  }
  
  /**
   * 处理消息历史
   * 
   * @param messages 原始消息列表
   * @param windowSize 窗口大小，默认为20条消息
   * @returns 处理后的记忆数据，包括窗口化消息、格式化文本和创意元素
   */
  processMessageHistory(
    messages: Message[],
    windowSize: number = 20
  ): ProcessedMemory {
    // 应用窗口策略
    const windowedMessages = this.applyMemoryWindow(messages, windowSize);
    
    // 格式化消息
    const formattedMemory = this.formatter.formatMessages(windowedMessages);
    
    // 提取创意元素
    const creativeElements = this.extractCreativeElements(windowedMessages);
    
    return {
      messages: windowedMessages,
      formattedMemory,
      creativeElements
    };
  }
  
  /**
   * 从消息中提取创意元素
   * 
   * @param messages 消息列表
   * @returns 提取的创意元素
   */
  private extractCreativeElements(messages: Message[]): Partial<CreativeElements> {
    return this.formatter.extractCreativeElements(messages);
  }
} 