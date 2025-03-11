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
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
        } as OllamaRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as OllamaResponse;
      return data.message.content;
    } catch (error) {
      console.error('Error calling Ollama:', error);
      throw error;
    }
  }
} 