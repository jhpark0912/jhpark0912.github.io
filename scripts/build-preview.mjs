/**
 * Packs `dist/` into one self-contained HTML file for a shareable preview.
 *
 * The preview host serves each page from its own origin behind a strict CSP,
 * so nothing may be fetched from another host: the stylesheet and the bundle
 * are inlined and every image becomes a data URI. Google Fonts is the single
 * exception the CSP allows, so Cormorant survives; Pretendard is served from
 * jsDelivr and falls back to the system Korean face here — the real deploy on
 * GitHub Pages loads it normally.
 *
 * Usage: npm run build && node scripts/build-preview.mjs [outFile]
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const outFile = process.argv[2] ?? resolve(root, 'preview.html')

const assets = await readdir(resolve(dist, 'assets'))
const cssName = assets.find((name) => name.endsWith('.css'))
const jsName = assets.find((name) => name.startsWith('index-') && name.endsWith('.js'))
if (!cssName || !jsName) throw new Error('build output not found — run `npm run build` first')

const css = await readFile(resolve(dist, 'assets', cssName), 'utf8')
let js = await readFile(resolve(dist, 'assets', jsName), 'utf8')

// Swap every /images/*.svg reference in the bundle for an inline data URI.
const imageDir = resolve(dist, 'images')
for (const file of await readdir(imageDir)) {
  const encoded = (await readFile(resolve(imageDir, file))).toString('base64')
  js = js.replaceAll(`/images/${file}`, `data:image/svg+xml;base64,${encoded}`)
}

const html = `<title>재현 ♥ 현정 청첩장</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&display=swap"
/>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`

await writeFile(outFile, html)
console.log(`preview written to ${outFile} (${(html.length / 1024).toFixed(0)} KB)`)
