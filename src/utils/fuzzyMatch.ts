import levenshtein from 'js-levenshtein';

/**
 * Normalizes a word by removing punctuation, quotes, and converting to lowercase.
 */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, '')
    .trim();
}

/**
 * Checks if a spoken word matches a target word using Levenshtein distance.
 * Returns true if edit distance is <= 2. For very short words (<= 2 chars),
 * allows at most 1 edit to avoid false matches (e.g. "a" matching "is").
 */
export function isWordMatch(spoken: string, target: string): boolean {
  const cleanSpoken = normalizeWord(spoken);
  const cleanTarget = normalizeWord(target);

  if (!cleanSpoken || !cleanTarget) return false;
  if (cleanSpoken === cleanTarget) return true;

  const dist = levenshtein(cleanSpoken, cleanTarget);

  if (cleanTarget.length <= 2) {
    return dist <= 1;
  }
  return dist <= 2;
}

/**
 * Updates the reading pointer by matching the list of expected words against the
 * spoken words from the Web Worker chunks.
 *
 * @param targetWords Lowercased/cleaned words from the target sentence
 * @param spokenChunks Chunk output from the Whisper worker (e.g., [{ text: "The" }, { text: "cat" }])
 * @param startFromIndex Index into targetWords to begin matching from (skip already-confirmed words)
 */
export function updateReadingProgress(
  targetWords: string[],
  spokenChunks: Array<{ text: string }>,
  startFromIndex: number = 0
): {
  currentWordIndex: number;
  matchedIndices: Set<number>;
} {
  // Tokenize and normalize the spoken chunks into individual words
  const spokenWords: string[] = [];
  for (const chunk of spokenChunks) {
    const tokens = chunk.text.trim().split(/\s+/);
    for (const token of tokens) {
      const cleaned = normalizeWord(token);
      if (cleaned) {
        spokenWords.push(cleaned);
      }
    }
  }

  let currentWordIndex = startFromIndex;
  const matchedIndices = new Set<number>();

  for (const spoken of spokenWords) {
    if (currentWordIndex >= targetWords.length) break;

    const target = targetWords[currentWordIndex];

    if (isWordMatch(spoken, target)) {
      matchedIndices.add(currentWordIndex);
      currentWordIndex++;
    } else {
      // Repetition check: If they repeated the previous word, just ignore it.
      if (currentWordIndex > 0) {
        const previousTarget = targetWords[currentWordIndex - 1];
        if (isWordMatch(spoken, previousTarget)) {
          continue; // Repeat found, keep pointer where it is and skip this spoken token
        }
      }
      // If it's some other word that doesn't match the active word,
      // we maintain the current index and keep listening.
    }
  }

  return {
    currentWordIndex,
    matchedIndices,
  };
}
