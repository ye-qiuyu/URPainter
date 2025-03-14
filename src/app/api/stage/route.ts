import { NextRequest, NextResponse } from 'next/server';
import { StageManager } from '@/services/stages/manager';
import { ConversationManager } from '@/services/conversation/manager';
import { ConversationStage } from '@/types/conversation';

export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const { conversationId, action, stage } = await req.json();
    
    if (!conversationId) {
      return NextResponse.json(
        { error: '会话ID不能为空' },
        { status: 400 }
      );
    }
    
    // 获取服务实例
    const stageManager = StageManager.getInstance();
    const conversationManager = ConversationManager.getInstance();
    
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
        
        // 这里应该从数据库获取对话，这里简化处理
        const mockConversation = {
          id: conversationId,
          messages: [],
          currentStage: 'A' as ConversationStage,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        // 设置阶段
        const updatedConversation = stageManager.setStage(mockConversation, stage as ConversationStage);
        
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