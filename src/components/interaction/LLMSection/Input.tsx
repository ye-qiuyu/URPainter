'use client';

import React, { useState, KeyboardEvent } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { BsKeyboard, BsSend } from 'react-icons/bs';

interface InputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

const Input: React.FC<InputProps> = ({ onSubmit, disabled }) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
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