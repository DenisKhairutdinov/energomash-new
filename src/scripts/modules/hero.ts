import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

/**
 * Hero. Вход: фото «отъезжает» (слой .hero__zoom), строки h1 выезжают из-под маски, блоки поднимаются.
 * При прокрутке (слой .hero__media): кадр плавно приближается, строки заголовка расходятся в стороны.
 * Слои разные, поэтому вход и прокрутка не конфликтуют, а на нулевой позиции кадр всегда в исходном масштабе.
 */
export const initHero = (ready: Promise<void>): void => {
  const hero = document.querySelector<HTMLElement>('[data-hero]')

  if (!hero) {
    return
  }

  gsap.registerPlugin(ScrollTrigger)

  const media = hero.querySelector<HTMLElement>('[data-hero-media]')
  const zoom = hero.querySelector<HTMLElement>('[data-hero-zoom]')
  const title = hero.querySelector<HTMLElement>('[data-hero-title]')
  const lines = gsap.utils.toArray<HTMLElement>('[data-hero-line]', hero)
  const sides = gsap.utils.toArray<HTMLElement>('[data-hero-side]', hero)
  const bottom = hero.querySelector<HTMLElement>('.hero__bottom')

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    const intro = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } })

    intro
      .fromTo(zoom, { scale: 1.2 }, { scale: 1, duration: 2.6, ease: 'power3.out' }, 0)
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

    void ready.then(() => {
      intro.play()
    })

    // Прокрутка: старт всегда с исходных значений, сглаживание scrub убирает рывки
    const scrollTrigger = {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 1.2,
    }

    gsap.fromTo(
      media,
      { scale: 1, yPercent: 0 },
      { scale: 1.22, yPercent: 6, ease: 'none', scrollTrigger },
    )
    gsap.fromTo(lines[0] ?? [], { xPercent: 0 }, { xPercent: -12, ease: 'none', scrollTrigger })
    gsap.fromTo(lines[2] ?? [], { xPercent: 0 }, { xPercent: 12, ease: 'none', scrollTrigger })
    gsap.fromTo(title, { opacity: 1 }, { opacity: 0.1, ease: 'none', scrollTrigger })
    gsap.fromTo(
      bottom ?? [],
      { yPercent: 0, opacity: 1 },
      { yPercent: 18, opacity: 0.15, ease: 'none', scrollTrigger },
    )
  })
}
