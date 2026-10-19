import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { initBlog } from './blog'
import { initCatalog } from './catalog'
import { initCinema } from './cinema'
import { initContactsMap } from './contacts-map'
import { initGeography } from './geography'
import { initGridOverlay } from './grid-overlay'
import { initHeader } from './header'
import { initHero } from './hero'
import { initLeasing } from './leasing'
import { initModal } from './modal'
import { initPicker } from './picker'
import { initJump } from './jump'
import { initProduct } from './product'
import { initPurposes, initTiles } from './purposes'
import { initRequestTone } from './request-tone'
import { initReveal } from './reveal'
import { initSearch } from './search'
import { initSlider } from './slider'
import { initSmoothScroll } from './smooth'
import { initText } from './text'
import { initVariants } from './variants'
import { initTheme } from './theme'
import { initWow } from './wow'
import { initWaterRipples } from './water-ripples'

/** Общий запуск всех модулей страницы. */
export const startApp = (): void => {
  initSmoothScroll()
  initGridOverlay()
  initHeader()
  initTheme()
  initModal()
  initPicker()
  initCatalog()
  initBlog()
  void initProduct()
  initSearch()
  initSlider()
  initLeasing()
  initGeography()
  initWaterRipples()
  initPurposes()

  const blog = document.querySelector<HTMLElement>('.blog')

  if (blog) {
    // Фото карточек блога следует за курсором, как в «Каталоге по назначению»
    initTiles(blog)
  }

  // То же у карточек статей на внутренних страницах (список блога, «Читайте также»)
  for (const root of document.querySelectorAll<HTMLElement>('.bl, .ap__related')) {
    initTiles(root)
  }

  initJump()
  initRequestTone()
  initContactsMap()
  initVariants()
  initText()
  initReveal()
  initWow()

  initHero(Promise.resolve())
  initCinema()

  // Фото меняют высоту секций после загрузки: пересчитываем позиции триггеров
  window.addEventListener('load', () => {
    ScrollTrigger.refresh()
  })
}
