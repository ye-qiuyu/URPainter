"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import StudioLayout from '@/components/layout/StudioLayout';
import { LLMSection, SDMSection } from '@/components/interaction';
import { ToolBar } from '@/components/ui';
import { Message, ConversationStage } from '@/types/conversation';
import DebugPanel from '@/components/debug/DebugPanel';
import { ClientMemory } from '@/lib/memory';
import { v4 as uuidv4 } from 'uuid';

// 动态导入画布组件以避免SSR问题
const Canvas = dynamic(() => import('@/components/canvas/Canvas'), { ssr: false });

export default function StudioPage() {
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStage, setCurrentStage] = useState<ConversationStage>('A');

  // 初始化会话ID
  useEffect(() => {
    // 如果没有会话ID，创建一个新的
    if (!conversationId) {
      const newConversationId = uuidv4();
      setConversationId(newConversationId);
      console.log(`创建新会话ID: ${newConversationId}`);
    }
    
    // 加载会话消息
    const storedMessages = ClientMemory.getMessages(conversationId);
    if (storedMessages.length > 0) {
      setMessages(storedMessages);
      console.log(`加载会话消息: ${storedMessages.length}条`);
    }
    
    // 加载会话阶段
    const storedStage = ClientMemory.getStage(conversationId);
    if (storedStage) {
      setCurrentStage(storedStage);
      console.log(`加载会话阶段: ${storedStage}`);
    }
  }, [conversationId]);

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
      
      // 更新本地状态
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      
      // 保存到会话存储
      ClientMemory.saveMessages(conversationId, updatedMessages);

      // 发送请求到API，包含消息历史和当前阶段
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          conversationId,
          messageHistory: updatedMessages,
          currentStage: currentStage // 添加当前阶段信息
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API请求失败: ${response.status}`);
      }

      // 处理API响应
      const data = await response.json();
      
      // 在开发环境下，打印调试信息到控制台
      if (data.data._debug) {
        console.log('调试信息:', data.data._debug);
        console.log('提示词内容:', data.data._debug.prompt);
        console.log('提示词长度:', data.data._debug.promptLength);
      }
      
      // 创建AI消息
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.data.aiResponse,
        timestamp: Date.now(),
      };
      
      // 更新本地状态
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      
      // 保存到会话存储
      ClientMemory.saveMessages(conversationId, finalMessages);

      // TODO: 根据AI响应决定是否需要生成图片
      
      if (data.success) {
        // 更新阶段信息
        if (data.data.currentStage) {
          setCurrentStage(data.data.currentStage);
          // 保存阶段信息到本地存储
          ClientMemory.saveStage(conversationId, data.data.currentStage);
          console.log(`[前端] 阶段更新: ${currentStage} -> ${data.data.currentStage}`);
        }
      }
    } catch (err) {
      console.error('对话过程中发生错误:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 清除会话
  const handleClearConversation = () => {
    ClientMemory.clearConversation(conversationId);
    setMessages([]);
  };

  // 创建新会话
  const handleNewConversation = () => {
    const newConversationId = uuidv4();
    setConversationId(newConversationId);
    setMessages([]);
    setCurrentStage('A'); // 重置阶段为A
    console.log(`创建新会话: ${newConversationId}`);
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
            conversationId={conversationId}
            currentStage={currentStage}
            onSendMessage={handleSendMessage}
            onInputStateChange={setIsTyping}
            onClearConversation={handleClearConversation}
            onNewConversation={handleNewConversation}
          />
        )
      }
    />
  );
} 