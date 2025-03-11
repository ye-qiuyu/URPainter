export type ConversationStage = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: string[];
}

export interface Conversation {
  id: string;
  messages: Message[];
  currentStage: ConversationStage;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationState {
  currentConversation: Conversation | null;
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
} 