import { useMemo, useState, useCallback, useEffect } from "react";
import "./App.css";

import { birds } from "./data/birds";
import { FlashCard } from "./components/FlashCard";
import { DeckComplete } from "./components/DeckComplete";
import { useScoring, type Mode } from "./hooks/useScoring";

export default function App() {
  const [mode, setMode] = useState<Mode>("audio-first");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeckComplete, setShowDeckComplete] = useState(false);

  const cards = useMemo(() => birds, []);
  const cardIds = useMemo(() => birds.map((b) => b.id), []);

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
      setMode(newMode);
      switchMode(cardIds, newMode);
      setShowDeckComplete(false);
    },
    [switchMode, cardIds]
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

  const formatPercent = (correct: number, attempts: number) => {
    if (attempts === 0) return "0%";
    return `${Math.round((correct / attempts) * 100)}%`;
  };

  return (
    <div className="app">
      <div className="top-bar">
        <h1 className="app-title">Prescott Preserve Bird Flashcards</h1>

        <div className="mode-toggle">
          <label>
            Mode:&nbsp;
            <select
              value={mode}
              onChange={(e) => handleModeChange(e.target.value as Mode)}
            >
              <option value="audio-first">Audio first</option>
              <option value="image-first">Image first</option>
            </select>
          </label>
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
          />
        )}
      </div>

      {!showDeckComplete && (
        <div className="navigation">
          <div className="deck-progress">
            Card {deckProgress.current} of {deckProgress.total}
          </div>

          {cardAnswered && (
            <button className="nav-button primary" onClick={handleNext}>
              {deckIsComplete ? "Finish Deck" : "Next"}
            </button>
          )}
        </div>
      )}

      <div className="score-widget">
        <div className="score-widget-main">
          <span className="score-current">
            {currentScore.correct}/{currentScore.attempts}
            {currentScore.attempts > 0 && (
              <span className="score-pct">
                {formatPercent(currentScore.correct, currentScore.attempts)}
              </span>
            )}
          </span>
          {currentScore.currentStreak > 1 && (
            <span className="score-streak">{currentScore.currentStreak} streak</span>
          )}
        </div>
        <div className="score-widget-bests">
          <span className={`score-best ${mode === "audio-first" ? "active" : ""}`}>
            Audio: {audioHighScore.bestCorrect}/{audioHighScore.bestAttempts}
          </span>
          <span className={`score-best ${mode === "image-first" ? "active" : ""}`}>
            Image: {imageHighScore.bestCorrect}/{imageHighScore.bestAttempts}
          </span>
        </div>
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
