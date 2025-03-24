import { PromptState } from './types';
import { systemBasePrompt, extractPersonaPart, extractTonePart } from './system';
import { stagePrompts, getStageFormatRequirements } from './stages';
import { themePrompts, getExamplarByThemeAndStage } from './themes';
import { formatMessagesToPrompt, formatCreativeElements } from './memory';
import { Message } from '@/types/conversation';

export class PromptBuilder {
  /**
   * 构建完整提示词
   * 
   * @param state 提示词状态
   * @param userMessage 用户消息
   * @param messagesOrFormattedMemory 消息数组或已格式化的记忆文本
   * @param creativeElements 创意元素
   * @returns 构建的完整提示词
   */
  buildFullPrompt(
    state: PromptState, 
    userMessage: string,
    messagesOrFormattedMemory: Message[] | string,
    creativeElements?: {
      theme?: string;
      mainCharacter?: string;
      supportElements?: string[];
      needSummary?: boolean;
    }
  ): string {
    // 1. 获取各功能层内容
    const systemBase = systemBasePrompt;
    const stagePrompt = stagePrompts[state.currentStage];
    const themePrompt = state.themeDetected ? themePrompts[state.themeDetected] : '';
    
    console.log(`[PromptBuilder] 构建阶段${state.currentStage}提示词, needSummary: ${creativeElements?.needSummary}`);
    if (creativeElements?.mainCharacter) {
      console.log(`[PromptBuilder] 使用提取的主角: ${creativeElements.mainCharacter}`);
    }
    
    // 处理消息/记忆参数
    let messagesPrompt: string;
    if (typeof messagesOrFormattedMemory === 'string') {
      // 如果是字符串，直接使用
      messagesPrompt = messagesOrFormattedMemory;
    } else {
      // 如果是消息数组，格式化为文本
      messagesPrompt = formatMessagesToPrompt(messagesOrFormattedMemory);
    }
    
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
    
    // 如果是A阶段且需要总结，添加特殊指令
    let specialInstructions = '';
    if (state.currentStage === 'A' && creativeElements?.needSummary === true) {
      console.log(`[PromptBuilder] 添加总结指令到提示词`);
      let theme = creativeElements.theme || '用户提到的主题';
      
      specialInstructions = `
<special_instruction>
用户的故事主题已经足够具体。在你的回复中，你必须遵循以下要求：
1. 使用"那么，我们就来画[主题]"的形式对对话进行总结
2. 引导用户描述主角的特征和细节
3. 主角可能是"${creativeElements.mainCharacter || '未知'}"，但让用户确认并描述更多细节

这是非常重要的指令，你必须在回复中执行这个总结。
</special_instruction>
      `.trim();
      
      // 标记为已经添加了总结指令，下次不需要再添加
      creativeElements.needSummary = false;
    }
    
    // 3. 组合最终提示词
    return `
${personaAndTone}

${context}

${taskAndFormat}

${specialInstructions}

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
# 重要对话历史
${messagesPrompt || '尚无对话历史'}

${themePrompt ? `# 主题知识\n${themePrompt}\n\n` : ''}

# 已确认的创作元素
${elementsPrompt}
</context>
    `.trim();
  }
} 