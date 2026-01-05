import React from 'react';
import { Screenshot } from '../types';
import { formatTime } from '../utils/videoUtils';
import saveAs from 'file-saver';

interface GalleryProps {
  screenshots: Screenshot[];
  onRemove: (id: string) => void;
}

const Gallery: React.FC<GalleryProps> = ({ screenshots, onRemove }) => {
  if (screenshots.length === 0) return null;

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Extracted Frames <span className="text-indigo-500 ml-2 text-sm font-normal bg-indigo-500/10 px-2 py-0.5 rounded-full">{screenshots.length}</span></h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {screenshots.map((shot) => (
          <div key={shot.id} className="group relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-indigo-500 transition-colors shadow-sm">
            
            {/* Aspect Square Container */}
            <div className="aspect-square w-full relative bg-[#000000]">
               {/* Image with object-contain to avoid cropping */}
               <img 
                 src={shot.url} 
                 alt={`Frame at ${shot.timestamp}`} 
                 className="w-full h-full object-contain"
               />
               
               {/* Timestamp Badge (Moved from footer to overlay) */}
               <div className="absolute bottom-2 right-2 pointer-events-none">
                 <span className="text-[10px] font-mono font-medium text-indigo-100 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10 shadow-sm">
                   {formatTime(shot.timestamp)}
                 </span>
               </div>

               {/* Hover Actions Overlay */}
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                 <button 
                   onClick={() => window.open(shot.url, '_blank')}
                   className="p-2.5 bg-gray-700/80 rounded-full hover:bg-indigo-600 text-white transition-all transform hover:scale-110 shadow-lg"
                   title="View Full Size"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                     <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                   </svg>
                 </button>
                 <button 
                   onClick={() => saveAs(shot.blob, shot.fileName)}
                   className="p-2.5 bg-gray-700/80 rounded-full hover:bg-emerald-600 text-white transition-all transform hover:scale-110 shadow-lg"
                   title="Download Image"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                   </svg>
                 </button>
                 <button 
                   onClick={() => onRemove(shot.id)}
                   className="p-2.5 bg-gray-700/80 rounded-full hover:bg-red-500 text-white transition-all transform hover:scale-110 shadow-lg"
                   title="Remove Frame"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                   </svg>
                 </button>
               </div>
            </div>
            
            {/* Footer removed */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;