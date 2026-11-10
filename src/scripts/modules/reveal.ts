import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

// Короткий подъём и мягкое проявление один раз; заголовки отдельно открываются построчно в text.ts.
const BLOCKS = [
  '.page--home .category-tiles__lead',
  '.page--home .blog__lead',
  '.page--home .blog .news',
  '.page--home .stock__lead',
  '.page--home .stock__viewport',
  '.page--home .photobank__lead',
  '.page--home .photobank__stage',
  '.page--home .geography__info',
  '.page--home .geography__total',
  '.page--home .request__contact',
  '.footer__col',
  '.catalog__head-side',
  '.process__item',
  '.docs__item',
  '.faq__item',
  '.service',
  '.request__panel',
  '.leasing__fields > *',
  '.leasing__result',
  '.category-tiles__card',
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

// Карточки наблюдаем по отдельности, чтобы длинная сетка не раскрывалась целиком при появлении первого ряда.
// Только для clip-path наблюдаем родителя: у закрытого шторкой блока нулевая площадь пересечения.
// Блоки выше окна (восстановление прокрутки, переход по якорю) показываем сразу без движения.
const revealOnView = (
  context: gsap.Context,
  selector: string,
  action: (batch: HTMLElement[]) => void,
  show: (batch: HTMLElement[]) => void,
  observeParent = false,
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
        context.add(() => {
          show(passed)
        })
      }

      if (batch.length > 0) {
        // Анимации из асинхронного observer тоже откатываются при смене reduced-motion.
        context.add(() => {
          action(batch)
        })
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  )

  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    const owner = observeParent ? (element.parentElement ?? element) : element

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

  gsap.matchMedia().add(NO_PREFERENCE, (context) => {
    // Начальное состояние выставляется сразу, чтобы блок не мигал перед появлением; при «уменьшить движение» этот код не запускается
    // Только для блоков, которые есть на странице: на внутренних страницах GSAP иначе пишет в консоль «target not found»
    if (document.querySelector(HIDDEN_WIPE)) {
      gsap.set(HIDDEN_WIPE, { clipPath: 'inset(100% 0% 0% 0%)' })
    }

    if (document.querySelector(BLOCKS)) {
      gsap.set(BLOCKS, { y: 20, autoAlpha: 0 })
    }

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
        context,
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
        true,
      ),
      revealOnView(
        context,
        BLOCKS,
        (batch) => {
          gsap.fromTo(
            batch,
            { y: 20, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.8,
              stagger: Math.min(0.065, 0.24 / Math.max(1, batch.length - 1)),
              ease: 'power3.out',
              clearProps: 'transform,opacity,visibility',
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
            scrub: true,
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
