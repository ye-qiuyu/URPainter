"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import StudioLayout from '@/components/layout/StudioLayout';
import { LLMSection, SDMSection } from '@/components/interaction';
import { ToolBar } from '@/components/ui';
import { Message } from '@/types/conversation';

// 动态导入画布组件以避免SSR问题
const Canvas = dynamic(() => import('@/components/canvas/Canvas'), { ssr: false });

export default function StudioPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    setLoading(true);
    try {
      // TODO: 实现发送消息的逻辑
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, newMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudioLayout
      header={
        <div className="flex h-full w-full">
          <div className="flex-1 flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
              <LLMSection
                messages={messages}
                onSendMessage={handleSendMessage}
                loading={loading}
              />
            </div>
          </div>
          <div className="w-[2px] h-full bg-gray-200 mx-4" />
          <div className="flex-1 flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
              <SDMSection
                images={images}
                loading={imageLoading}
              />
            </div>
          </div>
        </div>
      }
      sidebar={<ToolBar />}
      main={<Canvas />}
    />
  );
} 