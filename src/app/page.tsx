"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/studio");  // 跳转到画室页面
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <main className="w-full max-w-4xl p-6">
        <h1 className="text-4xl font-bold text-center mb-6">URPainter</h1>
        <p className="text-lg text-center mb-8">
          面向6-9岁儿童的创意绘画教育应用
        </p>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="mb-4">
            URPainter通过结合大语言模型（LLM）和稳定扩散模型（SDM），为儿童提供独特的创意绘画和科普教育体验。
          </p>
          <div className="mt-6 text-center">
            <button 
              onClick={handleStart}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-full transition duration-200"
            >
              开始创作
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
