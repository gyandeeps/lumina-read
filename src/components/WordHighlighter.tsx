import React, { useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';

interface WordHighlighterProps {
  sentence: string;
  currentWordIndex: number;
  isListening: boolean;
  isSpeakingHelp: boolean;
  theme: 'day' | 'sunset' | 'night';
}

export const WordHighlighter: React.FC<WordHighlighterProps> = ({
  sentence,
  currentWordIndex,
  isListening,
  isSpeakingHelp,
  theme,
}) => {
  // Split the sentence by spaces into individual words (keeping punctuation attached for display)
  const words = sentence.split(/\s+/);

  // Track previously recognized index to detect new word matches
  const prevRecognizedRef = useRef(currentWordIndex);

  useEffect(() => {
    prevRecognizedRef.current = currentWordIndex;
  }, [currentWordIndex]);

  return (
    <div className="flex flex-wrap justify-center items-center gap-y-8 gap-x-4 max-w-4xl mx-auto px-4 py-8 select-none text-center">
      {words.map((word, index) => {
        let wordState: 'pending' | 'active' | 'recognized' = 'pending';

        if (index < currentWordIndex) {
          wordState = 'recognized';
        } else if (index === currentWordIndex) {
          wordState = 'active';
        }

        // Apply pop animation only to the most recently recognized word
        const justRecognized = wordState === 'recognized' && index === currentWordIndex - 1 && index >= prevRecognizedRef.current - 1;

        // Determine word styling based on state and theme
        let wordClasses = '';
        if (wordState === 'recognized') {
          if (theme === 'night') {
            wordClasses = `text-emerald-300 font-extrabold scale-100 drop-shadow-[0_0_12px_rgba(52,211,153,0.55)] ${justRecognized ? 'word-pop' : ''}`;
          } else if (theme === 'sunset') {
            wordClasses = `text-emerald-600 font-bold scale-100 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] ${justRecognized ? 'word-pop' : ''}`;
          } else {
            wordClasses = `text-emerald-500 font-semibold scale-100 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] ${justRecognized ? 'word-pop' : ''}`;
          }
        } else if (wordState === 'active') {
          if (isSpeakingHelp) {
            if (theme === 'night') {
              wordClasses = 'text-amber-200 font-extrabold scale-110 animate-bounce-subtle px-3.5 py-1 bg-amber-950/70 rounded-2xl border-2 border-amber-400 shadow-lg shadow-amber-400/35';
            } else if (theme === 'sunset') {
              wordClasses = 'text-orange-600 font-extrabold scale-110 animate-bounce-subtle px-3.5 py-1 bg-orange-100 rounded-2xl border-2 border-orange-400 shadow-sm shadow-orange-100/50';
            } else {
              wordClasses = 'text-amber-500 font-extrabold scale-110 animate-bounce-subtle px-3.5 py-1 bg-amber-50 rounded-2xl border-2 border-amber-300 shadow-sm shadow-amber-100/50';
            }
          } else if (isListening) {
            if (theme === 'night') {
              wordClasses = 'text-sky-100 font-extrabold scale-110 animate-pulse-subtle px-3.5 py-1 bg-indigo-950/80 rounded-2xl border-2 border-sky-400 shadow-lg shadow-sky-400/40';
            } else if (theme === 'sunset') {
              wordClasses = 'text-orange-600 font-extrabold scale-110 animate-pulse-subtle px-3.5 py-1 bg-orange-100/70 rounded-2xl border-2 border-orange-400/60 shadow-sm shadow-orange-100/50';
            } else {
              wordClasses = 'text-teal-600 font-extrabold scale-110 animate-pulse-subtle px-3.5 py-1 bg-teal-50 rounded-2xl border-2 border-teal-200/50 shadow-sm shadow-teal-100/50';
            }
          } else {
            if (theme === 'night') {
              wordClasses = 'text-sky-200 font-bold scale-105 px-3.5 py-1 bg-sky-950/60 rounded-2xl border border-sky-500/40 shadow-sm';
            } else if (theme === 'sunset') {
              wordClasses = 'text-orange-600 font-bold scale-105 px-3.5 py-1 bg-orange-50/70 rounded-2xl border border-orange-200/40';
            } else {
              wordClasses = 'text-teal-600 font-bold scale-105 px-3.5 py-1 bg-teal-50/50 rounded-2xl border border-teal-100';
            }
          }
        } else {
          // pending
          if (theme === 'night') {
            wordClasses = 'text-slate-400 font-normal hover:text-slate-300';
          } else if (theme === 'sunset') {
            wordClasses = 'text-amber-800/60 font-normal hover:text-amber-900';
          } else {
            wordClasses = 'text-slate-400 font-normal hover:text-slate-500';
          }
        }

        return (
          <span
            key={index}
            className={`
              font-kids text-5xl md:text-6xl lg:text-7xl transition-all duration-300 origin-center inline-flex items-center gap-2
              ${wordClasses}
            `}
          >
            <span>{word}</span>
            {wordState === 'active' && isSpeakingHelp && (
              <Volume2 className="w-8 h-8 md:w-10 md:h-10 text-amber-500 animate-pulse" />
            )}
          </span>
        );
      })}
    </div>
  );
};
