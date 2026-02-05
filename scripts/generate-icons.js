import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

const inputImage = 'public/images/verfly.jpg';
const outputDir = 'public';

async function generateIcons() {
  for (const { size, name } of sizes) {
    const outputPath = `${outputDir}/${name}`;

    await sharp(inputImage)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(outputPath);

    console.log(`Generated ${outputPath}`);
  }
}

generateIcons().catch(console.error);
