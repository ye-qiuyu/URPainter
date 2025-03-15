import { NextRequest, NextResponse } from 'next/server';
import { StageManager } from '@/services/stages/manager';
import { ConversationManager } from '@/services/conversation/manager';
import { MemoryManager } from '@/services/memory/manager';
import { ConversationStage } from '@/types/conversation';

export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const { conversationId, action, stage } = await req.json();
    console.log('收到阶段管理请求:', { conversationId, action, stage });
    
    if (!conversationId) {
      return NextResponse.json(
        { error: '会话ID不能为空' },
        { status: 400 }
      );
    }
    
    // 获取服务实例
    const stageManager = StageManager.getInstance();
    const conversationManager = ConversationManager.getInstance();
    const memoryManager = MemoryManager.getInstance();
    
    // 根据操作类型处理
    switch (action) {
      case 'get': {
        // 获取阶段描述
        const stageDescription = stageManager.getStageDescription(stage as ConversationStage);
        return NextResponse.json({ stage, description: stageDescription });
      }
      
      case 'set': {
        if (!stage) {
          return NextResponse.json(
            { error: '设置阶段时，stage参数不能为空' },
            { status: 400 }
          );
        }
        
        // 从MemoryManager获取会话信息
        const messages = memoryManager.getMessages(conversationId);
        
        // 构建会话对象
        let conversation;
        if (messages && messages.length > 0) {
          conversation = {
            id: conversationId,
            messages: messages,
            currentStage: stage as ConversationStage, // 使用请求中的stage作为当前阶段
            createdAt: messages[0].timestamp,
            updatedAt: Date.now()
          };
          console.log(`找到会话: ${conversationId}, 消息数量: ${messages.length}`);
        } else {
          // 如果没有消息历史，创建一个基本会话对象
          conversation = {
            id: conversationId,
            messages: [],
            currentStage: 'A' as ConversationStage,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          console.log(`未找到会话消息: ${conversationId}, 创建基本会话对象`);
        }
        
        // 设置阶段
        const updatedConversation = stageManager.setStage(conversation, stage as ConversationStage);
        console.log(`阶段已更新: ${stage} - 会话ID: ${conversationId}`);
        
        return NextResponse.json({ 
          success: true, 
          stage: updatedConversation.currentStage,
          description: stageManager.getStageDescription(updatedConversation.currentStage)
        });
      }
      
      default:
        return NextResponse.json(
          { error: '不支持的操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('阶段管理API错误:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'URPainter阶段管理API服务正常运行' },
    { status: 200 }
  );
} 