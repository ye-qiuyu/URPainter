'use client';

import React from 'react';
import AIAssistant from './AIAssistant';
import { FaMicrophone } from 'react-icons/fa';
import { Message } from '@/types/conversation';

interface LLMSectionProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
}

const LLMSection: React.FC<LLMSectionProps> = ({
  messages,
  onSendMessage,
  loading
}) => {
  const handleVoiceInput = () => {
    // TODO: 实现语音输入逻辑
    console.log('语音输入');
  };

  return (
    <div className="flex items-center justify-between h-full px-4">
      {/* AI助手头像 */}
      <div className="flex-shrink-0">
        <AIAssistant />
      </div>

      {/* 中间的波纹动画区域 */}
      <div className="flex-1 mx-8 h-20 flex items-center justify-center">
        {loading ? (
          <div className="text-gray-500">AI正在思考...</div>
        ) : (
          <div className="text-gray-400">等待输入...</div>
        )}
      </div>

      {/* 语音输入按钮 */}
      <div className="flex-shrink-0">
        <button
          onClick={handleVoiceInput}
          className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
        >
          <FaMicrophone size={24} />
        </button>
      </div>
    </div>
  );
};

export default LLMSection; 