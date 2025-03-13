'use client';

import React, { useState } from 'react';
import { Message } from '@/types/conversation';
import Input from '@/components/interaction/LLMSection/Input';

interface DebugPanelProps {
  messages: Message[];
  loading?: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onInputStateChange?: (isTyping: boolean) => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
  messages, 
  loading, 
  onSendMessage,
  onInputStateChange 
}) => {
  return (
    <div className="w-[300px] h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-medium text-gray-700">调试面板 - 对话历史</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[90%] ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-sm">{message.content}</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
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
        <Input 
          onSubmit={onSendMessage} 
          onInputStateChange={onInputStateChange}
          disabled={loading} 
        />
      </div>
    </div>
  );
};

export default DebugPanel; 