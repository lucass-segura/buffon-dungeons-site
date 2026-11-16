import { defineConfig } from 'astro/config';

// Hosted on Vercel: https://buffon-dungeons.vercel.app
export default defineConfig({
  site: 'https://buffon-dungeons.vercel.app',
  output: 'static',
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
});
