'use client';

import React from 'react';

const ImagePreview: React.FC = () => {
  return (
    <div className="flex items-center gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-24 h-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
          <span className="text-gray-400">图片 {i}</span>
        </div>
      ))}
    </div>
  );
};

export default ImagePreview; 