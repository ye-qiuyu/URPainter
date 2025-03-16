import React from 'react';
import MemoryTest from '@/components/debug/MemoryTest';

export default function MemoryTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">记忆系统测试页面</h1>
        <MemoryTest />
      </div>
    </div>
  );
} 