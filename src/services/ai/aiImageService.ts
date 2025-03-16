import { ComfyUIService } from './comfyui';

/**
 * AIImageService - 统一管理AI图像生成服务
 * 
 * 这个服务封装了与图像生成AI模型的交互，提供了一个统一的接口。
 * 目前可以使用ComfyUIService作为底层实现，未来可以轻松切换到其他图像生成服务。
 * 
 * TODO: 实现此服务以统一管理所有图像生成相关功能
 */
export class AIImageService {
  private static instance: AIImageService;
  private comfyUIService: ComfyUIService;
  
  private constructor() {
    // 初始化图像生成服务
    this.comfyUIService = ComfyUIService.getInstance();
    console.log('[AIImageService] 初始化完成');
  }
  
  /**
   * 获取AIImageService的单例实例
   */
  public static getInstance(): AIImageService {
    if (!AIImageService.instance) {
      AIImageService.instance = new AIImageService();
    }
    return AIImageService.instance;
  }
  
  /**
   * 生成图像
   * 
   * @param prompt 图像生成提示词
   * @param options 其他选项，如负面提示词、会话ID等
   * @returns 生成的图像URL
   */
  async generateImage(prompt: string, options?: {
    negativePrompt?: string;
    sessionId?: string;
    useMock?: boolean;
  }): Promise<string> {
    try {
      console.log('[AIImageService] 开始生成图像', { prompt, options });
      
      // 提取选项
      const negativePrompt = options?.negativePrompt || '';
      const sessionId = options?.sessionId || 'default-session';
      const useMock = options?.useMock || false;
      
      // 如果使用模拟数据，返回一个默认图像URL
      if (useMock) {
        console.log('[AIImageService] 使用模拟图像');
        return 'https://via.placeholder.com/512x512.png?text=AI+Generated+Image';
      }
      
      // 调用ComfyUI服务生成图像
      const imageUrl = await this.comfyUIService.generateImage(prompt, negativePrompt, sessionId);
      
      if (!imageUrl) {
        console.error('[AIImageService] 图像生成失败，返回默认图像');
        return 'https://via.placeholder.com/512x512.png?text=Generation+Failed';
      }
      
      console.log('[AIImageService] 图像生成成功', { imageUrl });
      return imageUrl;
    } catch (error) {
      console.error('[AIImageService] 图像生成出错:', error);
      // 出错时返回一个错误图像
      return 'https://via.placeholder.com/512x512.png?text=Error';
    }
  }
} 