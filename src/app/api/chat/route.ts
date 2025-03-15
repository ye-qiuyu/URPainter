import { NextRequest, NextResponse } from 'next/server';
import { ConversationManager } from '@/services/conversation/manager';
import { ConversationStage } from '@/types/conversation';
import { MemoryManager } from '@/services/memory/manager';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId } = await request.json();
    console.log('收到聊天请求:', { conversationId, messagePreview: message.substring(0, 50) });
    
    const manager = ConversationManager.getInstance();
    const memoryManager = MemoryManager.getInstance();

    // 如果没有会话ID，创建新会话
    let conversation;
    
    if (conversationId) {
      // 尝试从内存中获取会话
      const messages = memoryManager.getMessages(conversationId);
      if (messages && messages.length > 0) {
        // 如果有消息历史，构建会话对象
        conversation = { 
          id: conversationId, 
          messages: messages,
          currentStage: 'A' as ConversationStage, // 默认阶段，可以改进
          createdAt: messages[0].timestamp,
          updatedAt: Date.now()
        };
        console.log(`找到现有会话: ${conversationId}, 消息数量: ${messages.length}`);
      } else {
        // 如果没有消息历史，创建新会话但保留ID
        conversation = manager.createConversation();
        conversation.id = conversationId;
        console.log(`未找到会话 ${conversationId}, 创建新会话`);
      }
    } else {
      // 创建全新会话
      conversation = manager.createConversation();
      console.log(`创建新会话: ${conversation.id}`);
    }

    // 处理消息
    console.log(`开始处理消息, 当前阶段: ${conversation.currentStage}`);
    conversation = await manager.processMessage(conversation, message);
    console.log(`消息处理完成, 新阶段: ${conversation.currentStage}`);

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
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