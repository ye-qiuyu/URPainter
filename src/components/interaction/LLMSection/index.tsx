'use client';

import React, { useState } from 'react';
import AIAssistant from './AIAssistant';
import WaveAnimation from './WaveAnimation';
import { FaMicrophone } from 'react-icons/fa';
import { Message } from '@/types/conversation';

interface LLMSectionProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
  isTyping?: boolean;
}

const LLMSection: React.FC<LLMSectionProps> = ({
  messages,
  onSendMessage,
  loading,
  isTyping
}) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const handleVoiceStart = () => {
    setIsVoiceActive(true);
    // TODO: 开始语音输入
  };

  const handleVoiceEnd = () => {
    setIsVoiceActive(false);
    // TODO: 结束语音输入
  };

  // 确定当前的状态和类型
  const isActive = loading || isTyping || isVoiceActive;
  const animationType = loading ? 'thinking' : 'input';

  return (
    <div className="flex items-center h-full px-4">
      {/* AI助手头像 */}
      <div className="flex-shrink-0 ml-4">
        <AIAssistant />
      </div>

      {/* 中间的波纹动画区域 - 固定宽度 */}
      <div className="w-[300px] mx-auto">
        <WaveAnimation 
          isActive={isActive}
          type={animationType}
        />
      </div>

      {/* 语音输入按钮 */}
      <div className="flex-shrink-0 -ml-4">
        <button
          onMouseDown={handleVoiceStart}
          onMouseUp={handleVoiceEnd}
          onMouseLeave={handleVoiceEnd}
          onTouchStart={handleVoiceStart}
          onTouchEnd={handleVoiceEnd}
          className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
        >
          <FaMicrophone size={32} />
        </button>
      </div>
    </div>
  );
};

export default LLMSection; 