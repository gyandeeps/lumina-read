const STORAGE_KEY = 'lumina-read-progress';

export interface ReadingProgress {
  /** Titles of stories the child has fully completed */
  completedStories: string[];
  /** Resume point — the story they were last reading */
  currentStory: { title: string; sentenceIndex: number } | null;
  /** Lifetime total words the child has successfully read */
  totalWordsRead: number;
}

const DEFAULT_PROGRESS: ReadingProgress = {
  completedStories: [],
  currentStory: null,
  totalWordsRead: 0,
};

/**
 * Loads persisted reading progress from localStorage.
 * Returns defaults if nothing is stored or data is corrupt.
 */
export function loadProgress(): ReadingProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      completedStories: Array.isArray(parsed.completedStories) ? parsed.completedStories : [],
      currentStory: parsed.currentStory ?? null,
      totalWordsRead: typeof parsed.totalWordsRead === 'number' ? parsed.totalWordsRead : 0,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

/**
 * Persists the full progress object to localStorage.
 */
export function saveProgress(progress: ReadingProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Failed to save reading progress:', err);
  }
}

/**
 * Saves the current reading position (story + sentence index) for resume.
 */
export function saveCurrentPosition(title: string, sentenceIndex: number): void {
  const progress = loadProgress();
  progress.currentStory = { title, sentenceIndex };
  saveProgress(progress);
}

/**
 * Marks a story as fully completed and clears the resume point.
 * Also increments the lifetime word counter.
 */
export function markStoryComplete(title: string, wordCount: number): void {
  const progress = loadProgress();
  if (!progress.completedStories.includes(title)) {
    progress.completedStories.push(title);
  }
  progress.totalWordsRead += wordCount;
  progress.currentStory = null;
  saveProgress(progress);
}

/**
 * Clears the current resume point (e.g. when going back to story select).
 */
export function clearCurrentStory(): void {
  const progress = loadProgress();
  progress.currentStory = null;
  saveProgress(progress);
}
