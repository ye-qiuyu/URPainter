import { ConversationStage, Conversation } from '@/types/conversation';
import { StagedMemory } from './StagedMemory';

/**
 * 阶段转换触发器
 * 负责检测阶段转换并触发记忆总结
 */
export class StageTransitionTrigger {
  private static instance: StageTransitionTrigger;
  private stagedMemory: StagedMemory;
  private lastStageByConversation: Map<string, ConversationStage>;
  
  // 私有构造函数
  private constructor() {
    this.stagedMemory = StagedMemory.getInstance();
    this.lastStageByConversation = new Map();
  }
  
  /**
   * 获取StageTransitionTrigger单例
   */
  public static getInstance(): StageTransitionTrigger {
    if (!StageTransitionTrigger.instance) {
      StageTransitionTrigger.instance = new StageTransitionTrigger();
    }
    return StageTransitionTrigger.instance;
  }
  
  /**
   * 检查并处理阶段转换
   * @param conversation 当前会话
   * @returns 如果发生阶段转换，返回true
   */
  public async checkAndHandleTransition(conversation: Conversation): Promise<boolean> {
    const conversationId = conversation.id;
    const currentStage = conversation.currentStage;
    
    // 获取上一个记录的阶段
    const lastStage = this.lastStageByConversation.get(conversationId) || currentStage;
    
    // 检查是否发生阶段转换
    if (lastStage !== currentStage) {
      console.log(`[StageTransitionTrigger] 检测到阶段转换: ${lastStage} -> ${currentStage}`);
      
      // 总结前一阶段的记忆
      await this.summarizeLastStage(conversation, lastStage, currentStage);
      
      // 更新最后一个阶段记录
      this.lastStageByConversation.set(conversationId, currentStage);
      
      return true;
    }
    
    // 没有阶段变化，更新记录保持一致
    this.lastStageByConversation.set(conversationId, currentStage);
    return false;
  }
  
  /**
   * 总结上一阶段的记忆
   */
  private async summarizeLastStage(
    conversation: Conversation, 
    prevStage: ConversationStage, 
    currentStage: ConversationStage
  ): Promise<void> {
    try {
      // 调用StagedMemory来总结前一阶段
      const memoryItem = await this.stagedMemory.summarizeStageMemory(
        conversation,
        prevStage,
        currentStage
      );
      
      if (memoryItem) {
        console.log(`[StageTransitionTrigger] 阶段${prevStage}记忆总结成功`);
        console.log(`[StageTransitionTrigger] 记忆总结: ${memoryItem.summary.substring(0, 50)}...`);
        console.log(`[StageTransitionTrigger] 关键词: ${memoryItem.keywords.join(', ')}`);
      } else {
        console.log(`[StageTransitionTrigger] 阶段${prevStage}没有生成记忆总结`);
      }
    } catch (error) {
      console.error(`[StageTransitionTrigger] 总结阶段${prevStage}记忆时出错:`, error);
    }
  }
  
  /**
   * 获取当前会话的最后记录阶段
   */
  public getLastStage(conversationId: string): ConversationStage | undefined {
    return this.lastStageByConversation.get(conversationId);
  }
  
  /**
   * 重置会话的阶段记录
   */
  public resetConversation(conversationId: string): void {
    this.lastStageByConversation.delete(conversationId);
  }
} 