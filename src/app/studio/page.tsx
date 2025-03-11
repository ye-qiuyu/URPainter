"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import StudioLayout from '@/components/layout/StudioLayout';
import { VoiceInput, TextInput, AIAssistant, ImagePreview } from '@/components/interaction';
import { ToolBar } from '@/components/ui';

// 动态导入画布组件以避免SSR问题
const Canvas = dynamic(() => import('@/components/canvas/Canvas'), { ssr: false });

export default function StudioPage() {
  return (
    <StudioLayout
      header={
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex-1 flex items-center gap-4">
            <VoiceInput />
            <TextInput />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <AIAssistant />
          </div>
          <div className="flex-1 flex items-center justify-end">
            <ImagePreview />
          </div>
        </div>
      }
      sidebar={<ToolBar />}
      main={<Canvas />}
    />
  );
} 