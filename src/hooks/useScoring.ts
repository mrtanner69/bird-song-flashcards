import { useState, useEffect, useCallback } from 'react';

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

export interface DeckState {
  shuffledOrder: string[]; // Array of card IDs in shuffled order
  currentIndex: number;    // Current position in the deck (0-based)
  mode: Mode;              // Mode this deck is for
}

export interface ScoringState {
  audioFirst: ModeScore;
  imageFirst: ModeScore;
  audioFirstHighScore: HighScore;
  imageFirstHighScore: HighScore;
  deckState: DeckState | null; // Current deck session state
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
  deckState: null,
};

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
        deckState: parsed.deckState || null,
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

      // Update high score immediately (no minimum threshold)
      const currentHighScore = prev[highScoreKey];
      let newHighScore = { ...currentHighScore };
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

      // Update best streak if current streak is better
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

  // Deck management functions
  const getDeckState = useCallback((): DeckState | null => {
    return state.deckState;
  }, [state.deckState]);

  const initializeDeck = useCallback((cardIds: string[], mode: Mode): void => {
    setState((prev) => {
      // Check if we already have a valid deck for this mode
      if (prev.deckState && prev.deckState.mode === mode && prev.deckState.shuffledOrder.length > 0) {
        // Restore existing deck session
        return prev;
      }

      // Create a new shuffled deck
      const shuffledOrder = shuffleArray(cardIds);
      return {
        ...prev,
        deckState: {
          shuffledOrder,
          currentIndex: 0,
          mode,
        },
      };
    });
  }, []);

  const advanceDeck = useCallback((): boolean => {
    let didAdvance = false;
    setState((prev) => {
      if (!prev.deckState) return prev;

      const newIndex = prev.deckState.currentIndex + 1;
      // Only advance if not at end of deck
      if (newIndex < prev.deckState.shuffledOrder.length) {
        didAdvance = true;
        return {
          ...prev,
          deckState: {
            ...prev.deckState,
            currentIndex: newIndex,
          },
        };
      }
      return prev;
    });
    return didAdvance;
  }, []);

  const isDeckComplete = useCallback((): boolean => {
    if (!state.deckState) return false;
    return state.deckState.currentIndex >= state.deckState.shuffledOrder.length - 1;
  }, [state.deckState]);

  const getCurrentCardId = useCallback((): string | null => {
    if (!state.deckState) return null;
    return state.deckState.shuffledOrder[state.deckState.currentIndex] || null;
  }, [state.deckState]);

  const getDeckProgress = useCallback((): { current: number; total: number } => {
    if (!state.deckState) return { current: 0, total: 0 };
    return {
      current: state.deckState.currentIndex + 1,
      total: state.deckState.shuffledOrder.length,
    };
  }, [state.deckState]);

  const reshuffleDeck = useCallback((cardIds: string[], mode: Mode): void => {
    setState((prev) => {
      const modeKey = getModeKey(mode);
      const shuffledOrder = shuffleArray(cardIds);

      // Reset current score for this mode (but NOT high scores)
      return {
        ...prev,
        [modeKey]: { ...defaultModeScore },
        deckState: {
          shuffledOrder,
          currentIndex: 0,
          mode,
        },
      };
    });
  }, []);

  // When mode changes, we need to start a fresh deck
  const switchMode = useCallback((cardIds: string[], newMode: Mode): void => {
    setState((prev) => {
      // If we already have a deck for this mode, keep it
      if (prev.deckState && prev.deckState.mode === newMode) {
        return prev;
      }

      // Create a new shuffled deck for the new mode
      const shuffledOrder = shuffleArray(cardIds);
      return {
        ...prev,
        deckState: {
          shuffledOrder,
          currentIndex: 0,
          mode: newMode,
        },
      };
    });
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
    // Deck management
    getDeckState,
    initializeDeck,
    advanceDeck,
    isDeckComplete,
    getCurrentCardId,
    getDeckProgress,
    reshuffleDeck,
    switchMode,
  };
}
