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
    
    // 检查是否应该转换到下一个阶段
    const shouldTransition = await this.detector.shouldTransition(
      conversation.messages,
      currentStage,
      conversation.detectedTheme
    );
    
    if (shouldTransition) {
      return this.getNextStage(currentStage);
    }
    
    return currentStage;
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