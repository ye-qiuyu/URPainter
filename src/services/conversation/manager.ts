import { v4 as uuidv4 } from 'uuid';
import type { Conversation, Message, ConversationStage } from '@/types/conversation';
import { OllamaService } from '../ai/ollama';
import { ComfyUIService } from '../ai/comfyui';

export class ConversationManager {
  private static instance: ConversationManager;
  private ollamaService: OllamaService;
  private comfyuiService: ComfyUIService;

  private constructor() {
    this.ollamaService = OllamaService.getInstance();
    this.comfyuiService = ComfyUIService.getInstance();
  }

  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  createConversation(): Conversation {
    return {
      id: uuidv4(),
      messages: [],
      currentStage: 'A',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  async processMessage(
    conversation: Conversation,
    userMessage: string
  ): Promise<Conversation> {
    // 1. 添加用户消息
    const newMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    conversation.messages.push(newMessage);

    // 2. 获取AI回复
    const aiResponse = await this.ollamaService.chat(
      conversation.messages.map(({ role, content }) => ({ role, content }))
    );

    // 3. 添加AI回复
    const aiMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now(),
    };

    conversation.messages.push(aiMessage);
    conversation.updatedAt = Date.now();

    // 4. 更新对话阶段
    conversation.currentStage = this.determineNextStage(conversation);

    return conversation;
  }

  private determineNextStage(conversation: Conversation): ConversationStage {
    // 根据对话内容和当前阶段确定下一个阶段
    // 这里需要实现具体的阶段转换逻辑
    return conversation.currentStage;
  }
} 