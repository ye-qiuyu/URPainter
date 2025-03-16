'use client';

import React, { useState } from 'react';
import { Message } from '@/types/conversation';
import Input from '@/components/interaction/LLMSection/Input';

interface DebugPanelProps {
  messages: Message[];
  loading?: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onInputStateChange?: (isTyping: boolean) => void;
  onClearConversation?: () => void;
  onNewConversation?: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
  messages, 
  loading, 
  onSendMessage,
  onInputStateChange,
  onClearConversation,
  onNewConversation
}) => {
  const [showTimestamps, setShowTimestamps] = useState(false);
  
  return (
    <div className="w-[300px] h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col">
      <div className="p-1.5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-xs font-medium text-gray-700">对话历史</h2>
          <button 
            onClick={() => setShowTimestamps(!showTimestamps)}
            className="ml-1 text-[10px] px-1 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
            title={showTimestamps ? "隐藏时间戳" : "显示时间戳"}
          >
            {showTimestamps ? "隐藏时间" : "显示时间"}
          </button>
        </div>
        <div className="flex space-x-1">
          {onClearConversation && (
            <button 
              onClick={onClearConversation}
              className="text-[10px] px-1 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
              title="清除当前会话"
            >
              清除
            </button>
          )}
          {onNewConversation && (
            <button 
              onClick={onNewConversation}
              className="text-[10px] px-1 py-0.5 bg-blue-500 hover:bg-blue-600 rounded text-white"
              title="创建新会话"
            >
              新会话
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        <div className="space-y-0.5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-1 ${
                message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
              }`}
            >
              <div
                className={`rounded px-1.5 py-0.5 max-w-[95%] ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-xs leading-tight">{message.content}</div>
              </div>
              {showTimestamps && (
                <div className="text-[9px] text-gray-400 mt-0.5">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="text-[10px] text-gray-500 animate-pulse">
              正在响应...
            </div>
          )}
        </div>
      </div>
      <div className="p-1.5 border-t border-gray-200 bg-gray-50">
        <Input 
          onSubmit={onSendMessage} 
          onInputStateChange={onInputStateChange}
          disabled={loading} 
          compact={true}
        />
      </div>
    </div>
  );
};

export default DebugPanel; 