import { injectManifest } from 'workbox-build';
import { resolve } from 'node:path';

async function build() {
  const swSrc = resolve(process.cwd(), 'src/lib/sw/sw-src.ts');
  const swDest = resolve(process.cwd(), 'public/sw.js');
  const globDirectory = resolve(process.cwd(), '.next');

  const { count, size, warnings } = await injectManifest({
    swSrc,
    swDest,
    globDirectory,
    globPatterns: [
      '**/*.{js,css,html,ico,png,svg,woff2}',
    ],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    modifyURLPrefix: {
      // Next outputs assets under /_next
      '': '/_next/',
    },
  });
  if (warnings.length) {
    for (const w of warnings) console.warn(w);
  }
  console.log(`SW precache: ${count} files, ${(size / 1024).toFixed(1)} KiB`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

