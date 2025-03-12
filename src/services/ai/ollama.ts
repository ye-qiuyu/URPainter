import { AI_SERVICES } from '../config';
import type { OllamaMessage, OllamaRequest, OllamaResponse } from '@/types/ai';

export class OllamaService {
  private static instance: OllamaService;
  private baseUrl: string;
  private model: string;

  private constructor() {
    this.baseUrl = AI_SERVICES.OLLAMA.BASE_URL;
    this.model = AI_SERVICES.OLLAMA.MODEL;
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  async chat(messages: OllamaMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: messages[messages.length - 1].content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 读取流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      let fullResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 将 Uint8Array 转换为文本
        const chunk = new TextDecoder().decode(value);
        // 处理每个JSON行
        const lines = chunk.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response && !data.done) {
              fullResponse += data.response;
            }
          } catch (e) {
            console.error('解析响应出错:', e);
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error calling Ollama:', error);
      throw error;
    }
  }
} 