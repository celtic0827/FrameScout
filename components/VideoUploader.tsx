import React, { useRef } from 'react';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    if (file.type.startsWith('video/')) {
      onFileSelect(file);
    } else {
      alert('Please upload a valid video file.');
    }
  };

  return (
    <div 
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer 
        border border-dashed rounded-xl p-4 lg:p-8
        transition-all duration-300 ease-in-out
        flex flex-row lg:flex-col items-center justify-center gap-4 lg:gap-0
        text-left lg:text-center overflow-hidden
        ${disabled 
          ? 'opacity-50 cursor-not-allowed border-gray-800 bg-gray-900/30' 
          : 'border-gray-700 hover:border-indigo-500/50 hover:bg-gray-900/60 bg-gray-900/20'
        }
      `}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleChange} 
        accept="video/*" 
        className="hidden" 
        disabled={disabled}
      />
      
      {/* Decorative background glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      
      <div className={`
        w-10 h-10 lg:w-14 lg:h-14 flex-shrink-0 rounded-xl lg:rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center lg:mb-4 shadow-xl relative z-10
        group-hover:scale-105 group-hover:border-indigo-500/30 group-hover:shadow-indigo-500/10 transition-all duration-300
      `}>
        {/* Film File Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 lg:h-7 lg:w-7 text-gray-400 group-hover:text-indigo-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <rect x="8" y="13" width="8" height="4" rx="1" ry="1" />
          <path d="M8 13h8" />
          <path d="M8 17h8" />
          <path d="M10 13v4" />
          <path d="M14 13v4" />
        </svg>
      </div>

      <div className="min-w-0 flex-1 lg:flex-none">
        <h3 className="text-sm lg:text-base font-semibold text-gray-200 mb-0.5 lg:mb-1 relative z-10">
          {disabled ? 'Processing...' : 'Select Source Video'}
        </h3>
        <p className="text-gray-500 text-xs relative z-10">
          <span>Drop your video file here.</span>
          <span className="hidden sm:inline lg:block lg:mt-1 opacity-70 ml-1.5 sm:ml-0"> (MP4, MOV, MKV)</span>
        </p>
      </div>
    </div>
  );
};

export default VideoUploader;