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
  private skipStageSummary: ConversationStage[] = ['A', 'B1']; // 不需要总结的阶段列表
  
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
    
    // 获取上一个记录的阶段，如果没有记录则使用当前阶段
    let lastStage = this.lastStageByConversation.get(conversationId);
    
    // 检查是否是首次阶段变更
    if (!lastStage) {
      console.log(`[StageTransitionTrigger] 首次检测阶段变更，当前阶段: ${currentStage}`);
      
      // 如果是从B1开始的会话(可能是从A阶段变化过来的)，特殊处理
      if (currentStage === 'B1') {
        console.log(`[StageTransitionTrigger] 检测到首次进入B1阶段，可能是从A阶段转换而来`);
        // 手动模拟从A阶段变更
        lastStage = 'A';
      } else {
        // 其他情况，记录当前阶段
        this.lastStageByConversation.set(conversationId, currentStage);
        return false;
      }
    }
    
    // 检查是否发生阶段转换
    if (lastStage !== currentStage) {
      console.log(`[StageTransitionTrigger] 检测到阶段转换: ${lastStage} -> ${currentStage}`);
      
      // 根据特殊规则处理不同的阶段转换
      await this.handleSpecialStageTransition(conversation, lastStage, currentStage);
      
      // 更新最后一个阶段记录
      this.lastStageByConversation.set(conversationId, currentStage);
      
      return true;
    }
    
    // 没有阶段变化，更新记录保持一致
    this.lastStageByConversation.set(conversationId, currentStage);
    return false;
  }
  
  /**
   * 处理特殊阶段转换
   * @param conversation 当前会话
   * @param prevStage 前一阶段
   * @param currentStage 当前阶段
   */
  private async handleSpecialStageTransition(
    conversation: Conversation,
    prevStage: ConversationStage, 
    currentStage: ConversationStage
  ): Promise<void> {
    // A阶段特殊处理：调用StagedMemory的A阶段总结方法
    if (prevStage === 'A') {
      console.log(`[StageTransitionTrigger] 检测到从A阶段转换，执行A阶段总结`);
      try {
        console.log(`[StageTransitionTrigger] 开始调用StagedMemory.summarizeAStage`);
        const memoryItem = await this.stagedMemory.summarizeAStage(conversation);
        
        if (memoryItem) {
          console.log(`[StageTransitionTrigger] A阶段记忆总结成功`);
          console.log(`[StageTransitionTrigger] 记忆总结: ${memoryItem.summary}`);
          console.log(`[StageTransitionTrigger] 关键词: ${memoryItem.keywords.join(', ')}`);
        } else {
          console.log(`[StageTransitionTrigger] A阶段没有生成记忆总结`);
        }
      } catch (error) {
        console.error(`[StageTransitionTrigger] A阶段总结过程出错:`, error);
      }
      return;
    }
    
    // 检查是否为不需要总结的阶段（从A阶段移除，因为已有专门处理）
    if (this.skipStageSummary.includes(prevStage)) {
      console.log(`[StageTransitionTrigger] 跳过阶段${prevStage}记忆总结，因为此阶段不需要总结`);
      return;
    }
    
    // 特殊阶段转换处理：从B2阶段离开应该总结整个B阶段(B1+B2)
    const isLeavingBStage = (prevStage === 'B2' && currentStage === 'C1');
    if (isLeavingBStage) {
      console.log(`[StageTransitionTrigger] 检测到离开B阶段，将执行B阶段整体总结`);
      await this.summarizeLastStage(conversation, prevStage, currentStage);
      return;
    }
    
    // 特殊阶段转换处理：C1与C2之间的循环总结
    const isInCLoop = (
      (prevStage === 'C1' && currentStage === 'C2') ||
      (prevStage === 'C2' && currentStage === 'C1')
    );
    
    if (isInCLoop) {
      // 当从C2回到C1时，表示完成了一个元素的添加，此时进行总结
      if (prevStage === 'C2' && currentStage === 'C1') {
        console.log(`[StageTransitionTrigger] 检测到从C2回到C1，总结当前元素添加`);
        await this.summarizeLastStage(conversation, prevStage, currentStage);
      } else {
        console.log(`[StageTransitionTrigger] 跳过C1->C2的总结，等待元素描述完成`);
      }
      return;
    }
    
    // 完成创作阶段的特殊处理
    if (currentStage === 'D') {
      console.log(`[StageTransitionTrigger] 检测到进入完成阶段D，总结前一阶段并准备最终总结`);
      await this.summarizeLastStage(conversation, prevStage, currentStage);
      
      // 可以在这里添加生成整个创作过程的完整总结的代码
      return;
    }
    
    // 默认处理：总结前一阶段的记忆
    await this.summarizeLastStage(conversation, prevStage, currentStage);
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