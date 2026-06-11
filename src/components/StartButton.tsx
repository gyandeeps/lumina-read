import { Loader2, Play, AlertCircle, Wand2 } from 'lucide-react';
import type { SpeechStatus } from '../hooks/useSpeechRecognition';

interface StartButtonProps {
  status: SpeechStatus;
  loadingProgress: number;
  isRecording: boolean;
  onInit: () => void;
  onStart: () => void;
  onStop: () => void;
}

export const StartButton: React.FC<StartButtonProps> = ({
  status,
  loadingProgress,
  isRecording,
  onInit,
  onStart,
  onStop,
}) => {
  if (status === 'idle') {
    return (
      <button
        onClick={onInit}
        className="group relative px-10 py-6 text-2xl font-bold font-kids text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-rose-300 hover:shadow-2xl border-4 border-white flex items-center gap-3 animate-bounce-subtle"
      >
        <Wand2 className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
        <span>Tap to Get Ready!</span>
        <span className="absolute -top-3 -right-3 px-3 py-1 bg-yellow-400 text-xs font-sans text-rose-900 rounded-full font-bold rotate-12 uppercase tracking-wide border-2 border-white shadow">
          Local AI
        </span>
      </button>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 bg-white/70 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-lg max-w-sm w-full mx-auto">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
        <div className="w-full text-center">
          <p className="font-kids text-xl font-bold text-slate-700">Waking up your companion...</p>
          <p className="text-xs text-slate-500 mt-1 font-sans">First time takes a minute (approx 75MB download)</p>
        </div>
        <div className="w-full bg-pink-100 rounded-full h-4 overflow-hidden border border-pink-200">
          <div
            className="bg-gradient-to-r from-pink-400 to-rose-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <span className="font-bold text-slate-600 text-sm font-sans">{loadingProgress}% Complete</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={onInit}
        className="px-8 py-5 text-xl font-bold font-kids text-white bg-red-500 rounded-3xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 border-white flex items-center gap-3"
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
          className="group relative px-10 py-6 text-2xl font-bold font-kids text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 border-white flex items-center gap-3 hover:shadow-red-300 hover:shadow-2xl"
        >
          <span className="relative flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-white"></span>
          </span>
          <span>I'm Listening... Tap to Pause!</span>
        </button>
      ) : (
        <button
          onClick={onStart}
          className="group relative px-10 py-6 text-2xl font-bold font-kids text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 border-white flex items-center gap-3 hover:shadow-blue-300 hover:shadow-2xl animate-bounce-subtle"
        >
          <Play className="w-8 h-8 fill-current group-hover:scale-110 transition-transform duration-300" />
          <span>Tap to Start Reading!</span>
        </button>
      )}
    </div>
  );
};
