import { Message } from '@/types/conversation';

export class OllamaService {
  private static instance: OllamaService;
  private baseUrl: string;
  private model: string;
  private useMockResponse: boolean;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://10.0.1.110:11434';
    this.model = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'qwen2.5:14b';
    this.useMockResponse = process.env.NEXT_PUBLIC_USE_MOCK_AI === 'true';
    
    console.log('[OllamaService] 初始化', { 
      baseUrl: this.baseUrl, 
      model: this.model,
      useMockResponse: this.useMockResponse
    });
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
      
      // 如果启用了模拟响应，则返回模拟数据
      if (this.useMockResponse) {
        console.log('[OllamaService] 使用模拟响应');
        return this.getMockResponse(prompt);
      }
      
      console.log(`[OllamaService] 发送请求到 ${this.baseUrl}/api/generate`);
      
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
      console.error('[OllamaService] 服务调用失败:', error);
      
      // 如果连接失败，返回模拟响应
      if (error instanceof Error && error.message.includes('failed to fetch')) {
        console.log('[OllamaService] 连接失败，使用模拟响应');
        return this.getMockResponse(messages[messages.length - 1]?.content || '');
      }
      
      return '模型调用失败，请稍后再试';
    }
  }

  // 发送生成请求
  async generate(prompt: string): Promise<string> {
    try {
      // 如果启用了模拟响应，则返回模拟数据
      if (this.useMockResponse) {
        console.log('[OllamaService] 使用模拟响应');
        return this.getMockResponse(prompt);
      }
      
      console.log(`[OllamaService] 发送请求到 ${this.baseUrl}/api/generate`);
      
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
      console.error('[OllamaService] 服务调用失败:', error);
      
      // 如果连接失败，返回模拟响应
      if (error instanceof Error && error.message.includes('failed to fetch')) {
        console.log('[OllamaService] 连接失败，使用模拟响应');
        return this.getMockResponse(prompt);
      }
      
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
  
  // 获取模拟响应
  private getMockResponse(lastMessage: string): string {
    // 简单的模拟响应，根据最后一条消息生成
    const responses = [
      `我理解您的问题是关于"${lastMessage.substring(0, 20)}..."。这是一个很好的问题！在我看来，这涉及到几个方面...`,
      `您提到的"${lastMessage.substring(0, 20)}..."很有趣。我认为可以从以下角度思考...`,
      `关于"${lastMessage.substring(0, 20)}..."，我有一些想法可以分享...`,
      `谢谢您的提问！关于"${lastMessage.substring(0, 20)}..."，我的回答是...`
    ];
    
    // 随机选择一个响应
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }
}