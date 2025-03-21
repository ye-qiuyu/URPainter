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
    // 将WebSocket实现替换为HTTP轮询
    log('使用HTTP轮询方式检查图像生成状态', { promptId });
    
    const maxAttempts = 30; // 最多尝试30次
    const interval = 1000; // 每秒检查一次
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        log(`检查历史记录 (${attempt + 1}/${maxAttempts})...`);
        
        // 请求历史记录API
        const response = await fetch(`${this.baseUrl}/history/${promptId}`);
        
        if (!response.ok) {
          log('获取历史记录失败', { 
            status: response.status, 
            statusText: response.statusText 
          });
          // 继续尝试
        } else {
          const history = await response.json();
          log('获取历史记录成功', { historyPreview: JSON.stringify(history).substring(0, 200) });
          
          // 查找输出节点的图像
          if (history && history[promptId] && history[promptId].outputs) {
            for (const nodeId in history[promptId].outputs) {
              const nodeOutput = history[promptId].outputs[nodeId];
              if (nodeOutput.images && nodeOutput.images.length > 0) {
                const image = nodeOutput.images[0];
                const imageUrl = `${this.baseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}`;
                log('从历史记录中找到图像URL', { imageUrl });
                return imageUrl;
              }
            }
          }
        }
        
        // 如果没有找到结果，等待一段时间后再次尝试
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        log('检查历史记录出错', { error });
        // 出错时继续尝试
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    // 如果多次尝试后仍未找到图像，则抛出错误
    throw new Error('等待图像生成超时，未找到生成的图像');
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