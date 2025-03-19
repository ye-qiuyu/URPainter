import { Conversation, ConversationStage } from '@/types/conversation';
import { StageDetector } from './detector';

export class StageManager {
  private static instance: StageManager;
  private detector: StageDetector;
  
  private constructor() {
    this.detector = new StageDetector();
  }
  
  public static getInstance(): StageManager {
    if (!StageManager.instance) {
      StageManager.instance = new StageManager();
    }
    return StageManager.instance;
  }
  
  // 确定下一个阶段
  async determineNextStage(conversation: Conversation): Promise<ConversationStage> {
    const currentStage = conversation.currentStage;
    
    console.log(`[StageManager] 开始判断阶段转换 - 当前阶段: ${currentStage}`);
    
    // 检查是否应该转换到下一个阶段
    const shouldTransition = await this.detector.shouldTransition(
      conversation.messages,
      currentStage,
      conversation.detectedTheme
    );
    
    console.log(`[StageManager] 转换判断结果: ${shouldTransition ? '应该转换' : '保持当前阶段'}`);
    
    if (shouldTransition) {
      const nextStage = this.getNextStage(currentStage);
      console.log(`[StageManager] 确定下一阶段: ${currentStage} -> ${nextStage}`);
      
      // 特殊处理：从A阶段到B阶段时，提取主角信息
      if (currentStage === 'A' && nextStage === 'B') {
        try {
          // 获取最近的用户消息
          const recentUserMessages = conversation.messages
            .filter(m => m.role === 'user')
            .slice(-3);
          
          if (recentUserMessages.length > 0) {
            // 简单提取最后一条用户消息中可能的主角名词
            // 在实际实现中，这里可能需要更复杂的NLP处理
            const lastUserMessage = recentUserMessages[recentUserMessages.length - 1].content;
            
            // 简单处理：假设最近的名词可能是主角
            // 这里仅作为示例，实际应用中可能需要更复杂的提取逻辑
            const potentialMainCharacter = this.extractMainCharacter(lastUserMessage);
            
            if (potentialMainCharacter) {
              // 保存主角信息到conversation对象
              if (!conversation.creativeElements) {
                conversation.creativeElements = {};
              }
              
              conversation.creativeElements.mainCharacter = potentialMainCharacter;
              console.log(`[StageManager] 提取到主角: ${potentialMainCharacter}`);
            }
          }
        } catch (error) {
          console.error('[StageManager] 提取主角信息失败:', error);
        }
      }
      
      return nextStage;
    }
    
    console.log(`[StageManager] 保持当前阶段: ${currentStage}`);
    return currentStage;
  }
  
  // 提取主角信息的辅助方法
  private extractMainCharacter(message: string): string | null {
    // 这是一个简化的实现，实际应用中可能需要更复杂的NLP技术
    // 简单地返回消息中可能的主要名词
    
    // 过滤掉一些常见的非主角词
    const stopWords = ['我', '你', '他', '她', '它', '我们', '你们', '他们', '那个', '这个', '是', '的', '了', '啊', '吗'];
    
    // 简单分词
    const words = message.split(/[\s,，.。!！?？;；:：]+/);
    
    // 尝试找出可能的主角词
    for (const word of words) {
      if (word.length >= 2 && !stopWords.includes(word)) {
        return word;
      }
    }
    
    return null;
  }
  
  // 获取下一个阶段
  private getNextStage(currentStage: ConversationStage): ConversationStage {
    const stageSequence: ConversationStage[] = ['A', 'B', 'C', 'D', 'E', 'F'];
    const currentIndex = stageSequence.indexOf(currentStage);
    
    if (currentIndex < 0 || currentIndex >= stageSequence.length - 1) {
      return currentStage;
    }
    
    return stageSequence[currentIndex + 1];
  }
  
  // 获取当前阶段的描述
  getStageDescription(stage: ConversationStage): string {
    const descriptions: Record<ConversationStage, string> = {
      'A': '开启对话',
      'B': '确定创作主题',
      'C': '绘制主角元素',
      'D': '联想阶段',
      'E': '绘制其他元素',
      'F': '完成创作'
    };
    
    return descriptions[stage] || '未知阶段';
  }
  
  // 手动设置阶段
  setStage(conversation: Conversation, stage: ConversationStage): Conversation {
    return {
      ...conversation,
      currentStage: stage
    };
  }
} 