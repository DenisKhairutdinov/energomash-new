import { defineConfig } from 'vite'
import vituum from 'vituum'
import nunjucks from '@vituum/vite-plugin-nunjucks'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'

const targets = browserslistToTargets(browserslist())

export default defineConfig({
  plugins: [
    vituum({
      formats: ['njk'],
    }),
    nunjucks({
      root: './src/templates',
      data: ['src/data/**/*.json'],
      options: {
        trimBlocks: true,
        lstripBlocks: true,
      },
    }),
  ],
  css: {
    transformer: 'lightningcss',
    lightningcss: { targets },
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
    },
  },
  build: {
    cssMinify: 'lightningcss',
    target: 'baseline-widely-available',
    sourcemap: true,
  },
  server: {
    open: true,
  },
})
