import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

// Фото открываются шторкой снизу вверх
const WIPE = '.news__frame, .shipments__frame, .menu__feature, .geography__svg'
// Стеклянные карточки въезжают с наклоном и масштабом, по очереди
const GLASS =
  '.facts__item, .process__item, .docs__intro, .docs__item, .service, .faq__item, .news--row, .news--lead .news__caption, .purposes__panel, .leasing__form, .leasing__result, .request__form, .geography__total, .footer__col'

/**
 * Появление, параллакс, рамки фона и счётчики.
 * Всё внутри prefers-reduced-motion: no-preference: при «уменьшить движение» страница статична.
 */
export const initReveal = (): void => {
  gsap.registerPlugin(ScrollTrigger)

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    ScrollTrigger.batch(WIPE, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => {
        gsap.fromTo(
          batch,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.3,
            stagger: 0.14,
            ease: 'power3.inOut',
            clearProps: 'clipPath',
          },
        )
      },
    })

    ScrollTrigger.batch(GLASS, {
      start: 'top 94%',
      once: true,
      onEnter: (batch) => {
        gsap.fromTo(
          batch,
          { y: 90, scale: 0.94, rotationX: -14, transformPerspective: 900, autoAlpha: 0 },
          {
            y: 0,
            scale: 1,
            rotationX: 0,
            autoAlpha: 1,
            duration: 1.4,
            stagger: 0.12,
            ease: 'power4.out',
            clearProps: 'transform',
          },
        )
      },
    })

    // Глубина: стеклянные карточки движутся с разной скоростью относительно страницы
    for (const element of gsap.utils.toArray<HTMLElement>('[data-depth]')) {
      const depth = Number(element.dataset['depth'] ?? 0)

      gsap.fromTo(
        element,
        { yPercent: depth },
        {
          yPercent: -depth,
          ease: 'none',
          scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: 1 },
        },
      )
    }

    // Рамка фона раскрывается по мере прокрутки: из окна на весь кадр
    for (const frame of gsap.utils.toArray<HTMLElement>('[data-frame]')) {
      gsap.fromTo(
        frame,
        { clipPath: 'inset(12% 7% 12% 7%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top 95%', end: 'top 20%', scrub: 1 },
        },
      )
    }

    // Параллакс фонов: слой движется медленнее страницы
    for (const element of gsap.utils.toArray<HTMLElement>('[data-parallax]')) {
      const amount = Number(element.dataset['parallax'] ?? 0.08)

      gsap.fromTo(
        element,
        { yPercent: -amount * 100, scale: 1.08 },
        {
          yPercent: amount * 100,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: element.parentElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        },
      )
    }

    // Фото в рамках слегка «плывёт» при прокрутке
    for (const image of gsap.utils.toArray<HTMLElement>('[data-parallax-img]')) {
      gsap.fromTo(
        image,
        { scale: 1.2, yPercent: -7 },
        {
          scale: 1.2,
          yPercent: 7,
          ease: 'none',
          scrollTrigger: { trigger: image, start: 'top bottom', end: 'bottom top', scrub: 1 },
        },
      )
    }

    // Числа считаются, когда блок входит в экран
    for (const element of gsap.utils.toArray<HTMLElement>('[data-count]')) {
      const target = Number(element.dataset['count'] ?? 0)
      const state = { value: 0 }

      element.textContent = '0'

      ScrollTrigger.create({
        trigger: element,
        start: 'top 92%',
        once: true,
        onEnter: () => {
          gsap.to(state, {
            value: target,
            duration: 2.4,
            ease: 'power3.out',
            onUpdate: () => {
              element.textContent = Math.round(state.value).toLocaleString('ru-RU')
            },
          })
        },
      })
    }

    // Подвал: огромное слово поднимается, пока подвал входит в экран
    const word = document.querySelector<HTMLElement>('[data-footer-word]')

    if (word) {
      gsap.fromTo(
        word,
        { yPercent: 40 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: word, start: 'top 105%', end: 'top 55%', scrub: 1 },
        },
      )
    }
  })
}
