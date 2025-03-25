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
    let stagedMemories: string = '';
    
    if (typeof messagesOrFormattedMemory === 'string') {
      // 如果是字符串，检查是否包含阶段记忆总结部分
      const memoryContent = messagesOrFormattedMemory;
      
      // 提取阶段记忆总结（如果存在）
      const stagedMemoryMatch = memoryContent.match(/## 阶段记忆总结\n([\s\S]+?)(?=\n\n|$)/);
      if (stagedMemoryMatch) {
        stagedMemories = stagedMemoryMatch[1];
        // 从主要记忆内容中移除阶段记忆总结部分，以避免重复
        messagesPrompt = memoryContent.replace(/## 阶段记忆总结\n[\s\S]+?(?=\n\n|$)/, '').trim();
        console.log(`[PromptBuilder] 提取到阶段记忆总结，长度: ${stagedMemories.length}`);
      } else {
        messagesPrompt = memoryContent;
      }
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
    const context = this.mapToContext(themePrompt, messagesPrompt, elementsPrompt, stagedMemories);
    const exemplar = state.themeDetected ? 
      getExamplarByThemeAndStage(state.themeDetected, state.currentStage) : '';
    
    // 只在B1阶段添加特殊指令
    let specialInstructions = '';
    
    if (state.currentStage === 'B1' && creativeElements?.mainCharacter) {
      console.log(`[PromptBuilder] 在B1阶段添加主角引导指令: ${creativeElements.mainCharacter}`);
      let theme = creativeElements.theme || '小朋友提到的故事';
      
      specialInstructions = `
<special_instruction>
在回复开头，请确保遵循以下要求：
1. 以"那么，我们就来画[主题]"的方式总结要画的内容
2. 引导用户描述主角("${creativeElements.mainCharacter || '主角'}")的细节特征
3. 提出关于主角外观、颜色、特点等方面的具体问题
4. 保持简短友好的语气，适合4-6岁儿童理解

请注意：这是主角创作阶段的首次回复，必须以总结句式开头并引导用户描述主角。
</special_instruction>
      `.trim();
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
  
  // 映射主题和记忆到context，增加对阶段记忆的支持
  private mapToContext(
    themePrompt: string, 
    messagesPrompt: string,
    elementsPrompt: string,
    stagedMemories: string = ''
  ): string {
    return `
<context>
# 重要对话历史
${messagesPrompt || '尚无对话历史'}

${themePrompt ? `# 主题知识\n${themePrompt}\n\n` : ''}

# 已确认的创作元素
${elementsPrompt}

${stagedMemories ? `# 阶段记忆总结\n${stagedMemories}\n\n` : ''}
</context>
    `.trim();
  }
} 