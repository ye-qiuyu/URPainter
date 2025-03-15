export type ConversationStage = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
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