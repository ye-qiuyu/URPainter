'use client';

import React from 'react';
import Image from 'next/image';

interface ImagePreviewProps {
  imageUrl?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl }) => {
  return (
    <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="生成的图片"
          width={400}
          height={400}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-gray-400">等待生成</span>
      )}
    </div>
  );
};

export default ImagePreview; 