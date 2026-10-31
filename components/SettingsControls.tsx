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
    <div className="bg-gray-900/60 rounded-xl p-3.5 lg:p-5 border border-gray-800 shadow-sm backdrop-blur-sm transition-all duration-300">
      
      {/* Header - shown in desktop sidebar mode */}
      <h3 className="hidden lg:block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Configuration</h3>

      {/* Responsive layout: In narrow screen (<lg), row grid layout; in desktop (lg:), vertical column stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3.5 lg:gap-5">

        {/* Frame Count Slider */}
        {!hideCount && (
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1.5 lg:mb-2.5">
              <label className="text-xs lg:text-sm font-medium text-gray-200">Frame Count</label>
              <div className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-center">
                <span className="text-xs lg:text-sm font-mono font-semibold text-indigo-400">{count}</span>
              </div>
            </div>

            <div className="relative w-full h-1.5 bg-gray-700 rounded-full group cursor-pointer my-1">
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
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>1</span>
              <span>50</span>
            </div>
          </div>
        )}

        {/* Scale Slider */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-1.5 lg:mb-2.5">
            <div className="flex items-baseline gap-1.5">
              <label className="text-xs lg:text-sm font-medium text-gray-200">Resolution</label>
              {metadata && (
                <span className="text-[10px] text-indigo-400 font-mono">
                  {Math.floor(metadata.width * (scale / 100))}×{Math.floor(metadata.height * (scale / 100))}
                </span>
              )}
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-center">
              <span className="text-xs lg:text-sm font-mono font-semibold text-indigo-400">{scale}%</span>
            </div>
          </div>

          <div className="relative w-full h-1.5 bg-gray-700 rounded-full group cursor-pointer my-1">
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
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Randomize Toggle */}
        {!hideRandomize && (
          <div className="md:col-span-2 lg:col-span-1 pt-1 md:pt-0 lg:pt-2 border-t md:border-t-0 lg:border-t border-gray-800/80 flex items-center justify-between">
            <div>
              <h4 className="text-xs lg:text-sm font-medium text-gray-200">
                Smart Shuffle
              </h4>
              <p className="text-[10px] lg:text-[11px] text-gray-500">
                Jitters timestamps to avoid identical duplicates.
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
        )}

      </div>
    </div>
  );
};

export default SettingsControls;