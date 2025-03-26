import { PromptState } from './types';
import { systemBasePrompt, extractPersonaPart, extractTonePart } from './system';
import { stagePrompts, getStageFormatRequirements } from './stages';
import { themePrompts, getExamplarByThemeAndStage } from './themes';
import { formatMessagesToPrompt, formatCreativeElements } from './memory';
import { Message, ConversationStage, ThemeCategory } from '@/types/conversation';
import { StagedMemory } from '@/services/memory/staged/StagedMemory';

export class PromptBuilder {
  /**
   * 构建完整提示词
   * 
   * @param state 提示词状态
   * @param userMessage 用户消息
   * @param messagesOrFormattedMemory 消息数组或已格式化的记忆文本
   * @param creativeElements 创意元素
   * @param stagedMemories 分阶段记忆内容
   * @param summarizedStages 已总结的阶段列表
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
    },
    stagedMemories?: string,
    summarizedStages: string[] = []
  ): string {
    // 1. 获取各功能层内容
    const systemBase = systemBasePrompt;
    // 使用类型转换确保类型安全
    const stagePrompt = stagePrompts[state.currentStage as keyof typeof stagePrompts];
    const themePrompt = state.themeDetected ? themePrompts[state.themeDetected as keyof typeof themePrompts] : '';
    
    console.log(`[PromptBuilder] 构建阶段${state.currentStage}提示词, needSummary: ${creativeElements?.needSummary}`);
    if (creativeElements?.mainCharacter) {
      console.log(`[PromptBuilder] 使用提取的主角: ${creativeElements.mainCharacter}`);
    }
    
    // 处理消息/记忆参数
    let messagesPrompt: string;
    let extractedStagedMemories: string = stagedMemories || '';
    
    // 检查是否传入了已总结阶段列表
    if (summarizedStages && summarizedStages.length > 0) {
      console.log(`[PromptBuilder] 使用传入的已总结阶段列表: ${summarizedStages.join(', ')}`);
    } else {
      // 如果没有传入，尝试从阶段记忆总结中提取
      summarizedStages = [];
      if (extractedStagedMemories && extractedStagedMemories !== '尚无历史记忆') {
        // 从阶段记忆总结中提取阶段信息
        const stageMatches = extractedStagedMemories.match(/##\s*阶段([A-Z0-9]+)记忆/g);
        if (stageMatches) {
          stageMatches.forEach(match => {
            // 提取阶段名，如"阶段B记忆"提取为"B"
            const stageName = match.replace(/##\s*阶段([A-Z0-9]+)记忆/, '$1');
            if (stageName) {
              summarizedStages.push(stageName);
              console.log(`[PromptBuilder] 已提取总结阶段: ${stageName}`);
            }
          });
        }
        
        // 检查是否有阶段组记忆
        if (extractedStagedMemories.includes('阶段B记忆')) {
          console.log(`[PromptBuilder] 检测到B阶段组记忆，将过滤B1和B2阶段的消息`);
        }
        if (extractedStagedMemories.includes('阶段C记忆')) {
          console.log(`[PromptBuilder] 检测到C阶段组记忆，将过滤C1和C2阶段的消息`);
        }
      }
    }
    
    if (typeof messagesOrFormattedMemory === 'string') {
      // 如果是字符串，检查是否包含阶段记忆总结部分（旧格式兼容）
      const memoryContent = messagesOrFormattedMemory;
      
      // 提取阶段记忆总结（如果存在且没有提供独立的stagedMemories参数）
      if (!stagedMemories) {
        const stagedMemoryMatch = memoryContent.match(/## 阶段记忆总结\n([\s\S]+?)(?=\n\n|$)/);
        if (stagedMemoryMatch) {
          extractedStagedMemories = stagedMemoryMatch[1];
          // 从主要记忆内容中移除阶段记忆总结部分，以避免重复
          messagesPrompt = memoryContent.replace(/## 阶段记忆总结\n[\s\S]+?(?=\n\n|$)/, '').trim();
          console.log(`[PromptBuilder] 提取到阶段记忆总结，长度: ${extractedStagedMemories.length}`);
        } else {
          messagesPrompt = memoryContent;
        }
      } else {
        messagesPrompt = memoryContent;
        console.log(`[PromptBuilder] 使用外部提供的阶段记忆总结，长度: ${extractedStagedMemories.length}`);
      }
    } else {
      // 如果是消息数组，使用StagedMemory获取当前阶段的消息
      console.log(`[PromptBuilder] 开始处理消息数组，长度: ${messagesOrFormattedMemory.length}，当前阶段: ${state.currentStage}`);
      
      // 直接使用StagedMemory获取当前阶段的消息
      const optimizedMessages = this.optimizeMessagesForStage(
        messagesOrFormattedMemory, 
        this.getMessageLimitForStage(state.currentStage), 
        state.currentStage,
        summarizedStages,
        state.conversationId
      );
      
      // 只有在还有消息需要保留的情况下才格式化，否则可能返回空
      if (optimizedMessages.length > 0) {
        messagesPrompt = formatMessagesToPrompt(optimizedMessages);
        console.log(`[PromptBuilder] 消息优化完成：原始${messagesOrFormattedMemory.length}条 -> 优化后${optimizedMessages.length}条，当前阶段: ${state.currentStage}`);
      } else {
        messagesPrompt = '尚无对话历史';
        console.log(`[PromptBuilder] 当前阶段无消息，返回空历史`);
      }
    }
    
    // 注意：formatCreativeElements已被注释，现在始终返回空字符串
    // 如果需要恢复创作元素显示，请取消src/prompts/memory.ts中相关代码的注释
    const elementsPrompt = formatCreativeElements(
      creativeElements?.theme,
      creativeElements?.mainCharacter,
      creativeElements?.supportElements
    );
    
    // 2. 映射到架构层
    const personaAndTone = this.mapSystemToPersonaAndTone(systemBase);
    const taskAndFormat = this.mapStageToTaskAndFormat(stagePrompt, state.currentStage);
    const context = this.mapToContext(
      themePrompt, 
      messagesPrompt, 
      elementsPrompt, 
      extractedStagedMemories,
      state.currentStage
    );
    const exemplar = state.themeDetected ? 
      getExamplarByThemeAndStage(state.themeDetected as ThemeCategory, state.currentStage as ConversationStage) : '';
    
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
  
  /**
   * 获取当前阶段的消息数量限制
   * 注意：这个限制不应该应用于当前正在进行的阶段，
   * 而是应该应用于之前的历史消息
   */
  private getMessageLimitForStage(stage: string): number {
    switch (stage) {
      case 'A':
        return 10;  // A阶段历史可以保留稍多的消息，因为主题可能需要更多上下文
      case 'B1':
      case 'B2':
        return 15; // B阶段需要足够的消息来了解主角
      case 'C1':
      case 'C2':
        return 12;  // C阶段需要足够的消息来理解添加的元素
      case 'D':
        return 20; // D阶段可能需要更多上下文来总结整个过程
      default:
        return 15;
    }
  }
  
  /**
   * 针对不同阶段优化消息，移除已总结阶段的消息
   * 使用StagedMemory获取指定阶段的消息
   */
  private optimizeMessagesForStage(
    messages: Message[], 
    limit: number, 
    currentStage: ConversationStage | string,
    summarizedStages: string[] = [],
    conversationId?: string
  ): Message[] {
    if (messages.length === 0) return messages;
    
    // 如果提供了会话ID，则直接使用StagedMemory获取当前阶段的消息
    if (conversationId) {
      const stagedMemory = StagedMemory.getInstance();
      const stageMessages = stagedMemory.getStageMessages(conversationId, currentStage as ConversationStage);
      
      console.log(`[PromptBuilder] 直接从StagedMemory获取阶段${currentStage}的消息: ${stageMessages.length}条`);
      
      // 如果消息数量超过限制，应用基本限制
      if (stageMessages.length > limit) {
        console.log(`[PromptBuilder] 阶段${currentStage}消息超过限制(${limit})，应用裁剪`);
        return stageMessages.slice(-limit);
      }
      
      return stageMessages;
    }
    
    // 如果没有提供会话ID，则保留一个简单的基本限制策略作为备选
    console.log(`[PromptBuilder] 未提供会话ID，使用基本限制策略: 限制为${limit}条消息`);
    return messages.slice(-limit);
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
  
  // 映射主题和记忆到context，优化阶段记忆的布局
  private mapToContext(
    themePrompt: string, 
    messagesPrompt: string,
    elementsPrompt: string,
    stagedMemories: string = '',
    currentStage: string
  ): string {
    // 根据当前阶段决定记忆的排序方式
    const shouldPrioritizeMemories = ['B1', 'B2', 'C1', 'C2', 'D'].includes(currentStage);
    
    // 为B, C和D阶段，将阶段记忆放在更靠前的位置，增加其重要性
    if (shouldPrioritizeMemories && stagedMemories) {
      return `
<context>
${stagedMemories ? `# 阶段记忆总结\n${stagedMemories}\n\n` : ''}

# 已确认的创作元素
${elementsPrompt}

${themePrompt ? `# 主题知识\n${themePrompt}\n\n` : ''}

# 重要对话历史
${messagesPrompt || '尚无对话历史'}
</context>
      `.trim();
    }
    
    // 对于A阶段或没有阶段记忆的情况，使用原始顺序
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