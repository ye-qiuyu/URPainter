import { NextRequest, NextResponse } from 'next/server';
import { ThemeManager } from '@/services/themes/manager';
import { ThemeDetector } from '@/services/themes/detector';
import { ConversationManager } from '@/services/conversation/manager';
import { ThemeCategory, ConversationStage } from '@/types/conversation';

export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const { conversationId, action, theme, messages } = await req.json();
    
    if (!conversationId) {
      return NextResponse.json(
        { error: '会话ID不能为空' },
        { status: 400 }
      );
    }
    
    // 获取服务实例
    const themeManager = ThemeManager.getInstance();
    const themeDetector = new ThemeDetector();
    const conversationManager = ConversationManager.getInstance();
    
    // 根据操作类型处理
    switch (action) {
      case 'detect': {
        if (!messages || !Array.isArray(messages)) {
          return NextResponse.json(
            { error: '检测主题时，messages参数不能为空且必须是数组' },
            { status: 400 }
          );
        }
        
        // 检测主题
        const detectedTheme = await themeDetector.detectTheme(messages);
        
        return NextResponse.json({ 
          theme: detectedTheme,
          info: detectedTheme ? themeManager.getThemeInfo(detectedTheme) : null
        });
      }
      
      case 'get': {
        if (!theme) {
          return NextResponse.json(
            { error: '获取主题信息时，theme参数不能为空' },
            { status: 400 }
          );
        }
        
        // 获取主题信息
        const themeInfo = themeManager.getThemeInfo(theme as ThemeCategory);
        
        return NextResponse.json({ theme, info: themeInfo });
      }
      
      case 'set': {
        if (!theme) {
          return NextResponse.json(
            { error: '设置主题时，theme参数不能为空' },
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
        
        // 设置主题
        const updatedConversation = conversationManager.setConversationTheme(
          mockConversation, 
          theme as ThemeCategory
        );
        
        return NextResponse.json({ 
          success: true, 
          theme: updatedConversation.detectedTheme,
          info: updatedConversation.detectedTheme ? 
            themeManager.getThemeInfo(updatedConversation.detectedTheme) : null
        });
      }
      
      default:
        return NextResponse.json(
          { error: '不支持的操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('主题管理API错误:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'URPainter主题管理API服务正常运行' },
    { status: 200 }
  );
} 