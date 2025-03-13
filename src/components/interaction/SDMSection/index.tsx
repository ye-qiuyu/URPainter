'use client';

import React from 'react';
import ImagePreview from './ImagePreview';

interface SDMSectionProps {
  images: string[];
  loading?: boolean;
}

const SDMSection: React.FC<SDMSectionProps> = ({ images, loading }) => {
  return (
    <div className="h-full flex flex-col justify-center">
      <div className="w-full px-4">
        <div className="grid grid-cols-3 gap-4">
          {images.length > 0 ? (
            images.slice(0, 3).map((url, index) => (
              <div key={index} className="w-[140px] h-[140px]">
                <ImagePreview imageUrl={url} />
              </div>
            ))
          ) : (
            <>
              <div className="w-[140px] h-[140px]">
                <ImagePreview />
              </div>
              <div className="w-[140px] h-[140px]">
                <ImagePreview />
              </div>
              <div className="w-[140px] h-[140px]">
                <ImagePreview />
              </div>
            </>
          )}
        </div>
      </div>
      {loading && (
        <div className="mt-2 text-center">
          <span className="text-gray-500">生成中...</span>
        </div>
      )}
    </div>
  );
};

export default SDMSection; 