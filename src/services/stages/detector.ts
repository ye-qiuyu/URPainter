import { Message, ConversationStage, ThemeCategory } from '@/types/conversation';
import { OllamaService } from '../ai/ollama';

export class StageDetector {
  private ollamaService: OllamaService;
  
  constructor() {
    this.ollamaService = OllamaService.getInstance();
  }
  
  // 检查是否应该转换阶段
  async shouldTransition(
    messages: Message[],
    currentStage: ConversationStage,
    detectedTheme?: ThemeCategory
  ): Promise<boolean> {
    console.log(`[StageDetector] 检查阶段转换条件 - 当前阶段: ${currentStage}, 主题: ${detectedTheme || '未检测'}`);
    console.log(`[StageDetector] 消息数量: ${messages.length}`);
    
    // 获取最近的几条消息
    const recentMessages = messages.slice(-5);
    
    // 构建阶段转换检测提示词
    const prompt = this.buildStageTransitionPrompt(
      recentMessages,
      currentStage,
      detectedTheme
    );
    
    console.log(`[StageDetector] 发送阶段转换检测提示词`);
    
    // 调用LLM判断是否应该转换
    const response = await this.ollamaService.chat([
      { role: 'user', content: prompt }
    ]);
    
    // 解析响应
    const shouldTransition = response.includes('TRANSITION_TO_NEXT_STAGE');
    console.log(`[StageDetector] 检测结果: ${shouldTransition ? '应该转换' : '保持当前阶段'}`);
    console.log(`[StageDetector] 原始响应: ${response.substring(0, 100)}...`);
    
    return shouldTransition;
  }
  
  // 构建阶段转换检测提示词
  private buildStageTransitionPrompt(
    messages: Message[],
    currentStage: ConversationStage,
    detectedTheme?: ThemeCategory
  ): string {
    console.log(`[StageDetector] 检查阶段${currentStage}转换条件，消息总数: ${messages.length}`);
    if (messages.length >= 2) {
      console.log(`[StageDetector] 最近消息: "${messages.slice(-2).map(m => `${m.role}: ${m.content}`).join(' -> ')}"`);
    }
    
    // 根据当前阶段构建特定的转换条件
    let transitionConditions = '';
    
    switch(currentStage) {
      case 'A':
        transitionConditions = `
1. 对话是否已经形成明确的故事/绘画主题？
2. 是否已经确定了故事的主要内容（谁在做什么）？
3. 儿童是否表示了充分的兴趣或积极反馈？

注意：应该形成的是一个完整的故事场景，而不仅仅是一个单独的物体或角色。例如"宇航员在月球上探险"而不仅仅是"宇航员"。
        `;
        break;
      
      case 'B':
        transitionConditions = `
1. 用户是否描述了主角的至少2-3个特征？（如外观、颜色、大小、特殊能力等）
2. 我们是否已经收集了足够多的细节来生成一个丰富的主角形象？

注意：简单判断用户是否提供了关于主角的足够细节即可。要求至少有2-3个不同方面的描述。
        `;
        break;
      
      case 'C':
        transitionConditions = `
1. 用户是否提及了任何与主角相关的辅助元素或场景元素？

注意：只要用户提到了任何除主角以外的元素（如其他角色、物品、环境等），就可以转换到下一阶段。
        `;
        break;
      
      case 'D':
        transitionConditions = `
1. 用户是否表达了对当前创作的满意或完成的意愿？
2. 或对话是否已进行了足够轮数？

注意：如果用户表示"完成了"、"满意了"或类似意思，或者对话已经进行了较多轮，就可以转换到最终阶段。
        `;
        break;
      
      case 'E':
        // E是最终阶段，不需要转换
        transitionConditions = `
1. 这是最终阶段，不需要转换。
        `;
        break;
    }
    
    return `
你是URPainter的阶段管理助手。你需要判断当前对话是否应该从${currentStage}阶段转换到下一个阶段。

当前主题: ${detectedTheme || '尚未检测到'}

最近的对话:
${messages.map(m => `${m.role === 'user' ? '用户' : 'AI助手'}: ${m.content}`).join('\n')}

转换条件:
${transitionConditions}

[内部思考] 基于以上条件评估是否应该转换阶段:
1. 分析最近的对话内容
2. 检查是否满足转换条件
3. 做出判断

如果应该转换到下一阶段，请输出：TRANSITION_TO_NEXT_STAGE
否则输出：STAY_IN_CURRENT_STAGE
    `;
  }
} 