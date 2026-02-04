import { useMemo, useState, useCallback } from "react";
import "./App.css";

import { birds } from "./data/birds";
import { FlashCard } from "./components/FlashCard";
import { useScoring, type Mode } from "./hooks/useScoring";

export default function App() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("audio-first");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const cards = useMemo(() => birds, []);
  const current = cards[index];

  const {
    getCurrentScore,
    getHighScore,
    isCardAnswered,
    getCardAnswer,
    recordAnswer,
    resetCurrentScore,
    resetAllScores,
    HIGH_SCORE_THRESHOLD,
  } = useScoring();

  const currentScore = getCurrentScore(mode);
  const audioHighScore = getHighScore("audio-first");
  const imageHighScore = getHighScore("image-first");
  const cardAnswered = isCardAnswered(mode, current.id);
  const cardAnswer = getCardAnswer(mode, current.id);

  const handleNext = () => setIndex((i) => (i + 1) % cards.length);
  const handlePrevious = () =>
    setIndex((i) => (i - 1 + cards.length) % cards.length);

  const handleShuffle = () => {
    if (cards.length <= 1) return;
    let next = index;
    while (next === index) next = Math.floor(Math.random() * cards.length);
    setIndex(next);
  };

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      recordAnswer(mode, current.id, isCorrect);
    },
    [mode, current.id, recordAnswer]
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
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="audio-first">Audio first</option>
              <option value="image-first">Image first</option>
            </select>
          </label>
        </div>
      </div>

      <div className="score-header">
        <div className="score-display">
          <div className="current-score">
            <span className="score-label">Current:</span>
            <span className="score-value">
              {currentScore.correct} / {currentScore.attempts}
              {currentScore.attempts > 0 && (
                <span className="score-percent">
                  ({formatPercent(currentScore.correct, currentScore.attempts)})
                </span>
              )}
            </span>
            {currentScore.currentStreak > 0 && (
              <span className="streak">Streak: {currentScore.currentStreak}</span>
            )}
          </div>

          <div className="high-scores">
            <div className={`high-score ${mode === "audio-first" ? "active" : ""}`}>
              <span className="score-label">Audio Best:</span>
              <span className="score-value">
                {audioHighScore.bestCorrect} / {audioHighScore.bestAttempts} ({audioHighScore.bestPercent}%)
              </span>
              {audioHighScore.bestStreak > 0 && (
                <span className="best-streak">Best streak: {audioHighScore.bestStreak}</span>
              )}
            </div>
            <div className={`high-score ${mode === "image-first" ? "active" : ""}`}>
              <span className="score-label">Image Best:</span>
              <span className="score-value">
                {imageHighScore.bestCorrect} / {imageHighScore.bestAttempts} ({imageHighScore.bestPercent}%)
              </span>
              {imageHighScore.bestStreak > 0 && (
                <span className="best-streak">Best streak: {imageHighScore.bestStreak}</span>
              )}
            </div>
          </div>
        </div>

        <div className="score-info">
          <small>High scores update after {HIGH_SCORE_THRESHOLD}+ attempts</small>
        </div>

        <div className="score-controls">
          <button className="reset-button" onClick={handleResetCurrent}>
            Reset current score
          </button>
          <button
            className={`reset-button danger ${showResetConfirm ? "confirm" : ""}`}
            onClick={handleResetAll}
          >
            {showResetConfirm ? "Confirm reset ALL?" : "Reset ALL scores"}
          </button>
          {showResetConfirm && (
            <button
              className="reset-button cancel"
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card-area">
        <FlashCard
          key={current.id}
          card={current}
          mode={mode}
          isAnswered={cardAnswered}
          currentAnswer={cardAnswer}
          onAnswer={handleAnswer}
        />
      </div>

      <div className="navigation">
        <button className="nav-button" onClick={handlePrevious}>
          ← Previous
        </button>

        <button className="nav-button shuffle" onClick={handleShuffle}>
          Shuffle
        </button>

        <button className="nav-button" onClick={handleNext}>
          Next →
        </button>
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
