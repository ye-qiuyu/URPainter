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
    const stagePrompt = stagePrompts[state.currentStage];
    const themePrompt = state.themeDetected ? themePrompts[state.themeDetected] : '';
    
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
      // 如果是消息数组，应用智能过滤和优化
      console.log(`[PromptBuilder] 开始处理消息数组，长度: ${messagesOrFormattedMemory.length}，当前阶段: ${state.currentStage}`);
      
      // 应用严格过滤，移除已总结阶段的消息
      const filteredMessages = this.optimizeMessagesForStage(
        messagesOrFormattedMemory, 
        this.getMessageLimitForStage(state.currentStage), 
        state.currentStage,
        summarizedStages
      );
      
      // 只有在还有消息需要保留的情况下才格式化，否则可能返回空
      if (filteredMessages.length > 0) {
        messagesPrompt = formatMessagesToPrompt(filteredMessages);
        console.log(`[PromptBuilder] 消息过滤完成：原始${messagesOrFormattedMemory.length}条 -> 过滤后${filteredMessages.length}条，已排除阶段: ${summarizedStages.join(', ')}`);
      } else {
        messagesPrompt = '尚无对话历史';
        console.log(`[PromptBuilder] 所有消息均已过滤，返回空历史`);
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
   * 注意：这个方法现在会优先尝试从StagedMemory中获取当前阶段的消息
   */
  private optimizeMessagesForStage(
    messages: Message[], 
    limit: number, 
    currentStage: string,
    summarizedStages: string[] = []
  ): Message[] {
    if (messages.length === 0) return messages;
    console.log(`[PromptBuilder] 开始消息优化，当前阶段: ${currentStage}, 已总结阶段: ${summarizedStages.join(', ')}`);
    
    // 推荐使用StagedMemory提供的阶段消息功能
    // 这里保留原来的逻辑作为备选，以确保向后兼容
    
    // 如果没有已总结的阶段，直接应用基本限制
    if (summarizedStages.length === 0) {
      // 根据阶段应用不同的保留策略
      return messages.slice(-limit);
    }
    
    // 寻找阶段转换消息
    const stageTransitions: {index: number, toStage: string}[] = [];
    
    messages.forEach((message, index) => {
      if (message.role === 'assistant' && message.content) {
        // 检查是否包含阶段更新信息
        const stageUpdateMatch = message.content.match(/阶段更新\s*(\w+)\s*->\s*(\w+)/);
        if (stageUpdateMatch) {
          stageTransitions.push({
            index,
            toStage: stageUpdateMatch[2] // 转换后的阶段
          });
          console.log(`[PromptBuilder] 找到阶段转换点: 索引${index}, ${stageUpdateMatch[1]} -> ${stageUpdateMatch[2]}`);
        }
      }
    });
    
    // 如果没有找到阶段转换消息，执行更精确的检查
    if (stageTransitions.length === 0) {
      console.log('[PromptBuilder] 未找到明确的阶段转换消息，尝试根据上下文推断');
      // 根据消息内容推断阶段
      messages.forEach((message, index) => {
        if (message.role === 'assistant' && message.content) {
          // 检查是否包含特定阶段的关键词或提示
          if (message.content.includes('角色设定完成') || message.content.includes('我们来开始塑造主角')) {
            stageTransitions.push({
              index,
              toStage: 'B1'
            });
            console.log(`[PromptBuilder] 推断阶段转换点: 索引${index}, -> B1`);
          } else if (message.content.includes('角色塑造') && message.content.includes('继续完善')) {
            stageTransitions.push({
              index,
              toStage: 'B2'
            });
            console.log(`[PromptBuilder] 推断阶段转换点: 索引${index}, -> B2`);
          } else if (message.content.includes('开始构建故事') || message.content.includes('故事开端')) {
            stageTransitions.push({
              index,
              toStage: 'C1'
            });
            console.log(`[PromptBuilder] 推断阶段转换点: 索引${index}, -> C1`);
          }
        }
      });
    }
    
    // 找出需要过滤的消息区间
    const filteredRanges: {start: number, end: number}[] = [];
    
    // 处理没有明确转换点的简单情况
    if (stageTransitions.length === 0) {
      // 如果总结了阶段B，过滤前半部分消息
      if (summarizedStages.includes('B') || summarizedStages.includes('B1') || summarizedStages.includes('B2')) {
        const midPoint = Math.floor(messages.length / 2);
        filteredRanges.push({
          start: 0,
          end: midPoint - 1
        });
        console.log(`[PromptBuilder] 无法检测到阶段转换，基于B阶段总结估算区间: 0 - ${midPoint - 1}`);
      }
    } else {
      // 标记每个区间的起始和结束
      for (let i = 0; i < stageTransitions.length; i++) {
        const transition = stageTransitions[i];
        const nextTransitionIndex = i < stageTransitions.length - 1 ? stageTransitions[i + 1].index : messages.length;
        
        // 检查该阶段是否已被总结
        const stageName = transition.toStage;
        const stageGroupB = ['B1', 'B2'].includes(stageName) ? 'B' : null;
        const stageGroupC = ['C1', 'C2'].includes(stageName) ? 'C' : null;
        
        // 如果阶段或其所属组已被总结，记录该区间
        if (summarizedStages.includes(stageName) || 
            (stageGroupB && summarizedStages.includes(stageGroupB)) ||
            (stageGroupC && summarizedStages.includes(stageGroupC))) {
          filteredRanges.push({
            start: transition.index,
            end: nextTransitionIndex - 1
          });
          console.log(`[PromptBuilder] 标记需要过滤的阶段 ${stageName} 区间: ${transition.index} - ${nextTransitionIndex - 1}`);
        }
      }
    }
    
    // 检查当前阶段是否有特殊处理需求
    if (currentStage === 'C1' && summarizedStages.includes('B')) {
      console.log('[PromptBuilder] 当前C1阶段，B阶段已总结，过滤逻辑已激活');
    }
    
    // 过滤掉已总结阶段的消息
    let filteredMessages = messages;
    if (filteredRanges.length > 0) {
      filteredMessages = messages.filter((message, index) => {
        // 检查该消息是否在需要过滤的区间内
        const shouldFilter = filteredRanges.some(range => index >= range.start && index <= range.end);
        if (shouldFilter) {
          console.log(`[PromptBuilder] 过滤掉索引${index}的消息`);
        }
        return !shouldFilter;
      });
      console.log(`[PromptBuilder] 阶段过滤后剩余消息: ${filteredMessages.length}`);
    }
    
    // 如果过滤后消息超过限制，应用基本限制
    if (filteredMessages.length > limit) {
      console.log(`[PromptBuilder] 过滤后消息数(${filteredMessages.length})超过限制(${limit})，应用消息限制裁剪`);
      return filteredMessages.slice(-limit);
    }
    
    return filteredMessages;
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