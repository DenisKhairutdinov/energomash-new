import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { initBlog } from './blog'
import { initCatalog } from './catalog'
import { initNewCatalog, initNewProduct } from './catalog-new'
import { initCinema } from './cinema'
import { initContactsMap } from './contacts-map'
import { initGeography } from './geography'
import { initGridOverlay } from './grid-overlay'
import { initHeader } from './header'
import { initHero } from './hero'
import { initIntro } from './intro'
import { initLeasing } from './leasing'
import { initModal } from './modal'
import { initPerformance } from './perf'
import { preloadDuringIntro } from './preload'
import { initPicker } from './picker'
import { initJump } from './jump'
import { initProduct } from './product'
import { initRequestTone } from './request-tone'
import { initReveal } from './reveal'
import { initSearch } from './search'
import { initSlider } from './slider'
import { initSmoothScroll } from './smooth'
import { initText } from './text'
import { initVariants } from './variants'
import { initTheme } from './theme'
import { initWow } from './wow'

/** Общий запуск всех модулей страницы. Возвращает промис, который разрешается, когда интро открыло страницу (без интро сразу). */
export const startApp = (): Promise<void> => {
  initPerformance()
  initSmoothScroll()
  initGridOverlay()
  initHeader()
  initTheme()
  initModal()
  initPicker()
  initCatalog()
  initNewCatalog()
  initNewProduct()
  initBlog()
  void initProduct()
  initSearch()
  initSlider()
  initLeasing()
  initGeography()

  initJump()
  initRequestTone()
  initContactsMap()
  initVariants()
  initText()
  initReveal()
  initWow()

  const introDone = initIntro()

  initHero(introDone)
  initCinema()
  // Пока играет интро, сайт догружается
  preloadDuringIntro()

  // Фото меняют высоту секций после загрузки: пересчитываем позиции триггеров
  window.addEventListener('load', () => {
    ScrollTrigger.refresh()
  })

  return introDone
}
