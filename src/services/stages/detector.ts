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
    // 获取最近的几条消息
    const recentMessages = messages.slice(-5);
    
    // 构建阶段转换检测提示词
    const prompt = this.buildStageTransitionPrompt(
      recentMessages,
      currentStage,
      detectedTheme
    );
    
    // 调用LLM判断是否应该转换
    const response = await this.ollamaService.chat([
      { role: 'user', content: prompt }
    ]);
    
    // 解析响应
    return response.includes('TRANSITION_TO_NEXT_STAGE');
  }
  
  // 构建阶段转换检测提示词
  private buildStageTransitionPrompt(
    messages: Message[],
    currentStage: ConversationStage,
    detectedTheme?: ThemeCategory
  ): string {
    // 根据当前阶段构建特定的转换条件
    let transitionConditions = '';
    
    switch(currentStage) {
      case 'A':
        transitionConditions = `
1. 用户是否表达了明确的兴趣方向？
2. 是否已经检测到可能的主题类别？
3. 对话是否已经进行了至少2轮？
        `;
        break;
      
      case 'B':
        transitionConditions = `
1. 用户是否明确表达了想要创作的具体主题？
2. 主题是否具体且有创意？
3. 用户是否对主题表现出认可和兴趣？
        `;
        break;
      
      case 'C':
        transitionConditions = `
1. 用户是否已经描述了主角的关键特征？
2. 主角是否有足够的细节可以开始绘制？
3. 用户是否表现出对主角设计的满意？
        `;
        break;
      
      case 'D':
        transitionConditions = `
1. 用户是否已经通过联想添加了额外元素？
2. 这些元素是否与主角有合理的联系？
3. 用户是否表现出想要继续添加更多元素或完善画面？
        `;
        break;
      
      case 'E':
        transitionConditions = `
1. 用户是否已经添加了背景或环境元素？
2. 画面是否已经有了足够的细节和完整性？
3. 用户是否表现出对整体画面的满意？
        `;
        break;
      
      case 'F':
        // F是最终阶段，不需要转换
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