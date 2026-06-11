import React, { useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';

interface WordHighlighterProps {
  sentence: string;
  currentWordIndex: number;
  isListening: boolean;
  isSpeakingHelp: boolean;
}

export const WordHighlighter: React.FC<WordHighlighterProps> = ({
  sentence,
  currentWordIndex,
  isListening,
  isSpeakingHelp,
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

        return (
          <span
            key={index}
            className={`
              font-kids text-5xl md:text-6xl lg:text-7xl transition-all duration-300 origin-center inline-flex items-center gap-2
              ${
                wordState === 'recognized'
                  ? `text-emerald-500 font-semibold scale-100 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] ${justRecognized ? 'word-pop' : ''}`
                  : ''
              }
              ${
                wordState === 'active'
                  ? isSpeakingHelp
                    ? 'text-amber-500 font-extrabold scale-110 animate-bounce-subtle px-3 py-1 bg-amber-50 rounded-2xl border-2 border-amber-300 shadow-sm shadow-amber-100/50'
                    : isListening
                      ? 'text-blue-500 font-extrabold scale-110 animate-pulse-subtle px-3 py-1 bg-blue-50 rounded-2xl border-2 border-blue-200/50 shadow-sm shadow-blue-100/50'
                      : 'text-blue-500 font-bold scale-105 px-3 py-1 bg-blue-50/50 rounded-2xl border border-blue-100'
                  : ''
              }
              ${
                wordState === 'pending'
                  ? 'text-slate-400 font-normal hover:text-slate-500'
                  : ''
              }
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
