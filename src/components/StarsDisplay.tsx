import React from 'react';
import { Star } from 'lucide-react';

interface StarsDisplayProps {
  /** Number of stars earned so far */
  earned: number;
  /** Total number of stars possible */
  total: number;
}

export const StarsDisplay: React.FC<StarsDisplayProps> = ({ earned, total }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap py-1">
      {Array.from({ length: total }, (_, i) => {
        const isEarned = i < earned;
        // Each star gets a staggered animation delay for a cascade pop-in
        const delay = isEarned ? `${i * 80}ms` : '0ms';

        return (
          <span
            key={i}
            className={`
              inline-flex transition-all duration-300 origin-center
              ${isEarned
                ? 'text-yellow-400 drop-shadow-[0_1px_3px_rgba(250,204,21,0.5)] star-pop-in'
                : 'text-slate-200'
              }
            `}
            style={isEarned ? { animationDelay: delay } : undefined}
          >
            <Star
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${isEarned ? 'fill-current' : ''}`}
            />
          </span>
        );
      })}
    </div>
  );
};
