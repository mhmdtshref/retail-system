import { injectManifest } from 'workbox-build';
import { resolve } from 'node:path';
import { build as esbuild } from 'esbuild';
import { rmSync } from 'node:fs';

async function build() {
  const swEntry = resolve(process.cwd(), 'src/lib/sw/sw-src.ts');
  const tmpBundle = resolve(process.cwd(), '.next', 'sw-bundle.js');
  const swDest = resolve(process.cwd(), 'public/sw.js');
  const globDirectory = resolve(process.cwd(), '.next');

  // 1) Bundle the service worker to a single classic script (no bare imports)
  await esbuild({
    entryPoints: [swEntry],
    bundle: true,
    outfile: tmpBundle,
    format: 'iife',
    platform: 'browser',
    sourcemap: false,
    minify: true,
    target: ['es2020'],
    legalComments: 'none',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
  });

  // 2) Inject the Next.js build manifest entries
  const { count, size, warnings } = await injectManifest({
    swSrc: tmpBundle,
    swDest,
    globDirectory,
    globPatterns: [
      '**/*.{js,css,html,ico,png,svg,woff2}',
    ],
    additionalManifestEntries: [
      { url: '/offline.html', revision: '1' },
      { url: '/manifest.webmanifest', revision: '1' },
      { url: '/favicon.ico', revision: '1' },
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

  // 3) Cleanup temporary bundle
  try { rmSync(tmpBundle, { force: true }); } catch {}
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

