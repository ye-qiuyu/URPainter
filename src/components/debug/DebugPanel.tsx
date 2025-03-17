'use client';

import React, { useState } from 'react';
import { Message, ConversationStage } from '@/types/conversation';
import Input from '@/components/interaction/LLMSection/Input';
import StageVisualizer from './StageVisualizer';
import StageDebugger from './StageDebugger';

interface DebugPanelProps {
  messages: Message[];
  loading?: boolean;
  conversationId?: string;
  currentStage?: ConversationStage;
  onSendMessage: (message: string) => Promise<void>;
  onInputStateChange?: (isTyping: boolean) => void;
  onClearConversation?: () => void;
  onNewConversation?: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
  messages, 
  loading, 
  conversationId = '',
  currentStage = 'A',
  onSendMessage,
  onInputStateChange,
  onClearConversation,
  onNewConversation
}) => {
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'stages'>('messages');
  
  return (
    <div className="w-[300px] h-full bg-white border-l border-gray-200 overflow-hidden flex flex-col">
      {/* 标签页切换 */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-2 text-xs font-medium ${activeTab === 'messages' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('messages')}
        >
          对话历史
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium ${activeTab === 'stages' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('stages')}
        >
          阶段管理
        </button>
      </div>
      
      {activeTab === 'messages' && (
        <>
          <div className="p-1.5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center">
              <h2 className="text-xs font-medium text-gray-700">对话历史</h2>
              <span className="ml-2 text-xs text-gray-500">({messages.length}条)</span>
            </div>
            <div className="flex space-x-1">
              <button 
                onClick={() => setShowTimestamps(!showTimestamps)}
                className="text-xs text-gray-500 hover:text-gray-700 px-1 py-0.5 rounded"
              >
                {showTimestamps ? '隐藏时间' : '显示时间'}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {messages.map((message, index) => (
              <div 
                key={message.id || index} 
                className={`mb-2 p-2 rounded text-xs ${
                  message.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium">
                    {message.role === 'user' ? '用户' : 'AI'}
                  </span>
                  {showTimestamps && (
                    <span className="text-[10px] text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-xs text-gray-400 mt-4">
                暂无消息
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-200">
            <div className="flex space-x-1 mb-2">
              <button
                onClick={onClearConversation}
                className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 rounded"
              >
                清空对话
              </button>
              <button
                onClick={onNewConversation}
                className="flex-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 rounded"
              >
                新建对话
              </button>
            </div>
            <Input
              onSubmit={onSendMessage}
              disabled={loading}
              onInputStateChange={onInputStateChange}
              compact={true}
            />
          </div>
        </>
      )}
      
      {activeTab === 'stages' && (
        <div className="flex-1 overflow-y-auto p-2">
          <StageVisualizer 
            currentStage={currentStage} 
            className="mb-4"
          />
          
          <StageDebugger 
            conversationId={conversationId}
            currentStage={currentStage}
          />
        </div>
      )}
    </div>
  );
};

export default DebugPanel; 