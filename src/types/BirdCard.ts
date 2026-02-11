export type BirdType =
  | 'raptor'
  | 'waterbird'
  | 'flycatcher'
  | 'sparrow'
  | 'hummingbird'
  | 'woodpecker'
  | 'songbird'
  | 'other';

export const BIRD_TYPE_LABELS: Record<BirdType, string> = {
  raptor: 'Raptors',
  waterbird: 'Waterbirds',
  flycatcher: 'Flycatchers',
  sparrow: 'Sparrows',
  hummingbird: 'Hummingbirds',
  woodpecker: 'Woodpeckers',
  songbird: 'Songbirds',
  other: 'Other',
};

export const ALL_BIRD_TYPES: BirdType[] = [
  'raptor',
  'waterbird',
  'flycatcher',
  'sparrow',
  'hummingbird',
  'woodpecker',
  'songbird',
  'other',
];

export type BirdCard = {
  id: string;
  commonName: string;
  scientificName: string;
  speciesCode: string;
  birdType: BirdType;
  fieldNotes?: string;
  audioNote?: string;

  imageUrl: string;

  audioAttribution: string;
  imageAttribution: string;

  license: string;
  licenseUrl: string;

  source: {
    audio: string;
    image: string;
    audioSourceUrl: string;
    imageSourceUrl: string;
  };
};
