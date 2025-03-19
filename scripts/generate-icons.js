/**
 * Icon Generator Script for Webpack Build
 * 
 * This script will be imported into the build process to generate 
 * different icon sizes from source SVG files.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import svgexport from 'svgexport';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path configuration
const SOURCE_DIR = path.resolve(__dirname, '../src/assets/icons');
const OUTPUT_DIR = path.resolve(__dirname, '../dist/assets/icons');

// Icon sizes to generate
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Function to convert SVG to PNG with specified size
async function convertSvgToPng(svgPath, pngPath, size) {
  // Create a temporary SVG file with dimensions set
  const svgData = fs.readFileSync(svgPath, 'utf8');
  const tempSvgPath = path.join(OUTPUT_DIR, `temp-${size}.svg`);
  
  // Write temp SVG file
  fs.writeFileSync(tempSvgPath, svgData);
  
  // Convert SVG to PNG using sharp
  try {
    await sharp(tempSvgPath)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    
    console.log(`Generated: ${pngPath}`);
  } catch (error) {
    console.error(`Error generating ${pngPath}:`, error);
  }
  
  // Clean up temp file
  fs.unlinkSync(tempSvgPath);
}

// Process all icon SVGs
async function generateAllIcons() {
  const svgFiles = [
    { name: 'icon', file: 'icon-512.svg', sizes: ICON_SIZES },
    { name: 'maskable-icon', file: 'maskable-icon-512.svg', sizes: [512] }
  ];
  
  for (const iconConfig of svgFiles) {
    const svgPath = path.join(SOURCE_DIR, iconConfig.file);
    
    // Skip if source file doesn't exist
    if (!fs.existsSync(svgPath)) {
      console.warn(`Warning: Source file ${svgPath} does not exist.`);
      continue;
    }
    
    // Generate PNGs for all sizes
    for (const size of iconConfig.sizes) {
      const pngPath = path.join(OUTPUT_DIR, `${iconConfig.name}-${size}.png`);
      await convertSvgToPng(svgPath, pngPath, size);
    }
  }
  
  console.log('Icon generation complete!');
}

// Used when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllIcons().catch(console.error);
}

// Export for use in Webpack build process
export default generateAllIcons;