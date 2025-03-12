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
      console.log('开始请求Ollama服务:', {
        url: `${this.baseUrl}/api/generate`,
        model: this.model,
        prompt: messages[messages.length - 1].content
      });

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
      let buffer = ''; // 用于存储不完整的JSON字符串

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 将 Uint8Array 转换为文本
        const chunk = new TextDecoder().decode(value);
        buffer += chunk;

        // 尝试按行分割并处理完整的JSON
        const lines = buffer.split('\n');
        // 保留最后一个可能不完整的行
        buffer = lines.pop() || '';

        // 处理完整的行
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              console.log('收到响应片段:', data);
              if (data.response && !data.done) {
                fullResponse += data.response;
              }
            } catch (e) {
              console.warn('解析响应行失败:', { line, error: e });
              // 继续处理下一行，不中断整个过程
            }
          }
        }
      }

      // 处理缓冲区中剩余的数据
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.response && !data.done) {
            fullResponse += data.response;
          }
        } catch (e) {
          console.warn('解析最后的缓冲区失败:', { buffer, error: e });
        }
      }

      console.log('完成响应处理，总长度:', fullResponse.length);
      return fullResponse;
    } catch (error) {
      console.error('Ollama服务错误:', error);
      throw error;
    }
  }
} 