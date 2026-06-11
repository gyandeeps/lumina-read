import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ArrowRight, Star, RefreshCw, Trophy, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Story } from '../content/stories';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { updateReadingProgress, normalizeWord } from '../utils/fuzzyMatch';
import { WordHighlighter } from './WordHighlighter';
import { StartButton } from './StartButton';
import successChimeUrl from '../assets/success-chime.mp3';

interface ReadingScreenProps {
  story: Story;
  onBack: () => void;
}

export const ReadingScreen: React.FC<ReadingScreenProps> = ({ story, onBack }) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isSentenceCompleted, setIsSentenceCompleted] = useState(false);
  const [isStoryCompleted, setIsStoryCompleted] = useState(false);

  const {
    status,
    error,
    words,
    initModel,
    startListening,
    stopListening,
    resetTranscript,
    loadingProgress,
    isRecording,
    micError,
  } = useSpeechRecognition();

  // Reset transcript and index when loading a new story
  useEffect(() => {
    setCurrentSentenceIndex(0);
    setCurrentWordIndex(0);
    setIsSentenceCompleted(false);
    setIsStoryCompleted(false);
    resetTranscript();
  }, [story, resetTranscript]);

  const sentence = story.sentences[currentSentenceIndex];

  // Tokenize expected sentence words
  const expectedWords = useMemo(() => sentence.split(/\s+/).filter(Boolean), [sentence]);
  const expectedTokens = useMemo(() => expectedWords.map(normalizeWord).filter(Boolean), [expectedWords]);

  // Audio elements ref to avoid creating multiple Audio objects
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chimeAudioRef.current = new Audio(successChimeUrl);
  }, []);

  const playSuccessChime = () => {
    if (chimeAudioRef.current) {
      chimeAudioRef.current.currentTime = 0;
      chimeAudioRef.current.play().catch((err) => {
        console.warn('Audio play failed due to user permission restriction:', err);
      });
    }
  };

  const triggerConfetti = () => {
    // Left side burst
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#fbbf24'],
    });
    // Right side burst
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#fbbf24'],
    });
  };

  // Sync speech worker transcription with reading index
  useEffect(() => {
    if (isSentenceCompleted || isStoryCompleted) return;

    if (words.length > 0) {
      const { currentWordIndex: nextIndex } = updateReadingProgress(expectedTokens, words, currentWordIndex);

      if (nextIndex > currentWordIndex) {
        setCurrentWordIndex(nextIndex);
      }

      // Sentence fully read!
      if (nextIndex === expectedTokens.length) {
        setIsSentenceCompleted(true);
        stopListening();
        playSuccessChime();
        triggerConfetti();
      }
    }
  }, [words, expectedTokens, currentWordIndex, isSentenceCompleted, isStoryCompleted, stopListening]);

  // Trigger when moving to the next sentence
  const handleNextSentence = () => {
    if (currentSentenceIndex < story.sentences.length - 1) {
      setCurrentSentenceIndex((prev) => prev + 1);
      setCurrentWordIndex(0);
      setIsSentenceCompleted(false);
      resetTranscript();
      startListening();
    } else {
      setIsStoryCompleted(true);
      // Extra grand confetti explosion for story completion!
      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.4 },
        });
      }, 300);
    }
  };

  // Skip sentence helper (useful if child is stuck)
  const handleSkipSentence = () => {
    stopListening();
    setIsSentenceCompleted(true);
    playSuccessChime();
    triggerConfetti();
  };

  // Reset the current sentence reading attempts
  const handleRetrySentence = () => {
    stopListening();
    setCurrentWordIndex(0);
    setIsSentenceCompleted(false);
    resetTranscript();
  };

  const overallProgressPercent = Math.round(
    ((currentSentenceIndex + (isSentenceCompleted ? 1 : 0)) / story.sentences.length) * 100
  );

  if (isStoryCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80svh] px-4">
        <div className="glass-card max-w-lg w-full p-10 rounded-3xl text-center shadow-2xl relative overflow-hidden">
          {/* Confetti decoration */}
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-yellow-300/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-pink-300/20 rounded-full blur-xl animate-pulse" />
          
          <div className="inline-flex p-5 bg-gradient-to-tr from-yellow-400 to-amber-300 rounded-full border-4 border-white shadow-lg mb-6">
            <Trophy className="w-16 h-16 text-yellow-900 animate-bounce-subtle" />
          </div>

          <h2 className="font-kids text-4xl md:text-5xl font-bold text-slate-800 mb-2">
            You Did It!
          </h2>
          <p className="text-xl text-slate-500 font-sans mb-8">
            You read <span className="font-bold text-pink-500">"{story.title}"</span> all by yourself!
          </p>

          <div className="bg-gradient-to-r from-pink-50/50 to-blue-50/50 p-6 rounded-2xl border border-white/60 shadow-inner mb-8 flex justify-around">
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-pink-500 font-sans">
                {story.sentences.length}
              </span>
              <span className="text-xs uppercase text-slate-500 font-bold tracking-wider font-sans">
                Sentences Read
              </span>
            </div>
            <div className="border-r border-slate-200" />
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-blue-500 font-sans">
                {story.sentences.reduce((acc, curr) => acc + curr.split(/\s+/).length, 0)}
              </span>
              <span className="text-xs uppercase text-slate-500 font-bold tracking-wider font-sans">
                Total Words
              </span>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full py-4 text-xl font-bold font-kids text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl shadow-lg shadow-pink-200 transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white flex items-center justify-center gap-2"
          >
            <span>Read Another Story!</span>
            <Sparkles className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[85svh] justify-between px-4 pb-8">
      {/* Header Area */}
      <div className="flex items-center justify-between py-4 max-w-6xl w-full mx-auto">
        <button
          onClick={() => {
            stopListening();
            onBack();
          }}
          className="p-3 bg-white/80 rounded-2xl border border-slate-200/50 hover:bg-slate-50 transition-colors flex items-center justify-center text-slate-600 shadow-sm hover:shadow active:scale-95 duration-200"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="text-center flex-1 mx-4">
          <h2 className="font-kids text-2xl font-bold text-slate-800 truncate">
            {story.title}
          </h2>
          {/* Progress bar */}
          <div className="flex items-center justify-center gap-3 mt-1">
            <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300/30">
              <div
                className="bg-pink-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-bold font-sans">
              Sentence {currentSentenceIndex + 1} of {story.sentences.length}
            </span>
          </div>
        </div>

        <div className="w-12 h-12" /> {/* Spacer */}
      </div>

      {/* Main Sentence Reader Card */}
      <div className="flex-1 flex flex-col items-center justify-center my-6">
        <div className="glass-card w-full max-w-4xl p-8 md:p-12 rounded-3xl relative shadow-xl min-h-[300px] flex items-center justify-center border-4 border-white">
          {/* Star animation corners */}
          {isSentenceCompleted && (
            <div className="absolute top-4 right-4 bg-yellow-400 p-2 rounded-full border-2 border-white shadow animate-bounce-subtle">
              <Star className="w-6 h-6 text-yellow-900 fill-current" />
            </div>
          )}

          <WordHighlighter
            sentence={sentence}
            currentWordIndex={currentWordIndex}
            isListening={status === 'listening' || isRecording}
          />
        </div>
      </div>

      {/* Controls & Helpers Area */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
        {/* Error Warnings */}
        {(error || micError) && (
          <div className="bg-red-50 text-red-700 px-6 py-3 rounded-2xl border border-red-200 text-sm flex items-center gap-2 shadow-sm mb-2 font-sans">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error || micError}</span>
          </div>
        )}

        {isSentenceCompleted ? (
          <div className="flex flex-col items-center gap-3 w-full animate-bounce-subtle">
            <button
              onClick={handleNextSentence}
              className="px-10 py-5 text-2xl font-bold font-kids text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl shadow-xl shadow-emerald-100 hover:shadow-2xl border-4 border-white transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>{currentSentenceIndex < story.sentences.length - 1 ? 'Next Sentence' : 'Finish Story!'}</span>
              <ArrowRight className="w-7 h-7" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <StartButton
              status={status}
              loadingProgress={loadingProgress}
              isRecording={status === 'listening' || isRecording}
              onInit={initModel}
              onStart={startListening}
              onStop={stopListening}
            />

            {/* Helper links for classroom environments / troubleshooting */}
            {status === 'ready' && (
              <div className="flex gap-4 text-xs font-sans font-semibold text-slate-500 mt-2">
                <button
                  onClick={handleRetrySentence}
                  className="hover:text-pink-500 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Sentence
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={handleSkipSentence}
                  className="hover:text-blue-500 transition-colors"
                >
                  Skip Sentence ➡️
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
