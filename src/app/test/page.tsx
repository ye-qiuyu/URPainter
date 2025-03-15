"use client";

import React, { useState } from 'react';

export default function TestPage() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testLLM = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('开始发送 LLM 请求...');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'LLM 请求失败');
      }

      const data = await response.json();
      console.log('收到 LLM 响应:', data);
      const lastMessage = data.data.messages[data.data.messages.length - 1];
      setResponse(lastMessage.content);
    } catch (err) {
      console.error('LLM 请求过程中发生错误:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const testSDM = async () => {
    try {
      setLoading(true);
      setError('');
      setImageUrl('');
      
      console.log('开始发送图片生成请求...');
      const startTime = Date.now();
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input,
          sessionId: 'test-session',
          workflow: 'test'
        }),
      });
      const endTime = Date.now();
      console.log(`请求耗时: ${endTime - startTime}ms`);
      console.log('收到响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('请求失败:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || '生成图片失败');
        } catch (e) {
          throw new Error(`生成图片失败: ${response.status} ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      console.log('收到服务器响应:', data);
      
      if (data.success && data.data && data.data.imageUrl) {
        console.log('设置图片URL:', data.data.imageUrl);
        // 添加时间戳防止缓存
        const imageUrlWithTimestamp = `${data.data.imageUrl}${data.data.imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setImageUrl(imageUrlWithTimestamp);
      } else {
        console.error('响应中没有有效的图片URL:', data);
        throw new Error('服务器返回的数据中没有图片URL');
      }
    } catch (err) {
      console.error('请求过程中发生错误:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API 通信测试页面</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            测试输入
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="输入测试消息..."
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={testLLM}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? '请求中...' : '测试 LLM'}
          </button>

          <button
            onClick={testSDM}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? '生成中...' : '测试 SDM'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {response && (
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-medium mb-2">LLM 响应：</h2>
            <pre className="whitespace-pre-wrap">{response}</pre>
          </div>
        )}

        {imageUrl && (
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-medium mb-2">生成的图片：</h2>
            <img src={imageUrl} alt="生成的图片" className="max-w-full rounded" />
          </div>
        )}
      </div>
    </div>
  );
} 