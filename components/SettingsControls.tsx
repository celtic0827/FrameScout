import React from 'react';
import { VideoMetadata } from '../types';

interface SettingsControlsProps {
  count: number;
  setCount: (n: number) => void;
  randomize: boolean;
  setRandomize: (b: boolean) => void;
  scale: number;
  setScale: (n: number) => void;
  disabled: boolean;
  metadata?: VideoMetadata | null;
  hideCount?: boolean;
  hideRandomize?: boolean;
}

const SettingsControls: React.FC<SettingsControlsProps> = ({ 
  count, setCount, 
  randomize, setRandomize, 
  scale, setScale,
  disabled,
  metadata,
  hideCount = false,
  hideRandomize = false
}) => {
  return (
    <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 shadow-sm backdrop-blur-sm transition-all duration-300">
      
      {/* Header */}
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Configuration</h3>

      {/* Frame Count Slider */}
      {!hideCount && (
        <div className="flex flex-col mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-gray-200">Frame Count</label>
            <div className="bg-gray-800 border border-gray-700 rounded px-2.5 py-0.5 min-w-[3rem] text-center">
              <span className="text-sm font-mono font-semibold text-indigo-400">{count}</span>
            </div>
          </div>

          <div className="relative w-full h-1.5 bg-gray-700 rounded-full group cursor-pointer">
            <input
              type="range"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              disabled={disabled}
              className="absolute w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed"
            />
            <div 
              className="absolute h-full bg-indigo-500 rounded-full transition-all duration-150"
              style={{ width: `${(count / 50) * 100}%` }}
            />
            <div 
              className="absolute h-3.5 w-3.5 bg-white border border-indigo-500 rounded-full shadow top-1/2 transform -translate-y-1/2 transition-all duration-150 pointer-events-none group-hover:scale-110"
              style={{ left: `calc(${(count / 50) * 100}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-2 font-mono">
            <span>1</span>
            <span>50</span>
          </div>
        </div>
      )}

      {/* Scale Slider */}
      <div className="flex flex-col mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-baseline gap-2">
            <label className="text-sm font-medium text-gray-200">Resolution Scale</label>
            {metadata && (
              <span className="text-[10px] text-indigo-400 font-mono">
                {Math.floor(metadata.width * (scale / 100))}×{Math.floor(metadata.height * (scale / 100))}
              </span>
            )}
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded px-2.5 py-0.5 min-w-[3.5rem] text-center">
            <span className="text-sm font-mono font-semibold text-indigo-400">{scale}%</span>
          </div>
        </div>

        <div className="relative w-full h-1.5 bg-gray-700 rounded-full group cursor-pointer">
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={scale}
            onChange={(e) => setScale(parseInt(e.target.value))}
            disabled={disabled}
            className="absolute w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed"
          />
          <div 
            className="absolute h-full bg-indigo-500 rounded-full transition-all duration-150"
            style={{ width: `${scale}%` }}
          />
          <div 
            className="absolute h-3.5 w-3.5 bg-white border border-indigo-500 rounded-full shadow top-1/2 transform -translate-y-1/2 transition-all duration-150 pointer-events-none group-hover:scale-110"
            style={{ left: `calc(${scale}% - 7px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-2 font-mono">
          <span>10%</span>
          <span>Original</span>
        </div>
      </div>

      {/* Randomize Toggle */}
      {!hideRandomize && (
        <>
          <div className="h-px bg-gray-800/80 mb-5 animate-in fade-in duration-300"></div>
          <div className="flex items-center justify-between group animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <h4 className="text-sm font-medium text-gray-200 flex items-center gap-2">
                Smart Shuffle
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Avoids identical frames by adding jitter.
              </p>
            </div>

            <button
              onClick={() => !disabled && setRandomize(!randomize)}
              disabled={disabled}
              className={`
                relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                ${randomize ? 'bg-indigo-600' : 'bg-gray-800 border-gray-700'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="sr-only">Use setting</span>
              <span
                aria-hidden="true"
                className={`
                  pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${randomize ? 'translate-x-4' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </>
      )}

    </div>
  );
};

export default SettingsControls;