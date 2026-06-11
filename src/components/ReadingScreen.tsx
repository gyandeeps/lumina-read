import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ArrowRight, Star, RefreshCw, Trophy, Sparkles, AlertCircle, Flower, Volume2, BookOpen, Clock, MessageCircle } from 'lucide-react';
import type { Story } from '../content/stories';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useReadingTimer } from '../hooks/useReadingTimer';
import { updateReadingProgress, normalizeWord } from '../utils/fuzzyMatch';
import { WordHighlighter } from './WordHighlighter';
import { StarsDisplay } from './StarsDisplay';
import { StartButton } from './StartButton';
import successChimeUrl from '../assets/success-chime.mp3';
import { triggerFlowerRain, triggerSideBurst, triggerSuccessExplosion } from '../utils/confettiHelper';
import { saveCurrentPosition, markStoryComplete } from '../utils/progressStore';

interface ReadingScreenProps {
  story: Story;
  onBack: () => void;
  initialSentenceIndex?: number;
}

/** Seconds of no word progress before showing encouragement */
const IDLE_ENCOURAGEMENT_SECONDS = 15;

export const ReadingScreen: React.FC<ReadingScreenProps> = ({ story, onBack, initialSentenceIndex = 0 }) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(initialSentenceIndex);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isSentenceCompleted, setIsSentenceCompleted] = useState(false);
  const [isStoryCompleted, setIsStoryCompleted] = useState(false);
  const [isSpeakingHelp, setIsSpeakingHelp] = useState(false);
  const [isSpeakingSentence, setIsSpeakingSentence] = useState(false);
  const [showIdleEncouragement, setShowIdleEncouragement] = useState(false);

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

  const readingTimer = useReadingTimer();
  const { start: timerStart, pause: timerPause, reset: timerReset } = readingTimer;

  // Idle encouragement timer
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressTimeRef = useRef(Date.now());

  const resetIdleTimer = useCallback(() => {
    lastProgressTimeRef.current = Date.now();
    setShowIdleEncouragement(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setShowIdleEncouragement(true);
    }, IDLE_ENCOURAGEMENT_SECONDS * 1000);
  }, []);

  // Clear idle timer on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Start idle timer when listening begins
  useEffect(() => {
    if (status === 'listening' || isRecording) {
      resetIdleTimer();
    } else {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      setShowIdleEncouragement(false);
    }
  }, [status, isRecording, resetIdleTimer]);

  // Reset transcript and index when loading a new story
  useEffect(() => {
    setCurrentSentenceIndex(initialSentenceIndex);
    setCurrentWordIndex(0);
    setIsSentenceCompleted(false);
    setIsStoryCompleted(false);
    setIsSpeakingHelp(false);
    setIsSpeakingSentence(false);
    setShowIdleEncouragement(false);
    resetTranscript();
    timerReset();
  }, [story, resetTranscript, initialSentenceIndex, timerReset]);

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

  // --- Help Pronunciation (single word) ---
  const playHelpPronunciation = () => {
    if (isSpeakingHelp || isSpeakingSentence) return;

    const wordToPronounce = expectedWords[currentWordIndex];
    if (!wordToPronounce) return;

    const cleanWord = wordToPronounce.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    if (!cleanWord) return;

    if ('speechSynthesis' in window) {
      setIsSpeakingHelp(true);

      const wasListening = status === 'listening' || isRecording;
      if (wasListening) {
        stopListening();
        readingTimer.pause();
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.rate = 0.85;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        setIsSpeakingHelp(false);
        if (wasListening) {
          startListening();
          readingTimer.start();
        }
      };

      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeakingHelp(false);
        if (wasListening) {
          startListening();
          readingTimer.start();
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      alert(`The word is: "${cleanWord}"`);
    }
  };

  // --- "Read to Me" Full Sentence Playback ---
  const playSentenceReadToMe = () => {
    if (isSpeakingSentence || isSpeakingHelp) return;

    if ('speechSynthesis' in window) {
      setIsSpeakingSentence(true);

      const wasListening = status === 'listening' || isRecording;
      if (wasListening) {
        stopListening();
        readingTimer.pause();
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 0.7;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        setIsSpeakingSentence(false);
        if (wasListening) {
          startListening();
          readingTimer.start();
        }
      };

      utterance.onerror = (e) => {
        console.error('Sentence speech synthesis error:', e);
        setIsSpeakingSentence(false);
        if (wasListening) {
          startListening();
          readingTimer.start();
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      alert(`The sentence is: "${sentence}"`);
    }
  };

  // Sync speech worker transcription with reading index
  useEffect(() => {
    if (isSentenceCompleted || isStoryCompleted) return;

    if (words.length > 0) {
      const { currentWordIndex: nextIndex } = updateReadingProgress(expectedTokens, words, currentWordIndex);

      if (nextIndex > currentWordIndex) {
        setCurrentWordIndex(nextIndex);
        // Reset idle timer on progress
        resetIdleTimer();
      }

      // Sentence fully read!
      if (nextIndex === expectedTokens.length) {
        setIsSentenceCompleted(true);
        stopListening();
        timerPause();
        playSuccessChime();
        triggerSideBurst();
        // Save progress to localStorage
        saveCurrentPosition(story.title, currentSentenceIndex);
      }
    }
  }, [words, expectedTokens, currentWordIndex, isSentenceCompleted, isStoryCompleted, stopListening, resetIdleTimer, story.title, currentSentenceIndex, timerPause]);

  // Trigger when moving to the next sentence
  const handleNextSentence = () => {
    if (currentSentenceIndex < story.sentences.length - 1) {
      const nextIndex = currentSentenceIndex + 1;
      setCurrentSentenceIndex(nextIndex);
      setCurrentWordIndex(0);
      setIsSentenceCompleted(false);
      setShowIdleEncouragement(false);
      resetTranscript();
      startListening();
      timerStart();
      // Save position
      saveCurrentPosition(story.title, nextIndex);
    } else {
      setIsStoryCompleted(true);
      timerPause();
      // Mark story complete with total word count
      const totalWords = story.sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0);
      markStoryComplete(story.title, totalWords);
      // Extra grand confetti explosion for story completion!
      setTimeout(() => {
        triggerSuccessExplosion();
      }, 300);
    }
  };

  // Skip sentence helper (useful if child is stuck)
  const handleSkipSentence = () => {
    stopListening();
    timerPause();
    setIsSentenceCompleted(true);
    playSuccessChime();
    triggerSideBurst();
  };

  // Reset the current sentence reading attempts
  const handleRetrySentence = () => {
    stopListening();
    setCurrentWordIndex(0);
    setIsSentenceCompleted(false);
    setShowIdleEncouragement(false);
    resetTranscript();
  };

  // Timer controls: start when listening, pause when not
  useEffect(() => {
    if (status === 'listening' || isRecording) {
      timerStart();
    } else if (status === 'ready') {
      timerPause();
    }
  }, [status, isRecording, timerStart, timerPause]);

  const overallProgressPercent = Math.round(
    ((currentSentenceIndex + (isSentenceCompleted ? 1 : 0)) / story.sentences.length) * 100
  );

  const starsEarned = currentSentenceIndex + (isSentenceCompleted ? 1 : 0);

  if (isStoryCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80svh] px-4 page-enter">
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
          <p className="text-xl text-slate-500 font-sans mb-4">
            You read <span className="font-bold text-pink-500">"{story.title}"</span> all by yourself!
          </p>

          {/* Stars celebration */}
          <div className="mb-6">
            <StarsDisplay earned={story.sentences.length} total={story.sentences.length} />
          </div>

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
            <div className="border-r border-slate-200" />
            <div className="text-center">
              <span className="block text-3xl font-extrabold text-emerald-500 font-sans">
                {readingTimer.getFormattedTime()}
              </span>
              <span className="text-xs uppercase text-slate-500 font-bold tracking-wider font-sans">
                Reading Time
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
            timerPause();
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
          {/* Progress bar + timer */}
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
            {/* Reading Timer */}
            <span className="text-xs text-slate-400 font-sans flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTimer.getFormattedTime()}
            </span>
          </div>
          {/* Stars Display */}
          <StarsDisplay earned={starsEarned} total={story.sentences.length} />
        </div>

        <button
          onClick={triggerFlowerRain}
          className="p-3 bg-white/80 rounded-2xl border border-slate-200/50 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-200 transition-all flex items-center justify-center text-slate-500 shadow-sm hover:shadow active:scale-95 duration-200"
          title="Sprinkle flowers!"
        >
          <Flower className="w-6 h-6 text-pink-500 animate-pulse" />
        </button>
      </div>

      {/* Main Sentence Reader Card */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 w-full">
        <div className="glass-card w-full max-w-4xl p-8 md:p-12 rounded-3xl relative shadow-xl min-h-[300px] flex flex-col items-center justify-center gap-6 border-4 border-white">
          {/* Star animation corners */}
          {isSentenceCompleted && (
            <div className="absolute top-4 right-4 bg-yellow-400 p-2 rounded-full border-2 border-white shadow animate-bounce-subtle">
              <Star className="w-6 h-6 text-yellow-900 fill-current" />
            </div>
          )}

          <div className="flex-1 flex items-center justify-center w-full">
            <WordHighlighter
              sentence={sentence}
              currentWordIndex={currentWordIndex}
              isListening={status === 'listening' || isRecording}
              isSpeakingHelp={isSpeakingHelp}
            />
          </div>

          {/* Idle Encouragement Prompt */}
          {showIdleEncouragement && !isSentenceCompleted && (status === 'listening' || isRecording) && (
            <div className="animate-idle-nudge bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/60 rounded-2xl px-6 py-3 shadow-sm flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-violet-500 flex-shrink-0" />
              <p className="font-kids text-base text-violet-700">
                You're doing great! Try saying: <span className="font-extrabold text-violet-900">"{expectedWords[currentWordIndex]}"</span>
              </p>
            </div>
          )}

          {/* Help Buttons inside the card */}
          {!isSentenceCompleted && (status === 'ready' || status === 'listening') && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Single Word Help */}
              <button
                onClick={playHelpPronunciation}
                disabled={isSpeakingHelp || isSpeakingSentence}
                className={`group px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:from-amber-300 disabled:to-orange-400 text-white font-kids text-lg font-bold rounded-2xl shadow-md hover:shadow-lg border-2 border-white transition-all transform hover:scale-105 active:scale-95 duration-200 flex items-center gap-2 cursor-pointer ${
                  isSpeakingHelp ? 'animate-pulse' : ''
                }`}
              >
                <Volume2 className="w-5 h-5 group-hover:animate-bounce-subtle" />
                <span>Hear "{expectedWords[currentWordIndex]}"</span>
              </button>

              {/* Full Sentence "Read to Me" */}
              <button
                onClick={playSentenceReadToMe}
                disabled={isSpeakingSentence || isSpeakingHelp}
                className={`group px-6 py-3 bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-500 hover:to-purple-600 disabled:from-violet-300 disabled:to-purple-400 text-white font-kids text-lg font-bold rounded-2xl shadow-md hover:shadow-lg border-2 border-white transition-all transform hover:scale-105 active:scale-95 duration-200 flex items-center gap-2 cursor-pointer ${
                  isSpeakingSentence ? 'animate-pulse' : ''
                }`}
              >
                <BookOpen className="w-5 h-5 group-hover:animate-bounce-subtle" />
                <span>Read to Me 📖</span>
              </button>
            </div>
          )}
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
