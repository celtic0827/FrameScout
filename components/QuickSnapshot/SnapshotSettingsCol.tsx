import React from 'react';
import { QuickSnapshotSettings } from './types';
import { VideoMetadata } from '../../types';

interface SnapshotSettingsColProps {
  settings: QuickSnapshotSettings;
  onUpdateSettings: (newSettings: Partial<QuickSnapshotSettings>) => void;
  metadata: VideoMetadata | null;
  snapshotCount: number;
  onClearAll: () => void;
}

const SnapshotSettingsCol: React.FC<SnapshotSettingsColProps> = ({
  settings,
  onUpdateSettings,
  metadata,
  snapshotCount,
  onClearAll
}) => {
  const scalePercent = settings.scale;
  const targetWidth = metadata ? Math.floor(metadata.width * (scalePercent / 100)) : null;
  const targetHeight = metadata ? Math.floor(metadata.height * (scalePercent / 100)) : null;

  return (
    <div className="h-full flex flex-col bg-[#08080a] border-r border-gray-800/80 overflow-y-auto custom-scrollbar p-4 text-xs select-none">
      
      {/* Header */}
      <div className="pb-3 border-b border-gray-800/60 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Capture Settings</h2>
            <p className="text-[11px] text-gray-500">Output and trigger preferences</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        
        {/* Output Resolution / Scale */}
        <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-300">Resolution Scale</span>
            {targetWidth && targetHeight && (
              <span className="font-mono text-[11px] text-indigo-400 tabular-nums">
                {targetWidth}×{targetHeight}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-950/70 rounded-lg border border-gray-800/80">
            {[
              { label: '50%', value: 50 },
              { label: '75%', value: 75 },
              { label: '100%', value: 100 }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdateSettings({ scale: opt.value })}
                className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                  settings.scale === opt.value
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image Format */}
        <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800/60 space-y-2">
          <span className="font-medium text-gray-300">Output Format</span>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-950/70 rounded-lg border border-gray-800/80">
            <button
              type="button"
              onClick={() => onUpdateSettings({ format: 'image/png' })}
              className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                settings.format === 'image/png'
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              PNG (Lossless)
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ format: 'image/jpeg' })}
              className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                settings.format === 'image/jpeg'
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              JPEG (92%)
            </button>
          </div>
        </div>

        {/* Auto-Copy Toggle */}
        <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800/60 flex items-center justify-between">
          <div className="pr-2">
            <div className="font-medium text-gray-200">Auto-copy to Clipboard</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Copy image instantly on capture</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoCopy}
            onClick={() => onUpdateSettings({ autoCopy: !settings.autoCopy })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.autoCopy ? 'bg-indigo-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.autoCopy ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Frame Stepping Interval */}
        <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-300">Step Interval (← / →)</span>
            <span className="text-[11px] text-gray-500 font-mono">
              {settings.stepSeconds < 0.1 ? '1 Frame' : settings.stepSeconds < 0.5 ? '5 Frames' : '1.0 sec'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-950/70 rounded-lg border border-gray-800/80">
            {[
              { label: '1 Frame', value: 0.033 },
              { label: '5 Frames', value: 0.167 },
              { label: '1.0s', value: 1.0 }
            ].map((step) => {
              const isSelected = Math.abs(settings.stepSeconds - step.value) < 0.01;
              return (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => onUpdateSettings({ stepSeconds: step.value })}
                  className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <div className="bg-gray-900/30 p-3 rounded-xl border border-gray-800/50 space-y-2">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Shortcuts Reference
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-gray-400">
              <span>Capture Snapshot</span>
              <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono text-[10px]">S</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono text-[10px]">C</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Play / Pause</span>
              <kbd className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono text-[10px]">Space</kbd>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Step Backward / Forward</span>
              <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono text-[10px]">←</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono text-[10px]">→</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Jump ±5 Seconds</span>
              <div className="flex gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono text-[10px]">J</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono text-[10px]">L</kbd>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer / Reset Action */}
      {snapshotCount > 0 && (
        <div className="pt-3 mt-4 border-t border-gray-800/60 flex items-center justify-between">
          <span className="text-gray-400 text-[11px]">
            <strong className="text-white font-mono">{snapshotCount}</strong> snapshot{snapshotCount > 1 ? 's' : ''} captured
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-red-400 hover:text-red-300 text-[11px] font-medium transition-colors hover:underline"
          >
            Clear All
          </button>
        </div>
      )}

    </div>
  );
};

export default SnapshotSettingsCol;
