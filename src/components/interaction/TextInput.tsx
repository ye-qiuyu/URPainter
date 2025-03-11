'use client';

import React from 'react';

const TextInput: React.FC = () => {
  return (
    <div className="flex-1 h-12">
      <input
        type="text"
        placeholder="告诉我你想画什么..."
        className="w-full h-full px-4 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};

export default TextInput; 