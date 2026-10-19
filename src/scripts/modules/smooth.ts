import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

let lenis: Lenis | undefined

export const getLenis = (): Lenis | undefined => lenis

/** Плавный скролл Lenis, связанный с тиком GSAP и ScrollTrigger. При «уменьшить движение» остаётся обычная прокрутка. */
export const initSmoothScroll = (): void => {
  // На слабых машинах (data-perf="low", см. perf.ts) оставляем нативную прокрутку
  if (
    matchMedia(REDUCED_MOTION_QUERY).matches ||
    document.documentElement.dataset['perf'] === 'low'
  ) {
    return
  }

  const instance = new Lenis({ lerp: 0.085, smoothWheel: true })

  lenis = instance

  if (import.meta.env.DEV) {
    // Для проверки в браузере: window.lenis.scrollTo(y, { immediate: true })
    Reflect.set(window, 'lenis', instance)
  }

  instance.on('scroll', () => {
    ScrollTrigger.update()
  })

  gsap.ticker.add((time) => {
    instance.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  // Якорные ссылки прокручиваются плавно, с запасом под шапку
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]')
    const hash = link?.getAttribute('href')

    if (!hash || hash === '#') {
      return
    }

    const target = document.querySelector<HTMLElement>(hash)

    if (target) {
      event.preventDefault()
      instance.scrollTo(target, { offset: -64, duration: 1.4 })
    }
  })
}
