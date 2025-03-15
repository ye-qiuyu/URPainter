import { NextResponse } from 'next/server';
import { ConversationManager } from '@/services/conversation/manager';
import { MemoryManager } from '@/services/memory/manager';

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

    // 使用MemoryManager获取会话历史
    const memoryManager = MemoryManager.getInstance();
    const conversationIds = memoryManager.getConversationIds(sessionId);
    console.log(`找到会话IDs: ${conversationIds.length}个 - 会话: ${sessionId}`);
    
    // 构建会话历史记录
    const conversations = [];
    for (const conversationId of conversationIds) {
      const messages = memoryManager.getMessages(conversationId);
      if (messages && messages.length > 0) {
        // 从消息中提取会话信息
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        
        conversations.push({
          id: conversationId,
          title: `对话 ${conversations.length + 1}`, // 可以从第一条消息中提取更有意义的标题
          messageCount: messages.length,
          createdAt: firstMessage.timestamp,
          updatedAt: lastMessage.timestamp,
          preview: messages.length > 0 ? messages[0].content.substring(0, 50) + '...' : ''
        });
      }
    }
    
    console.log(`返回会话历史: ${conversations.length}个会话`);
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
    console.log('收到删除历史记录请求:', { sessionId, conversationId });

    if (!sessionId || !conversationId) {
      return NextResponse.json(
        { success: false, error: 'Session ID and Conversation ID are required' },
        { status: 400 }
      );
    }

    // 使用MemoryManager删除会话
    const memoryManager = MemoryManager.getInstance();
    const success = memoryManager.deleteConversation(conversationId);
    console.log(`删除会话结果: ${success ? '成功' : '失败'} - 会话ID: ${conversationId}`);

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