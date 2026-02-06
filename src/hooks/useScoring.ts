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

// Only high scores are persisted - game state is NOT persisted
interface PersistedState {
  audioFirstHighScore: HighScore;
  imageFirstHighScore: HighScore;
}

export interface ScoringState {
  audioFirst: ModeScore;
  imageFirst: ModeScore;
  audioFirstHighScore: HighScore;
  imageFirstHighScore: HighScore;
  deckState: DeckState | null;
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

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Only load HIGH SCORES from storage - game state always starts fresh
function loadHighScoresFromStorage(): PersistedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        audioFirstHighScore: { ...defaultHighScore, ...parsed.audioFirstHighScore },
        imageFirstHighScore: { ...defaultHighScore, ...parsed.imageFirstHighScore },
      };
    }
  } catch (e) {
    console.error('Failed to load high scores from localStorage:', e);
  }
  return {
    audioFirstHighScore: { ...defaultHighScore },
    imageFirstHighScore: { ...defaultHighScore },
  };
}

// Only save HIGH SCORES to storage - game state is NOT persisted
function saveHighScoresToStorage(state: ScoringState): void {
  try {
    const toSave: PersistedState = {
      audioFirstHighScore: state.audioFirstHighScore,
      imageFirstHighScore: state.imageFirstHighScore,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save high scores to localStorage:', e);
  }
}

function getModeKey(mode: Mode): 'audioFirst' | 'imageFirst' {
  return mode === 'audio-first' ? 'audioFirst' : 'imageFirst';
}

function getHighScoreKey(mode: Mode): 'audioFirstHighScore' | 'imageFirstHighScore' {
  return mode === 'audio-first' ? 'audioFirstHighScore' : 'imageFirstHighScore';
}

export function useScoring() {
  // Initialize state: load only high scores, start with fresh game state
  const [state, setState] = useState<ScoringState>(() => {
    const highScores = loadHighScoresFromStorage();
    return {
      audioFirst: { ...defaultModeScore },
      imageFirst: { ...defaultModeScore },
      audioFirstHighScore: highScores.audioFirstHighScore,
      imageFirstHighScore: highScores.imageFirstHighScore,
      deckState: null, // Always start with no deck - fresh game
    };
  });

  // Save only high scores to localStorage whenever they change
  useEffect(() => {
    saveHighScoresToStorage(state);
  }, [state.audioFirstHighScore, state.imageFirstHighScore]);

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

      // Update best correct count if better (track highest number correct)
      if (newCorrect > currentHighScore.bestCorrect) {
        newHighScore = {
          ...newHighScore,
          bestCorrect: newCorrect,
          bestAttempts: newAttempts,
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
    setState({
      audioFirst: { ...defaultModeScore },
      imageFirst: { ...defaultModeScore },
      audioFirstHighScore: { ...defaultHighScore },
      imageFirstHighScore: { ...defaultHighScore },
      deckState: null,
    });
  }, []);

  // Deck management functions
  const getDeckState = useCallback((): DeckState | null => {
    return state.deckState;
  }, [state.deckState]);

  const initializeDeck = useCallback((cardIds: string[], mode: Mode): void => {
    setState((prev) => {
      // Check if we already have a valid deck for this mode (within the same session)
      if (prev.deckState && prev.deckState.mode === mode && prev.deckState.shuffledOrder.length > 0) {
        // Keep existing deck session
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

  // Get list of incorrectly answered card IDs for current mode
  const getIncorrectCardIds = useCallback((mode: Mode): string[] => {
    const modeScore = state[getModeKey(mode)];
    return Object.entries(modeScore.answeredCards)
      .filter(([, answer]) => answer === 'incorrect')
      .map(([cardId]) => cardId);
  }, [state]);

  // Start a review mistakes deck (only incorrect cards)
  const startReviewMistakes = useCallback((mode: Mode): void => {
    setState((prev) => {
      const modeKey = getModeKey(mode);
      const modeScore = prev[modeKey];

      // Get only the incorrect card IDs
      const incorrectIds = Object.entries(modeScore.answeredCards)
        .filter(([, answer]) => answer === 'incorrect')
        .map(([cardId]) => cardId);

      if (incorrectIds.length === 0) return prev;

      // Shuffle the incorrect cards
      const shuffledOrder = shuffleArray(incorrectIds);

      // Reset score but keep the high scores
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
    getIncorrectCardIds,
    startReviewMistakes,
  };
}
