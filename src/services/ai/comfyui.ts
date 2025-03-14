import { AI_SERVICES, API_ENDPOINTS } from '../config';
import type { ComfyUIWorkflow, ComfyUIPromptResponse, ComfyUIHistoryResponse } from '@/types/ai';

// 添加日志前缀函数
function log(message: string, data?: any) {
  const prefix = '[ComfyUI Service]';
  if (data) {
    console.log(prefix, message, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
}

export class ComfyUIService {
  private static instance: ComfyUIService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_COMFYUI_API_URL || 'http://localhost:8188';
    log('服务初始化', { baseUrl: this.baseUrl });
  }

  public static getInstance(): ComfyUIService {
    if (!ComfyUIService.instance) {
      ComfyUIService.instance = new ComfyUIService();
    }
    return ComfyUIService.instance;
  }

  // 查找工作流中的输出节点
  private findOutputNodes(workflow: ComfyUIWorkflow): string[] {
    const outputNodes: string[] = [];
    
    // 遍历所有节点
    Object.entries(workflow).forEach(([nodeId, node]) => {
      // 检查是否是输出相关节点（SaveImage, VAEDecode 等）
      if (
        node.class_type === 'SaveImage' ||
        node.class_type === 'VAEDecode' ||
        node.class_type === 'PreviewImage'
      ) {
        outputNodes.push(nodeId);
      }
    });

    return outputNodes;
  }

  // 查找工作流中的所有文本节点，返回正面提示词节点
  private findTextNodes(workflow: ComfyUIWorkflow): { 
    positiveNode: string | null; 
    allTextNodes: Array<{ 
      id: string; 
      type: 'positive' | 'negative'; 
      currentText: string; 
    }>;
  } {
    log('开始分析工作流节点', { workflowNodeCount: Object.keys(workflow).length });
    
    const allTextNodes: Array<{ 
      id: string; 
      type: 'positive' | 'negative'; 
      currentText: string; 
    }> = [];
    let positiveNode: string | null = null;

    // 首先找到 KSampler 节点，获取正负面提示词的连接信息
    let positiveNodeId: string | null = null;
    let negativeNodeId: string | null = null;

    // 查找 KSampler 节点
    log('开始查找 KSampler 节点...');
    for (const [nodeId, node] of Object.entries(workflow)) {
      log(`检查节点 ${nodeId}:`, {
        class_type: node.class_type,
        has_inputs: !!node.inputs,
        input_keys: node.inputs ? Object.keys(node.inputs) : []
      });

      if (node.class_type === 'KSampler') {
        log(`找到 KSampler 节点 ${nodeId}, 完整节点内容:`, node);
        
        if (node.inputs && typeof node.inputs === 'object') {
          const { positive, negative } = node.inputs;
          log('KSampler 输入解析:', { positive, negative });
          
          if (Array.isArray(positive) && positive.length > 0) {
            positiveNodeId = String(positive[0]);
            log('找到正面提示词节点ID:', positiveNodeId);
          }
          
          if (Array.isArray(negative) && negative.length > 0) {
            negativeNodeId = String(negative[0]);
            log('找到负面提示词节点ID:', negativeNodeId);
          }
          
          if (positiveNodeId || negativeNodeId) {
            log('成功解析 KSampler 连接:', {
              positive: positiveNodeId,
              negative: negativeNodeId
            });
            break;
          }
        }
      }
    }

    log('KSampler 节点分析结果:', {
      found: positiveNodeId !== null || negativeNodeId !== null,
      positiveNodeId,
      negativeNodeId
    });
    
    // 遍历所有节点，找出文本节点
    for (const [nodeId, node] of Object.entries(workflow)) {
      // 检查是否是文本输入节点
      if (node.class_type === 'CLIPTextEncode' && node.inputs && 'text' in node.inputs) {
        const currentText = String(node.inputs.text || '');
        
        log(`分析 CLIPTextEncode 节点 ${nodeId}:`, {
          text: currentText,
          meta: node._meta,
          isPositive: nodeId === positiveNodeId,
          isNegative: nodeId === negativeNodeId
        });

        // 根据连接关系判断节点类型
        const isPositive = nodeId === positiveNodeId;
        const isNegative = nodeId === negativeNodeId;
        
        if (!isPositive && !isNegative) {
          log(`警告: 文本节点 ${nodeId} 未连接到 KSampler`);
          continue; // 跳过未连接的节点
        }

        // 添加到所有文本节点列表
        allTextNodes.push({
          id: nodeId,
          type: isNegative ? 'negative' : 'positive',
          currentText
        });
        
        // 记录正面提示词节点
        if (isPositive) {
          positiveNode = nodeId;
          log(`确认正面提示词节点: ${nodeId}, 文本:`, currentText);
        } else {
          log(`确认负面提示词节点: ${nodeId}, 文本:`, currentText);
        }
      }
    }

    // 输出详细的节点分析结果
    log('文本节点分析结果:', {
      totalTextNodes: allTextNodes.length,
      positiveNode,
      allTextNodes,
      kSamplerConnections: {
        positive: positiveNodeId,
        negative: negativeNodeId
      }
    });

    return { positiveNode, allTextNodes };
  }

  // 从历史记录中获取图片文件名
  private getImageFilenameFromHistory(history: ComfyUIHistoryResponse, promptId: string, outputNodes: string[]): string | null {
    for (const nodeId of outputNodes) {
      const images = history[promptId]?.outputs?.[nodeId]?.images;
      if (images?.[0]?.filename) {
        return images[0].filename;
      }
    }
    return null;
  }

  async generateImage(prompt: string, negativePrompt: string = ''): Promise<string> {
    try {
      // 构建ComfyUI工作流
      const workflow = this.buildWorkflow(prompt, negativePrompt);
      
      // 发送请求
      const response = await fetch(`${this.baseUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });
      
      if (!response.ok) {
        throw new Error(`ComfyUI API 请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      const promptId = data.prompt_id;
      
      // 等待图像生成完成
      const imageUrl = await this.waitForImage(promptId);
      return imageUrl;
    } catch (error) {
      console.error('ComfyUI 服务调用失败:', error);
      return '';
    }
  }
  
  // 等待图像生成完成
  private async waitForImage(promptId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // 创建WebSocket连接
      const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/ws`);
      let imageUrl = '';
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        // 检查是否是我们的promptId的执行结果
        if (message.type === 'executed' && message.data.prompt_id === promptId) {
          // 查找输出节点的图像
          const outputs = message.data.output;
          for (const nodeId in outputs) {
            const nodeOutput = outputs[nodeId];
            if (nodeOutput.images && nodeOutput.images.length > 0) {
              const image = nodeOutput.images[0];
              imageUrl = `${this.baseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}`;
              break;
            }
          }
        }
        
        // 检查是否执行完成
        if (message.type === 'execution_complete' && message.data.prompt_id === promptId) {
          ws.close();
          if (imageUrl) {
            resolve(imageUrl);
          } else {
            reject(new Error('未找到生成的图像'));
          }
        }
      };
      
      ws.onerror = (error) => {
        reject(error);
      };
      
      // 设置超时
      setTimeout(() => {
        ws.close();
        reject(new Error('图像生成超时'));
      }, 60000); // 60秒超时
    });
  }
  
  // 构建ComfyUI工作流
  private buildWorkflow(prompt: string, negativePrompt: string): any {
    // 这里是一个简化的工作流，实际应用中可能需要更复杂的配置
    return {
      "3": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 20,
          "cfg": 7,
          "sampler_name": "euler_ancestral",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": "dreamshaper_8.safetensors"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": 512,
          "height": 512,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": negativePrompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "URPainter",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    };
  }
} 