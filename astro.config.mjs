import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: cloudflare({
    imageService: 'passthrough',
    prerenderEnvironment: 'node'
  }),
  vite: {
    plugins: [tailwindcss()]
  }
});