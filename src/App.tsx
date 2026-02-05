import { useMemo, useState, useCallback, useEffect } from "react";
import "./App.css";

import { birds } from "./data/birds";
import { FlashCard } from "./components/FlashCard";
import { DeckComplete } from "./components/DeckComplete";
import { useScoring, type Mode } from "./hooks/useScoring";

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

export default function App() {
  const [mode, setMode] = useState<Mode>(loadSavedMode);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeckComplete, setShowDeckComplete] = useState(false);

  const cards = useMemo(() => birds, []);
  const cardIds = useMemo(() => birds.map((b) => b.id), []);
  const totalCards = cards.length;

  const {
    getCurrentScore,
    getHighScore,
    isCardAnswered,
    getCardAnswer,
    recordAnswer,
    resetCurrentScore,
    resetAllScores,
    // Deck management
    initializeDeck,
    advanceDeck,
    isDeckComplete,
    getCurrentCardId,
    getDeckProgress,
    reshuffleDeck,
    switchMode,
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
  const cardAnswer = getCardAnswer(mode, current.id);
  const deckProgress = getDeckProgress();
  const deckIsComplete = isDeckComplete();

  // Game is in progress if user has answered at least one card
  // Mode should be locked during active gameplay
  const gameInProgress = currentScore.attempts > 0;
  const isModeLocked = gameInProgress && !showDeckComplete;

  const handleNext = useCallback(() => {
    // Check if deck is complete after this card
    if (deckIsComplete) {
      setShowDeckComplete(true);
    } else {
      advanceDeck();
    }
  }, [advanceDeck, deckIsComplete]);

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      recordAnswer(mode, current.id, isCorrect);
    },
    [mode, current.id, recordAnswer]
  );

  const handleReshuffle = useCallback(() => {
    reshuffleDeck(cardIds, mode);
    setShowDeckComplete(false);
  }, [reshuffleDeck, cardIds, mode]);

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

  const handleResetCurrent = () => {
    resetCurrentScore(mode);
  };

  const handleResetAll = () => {
    if (showResetConfirm) {
      resetAllScores();
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
    }
  };

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
        <p className="app-author">by Rob Tanner</p>

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
              Image first
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
              Audio first
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
      </div>

      <div className="card-area">
        {showDeckComplete ? (
          <DeckComplete
            mode={mode}
            currentScore={currentScore}
            highScore={mode === "audio-first" ? audioHighScore : imageHighScore}
            onReshuffle={handleReshuffle}
          />
        ) : (
          <FlashCard
            key={current.id}
            card={current}
            mode={mode}
            isAnswered={cardAnswered}
            currentAnswer={cardAnswer}
            onAnswer={handleAnswer}
            onNext={handleNext}
            isLastCard={deckIsComplete}
          />
        )}
      </div>

      {!showDeckComplete && (
        <div className="deck-progress">
          Card {deckProgress.current} of {deckProgress.total}
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
          <button className="score-reset" onClick={handleResetCurrent}>
            Reset
          </button>
          {!showResetConfirm ? (
            <button className="score-reset danger" onClick={handleResetAll}>
              Reset all
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
          Audio from Xeno-canto and images from Wikimedia. Check licenses in
          attribution.
        </p>
      </footer>
    </div>
  );
}
