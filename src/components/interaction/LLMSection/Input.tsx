'use client';

import React, { useState, KeyboardEvent } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { BsKeyboard, BsSend } from 'react-icons/bs';

interface InputProps {
  onSubmit: (message: string) => void;
  onInputStateChange?: (isTyping: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}

const Input: React.FC<InputProps> = ({ 
  onSubmit, 
  onInputStateChange, 
  disabled,
  compact = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
      setInputValue('');
      onInputStateChange?.(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onInputStateChange?.(e.target.value.length > 0);
  };

  const handleVoiceInput = () => {
    // TODO: 实现语音输入逻辑
    setIsRecording(!isRecording);
  };

  const inputClasses = compact 
    ? "flex-1 py-1 px-2 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
    : "flex-1 p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors";
  
  const buttonClasses = compact
    ? `p-1 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-red-50 text-red-500' : ''}`
    : `p-2 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-red-50 text-red-500' : ''}`;
  
  const iconSize = compact ? 16 : 20;

  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-2'} w-full`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => onInputStateChange?.(false)}
        onFocus={() => onInputStateChange?.(inputValue.length > 0)}
        placeholder={compact ? "输入内容..." : "输入内容后按回车发送"}
        className={inputClasses}
        disabled={disabled}
      />
      <button
        onClick={handleVoiceInput}
        className={buttonClasses}
        disabled={disabled}
        title={isRecording ? "正在录音" : "语音输入"}
      >
        <FaMicrophone size={iconSize} />
      </button>
    </div>
  );
};

export default Input; 