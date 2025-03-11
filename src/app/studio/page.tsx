"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// 动态导入画布组件以避免SSR问题
const Canvas = dynamic(() => import('@/components/canvas/Canvas'), { ssr: false });

export default function StudioPage() {
  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* 交互区域 - 顶部 */}
      <div className="w-full h-[180px] px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 h-full">
          {/* 语音输入和文字输入区域 */}
          <div className="flex-1 flex items-center gap-4">
            <button className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <div className="flex-1 h-12">
              <input
                type="text"
                placeholder="告诉我你想画什么..."
                className="w-full h-full px-4 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* AI助手区域 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                {/* AI头像 */}
                <span className="text-2xl">🤖</span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-gray-700">让我们开始创作吧！</div>
              </div>
            </div>
          </div>

          {/* 图片生成预览区域 */}
          <div className="flex-1 flex items-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-24 h-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                <span className="text-gray-400">图片 {i}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex">
        {/* 工具栏 - 左侧 */}
        <div className="w-16 bg-white/80 backdrop-blur-md border-r border-gray-200">
          <div className="flex flex-col items-center gap-4 p-2">
            {[
              { icon: "✏️", label: "粗笔" },
              { icon: "✎", label: "细笔" },
              { icon: "🔍", label: "放大" },
              { icon: "🔎", label: "缩小" },
              { icon: "↻", label: "旋转" },
              { icon: "⌫", label: "橡皮" },
              { icon: "🎨", label: "调色" },
            ].map((tool) => (
              <button
                key={tool.label}
                className="w-12 h-12 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                title={tool.label}
              >
                <span className="text-xl">{tool.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 画布区域 - 主要区域 */}
        <div className="flex-1 bg-white">
          <Canvas />
        </div>
      </div>
    </div>
  );
} 