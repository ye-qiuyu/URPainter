import { NextRequest, NextResponse } from 'next/server';
import { ConversationManager } from '@/services/conversation/manager';
import { ConversationStage, Message } from '@/types/conversation';
import { MemoryManager } from '@/services/memory/manager';

// 简化的阶段判断函数 - 始终返回固定阶段
function getFixedStage(): ConversationStage {
  // 固定返回阶段A，暂时不实现阶段转换功能
  return 'A';
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, messageHistory = [] } = await request.json();
    console.log('收到聊天请求:', { 
      conversationId, 
      messagePreview: message.substring(0, 50),
      historyLength: messageHistory.length
    });
    
    const manager = ConversationManager.getInstance();
    const memoryManager = MemoryManager.getInstance();

    // 处理消息历史，应用窗口策略
    const { messages: processedMessages, formattedMemory, creativeElements } = 
      memoryManager.processHistory(messageHistory, conversationId, { windowSize: 20 });
    
    console.log(`处理历史记忆 - 原始消息: ${messageHistory.length}, 处理后: ${processedMessages.length}`);
    
    // 构建会话对象
    let conversation;
    
    if (conversationId) {
      // 使用处理后的消息构建会话对象
      conversation = { 
        id: conversationId, 
        messages: processedMessages,
        currentStage: getFixedStage(), // 使用固定阶段
        createdAt: processedMessages.length > 0 ? processedMessages[0].timestamp : Date.now(),
        updatedAt: Date.now()
      };
    } else {
      // 创建全新会话
      conversation = manager.createConversation();
      console.log(`创建新会话: ${conversation.id}`);
    }

    // 处理消息
    console.log(`开始处理消息, 当前阶段: ${conversation.currentStage}`);
    
    // 使用格式化的记忆和创意元素处理消息
    const aiResponse = await manager.processMessageWithMemory(
      conversation, 
      message, 
      formattedMemory,
      creativeElements
    );
    
    // 创建AI响应消息对象
    const aiMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    };
    
    // 更新会话对象
    const updatedConversation = {
      ...conversation,
      messages: [...processedMessages, {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: Date.now()
      }, aiMessage],
      updatedAt: Date.now()
    };
    
    console.log(`消息处理完成, 响应长度: ${aiResponse.length}`);

    return NextResponse.json({
      success: true,
      data: {
        conversationId: updatedConversation.id,
        aiResponse,
        aiMessage,
        currentStage: updatedConversation.currentStage
      },
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