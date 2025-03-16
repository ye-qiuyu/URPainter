'use client';

import React, { useState, useEffect } from 'react';
import { ClientMemory } from '@/lib/memory';
import { Message } from '@/types/conversation';

/**
 * MemoryTest - 记忆系统测试组件
 * 
 * 用于测试SessionStorage记忆系统的功能
 */
const MemoryTest: React.FC = () => {
  const [conversationId, setConversationId] = useState<string>('test-conversation');
  const [userInput, setUserInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 加载消息历史
  useEffect(() => {
    const storedMessages = ClientMemory.getMessages(conversationId);
    setMessages(storedMessages);
  }, [conversationId]);
  
  // 发送消息
  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 添加用户消息到本地存储
      const updatedMessages = ClientMemory.addMessage(conversationId, {
        role: 'user',
        content: userInput
      });
      
      // 更新UI
      setMessages(updatedMessages);
      setUserInput('');
      
      // 发送到API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userInput,
          conversationId,
          messageHistory: updatedMessages
        })
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // 添加AI响应到本地存储
        const finalMessages = ClientMemory.addMessage(conversationId, {
          role: 'assistant',
          content: data.data.aiResponse
        });
        
        // 更新UI
        setMessages(finalMessages);
      } else {
        throw new Error(data.error || '未知错误');
      }
    } catch (err) {
      console.error('发送消息时出错:', err);
      setError(err instanceof Error ? err.message : '发送消息时出错');
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
    const newId = `test-conversation-${Date.now()}`;
    setConversationId(newId);
    setMessages([]);
  };
  
  return (
    <div className="p-4 max-w-2xl mx-auto bg-white rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">记忆系统测试</h1>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">会话ID:</span>
          <span className="text-blue-600">{conversationId}</span>
          <button 
            onClick={handleNewConversation}
            className="ml-auto px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            新会话
          </button>
          <button 
            onClick={handleClearConversation}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            清除会话
          </button>
        </div>
        <div className="text-sm text-gray-500">
          消息数: {messages.length} | 存储状态: {messages.length > 0 ? '已存储' : '空'}
        </div>
      </div>
      
      <div className="border rounded-lg p-4 h-80 overflow-y-auto mb-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-32">无消息历史</div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg max-w-[80%] ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        )}
        {loading && (
          <div className="text-center text-gray-500 mt-4">
            <div className="animate-pulse">处理中...</div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          错误: {error}
        </div>
      )}
      
      <div className="flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="输入消息..."
          className="flex-1 p-2 border rounded-lg"
          disabled={loading}
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !userInput.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default MemoryTest; 