import { AI_SERVICES } from '../config';
import type { ComfyUIWorkflow, ComfyUIPromptResponse, ComfyUIHistoryResponse } from '@/types/ai';

export class ComfyUIService {
  private static instance: ComfyUIService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = AI_SERVICES.COMFYUI.BASE_URL;
  }

  public static getInstance(): ComfyUIService {
    if (!ComfyUIService.instance) {
      ComfyUIService.instance = new ComfyUIService();
    }
    return ComfyUIService.instance;
  }

  async generateImage(
    workflow: ComfyUIWorkflow,
    prompt: string,
    sessionId: string
  ): Promise<string> {
    try {
      // 1. 提交生成任务
      const promptResponse = await fetch(`${this.baseUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: {
            ...workflow,
            '6': { // 假设节点6是文本提示输入
              inputs: {
                text: prompt,
              },
            },
          },
          client_id: sessionId,
        }),
      });

      if (!promptResponse.ok) {
        throw new Error(`HTTP error! status: ${promptResponse.status}`);
      }

      const { prompt_id } = await promptResponse.json() as ComfyUIPromptResponse;

      // 2. 轮询检查任务状态
      let imageFilename: string | null = null;
      while (!imageFilename) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const historyResponse = await fetch(
          `${this.baseUrl}/history/${prompt_id}`
        );
        
        if (!historyResponse.ok) {
          throw new Error(`HTTP error! status: ${historyResponse.status}`);
        }

        const history = await historyResponse.json() as ComfyUIHistoryResponse;
        
        if (history[prompt_id]?.outputs?.['9']?.images?.[0]) {
          imageFilename = history[prompt_id].outputs['9'].images[0].filename;
        }
      }

      // 3. 返回图片URL
      return `${this.baseUrl}/view?filename=${imageFilename}&type=output`;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }
} 