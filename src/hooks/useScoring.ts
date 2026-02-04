import { useState, useEffect, useCallback } from 'react';

// Threshold for updating high scores - only update once attempts >= this value
const HIGH_SCORE_THRESHOLD = 20;

export type Mode = 'audio-first' | 'image-first';

export interface ModeScore {
  correct: number;
  attempts: number;
  answeredCards: Record<string, 'correct' | 'incorrect'>; // cardId -> answer
  currentStreak: number;
}

export interface HighScore {
  bestCorrect: number;
  bestAttempts: number;
  bestPercent: number;
  bestStreak: number;
}

export interface ScoringState {
  audioFirst: ModeScore;
  imageFirst: ModeScore;
  audioFirstHighScore: HighScore;
  imageFirstHighScore: HighScore;
}

const STORAGE_KEY = 'birdFlashcardsScoring';

const defaultModeScore: ModeScore = {
  correct: 0,
  attempts: 0,
  answeredCards: {},
  currentStreak: 0,
};

const defaultHighScore: HighScore = {
  bestCorrect: 0,
  bestAttempts: 0,
  bestPercent: 0,
  bestStreak: 0,
};

const defaultState: ScoringState = {
  audioFirst: { ...defaultModeScore },
  imageFirst: { ...defaultModeScore },
  audioFirstHighScore: { ...defaultHighScore },
  imageFirstHighScore: { ...defaultHighScore },
};

function loadFromStorage(): ScoringState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure all required fields exist (handle partial data from older versions)
      return {
        audioFirst: { ...defaultModeScore, ...parsed.audioFirst },
        imageFirst: { ...defaultModeScore, ...parsed.imageFirst },
        audioFirstHighScore: { ...defaultHighScore, ...parsed.audioFirstHighScore },
        imageFirstHighScore: { ...defaultHighScore, ...parsed.imageFirstHighScore },
      };
    }
  } catch (e) {
    console.error('Failed to load scoring from localStorage:', e);
  }
  return { ...defaultState };
}

function saveToStorage(state: ScoringState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save scoring to localStorage:', e);
  }
}

function getModeKey(mode: Mode): 'audioFirst' | 'imageFirst' {
  return mode === 'audio-first' ? 'audioFirst' : 'imageFirst';
}

function getHighScoreKey(mode: Mode): 'audioFirstHighScore' | 'imageFirstHighScore' {
  return mode === 'audio-first' ? 'audioFirstHighScore' : 'imageFirstHighScore';
}

function calculatePercent(correct: number, attempts: number): number {
  if (attempts === 0) return 0;
  return Math.round((correct / attempts) * 100);
}

export function useScoring() {
  const [state, setState] = useState<ScoringState>(loadFromStorage);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const getCurrentScore = useCallback((mode: Mode): ModeScore => {
    return state[getModeKey(mode)];
  }, [state]);

  const getHighScore = useCallback((mode: Mode): HighScore => {
    return state[getHighScoreKey(mode)];
  }, [state]);

  const isCardAnswered = useCallback((mode: Mode, cardId: string): boolean => {
    return cardId in state[getModeKey(mode)].answeredCards;
  }, [state]);

  const getCardAnswer = useCallback((mode: Mode, cardId: string): 'correct' | 'incorrect' | null => {
    return state[getModeKey(mode)].answeredCards[cardId] || null;
  }, [state]);

  const recordAnswer = useCallback((mode: Mode, cardId: string, isCorrect: boolean): void => {
    setState((prev) => {
      const modeKey = getModeKey(mode);
      const highScoreKey = getHighScoreKey(mode);
      const currentModeScore = prev[modeKey];

      // Check if already answered - if so, this is a "change answer" scenario
      const previousAnswer = currentModeScore.answeredCards[cardId];
      const isChangingAnswer = previousAnswer !== undefined;

      let newCorrect = currentModeScore.correct;
      let newAttempts = currentModeScore.attempts;
      let newStreak = currentModeScore.currentStreak;

      if (isChangingAnswer) {
        // Changing answer - adjust counts
        if (previousAnswer === 'correct' && !isCorrect) {
          // Changed from correct to incorrect
          newCorrect -= 1;
          newStreak = 0; // Reset streak on incorrect
        } else if (previousAnswer === 'incorrect' && isCorrect) {
          // Changed from incorrect to correct
          newCorrect += 1;
          newStreak += 1;
        }
        // Note: attempts stay the same when changing answer
      } else {
        // New answer
        newAttempts += 1;
        if (isCorrect) {
          newCorrect += 1;
          newStreak += 1;
        } else {
          newStreak = 0;
        }
      }

      const newModeScore: ModeScore = {
        correct: newCorrect,
        attempts: newAttempts,
        answeredCards: {
          ...currentModeScore.answeredCards,
          [cardId]: isCorrect ? 'correct' : 'incorrect',
        },
        currentStreak: newStreak,
      };

      // Check if we should update high score
      const currentHighScore = prev[highScoreKey];
      let newHighScore = { ...currentHighScore };

      // Only update high score if we've reached the threshold
      if (newAttempts >= HIGH_SCORE_THRESHOLD) {
        const newPercent = calculatePercent(newCorrect, newAttempts);

        // Update best percent (and associated correct/attempts) if better
        if (newPercent > currentHighScore.bestPercent) {
          newHighScore = {
            ...newHighScore,
            bestCorrect: newCorrect,
            bestAttempts: newAttempts,
            bestPercent: newPercent,
          };
        }
      }

      // Always update best streak if current streak is better
      if (newStreak > currentHighScore.bestStreak) {
        newHighScore = {
          ...newHighScore,
          bestStreak: newStreak,
        };
      }

      return {
        ...prev,
        [modeKey]: newModeScore,
        [highScoreKey]: newHighScore,
      };
    });
  }, []);

  const resetCurrentScore = useCallback((mode: Mode): void => {
    setState((prev) => {
      const modeKey = getModeKey(mode);
      return {
        ...prev,
        [modeKey]: { ...defaultModeScore },
      };
    });
  }, []);

  const resetAllScores = useCallback((): void => {
    setState({ ...defaultState });
  }, []);

  return {
    state,
    getCurrentScore,
    getHighScore,
    isCardAnswered,
    getCardAnswer,
    recordAnswer,
    resetCurrentScore,
    resetAllScores,
    HIGH_SCORE_THRESHOLD,
  };
}
