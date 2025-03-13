'use client';

import React from 'react';

interface StudioLayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;
  debugPanel?: React.ReactNode;
}

const StudioLayout: React.FC<StudioLayoutProps> = ({ header, sidebar, main, debugPanel }) => {
  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 交互区域 - 顶部 */}
      <div className="w-full h-[180px] px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 h-full">
          {header}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex min-h-0">
        {/* 工具栏 - 左侧 */}
        <div className="w-16 bg-white/80 backdrop-blur-md border-r border-gray-200">
          {sidebar}
        </div>

        {/* 画布区域 - 主要区域 */}
        <div className="flex-1 bg-white">
          {main}
        </div>

        {/* 调试面板 - 右侧 */}
        {debugPanel && (
          <div className="bg-white/80 backdrop-blur-md h-full overflow-hidden">
            {debugPanel}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioLayout; 