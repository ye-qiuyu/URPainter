'use client';

import React from 'react';

const AIAssistant: React.FC = () => {
  return (
    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-2xl">🤖</span>
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="text-gray-700">让我们开始创作吧！</div>
      </div>
    </div>
  );
};

export default AIAssistant; 