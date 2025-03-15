import { Message } from '@/types/conversation';

export class OllamaService {
  private static instance: OllamaService;
  private baseUrl: string;
  private model: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434';
    this.model = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama3';
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  // 发送聊天请求
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    try {
      // 从消息数组中提取最后一条用户消息作为提示词
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      const prompt = lastUserMessage ? lastUserMessage.content : '';
      
      if (!prompt) {
        return '无法获取有效的用户消息';
      }
      
      // 使用generate端点
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error('Ollama 服务调用失败:', error);
      return '模型调用失败，请稍后再试';
    }
  }

  // 发送生成请求
  async generate(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error('Ollama 服务调用失败:', error);
      return '模型调用失败，请稍后再试';
    }
  }

  // 设置模型
  setModel(model: string): void {
    this.model = model;
  }

  // 获取当前模型
  getModel(): string {
    return this.model;
  }
}