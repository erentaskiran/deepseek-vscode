const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'media', 'icon.svg');
const pngPath = path.join(__dirname, '..', 'media', 'icon.png');

// SVG dosyasını oku
const svgBuffer = fs.readFileSync(svgPath);

// PNG'ye dönüştür
sharp(svgBuffer)
    .resize(128, 128)
    .png()
    .toFile(pngPath)
    .then(() => console.log('Icon generated successfully!'))
    .catch(err => {
        console.error('Error generating icon:', err);
        process.exit(1);
    }); 