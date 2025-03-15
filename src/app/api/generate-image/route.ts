import { NextResponse } from 'next/server';
import { ComfyUIService } from '@/services/ai/comfyui';
import { promises as fs } from 'fs';
import path from 'path';

// 从文件加载工作流配置
async function loadWorkflow(name: string) {
  try {
    // 使用项目根目录作为基准
    const projectRoot = path.join(process.cwd());
    const filePath = path.join(projectRoot, 'src', 'services', 'ai', 'workflows', `${name}.json`);
    
    console.log('工作流加载信息:', {
      projectRoot,
      filePath,
      exists: await fs.access(filePath).then(() => true).catch(() => false)
    });
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
      console.log('文件存在，开始读取');
    } catch (err) {
      console.error('文件不存在:', {
        filePath,
        error: err
      });
      throw new Error(`找不到工作流文件: ${name}.json (${filePath})`);
    }
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    console.log('工作流文件读取成功:', {
      length: fileContent.length,
      preview: fileContent.substring(0, 100)
    });
    
    try {
      const workflowConfig = JSON.parse(fileContent);
      console.log('工作流配置解析成功:', {
        nodeCount: Object.keys(workflowConfig).length,
        nodeTypes: Object.values(workflowConfig).map(node => (node as any).class_type)
      });
      return workflowConfig;
    } catch (err) {
      console.error('工作流JSON解析失败:', err);
      throw new Error(`工作流JSON解析失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  } catch (error) {
    console.error('工作流加载失败:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    console.log('开始处理图片生成请求...');
    console.log('环境信息:', {
      cwd: process.cwd(),
      nodeEnv: process.env.NODE_ENV
    });
    
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
    // 修改工作流中的提示词
    if (workflowConfig && workflowConfig['6'] && workflowConfig['6'].inputs) {
      console.log('修改工作流中的提示词', { 
        原提示词: workflowConfig['6'].inputs.text,
        新提示词: prompt 
      });
      workflowConfig['6'].inputs.text = prompt;
    }
    
    // 设置超时
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error('图像生成请求超时'));
      }, 20000); // 20秒超时
    });
    
    // 使用Promise.race确保请求不会无限等待
    const imageUrl = await Promise.race([
      comfyui.generateImage(
        workflowConfig,
        '', // 不使用negativePrompt参数，因为已经在工作流中设置了
        sessionId || 'default-session'
      ),
      timeoutPromise
    ]);
    
    console.log('图片生成成功:', imageUrl);

    return NextResponse.json({
      success: true,
      data: { imageUrl }
    });
  } catch (error) {
    console.error('图片生成过程中发生错误:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.constructor.name : typeof error
        }
      },
      { status: 500 }
    );
  }
} 