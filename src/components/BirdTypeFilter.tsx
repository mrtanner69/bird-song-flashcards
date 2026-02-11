import type { BirdType } from '../types/BirdCard';
import { ALL_BIRD_TYPES, BIRD_TYPE_LABELS } from '../types/BirdCard';
import './BirdTypeFilter.css';

interface BirdTypeFilterProps {
  selectedTypes: Set<BirdType>;
  onToggleType: (type: BirdType) => void;
  onSelectAll: () => void;
  disabled?: boolean;
}

export function BirdTypeFilter({
  selectedTypes,
  onToggleType,
  onSelectAll,
  disabled = false,
}: BirdTypeFilterProps) {
  const allSelected = selectedTypes.size === ALL_BIRD_TYPES.length;

  return (
    <div className={`bird-type-filter ${disabled ? 'disabled' : ''}`}>
      <button
        className={`type-chip all-chip ${allSelected ? 'active' : ''}`}
        onClick={onSelectAll}
        disabled={disabled || allSelected}
        aria-pressed={allSelected}
      >
        All
      </button>
      {ALL_BIRD_TYPES.map((type) => (
        <button
          key={type}
          className={`type-chip ${selectedTypes.has(type) ? 'active' : ''}`}
          onClick={() => onToggleType(type)}
          disabled={disabled}
          aria-pressed={selectedTypes.has(type)}
        >
          {BIRD_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
