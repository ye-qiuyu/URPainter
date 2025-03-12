import { AI_SERVICES, API_ENDPOINTS } from '../config';
import type { ComfyUIWorkflow, ComfyUIPromptResponse, ComfyUIHistoryResponse } from '@/types/ai';

export class ComfyUIService {
  private static instance: ComfyUIService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = AI_SERVICES.COMFYUI.BASE_URL;
    console.log('ComfyUI服务初始化，基础URL:', this.baseUrl);
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
    console.log('开始分析工作流节点:', Object.keys(workflow).length, '个节点');
    
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
    console.log('开始查找 KSampler 节点...');
    for (const [nodeId, node] of Object.entries(workflow)) {
      console.log(`检查节点 ${nodeId}:`, {
        class_type: node.class_type,
        has_inputs: !!node.inputs,
        input_keys: node.inputs ? Object.keys(node.inputs) : []
      });

      if (node.class_type === 'KSampler') {
        console.log(`找到 KSampler 节点 ${nodeId}, 完整节点内容:`, node);
        
        if (node.inputs && typeof node.inputs === 'object') {
          const { positive, negative } = node.inputs;
          console.log('KSampler 输入解析:', { positive, negative });
          
          if (Array.isArray(positive) && positive.length > 0) {
            positiveNodeId = String(positive[0]);
            console.log('找到正面提示词节点ID:', positiveNodeId);
          }
          
          if (Array.isArray(negative) && negative.length > 0) {
            negativeNodeId = String(negative[0]);
            console.log('找到负面提示词节点ID:', negativeNodeId);
          }
          
          if (positiveNodeId || negativeNodeId) {
            console.log('成功解析 KSampler 连接:', {
              positive: positiveNodeId,
              negative: negativeNodeId
            });
            break;
          }
        }
      }
    }

    console.log('KSampler 节点分析结果:', {
      found: positiveNodeId !== null || negativeNodeId !== null,
      positiveNodeId,
      negativeNodeId
    });
    
    // 遍历所有节点，找出文本节点
    for (const [nodeId, node] of Object.entries(workflow)) {
      // 检查是否是文本输入节点
      if (node.class_type === 'CLIPTextEncode' && node.inputs && 'text' in node.inputs) {
        const currentText = String(node.inputs.text || '');
        
        console.log(`分析 CLIPTextEncode 节点 ${nodeId}:`, {
          text: currentText,
          meta: node._meta,
          isPositive: nodeId === positiveNodeId,
          isNegative: nodeId === negativeNodeId
        });

        // 根据连接关系判断节点类型
        const isPositive = nodeId === positiveNodeId;
        const isNegative = nodeId === negativeNodeId;
        
        if (!isPositive && !isNegative) {
          console.log(`警告: 文本节点 ${nodeId} 未连接到 KSampler`);
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
          console.log(`确认正面提示词节点: ${nodeId}, 文本:`, currentText);
        } else {
          console.log(`确认负面提示词节点: ${nodeId}, 文本:`, currentText);
        }
      }
    }

    // 输出详细的节点分析结果
    console.log('文本节点分析结果:', {
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

  async generateImage(
    workflow: ComfyUIWorkflow,
    prompt: string,
    sessionId: string
  ): Promise<string> {
    try {
      console.log('开始生成图片请求:', {
        baseUrl: this.baseUrl,
        promptLength: prompt.length,
        sessionId,
        workflowNodeCount: Object.keys(workflow).length
      });
      
      // 1. 分析工作流结构
      const outputNodes = this.findOutputNodes(workflow);
      const { positiveNode, allTextNodes } = this.findTextNodes(workflow);

      if (!positiveNode) {
        throw new Error('未找到正面提示词节点');
      }

      // 2. 构建请求体
      const updatedWorkflow = { ...workflow };
      if (updatedWorkflow[positiveNode]?.inputs) {
        updatedWorkflow[positiveNode] = {
          ...updatedWorkflow[positiveNode],
          inputs: {
            ...updatedWorkflow[positiveNode].inputs,
            text: prompt
          }
        };
      }

      // 3. 直接调用 ComfyUI 服务
      const requestUrl = `${this.baseUrl}/prompt`;
      const requestBody = {
        prompt: updatedWorkflow,
        client_id: sessionId,
      };
      
      console.log('准备发送请求到 ComfyUI:', {
        url: requestUrl,
        method: 'POST',
        bodySize: JSON.stringify(requestBody).length,
        baseUrl: this.baseUrl
      });

      try {
        const promptResponse = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!promptResponse.ok) {
          const errorText = await promptResponse.text();
          console.error('ComfyUI 请求失败:', {
            status: promptResponse.status,
            statusText: promptResponse.statusText,
            error: errorText,
            url: requestUrl
          });
          throw new Error(`ComfyUI请求失败: ${promptResponse.status}, ${errorText}`);
        }

        const responseData = await promptResponse.json();
        console.log('ComfyUI 响应成功:', responseData);
        
        const { prompt_id } = responseData as ComfyUIPromptResponse;
        console.log('获取到prompt_id:', prompt_id);

        // 4. 轮询检查任务状态
        let imageFilename: string | null = null;
        let attempts = 0;
        const maxAttempts = 60;

        while (!imageFilename && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;

          const historyUrl = `${this.baseUrl}/history/${prompt_id}`;
          console.log(`检查生成状态 [${attempts}/${maxAttempts}]:`, historyUrl);
          
          const historyResponse = await fetch(historyUrl);
          
          if (!historyResponse.ok) {
            const errorText = await historyResponse.text();
            console.error('历史记录检查失败:', {
              status: historyResponse.status,
              error: errorText,
              url: historyUrl
            });
            throw new Error(`历史记录检查失败: ${historyResponse.status}, ${errorText}`);
          }

          const history = await historyResponse.json() as ComfyUIHistoryResponse;
          imageFilename = this.getImageFilenameFromHistory(history, prompt_id, outputNodes);
          
          if (imageFilename) {
            console.log('图片生成完成:', imageFilename);
            break;
          }
        }

        if (!imageFilename) {
          throw new Error('图片生成超时');
        }

        // 5. 返回完整的图片URL
        const imageUrl = `${this.baseUrl}/view?filename=${imageFilename}&type=output`;
        console.log('返回图片URL:', imageUrl);
        return imageUrl;
      } catch (fetchError) {
        console.error('网络请求错误:', {
          error: fetchError,
          message: fetchError.message,
          url: requestUrl
        });
        throw fetchError;
      }
    } catch (error) {
      console.error('ComfyUI服务错误:', {
        error,
        message: error.message,
        baseUrl: this.baseUrl
      });
      throw error;
    }
  }
} 