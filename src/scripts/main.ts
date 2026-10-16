import '@fontsource-variable/oswald/wght.css'
import '@fontsource-variable/golos-text/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import 'lenis/dist/lenis.css'

import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { initCinema } from './modules/cinema'
import { initGeography } from './modules/geography'
import { initHeader } from './modules/header'
import { initHero } from './modules/hero'
import { initLeasing } from './modules/leasing'
import { initLoader } from './modules/loader'
import { initModal } from './modules/modal'
import { initPicker } from './modules/picker'
import { initPurposes } from './modules/purposes'
import { initReveal } from './modules/reveal'
import { initSlider } from './modules/slider'
import { initSmoothScroll } from './modules/smooth'
import { initText } from './modules/text'
import { initWaterRipples } from './modules/water-ripples'

initSmoothScroll()
initHeader()
initModal()
initPicker()
initSlider()
initLeasing()
initGeography()
initWaterRipples()
initPurposes()
initText()
initReveal()

const ready = initLoader()

initHero(ready)

initCinema()

// Фото меняют высоту секций после загрузки: пересчитываем позиции триггеров
window.addEventListener('load', () => {
  ScrollTrigger.refresh()
})
