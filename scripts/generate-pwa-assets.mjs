import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const base = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
const publicDir = join(process.cwd(), 'public');
const iconDir = join(publicDir, 'icons');
const splashDir = join(publicDir, 'splash');
mkdirSync(iconDir, { recursive: true });
mkdirSync(splashDir, { recursive: true });

const logo = readFileSync(join(publicDir, 'icon.svg'));
await Promise.all([
  sharp(logo).resize(192, 192).png().toFile(join(iconDir, 'icon-192.png')),
  sharp(logo).resize(512, 512).png().toFile(join(iconDir, 'icon-512.png')),
  sharp(logo).resize(512, 512).png().toFile(join(iconDir, 'maskable-512.png')),
  sharp(logo).resize(180, 180).png().toFile(join(iconDir, 'apple-touch.png')),
]);

const manifest = {
  id: base + '/',
  name: 'Kagel — minuteur de Kegel',
  short_name: 'Kagel',
  description: 'Votre séance guidée de contraction et de relaxation, même hors ligne.',
  lang: 'fr',
  start_url: base + '/',
  scope: base + '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#0d2030',
  theme_color: '#0d2030',
  icons: [
    { src: base + '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: base + '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: base + '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync(join(publicDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

async function renderSplash(filename, width, height) {
  const iconSize = Math.round(width * 0.27);
  const icon = await sharp(logo).resize(iconSize, iconSize).png().toBuffer();
  const centerX = width / 2;
  const background = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
    '<defs><radialGradient id="g"><stop stop-color="#1e5b58"/><stop offset="1" stop-color="#0d2030"/></radialGradient></defs>' +
    '<rect width="100%" height="100%" fill="#0d2030"/>' +
    '<ellipse cx="' + centerX + '" cy="' + Math.round(height * 0.40) + '" rx="' + Math.round(width * 0.72) + '" ry="' + Math.round(height * 0.32) + '" fill="url(#g)" opacity=".8"/>' +
    '<text x="50%" y="' + Math.round(height * 0.67) + '" text-anchor="middle" fill="#f3fff9" font-family="Arial,sans-serif" font-size="' + Math.round(width * 0.098) + '" font-weight="700" letter-spacing="7">KAGEL</text>' +
    '<text x="50%" y="' + Math.round(height * 0.71) + '" text-anchor="middle" fill="#a6c8c5" font-family="Arial,sans-serif" font-size="' + Math.round(width * 0.039) + '">Prenez un moment pour vous</text>' +
    '</svg>'
  );
  await sharp(background)
    .composite([{ input: icon, left: Math.round((width - iconSize) / 2), top: Math.round(height * 0.40 - iconSize / 2) }])
    .png()
    .toFile(join(splashDir, filename));
}

await Promise.all([
  renderSplash('iphone.png', 1170, 2532),
  renderSplash('iphone-pro.png', 1179, 2556),
  renderSplash('iphone-max.png', 1290, 2796),
  renderSplash('ipad.png', 1536, 2048),
]);
console.log('Generated install icons, splash screens and manifest for base path:', base || '/');
