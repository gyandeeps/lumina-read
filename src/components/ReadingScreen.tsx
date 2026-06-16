import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ArrowRight, Star, RefreshCw, Trophy, Sparkles, AlertCircle, Flower, Volume2, BookOpen, Clock, MessageCircle } from 'lucide-react';
import type { Story } from '../content/stories';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useReadingTimer, useTimerDisplay } from '../hooks/useReadingTimer';
import { updateReadingProgress, normalizeWord } from '../utils/fuzzyMatch';
import { WordHighlighter } from './WordHighlighter';
import { StarsDisplay } from './StarsDisplay';
import { StartButton } from './StartButton';
import successChimeUrl from '../assets/success-chime.mp3';
import { triggerFlowerRain, triggerSideBurst, triggerSuccessExplosion, resetConfetti, cancelFlowerRain } from '../utils/confettiHelper';
import { saveCurrentPosition, markStoryComplete, incrementHelpWordsCount, incrementReadToMeCount } from '../utils/progressStore';

// ── Lazy Audio Singleton ────────────────────────────────────────────
// On iOS Safari, each `new Audio()` is backed by an AVAudioPlayer
// instance which is expensive. Re-creating it every mount leaks memory.
let sharedChimeAudio: HTMLAudioElement | null = null;
function getChimeAudio(): HTMLAudioElement {
  if (!sharedChimeAudio) {
    sharedChimeAudio = new Audio(successChimeUrl);
  }
  return sharedChimeAudio;
}

/** Maximum time (ms) to wait for TTS word help before force-cancelling. */
const TTS_WORD_TIMEOUT_MS = 8000;
/** Maximum time (ms) to wait for TTS full sentence before force-cancelling. */
const TTS_SENTENCE_TIMEOUT_MS = 20000;

interface ReadingScreenProps {
  story: Story;
  onBack: () => void;
  initialSentenceIndex?: number;
  theme: 'day' | 'sunset' | 'night';
}

/** Seconds of no word progress before showing encouragement */
const IDLE_ENCOURAGEMENT_SECONDS = 15;

/** Isolated component that subscribes to timer ticks. Only this re-renders every second. */
const TimerText: React.FC<{ store: ReturnType<typeof useReadingTimer>['store'] }> = ({ store }) => {
  const display = useTimerDisplay(store);
  return <>{display}</>;
};

export const ReadingScreen: React.FC<ReadingScreenProps> = ({
  story,
  onBack,
  initialSentenceIndex = 0,
  theme,
}) => {
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

  // Track whether this component instance is still mounted.
  // Guards async TTS callbacks from setting state on an unmounted component.
  const isMountedRef = useRef(true);

  // Safety timeout refs for iOS speech synthesis watchdog workaround
  const ttsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Master unmount cleanup: idle timer, speech synthesis, confetti, mounted flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      // Cancel any in-flight TTS to release iPad audio hardware
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // Free confetti GPU resources
      cancelFlowerRain();
      resetConfetti();
    };
  }, []);

  // Pre-warm Speech Synthesis voices for iOS Safari snappiness
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      };
    }
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

  // ── Visibility / Memory Pressure Handler ─────────────────────────
  // iPadOS aggressively terminates backgrounded WebViews. Proactively
  // release heavy resources when the page is hidden.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page backgrounded — release resources
        stopListening();
        timerPause();
        resetConfetti();
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopListening, timerPause]);

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

  // Dynamic page title update when story is completed
  useEffect(() => {
    if (isStoryCompleted) {
      document.title = `Completed "${story.title}"! 🎉 | LuminaRead`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          `Congratulations! You successfully read "${story.title}" all by yourself on LuminaRead!`
        );
      }
    }
  }, [isStoryCompleted, story.title]);

  const sentence = story.sentences[currentSentenceIndex];

  // Tokenize expected sentence words
  const expectedWords = useMemo(() => sentence.split(/\s+/).filter(Boolean), [sentence]);
  const expectedTokens = useMemo(() => expectedWords.map(normalizeWord).filter(Boolean), [expectedWords]);

  const playSuccessChime = () => {
    const chime = getChimeAudio();
    chime.currentTime = 0;
    chime.play().catch((err) => {
      console.warn('Audio play failed due to user permission restriction:', err);
    });
  };

  // --- Help Pronunciation (single word) ---
  const playHelpPronunciation = () => {
    if (isSpeakingHelp || isSpeakingSentence) return;

    const wordToPronounce = expectedWords[currentWordIndex];
    if (!wordToPronounce) return;

    const cleanWord = wordToPronounce.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    if (!cleanWord) return;

    incrementHelpWordsCount();

    if ('speechSynthesis' in window) {
      setIsSpeakingHelp(true);

      const wasListening = status === 'listening' || isRecording;
      if (wasListening) {
        stopListening();
        readingTimer.pause();
      }

      window.speechSynthesis.cancel();
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);

      /** Shared cleanup for both normal completion and watchdog timeout. */
      const finishTTS = () => {
        if (ttsTimeoutRef.current) {
          clearTimeout(ttsTimeoutRef.current);
          ttsTimeoutRef.current = null;
        }
        if (!isMountedRef.current) return;
        setIsSpeakingHelp(false);
        if (wasListening) {
          startListening();
          readingTimer.start();
        }
      };

      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.rate = 0.85;
      utterance.lang = 'en-US';

      utterance.onend = finishTTS;
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        finishTTS();
      };

      window.speechSynthesis.speak(utterance);

      // iOS watchdog: force-cancel if callbacks never fire (iOS kills TTS silently after ~15s)
      ttsTimeoutRef.current = setTimeout(() => {
        console.warn('TTS word help watchdog triggered — force-cancelling');
        window.speechSynthesis.cancel();
        finishTTS();
      }, TTS_WORD_TIMEOUT_MS);
    } else {
      alert(`The word is: "${cleanWord}"`);
    }
  };

  // --- "Read to Me" Full Sentence Playback ---
  const playSentenceReadToMe = () => {
    if (isSpeakingSentence || isSpeakingHelp) return;

    incrementReadToMeCount();

    if ('speechSynthesis' in window) {
      setIsSpeakingSentence(true);

      const wasListening = status === 'listening' || isRecording;
      if (wasListening) {
        stopListening();
        readingTimer.pause();
      }

      window.speechSynthesis.cancel();
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);

      /** Shared cleanup for both normal completion and watchdog timeout. */
      const finishTTS = () => {
        if (ttsTimeoutRef.current) {
          clearTimeout(ttsTimeoutRef.current);
          ttsTimeoutRef.current = null;
        }
        if (!isMountedRef.current) return;
        setIsSpeakingSentence(false);
        if (wasListening) {
          startListening();
          readingTimer.start();
        }
      };

      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 0.7;
      utterance.lang = 'en-US';

      utterance.onend = finishTTS;
      utterance.onerror = (e) => {
        console.error('Sentence speech synthesis error:', e);
        finishTTS();
      };

      window.speechSynthesis.speak(utterance);

      // iOS watchdog: force-cancel if callbacks never fire
      ttsTimeoutRef.current = setTimeout(() => {
        console.warn('TTS sentence help watchdog triggered — force-cancelling');
        window.speechSynthesis.cancel();
        finishTTS();
      }, TTS_SENTENCE_TIMEOUT_MS);
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
      <div className={`flex flex-col items-center justify-center min-h-[80svh] px-4 page-enter theme-${theme}`}>
        <div className="glass-card max-w-lg w-full p-5 sm:p-10 rounded-3xl text-center shadow-2xl relative overflow-hidden border border-slate-500/10">
          {/* Confetti decoration */}
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-yellow-300/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-teal-300/10 rounded-full blur-xl animate-pulse" />
          
          <div className="inline-flex p-5 bg-gradient-to-tr from-yellow-400 to-amber-300 rounded-full border-4 border-white shadow-lg mb-6">
            <Trophy className="w-16 h-16 text-yellow-900 animate-bounce-subtle" />
          </div>

          <h1 className="font-kids text-4xl md:text-5xl font-bold theme-text-primary mb-2">
            You Did It!
          </h1>
          <p className="text-xl theme-text-secondary font-sans mb-4">
            You read <span className="font-bold text-teal-500">"{story.title}"</span> all by yourself!
          </p>

          {/* Stars celebration */}
          <div className="mb-6">
            <StarsDisplay earned={story.sentences.length} total={story.sentences.length} />
          </div>

          <div className="bg-slate-500/5 p-4 sm:p-6 rounded-2xl border border-slate-500/10 shadow-inner mb-8 flex justify-around gap-1">
            <div className="text-center flex-1">
              <span className="block text-2xl sm:text-3xl font-extrabold text-teal-500 font-sans">
                {story.sentences.length}
              </span>
              <span className="text-[10px] sm:text-xs uppercase theme-text-secondary font-bold tracking-wider font-sans block leading-tight">
                Sentences Read
              </span>
            </div>
            <div className="border-r theme-border" />
            <div className="text-center flex-1">
              <span className="block text-2xl sm:text-3xl font-extrabold text-blue-500 font-sans">
                {story.sentences.reduce((acc, curr) => acc + curr.split(/\s+/).length, 0)}
              </span>
              <span className="text-[10px] sm:text-xs uppercase theme-text-secondary font-bold tracking-wider font-sans block leading-tight">
                Total Words
              </span>
            </div>
            <div className="border-r theme-border" />
            <div className="text-center flex-1">
              <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-500 font-sans">
                <TimerText store={readingTimer.store} />
              </span>
              <span className="text-[10px] sm:text-xs uppercase theme-text-secondary font-bold tracking-wider font-sans block leading-tight">
                Reading Time
              </span>
            </div>
          </div>

          <button
            id="btn-read-another"
            onClick={onBack}
            className="w-full py-4 text-xl font-bold font-kids text-white bg-gradient-to-r from-teal-600 to-cyan-500 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Read Another Story!</span>
            <Sparkles className="w-6 h-6 text-amber-300" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-[85svh] justify-between px-2 sm:px-4 pb-8 theme-${theme}`}>
      {/* Header Area */}
      <div className="flex flex-col gap-4 max-w-6xl w-full mx-auto py-3 sm:py-4 px-1 sm:px-4">
        {/* Top Row: Navigation and Title */}
        <div className="flex items-center justify-between w-full">
          <button
            id="btn-back-to-library"
            onClick={() => {
              stopListening();
              timerPause();
              onBack();
            }}
            className="p-2.5 sm:p-3 bg-white/10 backdrop-blur-sm rounded-2xl border theme-border hover:bg-white/20 transition-colors flex items-center justify-center theme-text-primary shadow-sm hover:shadow active:scale-95 duration-200 cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <h1 className="font-kids text-xl sm:text-3xl font-extrabold theme-text-primary truncate mx-4 text-center flex-1">
            {story.title}
          </h1>

          <button
            id="btn-sprinkle-flowers"
            onClick={triggerFlowerRain}
            className="p-2.5 sm:p-3 bg-white/10 backdrop-blur-sm rounded-2xl border theme-border hover:bg-teal-500/10 transition-all flex items-center justify-center theme-text-primary shadow-sm hover:shadow active:scale-95 duration-200 cursor-pointer shrink-0"
            title="Sprinkle flowers!"
          >
            <Flower className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 animate-pulse" />
          </button>
        </div>

        {/* Bottom Row: Premium Stats Capsule */}
        <div className="glass-card mx-auto w-full max-w-2xl px-4 py-2 sm:py-2.5 rounded-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-md border theme-border">
          {/* Progress bar + Sentence indicator */}
          <div className="flex items-center gap-3 min-w-0 flex-1 justify-center sm:justify-start w-full sm:w-auto">
            <div className="w-20 sm:w-28 bg-slate-500/15 rounded-full h-2 overflow-hidden border border-slate-500/20 shrink-0">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>
            <span className="text-sm sm:text-base theme-text-secondary font-bold font-sans truncate">
              Sentence {currentSentenceIndex + 1} of {story.sentences.length}
            </span>
          </div>

          {/* Stars display in the center/middle */}
          <div className="shrink-0 flex items-center justify-center w-full sm:w-auto">
            <StarsDisplay earned={starsEarned} total={story.sentences.length} />
          </div>

          {/* Timer on the right */}
          <div className="flex items-center gap-1.5 text-sm sm:text-base theme-text-muted font-sans font-bold shrink-0 justify-center sm:justify-end w-full sm:w-auto">
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            <span><TimerText store={readingTimer.store} /></span>
          </div>
        </div>
      </div>

      {/* Main Sentence Reader Card */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 w-full">
        <div className="glass-card w-full max-w-4xl p-4 sm:p-8 md:p-12 rounded-3xl relative shadow-xl min-h-[220px] sm:min-h-[300px] flex flex-col items-center justify-center gap-6 border-4 theme-border">
          {/* Star animation corners */}
          {isSentenceCompleted && (
            <div className="absolute top-4 right-4 bg-yellow-400 p-2 rounded-full border-2 theme-border shadow animate-bounce-subtle">
              <Star className="w-6 h-6 text-yellow-900 fill-current" />
            </div>
          )}

          <div key={currentSentenceIndex} className="flex-1 flex items-center justify-center w-full sentence-enter-active">
            <WordHighlighter
              sentence={sentence}
              currentWordIndex={currentWordIndex}
              isListening={status === 'listening' || isRecording}
              isSpeakingHelp={isSpeakingHelp}
              theme={theme}
            />
          </div>

          {/* Idle Encouragement Prompt */}
          {showIdleEncouragement && !isSentenceCompleted && (status === 'listening' || isRecording) && (
            <div className="animate-idle-nudge bg-violet-500/5 border border-violet-500/20 rounded-2xl px-6 py-3 shadow-sm flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-violet-500 flex-shrink-0" />
              <p className="font-kids text-base theme-text-primary">
                You're doing great! Try saying: <span className="font-extrabold text-violet-500">"{expectedWords[currentWordIndex]}"</span>
              </p>
            </div>
          )}

          {/* Help Buttons inside the card */}
          {!isSentenceCompleted && (status === 'ready' || status === 'listening') && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {/* Single Word Help */}
              <button
                id="btn-hear-word"
                onClick={playHelpPronunciation}
                disabled={isSpeakingHelp || isSpeakingSentence}
                className={`group px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:from-amber-300 disabled:to-orange-400 text-white font-kids text-sm sm:text-lg font-bold rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg border-2 theme-border transition-all transform hover:scale-105 active:scale-95 duration-200 flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                  isSpeakingHelp ? 'animate-pulse' : ''
                }`}
              >
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-bounce-subtle" />
                <span>Hear "{expectedWords[currentWordIndex]}"</span>
              </button>

              {/* Full Sentence "Read to Me" */}
              <button
                id="btn-read-to-me"
                onClick={playSentenceReadToMe}
                disabled={isSpeakingSentence || isSpeakingHelp}
                className={`group px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-500 hover:to-purple-600 disabled:from-violet-300 disabled:to-purple-400 text-white font-kids text-sm sm:text-lg font-bold rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg border-2 theme-border transition-all transform hover:scale-105 active:scale-95 duration-200 flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                  isSpeakingSentence ? 'animate-pulse' : ''
                }`}
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-bounce-subtle" />
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
          <div className="bg-red-500/10 text-red-400 px-6 py-3 rounded-2xl border border-red-500/20 text-sm flex items-center gap-2 shadow-sm mb-2 font-sans">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error || micError}</span>
          </div>
        )}

        {isSentenceCompleted ? (
          <div className="flex flex-col items-center gap-3 w-full animate-bounce-subtle">
            <button
              id="btn-next-sentence"
              onClick={handleNextSentence}
              className="px-10 py-5 text-2xl font-bold font-kids text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl shadow-xl shadow-emerald-100 hover:shadow-2xl border-4 theme-border transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
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
              theme={theme}
            />

            {/* Helper links for classroom environments / troubleshooting */}
            {status === 'ready' && (
              <div className="flex gap-4 text-xs font-sans font-semibold theme-text-muted mt-2">
                <button
                  id="btn-reset-sentence"
                  onClick={handleRetrySentence}
                  className="hover:text-teal-500 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Sentence
                </button>
                <span className="theme-text-muted opacity-40">|</span>
                <button
                  id="btn-skip-sentence"
                  onClick={handleSkipSentence}
                  className="hover:text-cyan-500 transition-colors cursor-pointer"
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
