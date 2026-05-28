import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';

// Dark green icon with white "CC" monogram and a small coin accent
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14532d"/>
      <stop offset="100%" style="stop-color:#166534"/>
    </linearGradient>
  </defs>

  <!-- Background rounded square -->
  <rect width="512" height="512" rx="110" ry="110" fill="url(#bg)"/>

  <!-- Subtle inner highlight -->
  <rect x="20" y="20" width="472" height="472" rx="96" ry="96"
        fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="2"/>

  <!-- Euro coin circle -->
  <circle cx="256" cy="210" r="118" fill="none"
          stroke="rgba(255,255,255,0.18)" stroke-width="10"/>
  <circle cx="256" cy="210" r="98" fill="rgba(255,255,255,0.08)"/>

  <!-- € symbol -->
  <text x="256" y="258"
        font-family="Georgia, serif"
        font-size="148"
        font-weight="bold"
        text-anchor="middle"
        fill="white"
        opacity="0.95">€</text>

  <!-- App name strip -->
  <rect x="60" y="356" width="392" height="100" rx="16" ry="16"
        fill="rgba(255,255,255,0.10)"/>
  <text x="256" y="426"
        font-family="Arial, Helvetica, sans-serif"
        font-size="52"
        font-weight="700"
        letter-spacing="3"
        text-anchor="middle"
        fill="white"
        opacity="0.95">CATRIVER</text>
</svg>
`;

mkdirSync('public', { recursive: true });

const sizes = [
  { name: 'public/icon-192.png',       size: 192 },
  { name: 'public/icon-512.png',       size: 512 },
  { name: 'public/apple-touch-icon.png', size: 180 },
  { name: 'public/icon-167.png',       size: 167 },
  { name: 'public/icon-152.png',       size: 152 },
];

for (const { name, size } of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(name);
  console.log(`Generated ${name} (${size}x${size})`);
}

// Also write the SVG for use in the manifest
writeFileSync('public/icon.svg', svg.trim());
console.log('Generated public/icon.svg');
