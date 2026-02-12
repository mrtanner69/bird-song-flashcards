import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import "./App.css";

import { birds } from "./data/birds";
import { FlashCard } from "./components/FlashCard";
import { DeckComplete } from "./components/DeckComplete";
import { BirdTypeFilter } from "./components/BirdTypeFilter";
import { useScoring, type Mode } from "./hooks/useScoring";
import { ALL_BIRD_TYPES, type BirdType } from "./types/BirdCard";

const MODE_STORAGE_KEY = "birdFlashcardsMode";

function loadSavedMode(): Mode {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === "audio-first" || saved === "image-first") {
      return saved;
    }
  } catch {
    // Ignore localStorage errors
  }
  return "image-first"; // Default to image-first
}

function saveModePreference(mode: Mode): void {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore localStorage errors
  }
}

function getInitialDarkMode(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>(loadSavedMode);
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeckComplete, setShowDeckComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [cardKey, setCardKey] = useState(0); // For card transition animation
  const [selectedBirdTypes, setSelectedBirdTypes] = useState<Set<BirdType>>(
    () => new Set(ALL_BIRD_TYPES)
  );

  // Sync data-theme attribute with darkMode state
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const cards = useMemo(
    () => birds.filter((b) => selectedBirdTypes.has(b.birdType)),
    [selectedBirdTypes]
  );
  const cardIds = useMemo(() => cards.map((b) => b.id), [cards]);
  const totalCards = cards.length;

  const {
    getCurrentScore,
    getHighScore,
    isCardAnswered,
    recordAnswer,
    resetAllScores,
    // Deck management
    initializeDeck,
    advanceDeck,
    isDeckComplete,
    getCurrentCardId,
    getDeckProgress,
    reshuffleDeck,
    switchMode,
    getIncorrectCardIds,
    startReviewMistakes,
  } = useScoring();

  // Initialize deck on mount and when mode changes
  useEffect(() => {
    initializeDeck(cardIds, mode);
  }, [initializeDeck, cardIds, mode]);

  // Get current card from deck
  const currentCardId = getCurrentCardId();
  const current = useMemo(() => {
    if (!currentCardId) return cards[0];
    return cards.find((c) => c.id === currentCardId) || cards[0];
  }, [currentCardId, cards]);

  const currentScore = getCurrentScore(mode);
  const audioHighScore = getHighScore("audio-first");
  const imageHighScore = getHighScore("image-first");
  const cardAnswered = isCardAnswered(mode, current.id);
  const deckProgress = getDeckProgress();
  const deckIsComplete = isDeckComplete();

  // Game is in progress if user has answered at least one card
  // Mode and filter should be locked during active gameplay
  const gameInProgress = currentScore.attempts > 0;
  const isModeLocked = gameInProgress && !showDeckComplete;

  // Track previous cardIds to reinitialize deck when filter changes
  const prevCardIdsRef = useRef(cardIds);
  useEffect(() => {
    if (prevCardIdsRef.current !== cardIds && cardIds.length > 0) {
      prevCardIdsRef.current = cardIds;
      reshuffleDeck(cardIds, mode);
      setShowDeckComplete(false);
      setCardKey((k) => k + 1);
    }
  }, [cardIds, mode, reshuffleDeck]);

  const handleNext = useCallback(() => {
    // Check if deck is complete after this card
    if (deckIsComplete) {
      // Check for perfect audio-only round - show big fireworks celebration
      const isPerfect = currentScore.correct === currentScore.attempts && currentScore.attempts > 0;
      if (isPerfect && mode === "audio-first") {
        setShowFireworks(true);
        setTimeout(() => setShowFireworks(false), 5000);
      } else if (isPerfect) {
        // Regular celebration for perfect image-first round
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
      setShowDeckComplete(true);
    } else {
      advanceDeck();
      setCardKey((k) => k + 1); // Trigger card transition
    }
  }, [advanceDeck, deckIsComplete, currentScore, mode]);

  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      recordAnswer(mode, current.id, isCorrect);
      setLastAnswerCorrect(isCorrect);

      // Celebrate on streak of 5+
      const newStreak = isCorrect ? currentScore.currentStreak + 1 : 0;
      if (newStreak >= 5 && newStreak % 5 === 0) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }

      // Clear feedback after a moment
      setTimeout(() => setLastAnswerCorrect(null), 600);
    },
    [mode, current.id, recordAnswer, currentScore.currentStreak]
  );

  const handleReshuffle = useCallback(() => {
    reshuffleDeck(cardIds, mode);
    setShowDeckComplete(false);
    setCardKey((k) => k + 1);
  }, [reshuffleDeck, cardIds, mode]);

  const handleReviewMistakes = useCallback(() => {
    startReviewMistakes(mode);
    setShowDeckComplete(false);
    setCardKey((k) => k + 1);
  }, [startReviewMistakes, mode]);

  const incorrectCount = getIncorrectCardIds(mode).length;

  const handleModeChange = useCallback(
    (newMode: Mode) => {
      // Don't allow mode change during active game
      if (isModeLocked) return;

      setMode(newMode);
      saveModePreference(newMode);
      switchMode(cardIds, newMode);
      setShowDeckComplete(false);
    },
    [switchMode, cardIds, isModeLocked]
  );

  const handleResetCurrent = useCallback(() => {
    reshuffleDeck(cardIds, mode);
    setShowDeckComplete(false);
    setCardKey((k) => k + 1);
  }, [reshuffleDeck, cardIds, mode]);

  const handleResetAll = useCallback(() => {
    if (showResetConfirm) {
      resetAllScores();
      initializeDeck(cardIds, mode);
      setShowDeckComplete(false);
      setShowResetConfirm(false);
      setCardKey((k) => k + 1);
    } else {
      setShowResetConfirm(true);
    }
  }, [showResetConfirm, resetAllScores, initializeDeck, cardIds, mode]);

  const handleToggleBirdType = useCallback(
    (type: BirdType) => {
      if (isModeLocked) return;
      setSelectedBirdTypes((prev) => {
        const next = new Set(prev);
        if (next.has(type)) {
          // Don't allow deselecting the last type
          if (next.size <= 1) return prev;
          next.delete(type);
        } else {
          next.add(type);
        }
        return next;
      });
    },
    [isModeLocked]
  );

  const handleSelectAllTypes = useCallback(() => {
    if (isModeLocked) return;
    setSelectedBirdTypes(new Set(ALL_BIRD_TYPES));
  }, [isModeLocked]);

  const handleKeyDown = (e: React.KeyboardEvent, targetMode: Mode) => {
    if (isModeLocked) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleModeChange(targetMode);
    }
  };

  return (
    <div className="app">
      <div className="top-bar">
        <h1 className="app-title">Prescott Preserve Bird Flashcards</h1>
        <div className="app-author-row">
          <p className="app-author">
            by <span className="author-name">Rob Tanner
              <img src="/images/rob.jpg" alt="Rob Tanner" className="author-thumbnail" />
            </span>
          </p>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode((d) => !d)}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        <div className="mode-toggle-container">
          <div
            className={`mode-toggle ${isModeLocked ? "locked" : ""}`}
            role="radiogroup"
            aria-label="Quiz mode selection"
            aria-disabled={isModeLocked}
          >
            <button
              role="radio"
              aria-checked={mode === "image-first"}
              className={`mode-option ${mode === "image-first" ? "active" : ""}`}
              onClick={() => handleModeChange("image-first")}
              onKeyDown={(e) => handleKeyDown(e, "image-first")}
              tabIndex={isModeLocked ? -1 : mode === "image-first" ? 0 : -1}
              disabled={isModeLocked}
              aria-disabled={isModeLocked}
            >
              Picture plus song flashcards
            </button>
            <button
              role="radio"
              aria-checked={mode === "audio-first"}
              className={`mode-option ${mode === "audio-first" ? "active" : ""}`}
              onClick={() => handleModeChange("audio-first")}
              onKeyDown={(e) => handleKeyDown(e, "audio-first")}
              tabIndex={isModeLocked ? -1 : mode === "audio-first" ? 0 : -1}
              disabled={isModeLocked}
              aria-disabled={isModeLocked}
            >
              Song only flashcards - hard!
            </button>
            {isModeLocked && (
              <span className="mode-lock-icon" aria-hidden="true">
                🔒
              </span>
            )}
          </div>
          {isModeLocked && (
            <p className="mode-lock-text">Locked during current game</p>
          )}
        </div>

        <BirdTypeFilter
          selectedTypes={selectedBirdTypes}
          onToggleType={handleToggleBirdType}
          onSelectAll={handleSelectAllTypes}
          disabled={isModeLocked}
        />
      </div>

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <span className="celebration-emoji">🎉</span>
            <span className="celebration-text">
              {currentScore.correct === currentScore.attempts
                ? "Perfect Round!"
                : `${currentScore.currentStreak} Streak!`}
            </span>
          </div>
        </div>
      )}

      {/* Fireworks celebration for 100% audio-only */}
      {showFireworks && (
        <div className="fireworks-overlay" onClick={() => setShowFireworks(false)}>
          {/* Sparkle stars */}
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />
          <div className="sparkle" />

          {/* Firework bursts */}
          <div className="firework-burst burst-1">
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
          </div>
          <div className="firework-burst burst-2">
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
          </div>
          <div className="firework-burst burst-3">
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
          </div>
          <div className="firework-burst burst-4">
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
          </div>
          <div className="firework-burst burst-5">
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
          </div>
          <div className="firework-burst burst-6">
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
          </div>
          <div className="firework-burst burst-7">
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
          </div>
          <div className="firework-burst burst-8">
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
            <div className="particle" /><div className="particle" /><div className="particle" />
          </div>

          <div className="fireworks-content">
            <span className="fireworks-emoji">🎆</span>
            <h1 className="fireworks-title">100% PERFECT!</h1>
            <p className="fireworks-subtitle">
              You scored 100% on audio only - You are a true Prescott Birder!
            </p>
          </div>
        </div>
      )}

      <div className={`card-area ${lastAnswerCorrect !== null ? (lastAnswerCorrect ? 'flash-correct' : 'flash-incorrect') : ''}`}>
        {showDeckComplete ? (
          <DeckComplete
            mode={mode}
            currentScore={currentScore}
            highScore={mode === "audio-first" ? audioHighScore : imageHighScore}
            onReshuffle={handleReshuffle}
            onReviewMistakes={handleReviewMistakes}
            incorrectCount={incorrectCount}
          />
        ) : (
          <FlashCard
            key={`${current.id}-${cardKey}`}
            card={current}
            mode={mode}
            isAnswered={cardAnswered}
            onAnswer={handleAnswer}
            onNext={handleNext}
            isLastCard={deckIsComplete}
          />
        )}
      </div>

      {!showDeckComplete && (
        <div className="deck-progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(deckProgress.current / deckProgress.total) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {deckProgress.current} / {deckProgress.total}
          </span>
        </div>
      )}

      <div className="score-widget">
        <div className="score-widget-bests">
          <span className={`score-best ${mode === "image-first" ? "active" : ""}`}>
            Best (Image): {imageHighScore.bestCorrect}/{totalCards}
          </span>
          <span className={`score-best ${mode === "audio-first" ? "active" : ""}`}>
            Best (Audio): {audioHighScore.bestCorrect}/{totalCards}
          </span>
        </div>
        {currentScore.currentStreak > 1 && (
          <span className="score-streak">{currentScore.currentStreak} streak</span>
        )}
        <div className="score-widget-controls">
          <button className="score-reset danger" onClick={handleResetCurrent}>
            Reset current game
          </button>
          {!showResetConfirm ? (
            <button className="score-reset danger" onClick={handleResetAll}>
              Reset game and best scores
            </button>
          ) : (
            <>
              <button className="score-reset confirm" onClick={handleResetAll}>
                Confirm?
              </button>
              <button
                className="score-reset"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <p>
          Audio from Xeno-canto and images from Rob Tanner. Check license in
          attribution.
        </p>
      </footer>
    </div>
  );
}
