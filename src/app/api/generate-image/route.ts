import { NextResponse } from 'next/server';
import { ComfyUIService } from '@/services/ai/comfyui';
import { promises as fs } from 'fs';
import path from 'path';

// 从文件加载工作流配置
async function loadWorkflow(name: string) {
  try {
    const filePath = path.join(process.cwd(), 'src/services/ai/workflows', `${name}.json`);
    console.log('尝试加载工作流文件:', filePath);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
      console.log('文件存在，开始读取');
    } catch (err) {
      console.error('文件不存在:', filePath);
      throw new Error(`Workflow file not found: ${name}.json`);
    }
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    console.log('成功读取文件，内容长度:', fileContent.length);
    console.log('文件内容预览:', fileContent.substring(0, 200));
    
    try {
      const workflowConfig = JSON.parse(fileContent);
      console.log('成功解析 JSON，节点数量:', Object.keys(workflowConfig).length);
      return workflowConfig;
    } catch (err) {
      console.error('JSON 解析失败:', err);
      throw new Error(`Failed to parse workflow JSON: ${err.message}`);
    }
  } catch (error: any) {
    console.error('工作流加载失败:', {
      error,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    console.log('开始处理图片生成请求...');
    console.log('当前工作目录:', process.cwd());
    
    const { prompt, sessionId, workflow = 'test' } = await request.json();
    console.log('收到的请求参数:', { prompt, sessionId, workflow });
    
    if (!prompt) {
      console.log('错误：缺少必要的 prompt 参数');
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('开始加载工作流配置...');
    const workflowConfig = await loadWorkflow(workflow);
    console.log('工作流配置加载成功:', {
      configKeys: Object.keys(workflowConfig),
      nodeCount: Object.keys(workflowConfig).length
    });
    
    console.log('初始化 ComfyUI 服务...');
    const comfyui = ComfyUIService.getInstance();
    
    console.log('开始生成图片...');
    const imageUrl = await comfyui.generateImage(
      workflowConfig,
      prompt,
      sessionId || 'default-session'
    );
    console.log('图片生成成功:', imageUrl);

    return NextResponse.json({
      success: true,
      data: { imageUrl }
    });
  } catch (error: any) {
    console.error('图片生成过程中发生错误:', {
      error,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate image',
        details: {
          stack: error.stack,
          type: error.constructor.name
        }
      },
      { status: 500 }
    );
  }
} 