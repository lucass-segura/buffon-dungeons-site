import { defineConfig } from 'astro/config';

// Hosted on GitHub Pages as a project site: https://lucass-segura.github.io/buffon-dungeons-site/
export default defineConfig({
  site: 'https://lucass-segura.github.io',
  base: '/buffon-dungeons-site',
  output: 'static',
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
});
