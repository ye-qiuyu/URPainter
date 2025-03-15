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

  async generateImage(prompt: string | any, negativePrompt: string = '', sessionId: string = 'default-session'): Promise<string> {
    try {
      log('开始生成图像', { prompt, negativePrompt, sessionId, baseUrl: this.baseUrl });
      
      // 如果prompt是工作流配置，直接使用
      let workflow;
      if (typeof prompt === 'object' && !Array.isArray(prompt) && prompt !== null && Object.keys(prompt).length > 0 && 
          Object.values(prompt).some(node => typeof node === 'object' && node !== null && 'class_type' in node)) {
        log('检测到prompt是工作流配置，直接使用');
        workflow = prompt;
      } else {
        // 否则构建工作流
        log('构建新的工作流');
        workflow = this.buildWorkflow(prompt, negativePrompt);
      }
      log('使用的工作流', workflow);
      
      // 发送请求
      log('发送请求到ComfyUI', { url: `${this.baseUrl}/prompt` });
      const response = await fetch(`${this.baseUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: workflow }), // 注意这里需要包装在prompt字段中
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log('ComfyUI请求失败', { status: response.status, error: errorText });
        throw new Error(`ComfyUI API 请求失败: ${response.status}, ${errorText}`);
      }
      
      const data = await response.json();
      log('ComfyUI响应', data);
      const promptId = data.prompt_id;
      
      if (!promptId) {
        throw new Error('ComfyUI响应中没有prompt_id');
      }
      
      // 等待图像生成完成
      log('等待图像生成完成', { promptId });
      const imageUrl = await this.waitForImage(promptId);
      log('图像生成完成', { imageUrl });
      return imageUrl;
    } catch (error) {
      console.error('ComfyUI 服务调用失败:', error);
      return '';
    }
  }
  
  // 等待图像生成完成
  private async waitForImage(promptId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      log('创建WebSocket连接', { wsUrl: `${this.baseUrl.replace('http', 'ws')}/ws` });
      
      // 创建WebSocket连接
      const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/ws`);
      let imageUrl = '';
      let lastProgress = 0;
      let progressStableCount = 0;
      let lastCheckTime = Date.now();
      const checkInterval = 500; // 每0.5秒检查一次历史记录
      let progressReached100 = false;
      let progressReached100Time = 0;
      
      // 定期检查历史记录的函数
      const checkHistory = async () => {
        const now = Date.now();
        // 如果进度已经达到100%，或者距离上次检查已经过了checkInterval时间
        if (progressReached100 || now - lastCheckTime >= checkInterval) {
          lastCheckTime = now;
          log('检查历史记录...');
          
          try {
            const response = await fetch(`${this.baseUrl}/history/${promptId}`);
            const history = await response.json();
            log('获取历史记录成功', { history: JSON.stringify(history).substring(0, 200) });
            
            // 查找输出节点的图像
            if (history && history[promptId] && history[promptId].outputs) {
              for (const nodeId in history[promptId].outputs) {
                const nodeOutput = history[promptId].outputs[nodeId];
                if (nodeOutput.images && nodeOutput.images.length > 0) {
                  const image = nodeOutput.images[0];
                  imageUrl = `${this.baseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}`;
                  log('从历史记录中找到图像URL', { imageUrl });
                  
                  ws.close();
                  resolve(imageUrl);
                  return true;
                }
              }
            }
            
            // 如果进度已经达到100%，并且已经等待了一段时间，但仍然没有找到图像，则再等待一段时间后再次检查
            if (progressReached100) {
              const waitTime = now - progressReached100Time;
              log('进度已达到100%，但未找到图像', { waitTime });
              
              // 如果等待时间超过3秒，则认为图像生成已完成，但没有找到图像
              if (waitTime > 3000) {
                log('等待超过3秒仍未找到图像，结束等待');
                ws.close();
                reject(new Error('未找到生成的图像'));
                return true;
              }
            }
            
            log('历史记录中未找到图像');
            return false;
          } catch (error) {
            log('获取历史记录失败', { error });
            return false;
          }
        }
        return false;
      };
      
      ws.onopen = () => {
        log('WebSocket连接已打开');
      };
      
      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          log('收到WebSocket消息', { 
            type: message.type, 
            promptId: message.data?.prompt_id,
            data: message.data ? JSON.stringify(message.data).substring(0, 200) : null
          });
          
          // 检查是否是进度消息
          if (message.type === 'progress' && message.data && message.data.prompt_id === promptId) {
            const progress = message.data.value || 0;
            const max = message.data.max || 1;
            const percentage = Math.round((progress / max) * 100);
            
            log('图像生成进度', { progress, max, percentage, lastProgress });
            
            // 检查进度是否已经达到100%
            if (percentage === 100 && !progressReached100) {
              progressReached100 = true;
              progressReached100Time = Date.now();
              log('进度达到100%，开始检查历史记录');
              
              // 进度达到100%时立即检查历史记录
              const found = await checkHistory();
              if (found) return;
              
              // 如果没有找到图像，设置一个定时器，每0.5秒检查一次历史记录
              const checkInterval = setInterval(async () => {
                const found = await checkHistory();
                if (found) {
                  clearInterval(checkInterval);
                }
              }, 500);
              
              // 3秒后如果仍然没有找到图像，清除定时器
              setTimeout(() => {
                clearInterval(checkInterval);
              }, 3000);
            }
            
            // 检测进度是否停滞（连续多次相同进度）
            if (percentage === lastProgress) {
              progressStableCount++;
              log('进度停滞检测', { progressStableCount, percentage });
              
              // 如果进度停滞，检查历史记录
              if (progressStableCount >= 3) {
                await checkHistory();
              }
            } else {
              lastProgress = percentage;
              progressStableCount = 0;
            }
            
            // 每收到进度消息也定期检查历史记录
            await checkHistory();
          }
          
          // 检查是否是我们的promptId的执行结果
          if (message.type === 'executed' && message.data && message.data.prompt_id === promptId) {
            log('收到执行结果', { outputs: JSON.stringify(message.data.output).substring(0, 200) });
            
            // 查找输出节点的图像
            const outputs = message.data.output;
            for (const nodeId in outputs) {
              const nodeOutput = outputs[nodeId];
              if (nodeOutput.images && nodeOutput.images.length > 0) {
                const image = nodeOutput.images[0];
                imageUrl = `${this.baseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}`;
                log('找到图像URL', { imageUrl });
                break;
              }
            }
            
            // 如果在执行结果中找到了图像URL，立即返回
            if (imageUrl) {
              ws.close();
              resolve(imageUrl);
              return;
            }
            
            // 否则检查历史记录
            await checkHistory();
          }
          
          // 检查是否执行完成
          if (message.type === 'execution_complete' && message.data && message.data.prompt_id === promptId) {
            log('执行完成', { hasImageUrl: !!imageUrl });
            ws.close();
            if (imageUrl) {
              resolve(imageUrl);
            } else {
              // 如果没有找到图像URL，尝试从历史记录中获取
              const found = await checkHistory();
              if (!found) {
                reject(new Error('未找到生成的图像'));
              }
            }
          }
        } catch (error) {
          log('解析WebSocket消息失败', { error, data: event.data });
        }
      };
      
      ws.onerror = (error) => {
        log('WebSocket错误', { error });
        reject(error);
      };
      
      ws.onclose = () => {
        log('WebSocket连接已关闭');
      };
      
      // 设置超时
      setTimeout(async () => {
        log('图像生成超时');
        
        // 在超时前尝试从历史记录中获取图像
        const found = await checkHistory();
        if (!found) {
          ws.close();
          reject(new Error('图像生成超时'));
        }
      }, 20000); // 20秒超时
    });
  }
  
  // 构建ComfyUI工作流
  private buildWorkflow(prompt: string | any, negativePrompt: string): any {
    // 使用服务器上可用的模型名称
    const modelName = "v1-5-pruned-emaonly-fp16.safetensors"; // 根据服务器上可用的模型
    
    // 确保prompt是字符串
    if (typeof prompt === 'object') {
      log('警告: prompt是对象，尝试提取正确的提示词', { prompt });
      
      // 如果prompt是一个包含工作流的对象，尝试从中提取正面提示词
      if (prompt && typeof prompt === 'object' && 
          prompt['6'] && typeof prompt['6'] === 'object' && 
          prompt['6'].inputs && typeof prompt['6'].inputs === 'object' && 
          prompt['6'].inputs.text) {
        prompt = String(prompt['6'].inputs.text);
        log('从工作流对象中提取的提示词', { extractedPrompt: prompt });
      } else {
        // 如果无法提取，使用默认提示词
        prompt = "a beautiful landscape";
        log('无法从对象中提取提示词，使用默认值', { defaultPrompt: prompt });
      }
    }
    
    log('构建工作流', { prompt, negativePrompt, modelName });
    
    // 这里是一个简化的工作流，实际应用中可能需要更复杂的配置
    return {
      "3": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 20,
          "cfg": 7,
          "sampler_name": "euler",  // 使用服务器支持的采样器
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
          "ckpt_name": modelName
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
          "text": prompt, // 确保这里是字符串
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": negativePrompt, // 确保这里是字符串
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