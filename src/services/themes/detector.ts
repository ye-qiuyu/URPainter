import { Message, ThemeCategory } from '@/types/conversation';
import { OllamaService } from '../ai/ollama';

export class ThemeDetector {
  private ollamaService: OllamaService;
  
  constructor() {
    this.ollamaService = OllamaService.getInstance();
  }
  
  // 检测主题
  async detectTheme(messages: Message[]): Promise<ThemeCategory | undefined> {
    // 如果消息太少，返回undefined
    if (messages.length < 2) return undefined;
    
    // 构建主题检测提示词
    const prompt = this.buildThemeDetectionPrompt(messages);
    
    // 调用LLM检测主题
    const response = await this.ollamaService.chat([
      { role: 'user', content: prompt }
    ]);
    
    // 解析响应
    return this.parseThemeResponse(response);
  }
  
  // 构建主题检测提示词
  private buildThemeDetectionPrompt(messages: Message[]): string {
    return `
你是URPainter的主题检测助手。你需要分析对话内容，判断儿童最感兴趣的创作主题类别。

对话内容:
${messages.map(m => `${m.role === 'user' ? '用户' : 'AI助手'}: ${m.content}`).join('\n')}

请从以下类别中选择一个最匹配的:
- SPACE (太空探险)
- ANIMALS (动物世界)
- FANTASY (奇幻世界)
- VEHICLES (交通工具)
- DEFAULT (其他/未明确)

只返回一个类别代码，不要有其他内容。例如: ANIMALS
    `;
  }
  
  // 解析主题响应
  private parseThemeResponse(response: string): ThemeCategory | undefined {
    const validThemes: ThemeCategory[] = ['SPACE', 'ANIMALS', 'FANTASY', 'VEHICLES', 'DEFAULT'];
    
    for (const theme of validThemes) {
      if (response.includes(theme)) {
        return theme;
      }
    }
    
    return undefined;
  }
  
  // 获取主题关键词
  getThemeKeywords(theme: ThemeCategory): string[] {
    const keywordsByTheme: Record<ThemeCategory, string[]> = {
      'SPACE': ['宇宙', '行星', '宇航员', '火箭', '星球', '外星人', '太空'],
      'ANIMALS': ['动物', '森林', '海洋', '宠物', '野生', '狗', '猫', '鸟', '鱼'],
      'FANTASY': ['魔法', '城堡', '龙', '精灵', '公主', '王子', '魔法师', '巫师'],
      'VEHICLES': ['汽车', '飞机', '火车', '船', '交通', '赛车', '宇宙飞船'],
      'DEFAULT': ['创意', '想象', '故事', '冒险', '梦想', '游戏', '朋友']
    };
    
    return keywordsByTheme[theme] || keywordsByTheme['DEFAULT'];
  }
} 