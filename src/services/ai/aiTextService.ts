import { Conversation, Message } from '@/types/conversation';
import { OllamaService } from './ollama';

/**
 * AITextService - 统一管理AI文本响应服务
 * 
 * 这个服务封装了与文本生成AI模型的交互，提供了一个统一的接口来获取AI响应。
 * 目前使用OllamaService作为底层实现，但可以轻松切换到其他AI服务。
 */
export class AITextService {
  private static instance: AITextService;
  private ollamaService: OllamaService;
  
  private constructor() {
    this.ollamaService = OllamaService.getInstance();
  }
  
  /**
   * 获取AITextService的单例实例
   */
  public static getInstance(): AITextService {
    if (!AITextService.instance) {
      AITextService.instance = new AITextService();
    }
    return AITextService.instance;
  }
  
  /**
   * 根据会话或提示词获取AI响应
   * 
   * @param input 当前会话或提示词字符串
   * @returns AI响应文本
   */
  async getResponse(input: Conversation | string): Promise<string> {
    try {
      // 处理字符串提示词
      if (typeof input === 'string') {
        console.log(`请求AI响应 - 提示词长度: ${input.length}`);
        const response = await this.ollamaService.generate(input);
        console.log(`收到AI响应 - 响应长度: ${response.length}`);
        return response;
      }
      
      // 处理会话对象
      console.log(`请求AI响应 - 会话ID: ${input.id}, 消息数量: ${input.messages.length}`);
      
      // 将会话消息转换为Ollama所需的格式
      const messages = input.messages.map(({ role, content }) => ({ 
        role, 
        content 
      }));
      
      // 调用Ollama服务获取响应
      const response = await this.ollamaService.chat(messages);
      console.log(`收到AI响应 - 会话ID: ${input.id}, 响应长度: ${response.length}`);
      
      return response;
    } catch (error) {
      console.error('获取AI响应失败:', error);
      return '抱歉，我现在无法回答您的问题。请稍后再试。';
    }
  }
} 