import { NextResponse } from 'next/server';
import { ConversationManager } from '@/services/conversation/manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // TODO: 从数据库获取历史记录
    // 这里需要实现数据持久化层
    const conversations = []; // 临时返回空数组，实际应该从数据库获取

    return NextResponse.json({
      success: true,
      data: { conversations }
    });
  } catch (error) {
    console.error('Error in history API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch history',
      },
      { status: 500 }
    );
  }
}

// 支持删除历史记录
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const conversationId = searchParams.get('conversationId');

    if (!sessionId || !conversationId) {
      return NextResponse.json(
        { success: false, error: 'Session ID and Conversation ID are required' },
        { status: 400 }
      );
    }

    // TODO: 从数据库删除指定对话
    // 这里需要实现数据持久化层

    return NextResponse.json({
      success: true,
      data: { deleted: conversationId }
    });
  } catch (error) {
    console.error('Error in history API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete conversation',
      },
      { status: 500 }
    );
  }
} 