'use client';

import React, { useState, KeyboardEvent } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { BsKeyboard, BsSend } from 'react-icons/bs';

interface InputProps {
  onSubmit: (message: string) => void;
  onInputStateChange?: (isTyping: boolean) => void;
  disabled?: boolean;
}

const Input: React.FC<InputProps> = ({ onSubmit, onInputStateChange, disabled }) => {
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

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => onInputStateChange?.(false)}
        onFocus={() => onInputStateChange?.(inputValue.length > 0)}
        placeholder="输入内容后按回车发送"
        className="flex-1 p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
        disabled={disabled}
      />
      <button
        onClick={handleVoiceInput}
        className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          isRecording ? 'bg-red-50 text-red-500' : ''
        }`}
        disabled={disabled}
        title={isRecording ? "正在录音" : "语音输入"}
      >
        <FaMicrophone size={20} />
      </button>
    </div>
  );
};

export default Input; 