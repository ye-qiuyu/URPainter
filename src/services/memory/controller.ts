import { Message } from '@/types/conversation';
import { MemoryFormatter } from './formatter';
import { CreativeElements } from './storage';

/**
 * 处理后的记忆数据结构
 */
export interface ProcessedMemory {
  // 经过窗口处理后的消息
  messages: Message[];
  // 格式化后的记忆文本
  formattedMemory: string;
  // 提取的创意元素
  creativeElements: Partial<CreativeElements>;
}

/**
 * MemoryController - 记忆控制器
 * 
 * 负责记忆的核心处理逻辑，包括：
 * 1. 应用窗口记忆策略
 * 2. 处理消息历史
 * 3. 提取创意元素
 * 4. 检索相关记忆
 * 
 * 这个类不直接管理存储，而是处理传入的消息数据
 */
export class MemoryController {
  private static instance: MemoryController;
  private formatter: MemoryFormatter;
  
  private constructor() {
    this.formatter = new MemoryFormatter();
  }
  
  /**
   * 获取MemoryController的单例实例
   */
  public static getInstance(): MemoryController {
    if (!MemoryController.instance) {
      MemoryController.instance = new MemoryController();
    }
    return MemoryController.instance;
  }
  
  /**
   * 应用记忆窗口策略
   * 
   * @param messages 原始消息列表
   * @param windowSize 窗口大小，默认为20条消息
   * @returns 应用窗口策略后的消息列表
   */
  applyMemoryWindow(messages: Message[], windowSize: number = 20): Message[] {
    if (!messages || !Array.isArray(messages)) {
      console.warn('应用窗口策略时收到无效消息列表');
      return [];
    }
    
    // 简单的窗口策略：保留最近的N条消息
    return messages.slice(-windowSize);
  }
  
  /**
   * 处理消息历史
   * 
   * @param messages 原始消息列表
   * @param windowSize 窗口大小，默认为20条消息
   * @returns 处理后的记忆数据，包括窗口化消息、格式化文本和创意元素
   */
  processMessageHistory(
    messages: Message[],
    windowSize: number = 20
  ): ProcessedMemory {
    // 应用窗口策略
    const windowedMessages = this.applyMemoryWindow(messages, windowSize);
    
    // 格式化消息
    const formattedMemory = this.formatter.formatMessages(windowedMessages);
    
    // 提取创意元素
    const creativeElements = this.extractCreativeElements(windowedMessages);
    
    return {
      messages: windowedMessages,
      formattedMemory,
      creativeElements
    };
  }
  
  /**
   * 从消息中提取创意元素
   * 
   * @param messages 消息列表
   * @returns 提取的创意元素
   */
  private extractCreativeElements(messages: Message[]): Partial<CreativeElements> {
    return this.formatter.extractCreativeElements(messages);
  }
  
  /**
   * 检索与用户问题相关的记忆
   * 
   * @param messages 消息历史
   * @param userQuery 用户查询
   * @returns 相关记忆的格式化文本
   */
  retrieveRelevantMemory(messages: Message[], userQuery: string): string {
    if (!messages || messages.length === 0) {
      return "没有找到相关记忆";
    }
    
    // 检测是否是关于之前对话的问题
    const isMemoryQuery = this.isMemoryRelatedQuery(userQuery);
    
    if (!isMemoryQuery) {
      return ""; // 不是记忆相关的查询，返回空字符串
    }
    
    // 根据查询类型提取相关记忆
    if (this.isPreviousMessageQuery(userQuery)) {
      // 查询之前的消息
      return this.retrievePreviousMessages(messages);
    } else if (this.isSpecificTopicQuery(userQuery)) {
      // 查询特定主题
      const topics = this.extractTopicsFromQuery(userQuery);
      return this.retrieveTopicRelatedMessages(messages, topics);
    }
    
    // 默认返回最近的几条消息
    return this.retrieveRecentMessages(messages, 5);
  }
  
  /**
   * 判断是否是记忆相关的查询
   */
  private isMemoryRelatedQuery(query: string): boolean {
    const memoryKeywords = [
      '刚才', '之前', '说过', '提到', '告诉', '问', '记得', 
      '忘了', '回忆', '想起', '记忆', '历史', '聊过'
    ];
    
    const lowerQuery = query.toLowerCase();
    return memoryKeywords.some(keyword => lowerQuery.includes(keyword));
  }
  
  /**
   * 判断是否是查询之前消息的问题
   */
  private isPreviousMessageQuery(query: string): boolean {
    const patterns = [
      /刚才.*?(说|问|告诉)/,
      /之前.*?(说|问|告诉)/,
      /我.*?(说|问|告诉).*?什么/,
      /你.*?(说|问|告诉).*?什么/,
      /我们.*?聊.*?什么/
    ];
    
    return patterns.some(pattern => pattern.test(query));
  }
  
  /**
   * 判断是否是查询特定主题的问题
   */
  private isSpecificTopicQuery(query: string): boolean {
    const patterns = [
      /关于.*?的/,
      /提到.*?的/,
      /说过.*?的/
    ];
    
    return patterns.some(pattern => pattern.test(query));
  }
  
  /**
   * 从查询中提取主题
   */
  private extractTopicsFromQuery(query: string): string[] {
    const topics: string[] = [];
    
    // 提取"关于X的"模式
    const aboutMatches = query.match(/关于(.*?)的/g);
    if (aboutMatches) {
      aboutMatches.forEach(match => {
        const topic = match.replace(/关于|的/g, '').trim();
        if (topic && !topics.includes(topic)) {
          topics.push(topic);
        }
      });
    }
    
    // 提取"提到X"模式
    const mentionMatches = query.match(/提到(.*?)([的吗]|$)/g);
    if (mentionMatches) {
      mentionMatches.forEach(match => {
        const topic = match.replace(/提到|的|吗/g, '').trim();
        if (topic && !topics.includes(topic)) {
          topics.push(topic);
        }
      });
    }
    
    return topics;
  }
  
  /**
   * 检索之前的消息
   */
  private retrievePreviousMessages(messages: Message[]): string {
    if (messages.length <= 1) {
      return "没有之前的对话记录";
    }
    
    // 获取最近的3条用户消息
    const recentUserMessages = messages
      .filter(msg => msg.role === 'user')
      .slice(-4, -1); // 排除当前消息
    
    if (recentUserMessages.length === 0) {
      return "没有找到之前的用户消息";
    }
    
    // 格式化消息
    const formattedMessages = recentUserMessages.map((msg, index) => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      return `${index + 1}. 在 ${time}，用户说: "${msg.content}"`;
    }).join('\n');
    
    return `以下是用户最近的消息:\n${formattedMessages}`;
  }
  
  /**
   * 检索与特定主题相关的消息
   */
  private retrieveTopicRelatedMessages(messages: Message[], topics: string[]): string {
    if (topics.length === 0) {
      return "未能识别查询的主题";
    }
    
    // 查找包含主题的消息
    const relatedMessages: Message[] = [];
    
    for (const msg of messages) {
      const content = msg.content.toLowerCase();
      for (const topic of topics) {
        if (content.includes(topic.toLowerCase())) {
          relatedMessages.push(msg);
          break;
        }
      }
    }
    
    if (relatedMessages.length === 0) {
      return `没有找到关于 "${topics.join(', ')}" 的对话记录`;
    }
    
    // 格式化消息
    const formattedMessages = relatedMessages.map((msg, index) => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role === 'user' ? '用户' : 'AI助手';
      return `${index + 1}. 在 ${time}，${role}说: "${msg.content}"`;
    }).join('\n');
    
    return `以下是关于 "${topics.join(', ')}" 的对话记录:\n${formattedMessages}`;
  }
  
  /**
   * 检索最近的N条消息
   */
  private retrieveRecentMessages(messages: Message[], count: number): string {
    if (messages.length <= 1) {
      return "没有足够的对话记录";
    }
    
    // 获取最近的N条消息（排除当前消息）
    const recentMessages = messages.slice(-count - 1, -1);
    
    if (recentMessages.length === 0) {
      return "没有找到最近的消息";
    }
    
    // 格式化消息
    const formattedMessages = recentMessages.map((msg, index) => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role === 'user' ? '用户' : 'AI助手';
      return `${index + 1}. 在 ${time}，${role}说: "${msg.content}"`;
    }).join('\n');
    
    return `以下是最近的对话记录:\n${formattedMessages}`;
  }
} 