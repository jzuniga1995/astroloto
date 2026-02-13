import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://lotohn.com',
  integrations: [tailwind()],
  trailingSlash: "never",
  build: {
    format: 'file'
  }
});

