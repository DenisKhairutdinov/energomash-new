import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

// Одно семейство движений на всю главную: фото открываются мягкой шторкой снизу вверх, текстовые плитки по очереди
// поднимаются и проявляются; кривая и длительность общие (power3.out, около секунды), каждый блок один раз.
const BLOCKS = [
  '.footer__col',
  '.catalog__head-side',
  '.process__item',
  '.docs__item',
  '.faq__item',
  '.service',
  '.request__panel',
  '.leasing__fields > *',
  '.leasing__result',
  // Внутренние страницы: плитки, цифры, строки списков, выноски, плашки в шапке и в призыве, фильтр и карточки блога
  '.ip__head-in',
  '.ip__cta-in',
  '.ip__tile',
  '.ip__fact',
  '.ip__num',
  '.mf__step',
  '.mf__shot',
  '.ip__dl > div',
  '.ip .callout',
  '.ip .prose > *',
  '.ip__photo',
  '.bl__filter',
  '.bl__card',
].join(', ')
// Заранее скрываются только блоки страницы: меню шапки работает по-старому
const HIDDEN_WIPE = '.geography__svg, .purposes__photo, .news__photo'

// Вызывает действие для блоков, которые вошли в окно (каждый один раз, пачкой в порядке появления). Наблюдение идёт за
// родителем блока: у закрытого шторкой блока (clip-path) наблюдатель видит нулевую площадь и не срабатывает. Блоки, оставшиеся
// выше окна (страница открыта посреди прокрутки), показываются сразу без движения
const revealOnView = (
  selector: string,
  action: (batch: HTMLElement[]) => void,
  show: (batch: HTMLElement[]) => void,
): (() => void) => {
  const owners = new Map<Element, HTMLElement[]>()

  const observer = new IntersectionObserver(
    (entries) => {
      const batch: HTMLElement[] = []
      const passed: HTMLElement[] = []

      for (const entry of entries) {
        const items = owners.get(entry.target) ?? []

        if (entry.isIntersecting) {
          batch.push(...items)
        } else if (entry.boundingClientRect.bottom <= 0) {
          passed.push(...items)
        } else {
          continue
        }

        observer.unobserve(entry.target)
      }

      if (passed.length > 0) {
        show(passed)
      }

      if (batch.length > 0) {
        action(batch)
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  )

  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    const owner = element.parentElement ?? element

    owners.set(owner, [...(owners.get(owner) ?? []), element])
  }

  for (const owner of owners.keys()) {
    observer.observe(owner)
  }

  return () => {
    observer.disconnect()
  }
}

/**
 * Появление, параллакс фонов и счётчики. Движение сдержанное: короткие сдвиги и проявление.
 * Всё внутри prefers-reduced-motion: no-preference: при «уменьшить движение» страница статична.
 */
export const initReveal = (): void => {
  gsap.registerPlugin(ScrollTrigger)

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    // Начальное состояние выставляется сразу, чтобы блок не мигал перед появлением; при «уменьшить движение» этот код не запускается
    gsap.set(HIDDEN_WIPE, { clipPath: 'inset(100% 0% 0% 0%)' })
    gsap.set(BLOCKS, { y: 28, autoAlpha: 0 })

    // Меню шапки открывается по-старому (триггер ScrollTrigger)
    ScrollTrigger.batch('.menu__feature', {
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

    // Блоки страницы появляются по фактическому появлению в окне (IntersectionObserver), а не по рассчитанным позициям:
    // ниже закреплённой ленты «Недавно отгружено» позиции ScrollTrigger сдвигаются на длину ленты, и блоки открывались бы
    // раньше времени. Блоки, вошедшие вместе, идут по очереди (stagger)
    const stop = [
      revealOnView(
        HIDDEN_WIPE,
        (batch) => {
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
        (batch) => {
          gsap.set(batch, { clearProps: 'clipPath' })
        },
      ),
      revealOnView(
        BLOCKS,
        (batch) => {
          gsap.fromTo(
            batch,
            { y: 28, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.9,
              stagger: Math.min(0.07, 0.7 / batch.length),
              ease: 'power3.out',
              clearProps: 'transform',
            },
          )
        },
        (batch) => {
          gsap.set(batch, { clearProps: 'transform,opacity,visibility' })
        },
      ),
    ]

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

    return () => {
      for (const disconnect of stop) {
        disconnect()
      }
    }
  })
}
