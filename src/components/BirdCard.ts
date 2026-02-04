export interface BirdCard {
  id: string; // 6-letter eBird species code, used as filename for audio/images
  commonName: string;
  scientificName: string;
  speciesCode: string; // eBird species code
  imageUrl: string; // direct usable image URL
  audioAttribution: string; // human-readable credit
  imageAttribution: string;
  license: string; // e.g., "CC BY 4.0"
  licenseUrl: string;
  source: {
    audio: 'xeno-canto' | 'other';
    image: 'wikimedia' | 'other';
    audioSourceUrl: string;
    imageSourceUrl: string;
  };
}

export interface AppSettings {
  mode: 'audio-first' | 'image-first';
  autoAdvanceAfterReveal: boolean;
}
