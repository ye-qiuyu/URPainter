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
    // 这里可以实现更复杂的提取逻辑，例如使用LLM分析对话
    // 简化实现，仅作为示例
    const elements: Partial<CreativeElements> = {};
    
    // 从最近的消息中查找可能的主题和主角
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      
      // 仅分析AI消息，因为它们更可能包含确认的元素
      if (msg.role === 'assistant') {
        const content = msg.content.toLowerCase();
        
        // 简单的关键词匹配
        if (!elements.theme && content.includes('主题')) {
          const themeMatch = content.match(/主题[是为：:]\s*([^，。!?]+)/);
          if (themeMatch) elements.theme = themeMatch[1].trim();
        }
        
        if (!elements.mainCharacter && (content.includes('主角') || content.includes('主要角色'))) {
          const characterMatch = content.match(/(主角|主要角色)[是为：:]\s*([^，。!?]+)/);
          if (characterMatch) elements.mainCharacter = characterMatch[2].trim();
        }
      }
    }
    
    return elements;
  }
} 