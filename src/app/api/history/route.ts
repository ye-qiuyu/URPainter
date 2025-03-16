import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    console.log('收到历史记录请求:', { sessionId });

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // 注意：在服务器端无法直接访问ClientMemory（它使用sessionStorage）
    // 这个API需要从客户端传入会话ID列表和消息
    // 这里返回一个空数组，实际实现应该在客户端完成
    console.log(`无法在服务器端访问会话存储，返回空数组`);
    return NextResponse.json({
      success: true,
      data: { conversations: [] }
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
    const conversationId = searchParams.get('conversationId');
    console.log('收到删除历史记录请求:', { conversationId });

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // 注意：在服务器端无法直接访问ClientMemory
    // 这个API只返回成功响应，实际删除操作应该在客户端完成
    console.log(`无法在服务器端删除会话，返回成功响应`);
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