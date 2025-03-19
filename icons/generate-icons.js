// generate-icons.js
// Script to generate all the required icon sizes from the SVG sources

/* 
To run this script:
1. Install dependencies:
   npm install svgexport sharp -g

2. Run the script:
   node generate-icons.js
*/

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Icon sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Function to create PNG from SVG for a specific size
function generateIcon(sourceFile, size) {
  const baseName = path.basename(sourceFile, '.svg');
  const outputFile = path.join(__dirname, `${baseName}-${size}.png`);
  
  // Using svgexport to convert SVG to PNG
  try {
    execSync(`svgexport ${sourceFile} ${outputFile} ${size}:${size}`);
    console.log(`Generated ${outputFile}`);
  } catch (error) {
    console.error(`Error generating ${outputFile}:`, error.message);
  }
}

// Main function to generate all icon sizes
function generateAllIcons() {
  const sourceFiles = [
    path.join(__dirname, 'icon-512.svg'),
    path.join(__dirname, 'maskable-icon-512.svg')
  ];
  
  sourceFiles.forEach(sourceFile => {
    if (fs.existsSync(sourceFile)) {
      // For standard icon, generate all sizes
      if (sourceFile.includes('icon-512')) {
        sizes.forEach(size => {
          generateIcon(sourceFile, size);
        });
      } 
      // For maskable icon, only generate the largest size
      else if (sourceFile.includes('maskable')) {
        generateIcon(sourceFile, 512);
      }
    } else {
      console.error(`Source file not found: ${sourceFile}`);
    }
  });
  
  console.log('Icon generation complete!');
}

// Run the icon generation
generateAllIcons();