import { NextResponse } from 'next/server';
import { ComfyUIService } from '@/services/ai/comfyui';

// 默认的工作流配置
const defaultWorkflow = {
  // 这里需要根据实际的 ComfyUI 工作流配置进行修改
  '6': {
    inputs: {
      text: '',  // 将由请求提供
    },
  },
  // 其他节点配置...
};

export async function POST(request: Request) {
  try {
    const { prompt, sessionId } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const comfyui = ComfyUIService.getInstance();
    const imageUrl = await comfyui.generateImage(
      defaultWorkflow,
      prompt,
      sessionId || 'default-session'
    );

    return NextResponse.json({
      success: true,
      data: { imageUrl }
    });
  } catch (error) {
    console.error('Error in generate-image API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate image',
      },
      { status: 500 }
    );
  }
} 