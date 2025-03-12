"use client";

import React, { useState } from 'react';
import { OllamaService } from '@/services/ai/ollama';
import { ComfyUIService } from '@/services/ai/comfyui';

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
      const ollama = OllamaService.getInstance();
      const result = await ollama.chat([
        { role: 'user', content: input }
      ]);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const testSDM = async () => {
    try {
      setLoading(true);
      setError('');
      const comfyui = ComfyUIService.getInstance();
      const imageUrl = await comfyui.generateImage(
        {}, // 默认工作流
        input,
        'test-session'
      );
      setImageUrl(imageUrl);
    } catch (err) {
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