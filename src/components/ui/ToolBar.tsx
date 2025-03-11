'use client';

import React from 'react';
import ToolButton from './ToolButton';

const tools = [
  { icon: "✏️", label: "粗笔" },
  { icon: "✎", label: "细笔" },
  { icon: "🔍", label: "放大" },
  { icon: "🔎", label: "缩小" },
  { icon: "↻", label: "旋转" },
  { icon: "⌫", label: "橡皮" },
  { icon: "🎨", label: "调色" },
];

const ToolBar: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-4 p-2">
      {tools.map((tool) => (
        <ToolButton
          key={tool.label}
          icon={tool.icon}
          label={tool.label}
        />
      ))}
    </div>
  );
};

export default ToolBar; 