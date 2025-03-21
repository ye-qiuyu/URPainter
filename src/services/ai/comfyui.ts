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
      
      // 只保留工作流配置处理的逻辑，删除创建新工作流的代码
      let workflow;
      if (typeof prompt === 'object' && !Array.isArray(prompt) && prompt !== null && Object.keys(prompt).length > 0) {
        log('使用传入的工作流配置');
        workflow = prompt;
        
        // 从工作流中提取并打印节点信息，帮助调试
        this.extractWorkflowInfo(workflow);
      } else {
        log('错误: 未提供有效的工作流配置', { prompt });
        throw new Error('必须提供有效的工作流配置');
      }
      
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
        log('ComfyUI请求失败', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText,
          url: `${this.baseUrl}/prompt`,
          workflow: workflow
        });
        throw new Error(`ComfyUI API 请求失败: ${response.status} ${response.statusText}, ${errorText}`);
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
  
  // 从工作流中提取关键信息，用于调试
  private extractWorkflowInfo(workflow: any): void {
    try {
      log('分析工作流结构');
      
      // 如果工作流是ComfyUI UI中导出的格式，需要检查nodes数组
      if (workflow.nodes && Array.isArray(workflow.nodes)) {
        log('检测到ComfyUI界面导出的工作流格式');
        
        // 提取模型节点
        const checkpointNodes = workflow.nodes.filter(
          (node: any) => node.type === 'CheckpointLoaderSimple'
        );
        
        if (checkpointNodes.length > 0) {
          const modelNode = checkpointNodes[0];
          const modelName = modelNode.widgets_values?.[0];
          log('找到模型节点', { 
            nodeId: modelNode.id, 
            modelName: modelName
          });
        }
        
        // 提取提示词节点
        const textNodes = workflow.nodes.filter(
          (node: any) => node.type === 'CLIPTextEncode'
        );
        
        for (const node of textNodes) {
          const promptText = node.widgets_values?.[0];
          log('找到提示词节点', { 
            nodeId: node.id, 
            promptText: promptText
          });
        }
      }
      
      // 如果没有nodes数组，可能是API格式的工作流，检查每个节点
      else {
        log('检测到API格式的工作流');
        for (const [nodeId, node] of Object.entries(workflow)) {
          if (typeof node === 'object' && node !== null) {
            const typedNode = node as any;
            if ('class_type' in typedNode) {
              log(`节点 ${nodeId}:`, { 
                类型: typedNode.class_type,
                输入: typedNode.inputs 
              });
              
              // 检查是否是模型加载节点
              if (typedNode.class_type === 'CheckpointLoaderSimple' && typedNode.inputs?.ckpt_name) {
                log('找到模型节点', { 
                  nodeId: nodeId, 
                  modelName: typedNode.inputs.ckpt_name 
                });
              }
              
              // 检查是否是提示词节点
              if (typedNode.class_type === 'CLIPTextEncode' && typedNode.inputs?.text) {
                log('找到提示词节点', { 
                  nodeId: nodeId, 
                  promptText: typedNode.inputs.text 
                });
              }
            }
          }
        }
      }
    } catch (error) {
      log('提取工作流信息失败', { error });
    }
  }
} 