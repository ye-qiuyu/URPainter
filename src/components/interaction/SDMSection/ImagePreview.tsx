'use client';

import React from 'react';
import Image from 'next/image';

interface ImagePreviewProps {
  imageUrl?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl }) => {
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="生成的图片"
            fill
            className="object-cover"
          />
        ) : (
          <span className="text-gray-400">等待生成</span>
        )}
      </div>
    </div>
  );
};

export default ImagePreview; 