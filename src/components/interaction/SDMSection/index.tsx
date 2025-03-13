'use client';

import React from 'react';
import ImagePreview from './ImagePreview';

interface SDMSectionProps {
  images: string[];
  loading?: boolean;
}

const SDMSection: React.FC<SDMSectionProps> = ({ images, loading }) => {
  return (
    <div className="h-full flex items-center">
      <div className="w-full max-w-3xl mx-auto">
        <div className="grid grid-cols-3 gap-6 p-4">
          {images.length > 0 ? (
            images.slice(0, 3).map((url, index) => (
              <ImagePreview key={index} imageUrl={url} />
            ))
          ) : (
            <>
              <ImagePreview />
              <ImagePreview />
              <ImagePreview />
            </>
          )}
        </div>
        {loading && (
          <div className="mt-4 text-center">
            <span className="text-gray-500">生成中...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SDMSection; 