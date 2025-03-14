import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { OllamaService } from '@/services/ai/ollama';
import { PromptBuilderService } from '@/services/prompt/builder';
import { ConversationManager } from '@/services/conversation/manager';
import { Message } from '@/types/conversation';

export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const { message, conversationId, currentStage, detectedTheme } = await req.json();
    
    if (!message) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }
    
    // 获取服务实例
    const ollamaService = OllamaService.getInstance();
    const promptBuilder = PromptBuilderService.getInstance();
    const conversationManager = ConversationManager.getInstance();
    
    // 构建提示词
    const prompt = promptBuilder.buildConversationPrompt(
      message,
      conversationId,
      currentStage,
      detectedTheme
    );
    
    // 调用AI服务
    const aiResponse = await ollamaService.generate(prompt);
    
    // 构建响应
    const responseMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    };
    
    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error('聊天API错误:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'URPainter聊天API服务正常运行' },
    { status: 200 }
  );
} 