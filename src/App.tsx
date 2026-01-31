import { useMemo, useState } from "react";
import "./App.css";

import { birds } from "./data/birds";
import { FlashCard } from "./components/FlashCard";

type Mode = "audio-first" | "image-first";

export default function App() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("audio-first");

  const cards = useMemo(() => birds, []);

  const current = cards[index];

  const handleNext = () => setIndex((i) => (i + 1) % cards.length);
  const handlePrevious = () =>
    setIndex((i) => (i - 1 + cards.length) % cards.length);

  const handleShuffle = () => {
    if (cards.length <= 1) return;
    let next = index;
    while (next === index) next = Math.floor(Math.random() * cards.length);
    setIndex(next);
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

      <div className="card-area">
        <FlashCard key={current.id} card={current} mode={mode} />
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
