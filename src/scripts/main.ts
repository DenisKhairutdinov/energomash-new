// Два шрифта на весь сайт: Oswald (заголовки) и Manrope (текст и данные)
import '@fontsource-variable/oswald/wght.css'
import '@fontsource-variable/manrope/wght.css'
import 'lenis/dist/lenis.css'

import { startApp } from './modules/app'
import { initAssistant, warmAssistant } from './modules/assistant'
import { initBlogVideo } from './modules/blog-video'
import { introFinished } from './modules/intro'
import { initPhotobank, warmPhotobank } from './modules/photobank'
import { runWhenIdle } from './modules/preload'

// Пока играет интро, файлы тяжёлых блоков (3D-помощник, фотобанк) качаются в простое браузера.
// Сами блоки запускаются, когда интро полностью закончилось (чёрный экран убран) и браузер свободен:
// так их работа не попадает на растворение интро (иначе в конце оно «дёргается»). Без интро это происходит сразу.
void startApp()

warmAssistant()
warmPhotobank()

void introFinished.then(() => {
  initBlogVideo()
  runWhenIdle(() => {
    initAssistant()
    initPhotobank()
  })
})
