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
export interface ComfyUIWorkflow {
  // 工作流JSON结构
  [key: string]: {
    inputs: {
      [key: string]: any;
    };
    // 其他工作流相关字段
  };
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