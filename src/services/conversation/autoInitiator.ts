import { getRandomQuestion } from '@/prompts/questionBank';
import { Message, ConversationStage } from '@/types/conversation';
import { v4 as uuidv4 } from 'uuid';

/**
 * 自动对话发起服务
 * 负责在新会话创建时自动发送AI消息
 */
export class AutoInitiator {
  /**
   * 生成初始AI消息
   * 随机选择一个问题作为对话的开始，加入友好的开场白
   * 
   * @returns 初始AI消息对象
   */
  static generateInitialMessage(): Message {
    const question = getRandomQuestion();
    const greetings = [
      "你好呀，小朋友！",
      "嗨，小朋友！",
      "哈喽，小画家！",
      "你好啊，小创造家！"
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    const content = `${randomGreeting} 😊 ${question}`;
    
    return {
      id: uuidv4(),
      role: 'assistant',
      content: content,
      timestamp: Date.now()
    };
  }

  /**
   * 向API发送自动生成的初始消息
   * 这个方法在客户端调用，用于记录系统自动发送的消息
   * 
   * @param conversationId 会话ID
   * @param currentStage 当前会话阶段
   * @returns 服务器响应
   */
  static async sendInitialMessage(conversationId: string, currentStage: ConversationStage = 'A'): Promise<any> {
    try {
      console.log('发送自动初始化消息...');
      
      // 由于这是系统发起的消息，我们直接创建一条模拟的AI回复
      // 不需要实际调用AI服务，只需在前端记录这条消息
      const initialMessage = this.generateInitialMessage();
      
      // 返回模拟的服务器响应
      return {
        success: true,
        data: {
          aiMessage: initialMessage,
          aiResponse: initialMessage.content,
          conversationId,
          currentStage
        }
      };
    } catch (error) {
      console.error('发送自动初始化消息失败:', error);
      throw error;
    }
  }
} 