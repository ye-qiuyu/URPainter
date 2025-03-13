'use client';

import React from 'react';
import { Message } from '@/types/conversation';
import Input from '@/components/interaction/LLMSection/Input';

interface DebugPanelProps {
  messages: Message[];
  loading?: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ messages, loading, onSendMessage }) => {
  return (
    <div className="w-[300px] h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-medium text-gray-700">调试面板 - 对话历史</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="text-sm"
            >
              <div className="font-medium text-gray-700 mb-1">
                {message.role === 'user' ? '用户' : 'AI助手'}
                <span className="ml-2 text-xs text-gray-500">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                {message.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-sm text-gray-500 animate-pulse">
              正在响应...
            </div>
          )}
        </div>
      </div>
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <Input onSubmit={onSendMessage} disabled={loading} />
      </div>
    </div>
  );
};

export default DebugPanel; 