export type BirdCard = {
  id: string;
  commonName: string;
  scientificName: string;
  speciesCode: string;

  audioUrl: string;
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
