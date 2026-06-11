import { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Volume2, Heart, Loader2 } from 'lucide-react';
import type { Story } from './content/stories';
import { ReadingScreen } from './components/ReadingScreen';

function App() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}stories.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not fetch stories definition.');
        return res.json();
      })
      .then((data) => {
        setStories(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load stories content:', err);
        setError(err.message || 'Could not fetch stories.');
        setIsLoading(false);
      });
  }, []);

  if (selectedStory) {
    return (
      <main className="min-h-screen bg-pink-50/50 py-4">
        <ReadingScreen story={selectedStory} onBack={() => setSelectedStory(null)} />
      </main>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between py-12 px-6 overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '4s' }} />

      {/* Header section */}
      <header className="relative max-w-4xl mx-auto w-full text-center mb-12">
        <div className="flex justify-center mb-6">
          <img
            src={`${import.meta.env.BASE_URL}pwa-512x512.png`}
            alt="LuminaRead Owl Mascot"
            className="w-36 h-36 object-contain rounded-3xl shadow-xl border-4 border-white transform hover:rotate-6 hover:scale-110 transition-all duration-300 pointer-events-auto"
          />
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 border border-white/50 backdrop-blur-md rounded-full shadow-sm text-pink-500 font-sans font-bold text-sm mb-4 animate-bounce-subtle">
          <Sparkles className="w-4 h-4 fill-current" />
          <span>100% On-Device Child-Safe AI</span>
        </div>
        <h1 className="font-kids text-5xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 tracking-tight leading-tight select-none">
          LuminaRead
        </h1>
        <p className="font-kids text-xl md:text-2xl text-slate-600 mt-4 max-w-xl mx-auto leading-relaxed select-none">
          Read stories out loud! Your iPad will listen and highlight words as you say them correctly! 🎙️✨
        </p>
      </header>

      {/* Story Select Cards */}
      <main className="relative flex-1 max-w-4xl mx-auto w-full mb-12">
        <h2 className="font-kids text-3xl font-bold text-slate-800 mb-6 text-center select-none">
          Pick a Story to Read:
        </h2>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
            <p className="font-kids text-lg font-bold text-slate-600">Opening library book list...</p>
          </div>
        ) : error ? (
          <div className="text-center p-8 bg-red-50 border border-red-200 rounded-3xl max-w-md mx-auto">
            <p className="font-kids text-lg font-bold text-red-600">{error}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 px-4">
            {stories.map((story) => {
              const totalWords = story.sentences.reduce((acc, curr) => acc + curr.split(/\s+/).length, 0);
              
              return (
                <div
                  key={story.title}
                  onClick={() => setSelectedStory(story)}
                  className="group glass-card p-8 rounded-3xl cursor-pointer hover:shadow-xl hover:shadow-pink-100 transition-all duration-300 transform hover:-translate-y-2 border-2 border-white/80 flex flex-col justify-between min-h-[240px]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="p-3 bg-pink-100/80 rounded-2xl text-pink-500 group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="w-7 h-7" />
                      </span>
                      <div className="flex gap-1.5 text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Heart key={i} className="w-4 h-4 fill-current text-rose-400" />
                        ))}
                      </div>
                    </div>

                    <h3 className="font-kids text-3xl font-extrabold text-slate-800 group-hover:text-pink-600 transition-colors duration-300 mb-2">
                      {story.title}
                    </h3>
                    
                    <p className="text-slate-500 font-sans text-sm line-clamp-2">
                      Start this adventure: "{story.sentences[0]}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100/50 pt-4 mt-6">
                    <div className="flex gap-4">
                      <span className="text-xs font-sans font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                        {story.sentences.length} sentences
                      </span>
                    <span className="text-xs font-sans font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                      {totalWords} words
                    </span>
                  </div>
                  <span className="text-sm font-sans font-extrabold text-pink-500 group-hover:translate-x-1.5 transition-transform duration-300 flex items-center gap-1">
                    Play ➡️
                  </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer / Tip */}
      <footer className="relative text-center text-xs text-slate-400 font-sans mt-auto">
        <div className="max-w-md mx-auto bg-white/40 border border-white/30 p-4 rounded-2xl flex items-center justify-center gap-3">
          <Volume2 className="w-5 h-5 text-pink-400 flex-shrink-0 animate-pulse" />
          <span className="leading-normal">
            <strong>Parent Tip:</strong> Ensure microphone access is allowed and that you are in a relatively quiet room for the best AI word tracking.
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
