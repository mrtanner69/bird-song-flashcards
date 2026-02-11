import React, { useState, useRef, useEffect } from 'react';
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
  const [showFieldNotes, setShowFieldNotes] = useState(false);
  const [showPhotographerPhoto, setShowPhotographerPhoto] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLoading, setAudioLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fieldNotesRef = useRef<HTMLDivElement>(null);

  // Close field notes when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fieldNotesRef.current && !fieldNotesRef.current.contains(e.target as Node)) {
        setShowFieldNotes(false);
      }
    };
    if (showFieldNotes) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFieldNotes]);

  // Reset field notes when card changes
  useEffect(() => {
    setShowFieldNotes(false);
  }, [card.id]);

  // Preload audio when card mounts (helps with iOS)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If the bird has an audioNote (e.g. no song file), skip loading
    if (card.audioNote) {
      setAudioError(true);
      setAudioLoading(false);
      return;
    }

    setAudioError(false);
    setAudioLoading(true);

    const handleCanPlay = () => {
      setAudioLoading(false);
    };

    const handleError = () => {
      setAudioError(true);
      setAudioLoading(false);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Explicitly load the audio (important for iOS)
    audio.load();

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [card.id]);

  const handlePlayPause = () => {
    if (!audioRef.current || audioError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // If audio has ended, restart from beginning
      if (audioRef.current.ended) {
        audioRef.current.currentTime = 0;
      }
      audioRef.current.play().catch(() => {
        setAudioError(true);
      });
      setIsPlaying(true);
    }
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

  const renderBirdName = () => (
    <div className="bird-name-wrapper" ref={fieldNotesRef}>
      <h2 className="bird-name">
        {card.commonName}
      </h2>
      <p className="scientific-name">{card.scientificName}</p>
      {card.fieldNotes && (
        <button
          className="field-notes-button"
          onClick={() => setShowFieldNotes(!showFieldNotes)}
        >
          Field Notes
        </button>
      )}
      {showFieldNotes && card.fieldNotes && (
        <div className="field-notes-popover">
          <p>{card.fieldNotes}</p>
        </div>
      )}
    </div>
  );

  const renderAudioFirst = () => (
    <>
      <div className="flashcard-question">
        {isRevealed ? (
          renderBirdName()
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
          renderBirdName()
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
          {audioError ? (
            <div className="audio-error">
              ⚠️ {card.audioNote || 'Audio unavailable for this bird'}
            </div>
          ) : (
            <button
              className="audio-button"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={audioLoading}
            >
              {audioLoading ? '⏳ Loading...' : isPlaying ? '⏸️ Pause' : '▶️ Play Song'}
            </button>
          )}

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
                </div>
                <div className="attribution-item attribution-image-item">
                  <strong>Image:</strong>{' '}
                  {card.source.imageSourceUrl ? (
                    <a href={card.source.imageSourceUrl} target="_blank" rel="noopener noreferrer">
                      {card.imageAttribution}
                    </a>
                  ) : (
                    <span
                      className="photographer-link"
                      onClick={() => setShowPhotographerPhoto(!showPhotographerPhoto)}
                    >
                      {card.imageAttribution}
                    </span>
                  )}
                  {showPhotographerPhoto && !card.source.imageSourceUrl && (
                    <div className="photographer-popup">
                      <img src="/images/rob.jpg" alt={card.imageAttribution} />
                    </div>
                  )}
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
