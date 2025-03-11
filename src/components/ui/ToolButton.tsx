'use client';

import React from 'react';

interface ToolButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, onClick }) => {
  return (
    <button
      className="w-12 h-12 rounded-lg hover:bg-gray-100 flex items-center justify-center"
      title={label}
      onClick={onClick}
    >
      <span className="text-xl">{icon}</span>
    </button>
  );
};

export default ToolButton; 