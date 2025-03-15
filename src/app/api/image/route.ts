import { NextRequest, NextResponse } from 'next/server';
import { ComfyUIService } from '@/services/ai/comfyui';
import { PromptBuilderService } from '@/services/prompt/builder';

export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const { conversationId, detectedTheme, customPrompt } = await req.json();
    
    if (!conversationId) {
      return NextResponse.json(
        { error: '会话ID不能为空' },
        { status: 400 }
      );
    }
    
    // 获取服务实例
    const comfyUIService = ComfyUIService.getInstance();
    const promptBuilder = PromptBuilderService.getInstance();
    
    // 构建提示词
    let prompt = customPrompt;
    if (!prompt) {
      prompt = promptBuilder.buildImageGenerationPrompt(
        conversationId,
        detectedTheme
      );
    }
    
    // 负面提示词
    const negativePrompt = '低质量, 模糊, 变形, 不自然, 文字, 水印, 签名, 不适合儿童的内容';
    
    // 调用图像生成服务
    const imageUrl = await comfyUIService.generateImage(prompt, negativePrompt, conversationId);
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: '图像生成失败' },
        { status: 500 }
      );
    }
    
    // 返回图像URL
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('图像生成API错误:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'URPainter图像生成API服务正常运行' },
    { status: 200 }
  );
} 