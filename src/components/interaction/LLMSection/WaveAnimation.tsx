'use client';

import React, { useMemo } from 'react';

interface WaveAnimationProps {
  isActive: boolean;
  type: 'input' | 'thinking';
}

const WaveAnimation: React.FC<WaveAnimationProps> = ({ isActive, type }) => {
  // 生成波纹数据，减少数量以适应更宽的线条
  const rippleList = useMemo(() => [
    40, 20, 40, 50, 70, 50, 20, 40, 30, 20, 30, 50, 100, 60, 20, 40, 30, 20, 30, 40,
  ], []);

  return (
    <div className="h-20 flex items-center justify-center overflow-hidden">
      {isActive ? (
        <div className="h-16 flex items-center justify-center">
          {rippleList.map((height, index) => (
            <div
              key={index}
              className={`
                w-[4px] rounded-[18px] mr-[3px] last:mr-0
                ${type === 'input' ? 'animate-wave-bar' : 'animate-wave-bar-green'}
              `}
              style={{
                animationDelay: `${index * 0.15}s`,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-gray-400">
          {type === 'input' ? '等待输入...' : 'AI助手空闲中...'}
        </div>
      )}
    </div>
  );
};

export default WaveAnimation; 