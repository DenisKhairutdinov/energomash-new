import { defineConfig } from 'vite'
import vituum from 'vituum'
import nunjucks from '@vituum/vite-plugin-nunjucks'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'
import { nbspPlugin } from './vite-plugins/nbsp'

const targets = browserslistToTargets(browserslist())

export default defineConfig({
  plugins: [
    vituum({
      formats: ['njk'],
      // Точки входа заданы явно, чтобы части стилей и модули не собирались отдельными файлами
      input: ['./src/styles/main.scss', './src/scripts/main.ts'],
      // Плагин imports по умолчанию создаёт файлы `+.js` и `+.css` с импортами всей папки; нам они не нужны
      imports: { paths: [] },
    }),
    nunjucks({
      root: './src/templates',
      data: ['src/data/**/*.json'],
      options: {
        trimBlocks: true,
        lstripBlocks: true,
      },
    }),
    nbspPlugin(),
  ],
  css: {
    transformer: 'lightningcss',
    lightningcss: { targets },
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
