import { Loader2, Play, AlertCircle, Wand2 } from 'lucide-react';
import type { SpeechStatus } from '../hooks/useSpeechRecognition';

interface StartButtonProps {
  status: SpeechStatus;
  loadingProgress: number;
  isRecording: boolean;
  onInit: () => void;
  onStart: () => void;
  onStop: () => void;
  theme: 'day' | 'sunset' | 'night';
}

export const StartButton: React.FC<StartButtonProps> = ({
  status,
  loadingProgress,
  isRecording,
  onInit,
  onStart,
  onStop,
  theme,
}) => {
  // Gradients and shadows based on themes for different states
  let idleBtnClasses = '';
  let readyBtnClasses = '';
  let listeningBtnClasses = '';
  let loaderColor = 'text-teal-500';
  let loaderProgressBg = 'bg-gradient-to-r from-teal-400 to-cyan-500';

  if (theme === 'night') {
    idleBtnClasses = 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-500/30';
    readyBtnClasses = 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-cyan-500/35';
    listeningBtnClasses = 'bg-gradient-to-r from-pink-600 to-rose-600 hover:shadow-pink-500/35';
    loaderColor = 'text-indigo-400';
    loaderProgressBg = 'bg-gradient-to-r from-indigo-500 to-violet-500';
  } else if (theme === 'sunset') {
    idleBtnClasses = 'bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-orange-500/20';
    readyBtnClasses = 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-orange-500/25';
    listeningBtnClasses = 'bg-gradient-to-r from-red-500 to-orange-600 hover:shadow-red-500/25';
    loaderColor = 'text-orange-500';
    loaderProgressBg = 'bg-gradient-to-r from-orange-400 to-amber-500';
  } else {
    idleBtnClasses = 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-teal-500/20';
    readyBtnClasses = 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/25';
    listeningBtnClasses = 'bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-rose-500/25';
  }

  if (status === 'idle') {
    return (
      <button
        onClick={onInit}
        className={`group relative px-10 py-6 text-2xl font-bold font-kids text-white rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-2xl border-4 theme-border flex items-center gap-3 animate-bounce-subtle cursor-pointer ${idleBtnClasses}`}
      >
        <Wand2 className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300 text-amber-300" />
        <span>Tap to Get Ready!</span>
        <span className="absolute -top-3 -right-3 px-3 py-1 bg-yellow-400 text-xs font-sans text-teal-950 rounded-full font-bold rotate-12 uppercase tracking-wide border-2 theme-border shadow">
          Local AI
        </span>
      </button>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 bg-white/30 backdrop-blur-md p-8 rounded-3xl border theme-border shadow-lg max-w-sm w-full mx-auto border-teal-100/20 shadow-teal-100/10">
        <Loader2 className={`w-12 h-12 animate-spin ${loaderColor}`} />
        <div className="w-full text-center">
          <p className="font-kids text-xl font-bold theme-text-primary">Waking up your companion...</p>
          <p className="text-xs theme-text-secondary mt-1 font-sans">First time takes a minute (approx 75MB download)</p>
        </div>
        <div className="w-full bg-teal-500/10 rounded-full h-4 overflow-hidden border theme-border">
          <div
            className={`h-full rounded-full transition-all duration-300 ${loaderProgressBg}`}
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <span className="font-bold theme-text-secondary text-sm font-sans">{loadingProgress}% Complete</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={onInit}
        className="px-8 py-5 text-xl font-bold font-kids text-white bg-red-500 rounded-3xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 theme-border flex items-center gap-3 cursor-pointer"
      >
        <AlertCircle className="w-7 h-7" />
        <span>Failed. Tap to try again!</span>
      </button>
    );
  }

  // Ready or listening
  return (
    <div className="flex flex-col items-center gap-2">
      {isRecording ? (
        <button
          onClick={onStop}
          className={`group relative px-10 py-6 text-2xl font-bold font-kids text-white rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 theme-border flex items-center gap-3 hover:shadow-2xl cursor-pointer ${listeningBtnClasses}`}
        >
          <div className="voice-wave-container mr-1 text-white">
            <span className="voice-wave-bar bar-1"></span>
            <span className="voice-wave-bar bar-2"></span>
            <span className="voice-wave-bar bar-3"></span>
            <span className="voice-wave-bar bar-4"></span>
            <span className="voice-wave-bar bar-5"></span>
          </div>
          <span>I'm Listening... Tap to Pause!</span>
        </button>
      ) : (
        <button
          onClick={onStart}
          className={`group relative px-10 py-6 text-2xl font-bold font-kids text-white rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 theme-border flex items-center gap-3 hover:shadow-2xl animate-bounce-subtle cursor-pointer ${readyBtnClasses}`}
        >
          <Play className="w-8 h-8 fill-current group-hover:scale-110 transition-transform duration-300" />
          <span>Tap to Start Reading!</span>
        </button>
      )}
    </div>
  );
};
