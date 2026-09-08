import { create } from 'zustand';
import { ChatMessage } from '../models/types';

interface AssistantState {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [],
  isLoading: false,

  sendMessage: async (content) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isLoading: true }));

    try {
      // BACKEND TEAM: replace with real API call
      await new Promise((r) => setTimeout(r, 1500));
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Based on BIS standards, here is information about "${content}". This is a mock response. Connect to /api/v1/assistant/chat for real answers.`,
        sources: ['IS 10500:2012', 'BIS Act 2016'],
        timestamp: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, reply], isLoading: false }));
    } catch {
      const err: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I could not process that. Please try again.',
        timestamp: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, err], isLoading: false }));
    }
  },

  clearHistory: () => set({ messages: [] }),
}));
