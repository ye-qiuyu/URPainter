// AI服务
import { OllamaService } from './ai/ollama';
import { ComfyUIService } from './ai/comfyui';
import { AITextService } from './ai/aiTextService';
import { AIImageService } from './ai/aiImageService';

// 记忆服务
import { MemoryManager } from './memory/manager';
import { MemoryFormatter } from './memory/formatter';
import { MemoryStorage, CreativeElements } from './memory/storage';

// 阶段服务
import { StageManager } from './stages/manager';
import { StageDetector } from './stages/detector';

// 主题服务
import { ThemeManager } from './themes/manager';
import { ThemeDetector } from './themes/detector';

// 对话服务
import { ConversationManager } from './conversation/manager';

// 提示词服务
import { PromptBuilderService } from './prompt/builder';

// 导出所有服务
export {
  // AI服务
  OllamaService,
  ComfyUIService,
  AITextService,
  AIImageService,
  
  // 记忆服务
  MemoryManager,
  MemoryFormatter,
  MemoryStorage,
  
  // 阶段服务
  StageManager,
  StageDetector,
  
  // 主题服务
  ThemeManager,
  ThemeDetector,
  
  // 对话服务
  ConversationManager,
  
  // 提示词服务
  PromptBuilderService
};

// 导出类型
export type { CreativeElements }; 