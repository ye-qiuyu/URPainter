export type ConversationStage = 'A' | 'B1' | 'B2' | 'C' | 'D' | 'E';
export type ThemeCategory = 'SPACE' | 'ANIMALS' | 'FANTASY' | 'VEHICLES' | 'DEFAULT';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: string[];
  sessionId?: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  currentStage: ConversationStage;
  detectedTheme?: ThemeCategory;
  createdAt: number;
  updatedAt: number;
  creativeElements?: {
    mainCharacter?: string;
    theme?: string;
    supportElements?: string[];
    needSummary?: boolean;
    [key: string]: any;
  };
}

export interface ConversationState {
  currentConversation: Conversation | null;
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
}

// 提示词状态类型
export interface PromptState {
  currentStage: ConversationStage;
  themeDetected?: ThemeCategory;
  conversationId: string;
} 