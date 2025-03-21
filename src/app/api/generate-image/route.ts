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
      
      // 提取工作流中的关键信息用于日志
      let nodeInfo = {};
      if (workflowConfig.nodes && Array.isArray(workflowConfig.nodes)) {
        // ComfyUI界面格式
        const modelNodes = workflowConfig.nodes.filter((node: any) => 
          node.type === 'CheckpointLoaderSimple');
        
        if (modelNodes.length > 0) {
          nodeInfo = {
            modelName: modelNodes[0].widgets_values?.[0] || '未找到模型名称'
          };
        }
        
        const textNodes = workflowConfig.nodes.filter((node: any) => 
          node.type === 'CLIPTextEncode');
        
        if (textNodes.length > 0) {
          nodeInfo = {
            ...nodeInfo,
            promptNodeCount: textNodes.length,
            promptNode1: textNodes[0].id,
            promptText1: textNodes[0].widgets_values?.[0] || '未找到提示词'
          };
        }
      }
      
      console.log('工作流配置解析成功:', {
        nodeCount: workflowConfig.nodes ? workflowConfig.nodes.length : Object.keys(workflowConfig).length,
        ...nodeInfo
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
      nodeCount: workflowConfig.nodes ? workflowConfig.nodes.length : Object.keys(workflowConfig).length
    });
    
    console.log('初始化 ComfyUI 服务...');
    const comfyui = ComfyUIService.getInstance();
    
    console.log('开始生成图片...');
    
    // 检查并修改工作流中的提示词
    let positivePromptNode = null;
    let negativePromptNode = null;
    let modelNodeId = null;
    let modelName = null;
    let promptModified = false;
    
    try {
      // ComfyUI界面导出的格式 (包含nodes数组)
      if (workflowConfig.nodes && Array.isArray(workflowConfig.nodes)) {
        console.log('检测到ComfyUI界面格式工作流');
        
        // 先提取模型信息
        const modelNodes = workflowConfig.nodes.filter((node: any) => 
          node.type === 'CheckpointLoaderSimple');
        
        if (modelNodes.length > 0) {
          modelNodeId = modelNodes[0].id;
          modelName = modelNodes[0].widgets_values?.[0];
          console.log('找到模型节点:', {
            nodeId: modelNodeId,
            modelName: modelName
          });
        }
        
        // 查找CLIPTextEncode节点
        const textNodes = workflowConfig.nodes.filter((node: any) => 
          node.type === 'CLIPTextEncode');
        
        if (textNodes.length > 0) {
          // 查找KSampler节点，了解哪个是正面提示词
          const kSamplerNodes = workflowConfig.nodes.filter((node: any) => 
            node.type === 'KSampler');
          
          if (kSamplerNodes.length > 0) {
            const kSampler = kSamplerNodes[0];
            // 找出正面提示词的输入链接
            const positiveLink = kSampler.inputs.find((input: any) => 
              input.name === 'positive' || 
              input.label === 'positive' || 
              input.localized_name === '正');
            
            if (positiveLink && positiveLink.link) {
              // 查找链接对应的节点
              const linkInfo = workflowConfig.links.find((link: any) => 
                link[0] === positiveLink.link);
              
              if (linkInfo) {
                const sourceNodeId = linkInfo[1];
                // 找到对应的提示词节点
                positivePromptNode = workflowConfig.nodes.find((node: any) => 
                  node.id === sourceNodeId);
                
                if (positivePromptNode) {
                  console.log('通过链接找到正面提示词节点:', {
                    nodeId: positivePromptNode.id,
                    原提示词: positivePromptNode.widgets_values[0]
                  });
                  
                  // 修改提示词
                  positivePromptNode.widgets_values[0] = prompt;
                  promptModified = true;
                  console.log('已修改提示词为:', prompt);
                }
              }
            }
          }
        } else {
          console.error('未找到CLIPTextEncode节点');
        }
      } else {
        // 处理API格式的工作流
        console.log('检测到API格式工作流，开始寻找提示词节点');
        
        // 在API格式中寻找CLIPTextEncode节点
        for (const [nodeId, node] of Object.entries(workflowConfig)) {
          if (typeof node === 'object' && node !== null && (node as any).class_type) {
            const typedNode = node as any;
            
            // 检查是否是模型节点
            if (typedNode.class_type === 'CheckpointLoaderSimple') {
              modelNodeId = nodeId;
              modelName = typedNode.inputs?.ckpt_name;
              console.log('找到模型节点:', {
                nodeId: modelNodeId,
                modelName: modelName
              });
            }
            
            // 检查是否是提示词节点
            if (typedNode.class_type === 'CLIPTextEncode') {
              console.log('找到CLIPTextEncode节点:', {
                nodeId,
                原提示词: typedNode.inputs?.text || '未找到提示词'
              });
              
              // 修改提示词节点的文本输入
              if (typedNode.inputs && 'text' in typedNode.inputs) {
                typedNode.inputs.text = prompt;
                promptModified = true;
                console.log('已修改API格式工作流的提示词为:', prompt);
              }
            }
          }
        }
        
        if (!promptModified) {
          console.error('API工作流中未找到可以修改的提示词节点');
        }
      }
    } catch (error) {
      console.error('修改工作流提示词失败:', error);
    }
    
    if (!promptModified) {
      console.error('警告: 未能修改任何提示词节点');
    }
    
    // 使用Promise.race确保请求不会无限等待
    try {
      const imageUrl = await Promise.race([
        comfyui.generateImage(
          workflowConfig,
          '', // 不使用negativePrompt参数
          sessionId || 'default-session'
        ),
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('图像生成请求超时')), 30000); // 30秒超时
        })
      ]);
      
      console.log('图片生成成功:', imageUrl);

      return NextResponse.json({
        success: true,
        data: { imageUrl }
      });
    } catch (error) {
      console.error('图像生成失败:', error);
      
      // 检查是否是模型不存在的错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ckpt_name') && errorMessage.includes('not in')) {
        return NextResponse.json(
          {
            success: false,
            error: `模型${modelName || ''}在当前ComfyUI环境中不可用。请在ComfyUI中检查可用模型列表。`,
            details: { 
              errorType: 'model_not_available',
              modelName: modelName,
              originalError: errorMessage
            }
          },
          { status: 400 }
        );
      }
      
      throw error; // 重新抛出其他错误
    }
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