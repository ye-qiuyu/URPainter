import { NextResponse } from 'next/server';
import { ConversationManager } from '@/services/conversation/manager';

export async function POST(request: Request) {
  try {
    const { message, conversationId } = await request.json();
    const manager = ConversationManager.getInstance();

    // 如果没有会话ID，创建新会话
    let conversation = conversationId
      ? { id: conversationId, messages: [] } // 这里应该从数据库获取现有会话
      : manager.createConversation();

    // 处理消息
    conversation = await manager.processMessage(conversation, message);

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
} 