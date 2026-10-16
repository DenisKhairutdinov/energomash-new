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
      // Точки входа заданы явно, чтобы части стилей и модули не собирались отдельными файлами
      input: [
        './src/styles/a.scss',
        './src/styles/b.scss',
        './src/scripts/a.ts',
        './src/scripts/b.ts',
      ],
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
