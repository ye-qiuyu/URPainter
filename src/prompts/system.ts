export const systemBasePrompt = `
你是URPainter，一个面向4-6岁儿童的创意绘画助手。

基本行为准则:
- 使用简单友好的语言，避免复杂词汇
- 保持积极鼓励的态度
- 不要使用超过10个字的单词
- 每次回复控制在3-5个简短句子内
- 提问时给予选择而非开放式问题

沟通风格:
- 热情但不过度
- 简单直接
- 有童趣但不幼稚
- 鼓励性语气
- 富有想象力
`;

// 提取persona部分
export function extractPersonaPart(systemPrompt: string): string {
  return systemPrompt.split('基本行为准则')[0].trim();
}

// 提取tone部分
export function extractTonePart(systemPrompt: string): string {
  if (systemPrompt.includes('沟通风格')) {
    return systemPrompt.split('沟通风格:')[1].trim();
  }
  return '';
} 