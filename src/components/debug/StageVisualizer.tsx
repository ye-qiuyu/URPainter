import React from 'react';
import { ConversationStage } from '@/types/conversation';

interface StageVisualizerProps {
  currentStage: ConversationStage;
  className?: string;
}

// 阶段描述映射
const stageDescriptions: Record<ConversationStage, string> = {
  'A': '开启对话',
  'B': '确定创作主题',
  'C': '绘制主角元素',
  'D': '联想阶段',
  'E': '绘制其他元素',
  'F': '完成创作'
};

// 阶段颜色映射
const stageColors: Record<ConversationStage, string> = {
  'A': 'bg-blue-500',
  'B': 'bg-purple-500',
  'C': 'bg-pink-500',
  'D': 'bg-yellow-500',
  'E': 'bg-green-500',
  'F': 'bg-red-500'
};

/**
 * 阶段可视化组件
 * 显示当前会话的阶段信息，包括阶段标识和描述
 */
export const StageVisualizer: React.FC<StageVisualizerProps> = ({ 
  currentStage, 
  className = '' 
}) => {
  // 获取当前阶段的描述和颜色
  const stageDescription = stageDescriptions[currentStage] || '未知阶段';
  const stageColor = stageColors[currentStage] || 'bg-gray-500';
  
  return (
    <div className={`flex flex-col items-center p-4 rounded-lg border border-gray-200 ${className}`}>
      <h3 className="text-lg font-semibold mb-2">创作阶段</h3>
      
      {/* 阶段流程图 */}
      <div className="flex items-center justify-between w-full mb-4">
        {(['A', 'B', 'C', 'D', 'E', 'F'] as ConversationStage[]).map((stage, index) => {
          const isActive = stage === currentStage;
          const isPast = stage.charCodeAt(0) < currentStage.charCodeAt(0);
          
          return (
            <React.Fragment key={stage}>
              {/* 阶段节点 */}
              <div className="flex flex-col items-center">
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                    ${isActive ? stageColors[stage] : isPast ? 'bg-gray-400' : 'bg-gray-200'}
                  `}
                >
                  {stage}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-bold' : ''}`}>
                  {stageDescriptions[stage]}
                </span>
              </div>
              
              {/* 连接线 */}
              {index < 5 && (
                <div 
                  className={`
                    h-0.5 w-4 flex-grow mx-1
                    ${isPast ? 'bg-gray-400' : 'bg-gray-200'}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* 当前阶段信息 */}
      <div className={`w-full p-3 rounded-md ${stageColor} text-white`}>
        <div className="font-bold text-center">
          当前阶段: {currentStage} - {stageDescription}
        </div>
      </div>
      
      {/* 阶段说明 */}
      <div className="mt-4 text-sm text-gray-600 w-full">
        <h4 className="font-semibold mb-1">阶段说明:</h4>
        <ul className="list-disc pl-5">
          <li>A - 开启对话：了解用户兴趣和创作意向</li>
          <li>B - 确定创作主题：确定具体的创作主题和方向</li>
          <li>C - 绘制主角元素：设计和描述主要角色或元素</li>
          <li>D - 联想阶段：通过联想扩展创意和元素</li>
          <li>E - 绘制其他元素：添加背景、环境和辅助元素</li>
          <li>F - 完成创作：完善细节，完成最终创作</li>
        </ul>
      </div>
    </div>
  );
};

export default StageVisualizer; 