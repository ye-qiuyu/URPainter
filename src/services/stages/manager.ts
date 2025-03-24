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
      
      // 特殊处理：从A阶段到B阶段时，使用LLM提取主角和主题信息
      if (currentStage === 'A' && nextStage === 'B') {
        try {
          await this.extractCreativeElementsWithLLM(conversation);
        } catch (error) {
          console.error('[StageManager] 提取创作元素失败:', error);
          // 使用备选方法提取主角
          this.fallbackMainCharacterExtraction(conversation);
        }
      }
      
      return nextStage;
    }
    
    console.log(`[StageManager] 保持当前阶段: ${currentStage}`);
    return currentStage;
  }
  
  // 使用LLM提取创作元素（主角、主题、辅助元素）
  private async extractCreativeElementsWithLLM(conversation: Conversation): Promise<void> {
    console.log(`[StageManager] 开始使用LLM提取创作元素`);
    
    // 获取所有对话历史，限制最近10条消息以避免过长
    const dialogHistory = conversation.messages
      .slice(-10)
      .map(m => `${m.role === 'user' ? '儿童' : 'AI'}: ${m.content}`)
      .join('\n');
    
    // 构建提取创作元素的提示词
    const prompt = `
你是一位儿童绘画分析师，需要从以下4-6岁儿童与AI的对话中提取关键创作信息。

对话历史:
${dialogHistory}

根据上面的对话，请分析:
1. 这个故事或绘画的主题是什么？（简洁描述整体创作方向）
2. 这个故事中的主角(主要角色或物体)是什么？（提取核心角色或物体名称）
3. 可能的辅助元素有哪些？（提取故事中除主角外的其他元素）

只需返回以下JSON格式，不要有其他任何文字:
{
  "theme": "故事/绘画主题",
  "mainCharacter": "主角名称",
  "supportElements": ["辅助元素1", "辅助元素2"]
}
    `;
    
    // 调用LLM提取主角信息
    console.log(`[StageManager] 发送LLM提取创作元素的请求`);
    const response = await this.aiTextService.getResponse(prompt);
    
    try {
      // 尝试解析JSON响应
      console.log(`[StageManager] 解析LLM响应`);
      let extractedInfo;
      
      try {
        // 尝试直接解析JSON
        extractedInfo = JSON.parse(response);
      } catch (parseError) {
        // 如果直接解析失败，尝试从文本中提取JSON部分
        console.log(`[StageManager] 直接解析JSON失败，尝试提取JSON部分`);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedInfo = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('无法从响应中提取JSON');
        }
      }
      
      // 更新创意元素
      if (!conversation.creativeElements) {
        conversation.creativeElements = {};
      }
      
      if (extractedInfo.mainCharacter) {
        conversation.creativeElements.mainCharacter = extractedInfo.mainCharacter;
        console.log(`[StageManager] LLM提取到主角: ${extractedInfo.mainCharacter}`);
      }
      
      if (extractedInfo.theme) {
        conversation.creativeElements.theme = extractedInfo.theme;
        console.log(`[StageManager] LLM提取到主题: ${extractedInfo.theme}`);
      }
      
      if (extractedInfo.supportElements && Array.isArray(extractedInfo.supportElements)) {
        conversation.creativeElements.supportElements = extractedInfo.supportElements;
        console.log(`[StageManager] LLM提取到辅助元素: ${extractedInfo.supportElements.join(', ')}`);
      }
    } catch (error) {
      console.error('[StageManager] 解析LLM响应失败:', error);
      console.error('[StageManager] 原始响应:', response);
      // 解析失败，抛出异常让调用者处理
      throw new Error('解析LLM响应失败');
    }
  }
  
  // 备选的主角提取方法（简单规则）
  private fallbackMainCharacterExtraction(conversation: Conversation): void {
    console.log(`[StageManager] 使用备选方法提取主角信息`);
    
    try {
      // 获取最近的用户消息
      const recentUserMessages = conversation.messages
        .filter(m => m.role === 'user')
        .slice(-3);
      
      if (recentUserMessages.length > 0) {
        // 简单提取最后一条用户消息中可能的主角名词
        const lastUserMessage = recentUserMessages[recentUserMessages.length - 1].content;
        
        // 简单处理：假设最近的名词可能是主角
        const potentialMainCharacter = this.extractMainCharacter(lastUserMessage);
        
        if (potentialMainCharacter) {
          // 保存主角信息到conversation对象
          if (!conversation.creativeElements) {
            conversation.creativeElements = {};
          }
          
          conversation.creativeElements.mainCharacter = potentialMainCharacter;
          console.log(`[StageManager] 备选方法提取到主角: ${potentialMainCharacter}`);
        }
      }
    } catch (error) {
      console.error('[StageManager] 备选方法提取主角信息失败:', error);
    }
  }
  
  // 提取主角信息的辅助方法（简单规则）
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
    const stageSequence: ConversationStage[] = ['A', 'B', 'C', 'D', 'E'];
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
      'B': '绘制主角元素',
      'C': '联想阶段',
      'D': '绘制其他元素',
      'E': '完成创作'
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