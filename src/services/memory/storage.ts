import { Message } from '@/types/conversation';

export interface CreativeElements {
  theme?: string;
  mainCharacter?: string;
  supportElements?: string[];
}

export class MemoryStorage {
  private messagesByConversation: Record<string, Message[]> = {};
  private creativeElementsByConversation: Record<string, CreativeElements> = {};
  private sessionToConversations: Record<string, string[]> = {};
  
  // 添加消息
  addMessage(message: Message, conversationId: string): void {
    if (!this.messagesByConversation[conversationId]) {
      this.messagesByConversation[conversationId] = [];
    }
    
    this.messagesByConversation[conversationId].push(message);
    
    if (message.sessionId) {
      if (!this.sessionToConversations[message.sessionId]) {
        this.sessionToConversations[message.sessionId] = [];
      }
      
      if (!this.sessionToConversations[message.sessionId].includes(conversationId)) {
        this.sessionToConversations[message.sessionId].push(conversationId);
      }
    }
  }
  
  // 获取消息
  getMessages(conversationId: string): Message[] {
    return this.messagesByConversation[conversationId] || [];
  }
  
  // 获取创作元素
  getCreativeElements(conversationId: string): CreativeElements {
    return this.creativeElementsByConversation[conversationId] || {};
  }
  
  // 更新创作元素
  updateCreativeElements(conversationId: string, elements: Partial<CreativeElements>): void {
    this.creativeElementsByConversation[conversationId] = {
      ...this.creativeElementsByConversation[conversationId],
      ...elements
    };
  }
  
  // 清除特定对话的记忆
  clearMemory(conversationId: string): void {
    for (const sessionId in this.sessionToConversations) {
      const index = this.sessionToConversations[sessionId].indexOf(conversationId);
      if (index !== -1) {
        this.sessionToConversations[sessionId].splice(index, 1);
      }
    }
    
    delete this.messagesByConversation[conversationId];
    delete this.creativeElementsByConversation[conversationId];
  }
  
  // 清除所有记忆
  clearAllMemory(): void {
    this.messagesByConversation = {};
    this.creativeElementsByConversation = {};
    this.sessionToConversations = {};
  }
  
  // 获取会话ID对应的所有对话ID
  getConversationIds(sessionId: string): string[] {
    return this.sessionToConversations[sessionId] || [];
  }
  
  // 删除对话
  deleteConversation(conversationId: string): boolean {
    if (this.messagesByConversation[conversationId]) {
      this.clearMemory(conversationId);
      return true;
    }
    return false;
  }
} 