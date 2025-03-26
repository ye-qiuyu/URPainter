import { Conversation, ConversationStage } from '@/types/conversation';
import { StageDetector } from './detector';
import { AITextService } from '../ai/aiTextService';

export class StageManager {
  private static instance: StageManager;
  private detector: StageDetector;
  private aiTextService: AITextService;
  
  private constructor() {
    this.detector = new StageDetector();
    this.aiTextService = AITextService.getInstance();
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
    
    // 特殊处理：如果当前是B1阶段且已有回复，自动转到B2
    if (currentStage === 'B1') {
      // 获取最近的AI消息
      const recentMessages = conversation.messages.slice(-4); // 最近4条消息
      const aiMessages = recentMessages.filter(m => m.role === 'assistant');
      
      // 检查是否存在包含总结句式的AI消息
      if (aiMessages.length > 0 && aiMessages.some(m => m.content.includes('那么，我们就来画'))) {
        console.log(`[StageManager] 从B1自动转换到B2阶段`);
        return 'B2';
      }
    }
    
    // 特殊处理：C2阶段的转换逻辑，默认转回C1除非明确表示完成
    if (currentStage === 'C2') {
      // 获取最近的用户消息
      const recentMessages = conversation.messages.slice(-3); // 最近3条消息
      const userMessages = recentMessages.filter(m => m.role === 'user');
      
      // 检查是否表达了结束意图 (简单关键词匹配，避免额外LLM调用)
      if (userMessages.length > 0) {
        const lastUserMsg = userMessages[userMessages.length - 1].content.toLowerCase();
        // 扩展完成意图关键词列表
        if (lastUserMsg.includes('完成') || lastUserMsg.includes('就这些') || 
            lastUserMsg.includes('好了') || lastUserMsg.includes('结束') || 
            lastUserMsg.includes('满意') || lastUserMsg.includes('可以了') ||
            lastUserMsg.includes('画好了') || lastUserMsg.includes('不要了') ||
            lastUserMsg.includes('够了') || lastUserMsg.includes('不加了')) {
          console.log(`[StageManager] 用户表达完成意图，从C2转到D阶段`);
          return 'D';
        } else {
          // 默认行为：总是返回C1继续循环(无需额外LLM调用)
          console.log(`[StageManager] 默认从C2转回C1阶段继续添加元素`);
          return 'C1';
        }
      }
      
      // 如果没有最近用户消息，默认继续循环
      return 'C1';
    }
    
    // 检查是否应该转换到下一个阶段（C2阶段已经在StageDetector中特殊处理，不会触发LLM调用）
    const shouldTransition = await this.detector.shouldTransition(
      conversation.messages,
      currentStage,
      conversation.detectedTheme
    );
    
    console.log(`[StageManager] 转换判断结果: ${shouldTransition ? '应该转换' : '保持当前阶段'}`);
    
    // 如果从A阶段应该转换到B1阶段
    if (shouldTransition && currentStage === 'A') {
      console.log(`[StageManager] 阶段A满足转换条件，准备转换到阶段B1`);
      
      // 确保creativeElements对象存在
      if (!conversation.creativeElements) {
        conversation.creativeElements = {};
      }
      
      // 注意：不再在这里提取创作元素
      // 创作元素的提取已经移动到StagedMemory.summarizeAStage方法中
      // 该方法会在StageTransitionTrigger中的handleSpecialStageTransition中被调用
      
      // 直接返回B1阶段
      console.log(`[StageManager] 正式转换到阶段B1`);
      return 'B1';
    }
    
    // 从B2阶段转换到C1阶段
    if (shouldTransition && currentStage === 'B2') {
      console.log(`[StageManager] 阶段B2满足转换条件，准备转换到阶段C1`);
      return 'C1';
    }
    
    // 从C1阶段转换到C2阶段，需要LLM确认用户提出了具体元素
    if (shouldTransition && currentStage === 'C1') {
      console.log(`[StageManager] 阶段C1满足转换条件，准备转换到阶段C2`);
      return 'C2';
    }
    
    // 其他阶段正常转换
    if (shouldTransition) {
      const nextStage = this.getNextStage(currentStage);
      console.log(`[StageManager] 确定下一阶段: ${currentStage} -> ${nextStage}`);
      
      return nextStage;
    }
    
    console.log(`[StageManager] 保持当前阶段: ${currentStage}`);
    return currentStage;
  }
  
  // 获取下一个阶段
  private getNextStage(currentStage: ConversationStage): ConversationStage {
    const stageSequence: ConversationStage[] = ['A', 'B1', 'B2', 'C1', 'C2', 'D'];
    const currentIndex = stageSequence.indexOf(currentStage);
    
    if (currentIndex < 0 || currentIndex >= stageSequence.length - 1) {
      return currentStage;
    }
    
    return stageSequence[currentIndex + 1];
  }
  
  // 获取当前阶段的描述
  getStageDescription(stage: ConversationStage): string {
    const descriptions: Record<ConversationStage, string> = {
      'A': '引导主题确立',
      'B1': '绘制主角元素(首次)',
      'B2': '绘制主角元素(细节)',
      'C1': '联想阶段',
      'C2': '绘制其他元素',
      'D': '完成创作'
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