import { Message } from '@/types/conversation';

/**
 * 创意元素接口
 * 定义了从对话中提取的创意元素结构
 */
export interface CreativeElements {
  theme?: string;
  mainCharacter?: string;
  supportElements?: string[];
}

/**
 * MemoryStorage - 记忆处理类
 * 
 * 负责消息的验证和处理，不再负责存储功能。
 * 实际存储将由前端的SessionStorage负责。
 */
export class MemoryStorage {
  /**
   * 验证消息格式
   * 
   * @param message 要验证的消息
   * @returns 消息是否有效
   */
  validateMessage(message: any): boolean {
    return (
      message &&
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      (message.role === 'user' || message.role === 'assistant') &&
      typeof message.content === 'string' &&
      typeof message.timestamp === 'number'
    );
  }
  
  /**
   * 处理消息列表
   * 验证并过滤消息列表中的无效消息
   * 
   * @param messages 要处理的消息列表
   * @returns 处理后的有效消息列表
   */
  processMessages(messages: Message[]): Message[] {
    if (!messages || !Array.isArray(messages)) {
      console.warn('处理消息时收到无效消息列表');
      return [];
    }
    
    // 过滤无效消息
    const validMessages = messages.filter(msg => this.validateMessage(msg));
    
    if (validMessages.length !== messages.length) {
      console.warn(`消息列表中有 ${messages.length - validMessages.length} 条无效消息被过滤`);
    }
    
    return validMessages;
  }
} 