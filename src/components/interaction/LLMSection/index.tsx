'use client';

import React from 'react';
import Input from './Input';
import MessageList from './MessageList';
import AIAssistant from './AIAssistant';
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
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-lg">
        <MessageList messages={messages} loading={loading} />
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Input onSubmit={onSendMessage} disabled={loading} />
        </div>
        <div className="flex-shrink-0">
          <AIAssistant />
        </div>
      </div>
    </div>
  );
};

export default LLMSection; 