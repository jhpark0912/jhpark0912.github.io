/**
 * Generates the placeholder artwork committed under public/images.
 *
 * These stand in for the real wedding photos so the layout, the carousel and
 * the lightbox can be reviewed before any photography exists. Replace the files
 * (keeping the names, or updating src/data/wedding.ts) and delete this script.
 *
 * Usage: node scripts/make-placeholders.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/images')

/** Lemon-led pairs, each drifting a little further toward the sky accent. */
const palettes = [
  ['#FDF8E2', '#F4E498', '#E3EEF6'],
  ['#FFFDF3', '#F9F0C2', '#C7E3F6'],
  ['#FDF8E2', '#ECD469', '#E3F1FB'],
  ['#FFFDF3', '#F4E498', '#9BCDED'],
  ['#FDF8E2', '#F9F0C2', '#6FB4E2'],
  ['#FFFDF3', '#ECD469', '#C7E3F6'],
  ['#FDF8E2', '#F4E498', '#E3EEF6'],
]

function placeholder({ width, height, label, palette }) {
  const [base, warm, cool] = palette
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stop-color="${base}"/>
      <stop offset="55%" stop-color="${warm}"/>
      <stop offset="100%" stop-color="${cool}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.34" r="0.62">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>

  <circle cx="${width * 0.5}" cy="${height * 0.38}" r="${width * 0.21}" fill="#FFFFFF" opacity="0.45"/>
  <circle cx="${width * 0.5}" cy="${height * 0.38}" r="${width * 0.21}" fill="none" stroke="#B99C26" stroke-opacity="0.5" stroke-width="2"/>

  <path d="M${width * 0.2} ${height * 0.74} Q${width * 0.5} ${height * 0.62} ${width * 0.8} ${height * 0.74}"
        fill="none" stroke="#276694" stroke-opacity="0.35" stroke-width="2"/>

  <text x="50%" y="${height * 0.39}" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif" font-style="italic"
        font-size="${Math.round(width * 0.075)}" fill="#8D761B">${label}</text>

  <text x="50%" y="${height * 0.83}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" letter-spacing="${Math.round(width * 0.012)}"
        font-size="${Math.round(width * 0.032)}" fill="#6F6A5B" opacity="0.85">PLACEHOLDER</text>
</svg>
`
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#ECD469"/>
  <path d="M32 46s-14-8.6-14-18a8 8 0 0 1 14-5.2A8 8 0 0 1 46 28c0 9.4-14 18-14 18Z" fill="#FFFDF3"/>
</svg>
`

await mkdir(outputDir, { recursive: true })

await writeFile(
  resolve(outputDir, 'cover.svg'),
  placeholder({ width: 1000, height: 1500, label: 'Cover', palette: palettes[0] }),
)

for (let index = 1; index <= 6; index += 1) {
  await writeFile(
    resolve(outputDir, `gallery-0${index}.svg`),
    placeholder({ width: 1000, height: 1250, label: `Photo ${index}`, palette: palettes[index] }),
  )
}

await writeFile(resolve(outputDir, '../favicon.svg'), favicon)

console.log(`placeholders written to ${outputDir}`)
