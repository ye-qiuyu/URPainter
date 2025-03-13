"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import StudioLayout from '@/components/layout/StudioLayout';
import { LLMSection, SDMSection } from '@/components/interaction';
import { ToolBar } from '@/components/ui';
import { Message } from '@/types/conversation';
import DebugPanel from '@/components/debug/DebugPanel';

// 动态导入画布组件以避免SSR问题
const Canvas = dynamic(() => import('@/components/canvas/Canvas'), { ssr: false });

export default function StudioPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (message: string) => {
    try {
      setLoading(true);
      setError('');

      // 添加用户消息到对话列表
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMessage]);

      // 发送请求到API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '对话请求失败');
      }

      // 处理API响应
      const data = await response.json();
      const aiMessage = data.data.messages[data.data.messages.length - 1];
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: aiMessage.content,
        timestamp: Date.now(),
      }]);

      // TODO: 根据AI响应决定是否需要生成图片
      
    } catch (err) {
      console.error('对话过程中发生错误:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudioLayout
      header={
        <div className="flex h-full w-full">
          <div className="w-[40%] flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
              <LLMSection
                messages={messages}
                onSendMessage={handleSendMessage}
                loading={loading}
                isTyping={isTyping}
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
      debugPanel={
        process.env.NODE_ENV === 'development' && (
          <DebugPanel
            messages={messages}
            loading={loading}
            onSendMessage={handleSendMessage}
            onInputStateChange={setIsTyping}
          />
        )
      }
    />
  );
} 