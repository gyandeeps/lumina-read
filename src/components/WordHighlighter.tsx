import React from 'react';

interface WordHighlighterProps {
  sentence: string;
  currentWordIndex: number;
  isListening: boolean;
}

export const WordHighlighter: React.FC<WordHighlighterProps> = ({
  sentence,
  currentWordIndex,
  isListening,
}) => {
  // Split the sentence by spaces into individual words (keeping punctuation attached for display)
  const words = sentence.split(/\s+/);

  return (
    <div className="flex flex-wrap justify-center items-center gap-y-8 gap-x-4 max-w-4xl mx-auto px-4 py-8 select-none text-center">
      {words.map((word, index) => {
        let wordState: 'pending' | 'active' | 'recognized' = 'pending';

        if (index < currentWordIndex) {
          wordState = 'recognized';
        } else if (index === currentWordIndex) {
          wordState = 'active';
        }

        return (
          <span
            key={index}
            className={`
              font-kids text-5xl md:text-6xl lg:text-7xl transition-all duration-300 origin-center inline-block
              ${
                wordState === 'recognized'
                  ? 'text-emerald-500 font-semibold scale-100 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
                  : ''
              }
              ${
                wordState === 'active'
                  ? isListening
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
            {word}
          </span>
        );
      })}
    </div>
  );
};
