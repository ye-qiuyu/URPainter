import { ConversationStage, ThemeCategory } from '@/types/conversation';

// 提示词状态
export interface PromptState {
  currentStage: ConversationStage;
  themeDetected?: ThemeCategory;
  conversationId: string;
}

// 提示词架构层标签
export type PromptTag = 'persona' | 'context' | 'task' | 'format' | 'exemplar' | 'tone';

// 提示词功能层
export type PromptLayer = 'system' | 'stage' | 'theme' | 'memory'; 