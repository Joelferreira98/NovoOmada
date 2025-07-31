// Script simples para gerar ícones PWA básicos
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar SVG básico com as iniciais OL
const createIcon = (size) => {
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad1)" rx="${size * 0.15}"/>
  <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
        font-family="Arial, sans-serif" font-weight="bold" 
        font-size="${size * 0.35}" fill="white">OL</text>
</svg>
  `.trim();
  
  return svg;
};

// Tamanhos necessários para PWA
const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// Criar diretório se não existir
const iconsDir = path.join(__dirname, 'client', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Gerar arquivos SVG (para desenvolvimento rápido)
sizes.forEach(size => {
  const svg = createIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`Gerado: ${filename}`);
});

console.log('Ícones PWA gerados com sucesso!');