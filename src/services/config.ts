export const AI_SERVICES = {
  OLLAMA: {
    BASE_URL: 'http://10.0.1.88:11434',
    MODEL: 'deepseek-r1:32b',
  },
  COMFYUI: {
    BASE_URL: '/api/comfyui',
  },
} as const;

export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  GENERATE_IMAGE: '/api/generate-image',
  HISTORY: '/api/history',
} as const; 