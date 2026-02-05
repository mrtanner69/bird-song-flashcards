import React, { useState, useRef } from 'react';
import type { BirdCard } from '../types/BirdCard';
import './FlashCard.css';

interface FlashCardProps {
  card: BirdCard;
  mode: 'audio-first' | 'image-first';
  isAnswered: boolean;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  isLastCard: boolean;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  card,
  mode,
  isAnswered,
  onAnswer,
  onNext,
  isLastCard
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const [imageError, setImageError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getImageSrc = () => {
    if (imageError) {
      return '/images/placeholder.jpg';
    }
    return `/images/${card.id}.jpg`;
  };

  const renderAudioFirst = () => (
    <>
      <div className="flashcard-question">
        {isRevealed ? (
          <>
            <h2>{card.commonName}</h2>
            <p className="scientific-name">{card.scientificName}</p>
          </>
        ) : (
          <>
            <h2>🎵 Listen and Identify</h2>
            <p>What bird is singing?</p>
          </>
        )}
      </div>

      {isRevealed && (
        <div className="flashcard-image">
          <img
            src={getImageSrc()}
            alt={card.commonName}
            onError={handleImageError}
          />
        </div>
      )}
    </>
  );

  const renderImageFirst = () => (
    <>
      <div className="flashcard-image">
        <img
          src={getImageSrc()}
          alt={isRevealed ? card.commonName : 'Bird'}
          className=""
          onError={handleImageError}
        />
      </div>

      <div className="flashcard-question">
        {isRevealed ? (
          <>
            <h2>{card.commonName}</h2>
            <p className="scientific-name">{card.scientificName}</p>
          </>
        ) : (
          <>
            <h2>🖼️ Identify the Bird</h2>
            <p>What species is this?</p>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="flashcard">
      <div className="flashcard-content">
        {mode === 'audio-first' ? renderAudioFirst() : renderImageFirst()}

        <div className="flashcard-controls">
          <div className="audio-controls">
            <button
              className="audio-button"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play Song'}
            </button>

            <button
              className="audio-button replay"
              onClick={handleReplay}
              aria-label="Replay"
            >
              🔁 Replay
            </button>
          </div>

          <audio
            ref={audioRef}
            onEnded={handleAudioEnded}
            preload="auto"
          >
            <source src={`/audio/birdsong/${card.id}.mp3`} type="audio/mpeg" />
            <source src={`/audio/birdsong/${card.id}.wav`} type="audio/wav" />
          </audio>
        </div>

        {!isRevealed && (
          <button
            className="reveal-button"
            onClick={() => setIsRevealed(true)}
          >
            Reveal Name
          </button>
        )}

        {isRevealed && (
          <div className="scoring-section">
            {!isAnswered ? (
              <>
                <p className="scoring-prompt">Did you get it correct?</p>
                <div className="scoring-buttons">
                  <button
                    className="score-button correct"
                    onClick={() => onAnswer(true)}
                  >
                    Yes
                  </button>
                  <button
                    className="score-button incorrect"
                    onClick={() => onAnswer(false)}
                  >
                    No
                  </button>
                </div>
              </>
            ) : (
              <button
                className="score-button next"
                onClick={onNext}
              >
                {isLastCard ? 'Finish' : 'Next'}
              </button>
            )}
          </div>
        )}

        {isRevealed && (
          <div className="attribution-section">
            <button
              className="attribution-toggle"
              onClick={() => setShowAttribution(!showAttribution)}
            >
              ⓘ Attribution {showAttribution ? '▼' : '▶'}
            </button>

            {showAttribution && (
              <div className="attribution-details">
                <div className="attribution-item">
                  <strong>Audio:</strong> {card.audioAttribution}
                  <br />
                  <a href={card.source.audioSourceUrl} target="_blank" rel="noopener noreferrer">
                    View source
                  </a>
                </div>
                <div className="attribution-item">
                  <strong>Image:</strong> {card.imageAttribution}
                  <br />
                  <a href={card.source.imageSourceUrl} target="_blank" rel="noopener noreferrer">
                    View source
                  </a>
                </div>
                <div className="attribution-item">
                  <strong>License:</strong>{' '}
                  <a href={card.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {card.license}
                  </a>
                </div>
                <div className="attribution-item source-info">
                  <small>
                    Audio from {card.source.audio} • Image from {card.source.image}
                  </small>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
