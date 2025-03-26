import { Message } from '@/types/conversation';

// 将消息历史格式化为提示词
export function formatMessagesToPrompt(messages: Message[]): string {
  if (!messages.length) return '';
  
  // 添加记忆重要性的前缀
  const prefix = `以下是之前的对话历史，请仔细阅读并记住这些内容，因为用户可能会询问关于之前对话的问题：\n\n`;
  
  // 格式化每条消息，添加时间信息
  const formattedMessages = messages.map((msg, index) => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const messageNumber = index + 1;
    return `消息#${messageNumber} [${time}] ${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`;
  }).join('\n\n');
  
  return prefix + formattedMessages;
}

/**
 * 格式化确认的创意元素
 * 
 * @param theme 主题
 * @param mainCharacter 主角
 * @param supportElements 辅助元素
 * @returns 格式化的创意元素字符串
 */
export function formatCreativeElements(
  theme?: string,
  mainCharacter?: string,
  supportElements?: string[]
): string {
  // 注意：此函数已被注释掉，当前会返回空字符串
  // 如果需要恢复创意元素显示，请取消下面代码的注释
  
  /*
  const elements = [];
  
  if (theme) {
    elements.push(`- 主题: ${theme}`);
  }
  
  if (mainCharacter) {
    elements.push(`- 主角: ${mainCharacter}`);
  }
  
  if (supportElements && supportElements.length > 0) {
    elements.push(`- 辅助元素: ${supportElements.join('、')}`);
  }
  
  if (elements.length === 0) {
    return '尚未确认任何创意元素';
  }
  
  return elements.join('\n');
  */
  
  // 返回空字符串
  return '';
} 