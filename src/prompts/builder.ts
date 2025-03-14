import { PromptState } from './types';
import { systemBasePrompt, extractPersonaPart, extractTonePart } from './system';
import { stagePrompts, getStageFormatRequirements } from './stages';
import { themePrompts, getExamplarByThemeAndStage } from './themes';
import { formatMessagesToPrompt, formatCreativeElements } from './memory';
import { Message } from '@/types/conversation';

export class PromptBuilder {
  // 构建完整提示词
  buildFullPrompt(
    state: PromptState, 
    userMessage: string,
    messages: Message[],
    creativeElements?: {
      theme?: string;
      mainCharacter?: string;
      supportElements?: string[];
    }
  ): string {
    // 1. 获取各功能层内容
    const systemBase = systemBasePrompt;
    const stagePrompt = stagePrompts[state.currentStage];
    const themePrompt = state.themeDetected ? themePrompts[state.themeDetected] : '';
    const messagesPrompt = formatMessagesToPrompt(messages);
    const elementsPrompt = formatCreativeElements(
      creativeElements?.theme,
      creativeElements?.mainCharacter,
      creativeElements?.supportElements
    );
    
    // 2. 映射到架构层
    const personaAndTone = this.mapSystemToPersonaAndTone(systemBase);
    const taskAndFormat = this.mapStageToTaskAndFormat(stagePrompt, state.currentStage);
    const context = this.mapToContext(themePrompt, messagesPrompt, elementsPrompt);
    const exemplar = state.themeDetected ? 
      getExamplarByThemeAndStage(state.themeDetected, state.currentStage) : '';
    
    // 3. 组合最终提示词
    return `
${personaAndTone}

${context}

${taskAndFormat}

${exemplar ? `<exemplar>\n${exemplar}\n</exemplar>\n` : ''}

用户消息: ${userMessage}
    `.trim();
  }
  
  // 映射系统基础层到persona和tone
  private mapSystemToPersonaAndTone(systemBase: string): string {
    const personaPart = extractPersonaPart(systemBase);
    const tonePart = extractTonePart(systemBase);
    
    return `
<persona>
${personaPart}
</persona>

<tone>
${tonePart}
</tone>
    `.trim();
  }
  
  // 映射对话阶段层到task和format
  private mapStageToTaskAndFormat(stagePrompt: string, currentStage: string): string {
    const formatRequirements = getStageFormatRequirements(currentStage as any);
    
    return `
<task>
${stagePrompt}
</task>

<format>
${formatRequirements}
</format>
    `.trim();
  }
  
  // 映射主题和记忆到context
  private mapToContext(
    themePrompt: string, 
    messagesPrompt: string,
    elementsPrompt: string
  ): string {
    return `
<context>
${themePrompt ? `# 主题知识\n${themePrompt}\n\n` : ''}
# 对话历史
${messagesPrompt || '尚无对话历史'}

# 已确认的创作元素
${elementsPrompt}
</context>
    `.trim();
  }
} 