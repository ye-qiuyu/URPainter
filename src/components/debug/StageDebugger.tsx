import React, { useState, useEffect } from 'react';
import { ConversationStage } from '@/types/conversation';

interface StageDebuggerProps {
  conversationId: string;
  currentStage: ConversationStage;
  className?: string;
}

interface StageTransitionLog {
  timestamp: number;
  fromStage: ConversationStage;
  toStage: ConversationStage;
  reason?: string;
}

/**
 * 阶段调试组件
 * 显示阶段转换的详细信息和日志
 */
export const StageDebugger: React.FC<StageDebuggerProps> = ({
  conversationId,
  currentStage,
  className = ''
}) => {
  const [transitionLogs, setTransitionLogs] = useState<StageTransitionLog[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 模拟获取阶段转换日志
  useEffect(() => {
    // 实际项目中，这里应该从API获取阶段转换日志
    const mockLogs: StageTransitionLog[] = [
      {
        timestamp: Date.now() - 1000 * 60 * 10,
        fromStage: 'A',
        toStage: 'A',
        reason: '会话初始化'
      }
    ];
    
    setTransitionLogs(mockLogs);
  }, [conversationId]);
  
  // 添加新的转换日志（当阶段变化时）
  useEffect(() => {
    if (transitionLogs.length > 0) {
      const lastLog = transitionLogs[transitionLogs.length - 1];
      
      if (lastLog.toStage !== currentStage) {
        setTransitionLogs([
          ...transitionLogs,
          {
            timestamp: Date.now(),
            fromStage: lastLog.toStage,
            toStage: currentStage,
            reason: '阶段转换条件满足'
          }
        ]);
      }
    }
  }, [currentStage, transitionLogs]);
  
  // 格式化时间戳
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };
  
  // 手动触发阶段转换（仅用于调试）
  const triggerStageTransition = async (targetStage: ConversationStage) => {
    if (!conversationId) return;
    
    setIsLoading(true);
    
    try {
      // 调用阶段设置API
      const response = await fetch('/api/stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          action: 'set',
          stage: targetStage
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('阶段设置成功:', data);
        
        // 添加手动转换日志
        setTransitionLogs([
          ...transitionLogs,
          {
            timestamp: Date.now(),
            fromStage: currentStage,
            toStage: targetStage,
            reason: '手动设置阶段'
          }
        ]);
      } else {
        console.error('阶段设置失败:', await response.text());
      }
    } catch (error) {
      console.error('阶段设置错误:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">阶段调试</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-500 hover:text-blue-700"
        >
          {isExpanded ? '收起' : '展开'}
        </button>
      </div>
      
      {isExpanded && (
        <>
          {/* 阶段转换控制 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">手动设置阶段</h4>
            <div className="flex flex-wrap gap-2">
              {(['A', 'B1', 'B2', 'C1', 'C2', 'D'] as ConversationStage[]).map(stage => (
                <button
                  key={stage}
                  onClick={() => triggerStageTransition(stage)}
                  disabled={isLoading || stage === currentStage}
                  className={`
                    px-3 py-1 rounded-md text-white font-medium
                    ${stage === currentStage ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}
                  `}
                >
                  {stage}
                </button>
              ))}
            </div>
            {isLoading && <p className="text-sm text-gray-500 mt-2">正在设置阶段...</p>}
          </div>
          
          {/* 阶段转换日志 */}
          <div>
            <h4 className="font-medium mb-2">阶段转换日志</h4>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">从</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">到</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原因</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transitionLogs.map((log, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatTimestamp(log.timestamp)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{log.fromStage}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{log.toStage}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{log.reason}</td>
                    </tr>
                  ))}
                  {transitionLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-sm text-gray-500">暂无阶段转换记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StageDebugger; 