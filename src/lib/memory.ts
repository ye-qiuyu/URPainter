import { Message, ConversationStage } from '@/types/conversation';

/**
 * ClientMemory - 客户端记忆管理
 * 
 * 提供在浏览器端管理会话记忆的工具函数，使用SessionStorage存储消息。
 * 这确保了记忆在会话期间保持，但在浏览器关闭或刷新时被清除。
 */
export class ClientMemory {
  /**
   * 获取会话的所有消息
   * 
   * @param conversationId 会话ID
   * @returns 消息列表，如果不存在则返回空数组
   */
  static getMessages(conversationId: string): Message[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = sessionStorage.getItem(`messages_${conversationId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('从SessionStorage获取消息失败:', e);
      return [];
    }
  }
  
  /**
   * 保存消息列表到会话存储
   * 
   * @param conversationId 会话ID
   * @param messages 要保存的消息列表
   */
  static saveMessages(conversationId: string, messages: Message[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));
    } catch (e) {
      console.error('保存消息到SessionStorage失败:', e);
    }
  }
  
  /**
   * 添加新消息到会话
   * 
   * @param conversationId 会话ID
   * @param message 要添加的消息（不需要id和timestamp，会自动生成）
   * @returns 更新后的消息列表
   */
  static addMessage(
    conversationId: string, 
    message: Omit<Message, 'id' | 'timestamp'>
  ): Message[] {
    const messages = this.getMessages(conversationId);
    
    // 创建完整的消息对象
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    
    // 添加到消息列表
    const updatedMessages = [...messages, newMessage];
    
    // 保存到SessionStorage
    this.saveMessages(conversationId, updatedMessages);
    
    return updatedMessages;
  }
  
  /**
   * 保存会话阶段信息
   * 
   * @param conversationId 会话ID
   * @param stage 会话阶段
   */
  static saveStage(conversationId: string, stage: ConversationStage): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(`stage_${conversationId}`, stage);
      console.log(`[ClientMemory] 保存阶段: ${stage} - 会话ID: ${conversationId}`);
    } catch (e) {
      console.error('保存阶段到SessionStorage失败:', e);
    }
  }
  
  /**
   * 获取会话阶段信息
   * 
   * @param conversationId 会话ID
   * @returns 会话阶段，如果不存在则返回'A'
   */
  static getStage(conversationId: string): ConversationStage {
    if (typeof window === 'undefined') return 'A';
    
    try {
      const stage = sessionStorage.getItem(`stage_${conversationId}`);
      console.log(`[ClientMemory] 获取阶段: ${stage || 'A'} - 会话ID: ${conversationId}`);
      return (stage as ConversationStage) || 'A';
    } catch (e) {
      console.error('从SessionStorage获取阶段失败:', e);
      return 'A';
    }
  }
  
  /**
   * 清除特定会话的所有消息
   * 
   * @param conversationId 会话ID
   */
  static clearConversation(conversationId: string): void {
    if (typeof window === 'undefined') return;
    
    sessionStorage.removeItem(`messages_${conversationId}`);
    sessionStorage.removeItem(`stage_${conversationId}`);
  }
  
  /**
   * 清除所有会话的消息
   */
  static clearAll(): void {
    if (typeof window === 'undefined') return;
    
    // 遍历所有SessionStorage项
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('messages_') || key?.startsWith('stage_')) {
        sessionStorage.removeItem(key);
      }
    }
  }
  
  /**
   * 获取所有会话ID
   * 
   * @returns 会话ID列表
   */
  static getAllConversationIds(): string[] {
    if (typeof window === 'undefined') return [];
    
    const ids: string[] = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('messages_')) {
        ids.push(key.replace('messages_', ''));
      }
    }
    
    return ids;
  }

  /**
   * 检查是否为新会话（没有任何消息）
   * 
   * @param conversationId 会话ID
   * @returns 如果会话没有任何消息则返回true
   */
  static isNewConversation(conversationId: string): boolean {
    const messages = this.getMessages(conversationId);
    return messages.length === 0;
  }

  /**
   * 设置会话已初始化标记
   * 防止在页面刷新或重新访问时重复发送自动消息
   * 
   * @param conversationId 会话ID
   */
  static markConversationInitialized(conversationId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(`initialized_${conversationId}`, 'true');
    } catch (e) {
      console.error('标记会话初始化状态失败:', e);
    }
  }

  /**
   * 检查会话是否已初始化
   * 
   * @param conversationId 会话ID
   * @returns 如果会话已初始化则返回true
   */
  static isConversationInitialized(conversationId: string): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      return sessionStorage.getItem(`initialized_${conversationId}`) === 'true';
    } catch (e) {
      console.error('检查会话初始化状态失败:', e);
      return false;
    }
  }
} 