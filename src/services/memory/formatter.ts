import { Message } from '@/types/conversation';
import { formatMessagesToPrompt } from '@/prompts/memory';
import { CreativeElements } from './storage';

export class MemoryFormatter {
  // 格式化消息
  formatMessages(messages: Message[]): string {
    return formatMessagesToPrompt(messages);
  }
  
  // 格式化创作元素
  formatCreativeElements(elements: CreativeElements): string {
    return this.formatElementsToString(
      elements.theme,
      elements.mainCharacter,
      elements.supportElements
    );
  }
  
  // 格式化元素为字符串
  private formatElementsToString(
    theme?: string,
    mainCharacter?: string,
    supportElements?: string[]
  ): string {
    const elements = [];
    
    if (theme) elements.push(`- 主题: ${theme}`);
    if (mainCharacter) elements.push(`- 主角: ${mainCharacter}`);
    if (supportElements?.length) {
      elements.push(`- 其他元素: ${supportElements.join(', ')}`);
    }
    
    return elements.length ? elements.join('\n') : '尚未确认任何创作元素';
  }
  
  // 提取关键创作元素
  extractCreativeElements(messages: Message[]): Partial<CreativeElements> {
    // 初始化创意元素对象
    const elements: Partial<CreativeElements> = {
      theme: undefined,
      mainCharacter: undefined,
      supportElements: []
    };
    
    // 如果没有消息，返回空对象
    if (!messages || messages.length === 0) {
      return elements;
    }
    
    // 关键词匹配模式
    const themePatterns = [
      /主题[是为：:]\s*([^，。!?]+)/i,
      /关于([^，。!?]+)的故事/i,
      /想[画做创]([^，。!?]+)/i
    ];
    
    const characterPatterns = [
      /(主角|主要角色)[是为：:]\s*([^，。!?]+)/i,
      /([^，。!?]+)是主角/i,
      /画一[个只条匹]([^，。!?]+)/i
    ];
    
    const supportElementPatterns = [
      /(还有|还需要|也有|加上)([^，。!?]+)/i,
      /在([^，。!?]+)里面/i,
      /和([^，。!?]+)一起/i
    ];
    
    // 遍历所有消息，提取关键元素
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const content = msg.content.toLowerCase();
      
      // 提取主题
      if (!elements.theme) {
        for (const pattern of themePatterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            elements.theme = match[1].trim();
            break;
          }
        }
      }
      
      // 提取主角
      if (!elements.mainCharacter) {
        for (const pattern of characterPatterns) {
          const match = content.match(pattern);
          if (match && (match[2] || match[1])) {
            elements.mainCharacter = (match[2] || match[1]).trim();
            break;
          }
        }
      }
      
      // 提取支持元素
      for (const pattern of supportElementPatterns) {
        const match = content.match(pattern);
        if (match && (match[1] || match[2])) {
          const element = match[2] ? match[2].trim() : match[1].trim();
          // 避免重复添加
          if (element && 
              element !== elements.theme && 
              element !== elements.mainCharacter && 
              !elements.supportElements?.includes(element)) {
            elements.supportElements = [...(elements.supportElements || []), element];
          }
        }
      }
    }
    
    return elements;
  }
} 