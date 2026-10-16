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

interface AppOptions {
  /** Горизонтальная «киноплёнка» отгрузок с пином (вариант B) */
  cinema: boolean
}

/** Общий запуск всех модулей страницы; варианты A и B отличаются только стилями и настройками. */
export const startApp = ({ cinema }: AppOptions): void => {
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

  if (cinema) {
    initCinema()
  }

  // Фото меняют высоту секций после загрузки: пересчитываем позиции триггеров
  window.addEventListener('load', () => {
    ScrollTrigger.refresh()
  })
}
