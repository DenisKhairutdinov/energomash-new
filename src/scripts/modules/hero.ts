import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

/**
 * Hero: строки h1 выезжают из-под маски, описание и кнопки поднимаются.
 * При прокрутке заголовок затухает; фото сохраняет масштаб и положение.
 */
export const initHero = (ready: Promise<void>): void => {
  const hero = document.querySelector<HTMLElement>('[data-hero]')

  if (!hero) {
    return
  }

  const hasIntro = document.documentElement.hasAttribute('data-intro-pending')

  gsap.registerPlugin(ScrollTrigger)

  const title = hero.querySelector<HTMLElement>('[data-hero-title]')
  const lines = gsap.utils.toArray<HTMLElement>('[data-hero-line]', hero)
  const sides = gsap.utils.toArray<HTMLElement>('[data-hero-side]', hero)
  // Стеклянные плашки анимируются сами, а не через общий контейнер: прозрачность контейнера делает его «корнем фона»,
  // и размытие у плашек внутри пропадает до конца анимации
  const panels = gsap.utils.toArray<HTMLElement>('.hero__bottom [data-hero-glass]', hero)
  const bottom = hero.querySelector<HTMLElement>('.hero__bottom')

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    const intro = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } })

    intro
      .fromTo(
        lines,
        { yPercent: 118, autoAlpha: 1 },
        { yPercent: 0, duration: 1.5, stagger: 0.14 },
        0.1,
      )
      .fromTo(
        sides,
        { y: 36, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.14 },
        0.8,
      )
      .fromTo(
        panels,
        { y: 36, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.12 },
        1.08,
      )

    // После интро текст hero появляется с небольшой паузой, когда чёрный экран уже почти растворился
    void ready.then(() => {
      intro.delay(hasIntro ? 0.45 : 0).play()
    })

    // Прокрутка: старт всегда с исходных значений. Сглаживает Lenis, поэтому scrub без задержки (двойное сглаживание
    // тянуло анимацию за прокруткой и держало кадры дольше). На слабых машинах привязка к прокрутке не создаётся
    const scrollTrigger = {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    }

    if (document.documentElement.dataset['perf'] === 'low') {
      return
    }

    gsap.fromTo(title, { opacity: 1 }, { opacity: 0.1, ease: 'none', scrollTrigger })
    // Сдвиг на контейнере (transform размытию не мешает), затухание на самих плашках
    gsap.fromTo(bottom ?? [], { yPercent: 0 }, { yPercent: 18, ease: 'none', scrollTrigger })
    gsap.fromTo(panels, { opacity: 1 }, { opacity: 0.15, ease: 'none', scrollTrigger })
  })
}
