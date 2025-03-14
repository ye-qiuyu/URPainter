import { ThemeCategory } from '@/types/conversation';
import { ThemeDetector } from './detector';

export class ThemeManager {
  private static instance: ThemeManager;
  private detector: ThemeDetector;
  
  private constructor() {
    this.detector = new ThemeDetector();
  }
  
  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }
  
  // 获取主题相关信息
  getThemeInfo(theme: ThemeCategory): any {
    // 返回主题相关的信息，如关键词、建议等
    return {
      name: theme,
      displayName: this.getThemeDisplayName(theme),
      keywords: this.detector.getThemeKeywords(theme),
      suggestions: this.getThemeSuggestions(theme)
    };
  }
  
  // 获取主题显示名称
  getThemeDisplayName(theme: ThemeCategory): string {
    const displayNames: Record<ThemeCategory, string> = {
      'SPACE': '太空探险',
      'ANIMALS': '动物世界',
      'FANTASY': '奇幻世界',
      'VEHICLES': '交通工具',
      'DEFAULT': '创意世界'
    };
    
    return displayNames[theme] || displayNames['DEFAULT'];
  }
  
  // 获取主题创作建议
  private getThemeSuggestions(theme: ThemeCategory): string[] {
    const suggestionsByTheme: Record<ThemeCategory, string[]> = {
      'SPACE': ['太空探险', '月球基地', '外星朋友', '宇宙飞船', '星际旅行'],
      'ANIMALS': ['动物园', '海底世界', '丛林冒险', '宠物派对', '农场生活'],
      'FANTASY': ['魔法城堡', '龙骑士', '精灵森林', '魔法学校', '公主王子'],
      'VEHICLES': ['赛车比赛', '飞行冒险', '海上航行', '太空交通', '未来交通'],
      'DEFAULT': ['冒险故事', '神奇世界', '梦想之旅', '奇妙发现', '超级英雄']
    };
    
    return suggestionsByTheme[theme] || suggestionsByTheme['DEFAULT'];
  }
  
  // 检测主题
  async detectTheme(messages: any[]): Promise<ThemeCategory | undefined> {
    return this.detector.detectTheme(messages);
  }
}