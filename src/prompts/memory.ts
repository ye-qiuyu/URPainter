import { Message } from '@/types/conversation';

// 将消息历史格式化为提示词
export function formatMessagesToPrompt(messages: Message[]): string {
  if (!messages.length) return '';
  
  return messages.map(msg => 
    `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`
  ).join('\n\n');
}

// 格式化已确认的创作元素
export function formatCreativeElements(
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