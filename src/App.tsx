import { useState, useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  Volume2,
  Loader2,
  CheckCircle,
  BookOpenCheck,
  Filter,
} from "lucide-react";
import type { Story } from "./content/stories";
import { ReadingScreen } from "./components/ReadingScreen";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { triggerFlowerRain } from "./utils/confettiHelper";
import { loadProgress, clearCurrentStory } from "./utils/progressStore";

type DifficultyFilter = "all" | "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  medium: {
    label: "Medium",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  hard: { label: "Hard", color: "bg-rose-100 text-rose-700 border-rose-200" },
} as const;

function App() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [resumeSentenceIndex, setResumeSentenceIndex] = useState(0);
  const [theme, setTheme] = useState<"day" | "sunset" | "night">(() => {
    const saved = localStorage.getItem("lumina-theme");
    return (saved as "day" | "sunset" | "night") || "sunset";
  });

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem("lumina-theme", theme);
  }, [theme]);

  // Dynamic page title and meta description update
  useEffect(() => {
    if (selectedStory) {
      document.title = `Read "${selectedStory.title}" | LuminaRead`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          `Read "${selectedStory.title}" out loud with LuminaRead's child-friendly offline voice tracking. Difficulty: ${selectedStory.difficulty}.`
        );
      }
    } else {
      document.title = "LuminaRead - Child-Safe On-Device AI Reading Companion";
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          "LuminaRead is an offline-capable, private AI voice reading companion for kids. Powered by on-device Whisper WebGPU/WASM, it helps children learn to read with patience."
        );
      }
    }
  }, [selectedStory]);

  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedStories, setCompletedStories] = useState<string[]>([]);
  const [totalWordsRead, setTotalWordsRead] = useState(0);
  const [helpWordsCount, setHelpWordsCount] = useState(0);
  const [readToMeCount, setReadToMeCount] = useState(0);
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeStory, setResumeStory] = useState<{
    title: string;
    sentenceIndex: number;
  } | null>(null);

  // Load progress and stories on mount
  useEffect(() => {
    const progress = loadProgress();
    setCompletedStories(progress.completedStories);
    setTotalWordsRead(progress.totalWordsRead);
    setHelpWordsCount(progress.helpWordsCount ?? 0);
    setReadToMeCount(progress.readToMeCount ?? 0);

    if (progress.currentStory) {
      setResumeStory(progress.currentStory);
      setShowResumePrompt(true);
    }

    fetch(`${import.meta.env.BASE_URL}stories.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch stories definition.");
        return res.json();
      })
      .then((data) => {
        setStories(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load stories content:", err);
        setError(err.message || "Could not fetch stories.");
        setIsLoading(false);
      });
  }, []);

  const handleSelectStory = (story: Story, sentenceIndex = 0) => {
    setResumeSentenceIndex(sentenceIndex);
    setSelectedStory(story);
    setShowResumePrompt(false);
  };

  const handleBack = () => {
    setSelectedStory(null);
    setResumeSentenceIndex(0);
    // Refresh progress when returning to story list
    const progress = loadProgress();
    setCompletedStories(progress.completedStories);
    setTotalWordsRead(progress.totalWordsRead);
    setHelpWordsCount(progress.helpWordsCount ?? 0);
    setReadToMeCount(progress.readToMeCount ?? 0);
  };

  const handleResumeStory = () => {
    if (resumeStory && stories.length > 0) {
      const story = stories.find((s) => s.title === resumeStory.title);
      if (story) {
        handleSelectStory(story, resumeStory.sentenceIndex);
      }
    }
    setShowResumePrompt(false);
  };

  const handleDismissResume = () => {
    setShowResumePrompt(false);
    clearCurrentStory();
  };

  const filteredStories =
    difficultyFilter === "all"
      ? stories
      : stories.filter((s) => s.difficulty === difficultyFilter);

  if (selectedStory) {
    return (
      <main className={`min-h-screen theme-bg-gradient py-4 page-enter theme-${theme}`}>
        <ReadingScreen
          story={selectedStory}
          onBack={handleBack}
          initialSentenceIndex={resumeSentenceIndex}
          theme={theme}
        />

        {/* Floating Theme Switcher */}
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
      </main>
    );
  }

  return (
    <div className={`relative min-h-screen flex flex-col justify-between py-8 px-6 overflow-hidden theme-bg-gradient theme-${theme}`}>
      {/* Background Decorative Blobs */}
      <div className={`absolute top-10 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse pointer-events-none transition-all duration-500 ${
        theme === 'night' ? 'bg-indigo-900/40' : theme === 'sunset' ? 'bg-rose-300' : 'bg-sky-200'
      }`} />
      <div
        className={`absolute bottom-10 right-10 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse pointer-events-none transition-all duration-500 ${
          theme === 'night' ? 'bg-purple-900/40' : theme === 'sunset' ? 'bg-amber-300' : 'bg-teal-200'
        }`}
        style={{ animationDelay: "2s" }}
      />
      <div
        className={`absolute top-1/2 left-1/3 w-60 h-60 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none transition-all duration-500 ${
          theme === 'night' ? 'bg-blue-900/30' : theme === 'sunset' ? 'bg-orange-300' : 'bg-amber-200'
        }`}
        style={{ animationDelay: "4s" }}
      />

      {/* Resume Prompt Modal */}
      {showResumePrompt && resumeStory && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in-up">
          <div className="glass-card max-w-md w-full p-6 sm:p-8 rounded-3xl text-center shadow-2xl border-teal-100 shadow-teal-100/20">
            <BookOpenCheck className="w-14 h-14 text-teal-600 mx-auto mb-4" />
            <h3 className="font-kids text-2xl font-bold text-slate-800 mb-2">
              Welcome Back! 📖
            </h3>
            <p className="text-slate-500 font-sans text-sm mb-6">
              You were reading{" "}
              <span className="font-bold text-teal-600">
                "{resumeStory.title}"
              </span>{" "}
              — sentence {resumeStory.sentenceIndex + 1}. Pick up where you left
              off?
            </p>
            <div className="flex gap-3">
              <button
                id="resume-start-fresh"
                onClick={handleDismissResume}
                className="flex-1 py-3 text-sm font-bold font-sans text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Start Fresh
              </button>
              <button
                id="resume-continue"
                onClick={handleResumeStory}
                className="flex-1 py-3 text-sm font-bold font-kids text-white bg-gradient-to-r from-teal-600 to-cyan-500 rounded-2xl shadow-md hover:shadow-lg hover:shadow-teal-100/20 transition-all transform hover:scale-105 active:scale-95 animate-pulse-subtle"
              >
                Continue! ✨
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-between w-full">
        {/* Header section */}
        <header className="relative max-w-4xl mx-auto w-full flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 mb-10 px-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left flex-1">
            <div className="flex-shrink-0 animate-mascot-entrance">
              <img
                id="pwa-mascot-logo"
                src={`${import.meta.env.BASE_URL}pwa-512x512.png`}
                alt="LuminaRead Owl Mascot"
                onClick={triggerFlowerRain}
                className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-3xl shadow-xl border-4 border-white transform hover:rotate-6 hover:scale-110 transition-all duration-300 pointer-events-auto cursor-pointer"
                title="Click me for flowers!"
              />
            </div>
            <div className="flex-1 flex flex-col items-center sm:items-start w-full">
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-3">
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/60 border border-white/50 backdrop-blur-md rounded-full shadow-sm text-teal-600 font-sans font-bold text-xs animate-bounce-subtle animate-fade-in-up-stagger"
                  style={{ animationDelay: "100ms" }}
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span>100% On-Device Child-Safe AI</span>
                </div>
              </div>

              <h1
                className="font-kids text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight select-none animate-fade-in-up-stagger theme-title-gradient"
                style={{ animationDelay: "200ms" }}
              >
                LuminaRead
              </h1>
              <p
                className="font-kids text-lg sm:text-xl theme-text-secondary mt-2 max-w-lg leading-relaxed select-none animate-fade-in-up-stagger"
                style={{ animationDelay: "300ms" }}
              >
                Read stories out loud! Your device will listen and highlight
                words as you say them correctly! 🎙️✨
              </p>
            </div>
          </div>

          {/* Star Reader Progress Card */}
          <div
            className="w-full md:w-auto animate-fade-in-up-stagger"
            style={{ animationDelay: "380ms" }}
          >
            <div className="glass-card p-6 rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 min-w-[240px] flex flex-col gap-3">
              <h3 className="font-kids text-xl font-bold theme-text-primary flex items-center gap-2 border-b theme-border pb-2">
                <span>Star Reader Stats</span>
                <span className="animate-pulse">🏆</span>
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm font-sans">
                  <span className="theme-text-secondary font-medium flex items-center gap-2 text-sm">
                    <Sparkles className="w-4.5 h-4.5 text-amber-500 fill-current" />
                    Words Read:
                  </span>
                  <span id="stats-words-read" className="font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-sm">
                    {totalWordsRead}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-sans">
                  <span className="theme-text-secondary font-medium flex items-center gap-2 text-sm">
                    <BookOpenCheck className="w-4.5 h-4.5 text-teal-500" />
                    Stories Completed:
                  </span>
                  <span id="stats-stories-completed" className="font-extrabold text-teal-500 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20 text-sm">
                    {completedStories.length} / {stories.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-sans">
                  <span className="theme-text-secondary font-medium flex items-center gap-2 text-sm">
                    <Volume2 className="w-4.5 h-4.5 text-amber-500" />
                    "Hear Word" Help:
                  </span>
                  <span id="stats-hear-help" className="font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 text-sm">
                    {helpWordsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-sans">
                  <span className="theme-text-secondary font-medium flex items-center gap-2 text-sm">
                    <BookOpen className="w-4.5 h-4.5 text-cyan-500" />
                    "Read to Me":
                  </span>
                  <span id="stats-read-to-me" className="font-extrabold text-cyan-500 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 text-sm">
                    {readToMeCount}
                  </span>
                </div>
              </div>

              {totalWordsRead === 0 ? (
                <div className="mt-1 text-[11px] theme-text-muted font-sans italic leading-normal text-center bg-slate-500/5 p-2 rounded-xl border border-dashed theme-border">
                  Pick a story below to start your adventure! ✨
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-emerald-500 font-sans font-bold leading-normal text-center bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  Awesome job reading! Keep it up! 🌟
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Story Select Cards */}
        <main className="relative flex-1 max-w-4xl mx-auto w-full mb-12">
          <h2
            className="font-kids text-3xl font-bold theme-text-primary mb-4 text-center select-none animate-fade-in-up-stagger"
            style={{ animationDelay: "400ms" }}
          >
            Pick a Story to Read:
          </h2>

          {/* Difficulty Filter Row */}
          <div
            className="flex items-center justify-center gap-2 mb-6 flex-wrap animate-fade-in-up-stagger"
            style={{ animationDelay: "480ms" }}
          >
            <Filter className="w-4 h-4 theme-text-muted" />
            {(["all", "easy", "medium", "hard"] as DifficultyFilter[]).map(
              (level) => (
                <button
                  id={`filter-${level}`}
                  key={level}
                  onClick={() => setDifficultyFilter(level)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold font-sans border transition-all duration-200 cursor-pointer ${
                    difficultyFilter === level
                      ? level === "all"
                        ? theme === "night"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : "bg-slate-800 text-white border-slate-800 shadow-md"
                        : level === "easy"
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                          : level === "medium"
                            ? "bg-amber-500 text-white border-amber-500 shadow-md"
                            : "bg-rose-500 text-white border-rose-500 shadow-md"
                      : theme === "night"
                        ? "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700"
                        : "bg-white/70 text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {level === "all" ? "All" : DIFFICULTY_CONFIG[level].label}
                </button>
              ),
            )}
          </div>

          {isLoading ? (
            <div
              className="flex flex-col items-center justify-center p-12 animate-fade-in-up-stagger"
              style={{ animationDelay: "560ms" }}
            >
              <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
              <p className="font-kids text-lg font-bold theme-text-secondary">
                Opening library book list...
              </p>
            </div>
          ) : error ? (
            <div
              className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-3xl max-w-md mx-auto animate-fade-in-up-stagger"
              style={{ animationDelay: "560ms" }}
            >
              <p className="font-kids text-lg font-bold text-red-500">
                {error}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 px-4">
              {filteredStories.map((story, index) => {
                const totalWords = story.sentences.reduce(
                  (acc, curr) => acc + curr.split(/\s+/).length,
                  0,
                );
                const isCompleted = completedStories.includes(story.title);
                const diffConfig = DIFFICULTY_CONFIG[story.difficulty];
                const isNight = theme === "night";

                return (
                  <div
                    key={story.title}
                    className="animate-fade-in-up-stagger"
                    style={{ animationDelay: `${560 + index * 60}ms` }}
                  >
                    <div
                      id={`story-card-${story.title.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => handleSelectStory(story)}
                      className={`group glass-card p-6 sm:p-8 rounded-3xl cursor-pointer hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 transform hover:-translate-y-2 border-2 flex flex-col justify-between min-h-[240px] ${
                        isCompleted
                          ? isNight
                            ? "border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-400"
                            : "border-emerald-300 bg-emerald-50/40 hover:border-emerald-400"
                          : isNight
                            ? "border-indigo-950 bg-slate-900/40 hover:border-indigo-400"
                            : "border-slate-200/90 bg-white/90 hover:border-teal-300"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="p-3 bg-teal-500/10 rounded-2xl text-teal-500 group-hover:scale-110 transition-transform duration-300 border border-teal-500/20">
                            <BookOpen className="w-7 h-7" />
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Difficulty Badge */}
                            <span
                              className={`text-xs font-sans font-bold px-3 py-1 rounded-full border ${diffConfig.color}`}
                            >
                              {diffConfig.label}
                            </span>
                            {/* Completed Checkmark */}
                            {isCompleted && (
                              <span className="p-1.5 bg-emerald-500/20 rounded-full text-emerald-400 border border-emerald-500/30">
                                <CheckCircle className="w-5 h-5" />
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="font-kids text-2xl sm:text-3xl font-extrabold theme-text-primary group-hover:text-teal-500 transition-colors duration-300 mb-2">
                          {story.title}
                        </h3>

                        <p className="theme-text-secondary font-sans text-sm line-clamp-2">
                          Start this adventure: "{story.sentences[0]}"
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-y-3 border-t theme-border pt-4 mt-6">
                        <div className="flex gap-2 sm:gap-4">
                          <span className="text-[11px] sm:text-xs font-sans font-bold theme-text-muted bg-slate-500/5 px-2.5 sm:px-3 py-1 rounded-full">
                            {story.sentences.length} sentences
                          </span>
                          <span className="text-[11px] sm:text-xs font-sans font-bold theme-text-muted bg-slate-500/5 px-2.5 sm:px-3 py-1 rounded-full">
                            {totalWords} words
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-sans font-extrabold text-teal-500 group-hover:translate-x-1.5 transition-transform duration-300 flex items-center gap-1">
                          {isCompleted ? "Read Again" : "Play"} ➡️
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Footer / Tip */}
        <footer
          className="relative text-center text-xs theme-text-muted mt-auto space-y-3 animate-fade-in-up-stagger"
          style={{ animationDelay: "800ms" }}
        >
          <div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm border theme-border p-4 rounded-2xl flex items-center justify-center gap-3">
            <Volume2 className="w-5 h-5 text-teal-400 flex-shrink-0 animate-pulse" />
            <span className="leading-normal">
              <strong>Parent Tip:</strong> Ensure microphone access is allowed
              and that you are in a relatively quiet room for the best AI word
              tracking.
            </span>
          </div>
        </footer>
      </div>

      {/* Floating Theme Switcher */}
      <ThemeSwitcher theme={theme} setTheme={setTheme} />
    </div>
  );
}

export default App;
