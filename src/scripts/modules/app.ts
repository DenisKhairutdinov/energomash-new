import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { initCinema } from './cinema'
import { initGeography } from './geography'
import { initHeader } from './header'
import { initHero } from './hero'
import { initLeasing } from './leasing'
import { initLoader } from './loader'
import { initModal } from './modal'
import { initPicker } from './picker'
import { initPurposes } from './purposes'
import { initReveal } from './reveal'
import { initSlider } from './slider'
import { initSmoothScroll } from './smooth'
import { initText } from './text'
import { initWow } from './wow'
import { initWaterRipples } from './water-ripples'

/** Общий запуск всех модулей страницы. */
export const startApp = (): void => {
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
  initWow()

  const ready = initLoader()

  initHero(ready)
  initCinema()

  // Фото меняют высоту секций после загрузки: пересчитываем позиции триггеров
  window.addEventListener('load', () => {
    ScrollTrigger.refresh()
  })
}
