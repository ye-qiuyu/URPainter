// Ollama 相关类型
export interface OllamaMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
}

export interface OllamaResponse {
  message: {
    role: 'assistant';
    content: string;
  };
}

// ComfyUI 相关类型
export interface ComfyUINode {
  inputs: {
    [key: string]: any;
  };
  class_type: string;
  _meta?: {
    title?: string;
  };
}

export interface ComfyUIWorkflow {
  [key: string]: ComfyUINode;
}

export interface ComfyUIPromptResponse {
  prompt_id: string;
  // 其他响应字段
}

export interface ComfyUIHistoryResponse {
  [prompt_id: string]: {
    outputs: {
      [node_id: string]: {
        images: Array<{
          filename: string;
          // 其他图像相关字段
        }>;
      };
    };
  };
} 