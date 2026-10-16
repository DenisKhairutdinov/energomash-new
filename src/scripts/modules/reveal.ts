import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

// Фото открываются мягкой шторкой снизу вверх
const WIPE = '.shipments__frame, .menu__feature, .geography__svg'
// Блоки появляются по очереди: небольшой сдвиг вверх и проявление
const BLOCKS =
  '.facts__item, .process__item, .docs__intro, .docs__item, .service, .faq__item, .news, .leasing__form, .leasing__result, .request__form, .geography__total, .footer__col'

/**
 * Появление, параллакс фонов и счётчики. Движение сдержанное: короткие сдвиги и проявление.
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
            duration: 1,
            stagger: 0.1,
            ease: 'power3.out',
            clearProps: 'clipPath',
          },
        )
      },
    })

    ScrollTrigger.batch(BLOCKS, {
      start: 'top 94%',
      once: true,
      onEnter: (batch) => {
        gsap.fromTo(
          batch,
          { y: 28, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            stagger: 0.07,
            ease: 'power3.out',
            clearProps: 'transform',
          },
        )
      },
    })

    // Параллакс фонов: слой движется чуть медленнее страницы
    for (const element of gsap.utils.toArray<HTMLElement>('[data-parallax]')) {
      const amount = Number(element.dataset['parallax'] ?? 0.05)

      gsap.fromTo(
        element,
        { yPercent: -amount * 100 },
        {
          yPercent: amount * 100,
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

    // Подвал: огромное слово мягко поднимается, пока подвал входит в экран
    const word = document.querySelector<HTMLElement>('[data-footer-word]')

    if (word) {
      gsap.fromTo(
        word,
        { yPercent: 25 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: word, start: 'top 105%', end: 'top 60%', scrub: 1 },
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
            duration: 1.8,
            ease: 'power3.out',
            onUpdate: () => {
              element.textContent = Math.round(state.value).toLocaleString('ru-RU')
            },
          })
        },
      })
    }
  })
}
