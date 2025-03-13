'use client';

import React from 'react';

const AIAssistant: React.FC = () => {
  return (
    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-xl">🤖</span>
      </div>
      <div className="text-sm text-gray-700">AI助手</div>
    </div>
  );
};

export default AIAssistant; 