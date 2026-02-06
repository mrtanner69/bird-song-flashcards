import React from 'react';
import type { ModeScore, HighScore, Mode } from '../hooks/useScoring';
import './DeckComplete.css';

interface DeckCompleteProps {
  mode: Mode;
  currentScore: ModeScore;
  highScore: HighScore;
  onReshuffle: () => void;
  onReviewMistakes: () => void;
  incorrectCount: number;
}

export const DeckComplete: React.FC<DeckCompleteProps> = ({
  mode,
  currentScore,
  highScore,
  onReshuffle,
  onReviewMistakes,
  incorrectCount,
}) => {
  const { correct, attempts, currentStreak } = currentScore;
  const percent = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

  // Check if this deck achieved a new high score (no minimum threshold)
  // Since high scores are updated in real-time, we check if current score matches the high score
  const isNewBestPercent =
    percent === highScore.bestPercent &&
    correct === highScore.bestCorrect &&
    attempts === highScore.bestAttempts &&
    attempts > 0;
  const isNewBestStreak = currentStreak === highScore.bestStreak && currentStreak > 0;

  const modeLabel = mode === 'audio-first' ? 'Audio-First' : 'Image-First';

  return (
    <div className="deck-complete">
      <div className="deck-complete-content">
        <div className="deck-complete-header">
          <h2>Deck Complete!</h2>
          <p className="mode-label">{modeLabel} Mode</p>
        </div>

        <div className="score-summary">
          <div className="main-score">
            <span className="score-fraction">{correct} / {attempts}</span>
            <span className="score-percentage">{percent}%</span>
          </div>

          {currentStreak > 0 && (
            <div className="streak-info">
              <span className="streak-badge">Streak: {currentStreak}</span>
            </div>
          )}
        </div>

        <div className="high-score-section">
          <h3>High Scores</h3>

          {isNewBestPercent && (
            <div className="achievement">New best score!</div>
          )}

          {isNewBestStreak && (
            <div className="achievement">New best streak!</div>
          )}

          <div className="high-score-details">
            <div className="high-score-item">
              <span className="label">Best Score:</span>
              <span className="value">
                {highScore.bestCorrect} / {highScore.bestAttempts} ({highScore.bestPercent}%)
              </span>
            </div>
            {highScore.bestStreak > 0 && (
              <div className="high-score-item">
                <span className="label">Best Streak:</span>
                <span className="value">{highScore.bestStreak}</span>
              </div>
            )}
          </div>
        </div>

        <div className="deck-complete-actions">
          <button className="reshuffle-button" onClick={onReshuffle}>
            Reshuffle Deck
          </button>
          {incorrectCount > 0 && (
            <button className="review-mistakes-button" onClick={onReviewMistakes}>
              Review Mistakes ({incorrectCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
