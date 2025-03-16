import { PromptBuilder as BasePromptBuilder } from '@/prompts/builder';
import { Message, ConversationStage, ThemeCategory } from '@/types/conversation';
import { CreativeElements } from '../memory/storage';

export class PromptBuilderService {
  private static instance: PromptBuilderService;
  private baseBuilder: BasePromptBuilder;
  
  private constructor() {
    this.baseBuilder = new BasePromptBuilder();
  }
  
  public static getInstance(): PromptBuilderService {
    if (!PromptBuilderService.instance) {
      PromptBuilderService.instance = new PromptBuilderService();
    }
    return PromptBuilderService.instance;
  }
  
  /**
   * 构建对话提示词
   * 
   * @param userMessage 用户消息
   * @param conversationId 会话ID
   * @param currentStage 当前阶段
   * @param detectedTheme 检测到的主题
   * @param formattedMemory 格式化的记忆文本
   * @param creativeElements 创意元素
   * @returns 构建的提示词
   */
  buildConversationPrompt(
    userMessage: string,
    conversationId: string,
    currentStage: ConversationStage,
    detectedTheme?: ThemeCategory,
    formattedMemory: string = '',
    creativeElements: Partial<CreativeElements> = {}
  ): string {
    console.log(`构建提示词 - 会话ID: ${conversationId}, 阶段: ${currentStage}`);
    
    // 构建提示词状态
    const promptState = {
      currentStage,
      themeDetected: detectedTheme,
      conversationId
    };
    
    // 使用基础提示词构建器构建完整提示词
    return this.baseBuilder.buildFullPrompt(
      promptState,
      userMessage,
      formattedMemory,
      creativeElements
    );
  }
  
  /**
   * 构建图像生成提示词
   * 
   * @param conversationId 会话ID
   * @param detectedTheme 检测到的主题
   * @param creativeElements 创意元素
   * @returns 构建的图像生成提示词
   */
  buildImageGenerationPrompt(
    conversationId: string,
    detectedTheme?: ThemeCategory,
    creativeElements: Partial<CreativeElements> = {}
  ): string {
    // 构建基础提示词
    let prompt = '儿童友好的插图，';
    
    // 添加主题
    if (detectedTheme) {
      const themeKeywords = this.getThemeKeywords(detectedTheme);
      prompt += `${themeKeywords.join(', ')}, `;
    }
    
    // 添加创作元素
    if (creativeElements.mainCharacter) {
      prompt += `主角: ${creativeElements.mainCharacter}, `;
    }
    
    if (creativeElements.theme) {
      prompt += `主题: ${creativeElements.theme}, `;
    }
    
    if (creativeElements.supportElements && creativeElements.supportElements.length > 0) {
      prompt += `其他元素: ${creativeElements.supportElements.join(', ')}, `;
    }
    
    // 添加样式
    prompt += '简单的线条, 明亮的颜色, 适合儿童的风格, 无文字';
    
    return prompt;
  }
  
  /**
   * 获取主题关键词
   * 
   * @param theme 主题类别
   * @returns 主题关键词列表
   */
  private getThemeKeywords(theme: ThemeCategory): string[] {
    const keywordsByTheme: Record<ThemeCategory, string[]> = {
      'SPACE': ['太空', '宇宙', '星球', '宇航员'],
      'ANIMALS': ['动物', '可爱', '自然', '友好'],
      'FANTASY': ['奇幻', '魔法', '童话', '想象'],
      'VEHICLES': ['交通工具', '车辆', '运输', '旅行'],
      'DEFAULT': ['创意', '想象', '冒险', '故事']
    };
    
    return keywordsByTheme[theme] || keywordsByTheme['DEFAULT'];
  }
} 