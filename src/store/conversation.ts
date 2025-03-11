import { create } from 'zustand';
import type { ConversationState, Conversation, Message } from '@/types/conversation';

interface ConversationStore extends ConversationState {
  // 会话管理
  setCurrentConversation: (conversation: Conversation | null) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  
  // 消息管理
  sendMessage: (content: string) => Promise<void>;
  
  // 状态管理
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // 初始状态
  currentConversation: null,
  conversations: [],
  isLoading: false,
  error: null,

  // 会话管理方法
  setCurrentConversation: (conversation) => 
    set({ currentConversation: conversation }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [...state.conversations, conversation]
    })),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== conversationId),
      currentConversation: state.currentConversation?.id === conversationId
        ? null
        : state.currentConversation
    })),

  // 消息发送方法
  sendMessage: async (content: string) => {
    const state = get();
    set({ isLoading: true, error: null });

    try {
      // 如果没有当前会话，创建新会话
      if (!state.currentConversation) {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content })
        });

        if (!response.ok) throw new Error('Failed to create conversation');
        
        const { data } = await response.json();
        set({ 
          currentConversation: data,
          conversations: [...state.conversations, data]
        });
      } else {
        // 在现有会话中发送消息
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            conversationId: state.currentConversation.id
          })
        });

        if (!response.ok) throw new Error('Failed to send message');
        
        const { data } = await response.json();
        set({
          currentConversation: data,
          conversations: state.conversations.map((conv) =>
            conv.id === data.id ? data : conv
          )
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },

  // 状态管理方法
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error })
})); 