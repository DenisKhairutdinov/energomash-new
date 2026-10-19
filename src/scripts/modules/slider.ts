import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getLenis } from './smooth'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DESKTOP_QUERY = '(min-width: 900px) and (prefers-reduced-motion: no-preference)'
// Примагничивание (доли высоты экрана) и пауза после остановки прокрутки
const SNAP_IN = 0.6
const SNAP_OUT = 0.4
const SETTLE_MS = 260
const SNAP_SECONDS = 1.1
// Залипание: пауза между колёсиками, после которой серия считается новой; окно «вслед за вводом пользователя»;
// расстояние, на которое нужно отъехать от секции, чтобы она снова могла залипнуть; запас, добавляемый к первому колёсику новой серии
const GESTURE_GAP_MS = 220
const INPUT_WINDOW_MS = 700
const REARM_DISTANCE = 60
const RELEASE_GAIN = 1
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])
const ACTIVE = 'is-active'
const PLAYING = 'is-playing'
const FADE_MS = 950

/**
 * Логика секции на весь экран. Пока на экране больше половины секции, шапка скрыта (`is-away`, шапка тут не появляется).
 * На широких экранах секция «залипает»: когда прокрутка колёсиком доходит до положения «секция ровно от верха до низа экрана»,
 * страница останавливается там и гасит инерцию; дальше она отпускает только после новой серии прокрутки колеса
 * (пауза между колёсиками больше GESTURE_GAP_MS, затем новое движение) или нажатия клавиши прокрутки.
 * Если прокрутка просто остановилась рядом, секция плавно доезжает до границы в сторону движения.
 */
const initSticky = (root: HTMLElement): void => {
  const header = document.querySelector<HTMLElement>('[data-header]')

  new IntersectionObserver(
    ([entry]) => {
      header?.classList.toggle('is-away', (entry?.intersectionRatio ?? 0) >= 0.5)
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  ).observe(root)

  gsap.registerPlugin(ScrollTrigger)

  gsap.matchMedia().add(DESKTOP_QUERY, () => {
    const lenis = getLenis()

    if (!lenis) {
      return undefined
    }

    let top = root.getBoundingClientRect().top + window.scrollY
    let lastScroll = lenis.scroll
    let lastInput = 0
    let lastWheel = 0
    let direction = 1
    let held = false
    let armed = true
    let idle: number | undefined

    const measure = (): void => {
      top = root.getBoundingClientRect().top + window.scrollY
    }

    const hold = (): void => {
      held = true
      lenis.scrollTo(top, { immediate: true, force: true })
      lenis.stop()
    }

    // Новая серия: Lenis снова слушает колесо, первому движению серии добавляем его величину, чтобы отклик не терялся
    const release = (delta: number): void => {
      held = false
      armed = false
      lenis.start()

      if (delta !== 0) {
        lenis.scrollTo(top + delta * RELEASE_GAIN, { duration: 0.4 })
      }
    }

    const onWheel = (event: WheelEvent): void => {
      const now = performance.now()
      const gap = now - lastWheel

      lastWheel = now
      lastInput = now

      if (held && gap > GESTURE_GAP_MS) {
        release(event.deltaY)
      }
    }

    const onKey = (event: KeyboardEvent): void => {
      if (!NAV_KEYS.has(event.key)) {
        return
      }

      lastInput = performance.now()

      if (held) {
        release(
          event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'Home' ? -120 : 120,
        )
      }
    }

    const goTo = (y: number): void => {
      lenis.scrollTo(y, { duration: SNAP_SECONDS, easing: (x) => 1 - (1 - x) ** 3 })
    }

    // Мягкое примагничивание: только когда прокрутка остановилась и только в сторону движения (пользователя не тянет назад)
    const settle = (): void => {
      if (held) {
        return
      }

      const y = lenis.scroll
      const vh = window.innerHeight

      if (direction > 0 && y < top - 4 && top - y <= vh * SNAP_IN) {
        goTo(top)
      } else if (direction < 0 && y > top + 4 && y - top <= vh * SNAP_OUT) {
        goTo(top)
      }
    }

    const onScroll = (): void => {
      const scroll = lenis.scroll
      const previous = lastScroll

      lastScroll = scroll

      if (Math.abs(scroll - previous) > 0.5) {
        direction = scroll > previous ? 1 : -1
      }

      if (held) {
        if (Math.abs(scroll - top) > 1) {
          lenis.scrollTo(top, { immediate: true, force: true })
        }

        return
      }

      if (!armed) {
        if (Math.abs(scroll - top) > REARM_DISTANCE) {
          armed = true
        }

        return
      }

      // Секция достигнута (пересечена граница «ровно от верха до низа») вслед за колёсиком или клавишей: залипаем
      const crossed = (previous - top) * (scroll - top) <= 0 && previous !== scroll

      if (crossed && performance.now() - lastInput < INPUT_WINDOW_MS) {
        hold()

        return
      }

      window.clearTimeout(idle)
      idle = window.setTimeout(settle, SETTLE_MS)
    }

    const off = lenis.on('scroll', onScroll)

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', measure)
    ScrollTrigger.addEventListener('refresh', measure)

    if (import.meta.env.DEV) {
      // Для проверки в браузере: window.stockHold() возвращает состояние
      Reflect.set(window, 'stockHold', () => ({ held, armed, top }))
    }

    return () => {
      window.clearTimeout(idle)
      off()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', measure)
      ScrollTrigger.removeEventListener('refresh', measure)
      lenis.start()
    }
  })
}

/**
 * Витрина наличия: картотека моделей и стопка фото. Модель выбирается наведением мыши, фокусом или первым касанием
 * (стрелки вверх и вниз внутри списка); сама листается (data-autoplay секунд на модель), пауза при наведении на картотеку,
 * фокусе и скрытой вкладке. Новый кадр проявляется поверх прежнего.
 */
export const initSlider = (): void => {
  const root = document.querySelector<HTMLElement>('[data-showcase]')

  if (!root) {
    return
  }

  const items = [...root.querySelectorAll<HTMLElement>('[data-item]')]
  const heads = items.map((item) => item.querySelector<HTMLAnchorElement>('[data-head]'))
  const photos = [...root.querySelectorAll<HTMLElement>('[data-photo]')]
  const panel = root.querySelector<HTMLElement>('.stock__side')
  const seconds = Number(root.dataset['autoplay'] ?? 0)
  const canAutoplay = seconds > 0 && !matchMedia(REDUCED_MOTION_QUERY).matches && items.length > 1

  let index = 0
  let timer: number | undefined
  let isPaused = false
  let cleanup: number | undefined
  let layer = 1

  root.style.setProperty('--autoplay', `${String(seconds)}s`)

  const stop = (): void => {
    window.clearTimeout(timer)
    root.classList.remove(PLAYING)
  }

  const schedule = (): void => {
    stop()

    if (!canAutoplay || isPaused) {
      return
    }

    // Принудительный перерасчёт стилей, чтобы индикатор начался заново
    root.getBoundingClientRect()
    root.classList.add(PLAYING)
    timer = window.setTimeout(() => {
      show((index + 1) % items.length)
    }, seconds * 1000)
  }

  const show = (target: number): void => {
    const next = photos[target]

    if (target !== index && next) {
      // Новый кадр кладётся поверх всех и проявляется; прежние остаются видимыми под ним, пока он не проявился полностью
      layer += 1
      next.style.zIndex = String(layer)

      // Кадр, который ещё не успел скрыться (быстрый возврат), проявляется заново поверх остальных
      if (next.classList.contains(ACTIVE)) {
        next.classList.remove(ACTIVE)
        next.getBoundingClientRect()
      }

      next.classList.add(ACTIVE)
      window.clearTimeout(cleanup)
      cleanup = window.setTimeout(() => {
        for (const [position, photo] of photos.entries()) {
          if (position !== index) {
            photo.classList.remove(ACTIVE)
          }
        }
      }, FADE_MS)
    }

    index = target

    for (const [position, item] of items.entries()) {
      const isCurrent = position === index

      item.classList.toggle(ACTIVE, isCurrent)
      if (isCurrent) {
        heads[position]?.setAttribute('aria-current', 'true')
      } else {
        heads[position]?.removeAttribute('aria-current')
      }
    }

    schedule()
  }

  for (const [position, head] of heads.entries()) {
    head?.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && position !== index) {
        show(position)
      }
    })
    // Строка целиком ссылка. Мышью она выбирается наведением, а переход идёт по клику; на сенсорном экране первое касание
    // только выбирает модель (показывает характеристики), второе открывает карточку
    head?.addEventListener('click', (event) => {
      if (position !== index) {
        event.preventDefault()
        show(position)
      }
    })
    head?.addEventListener('focus', () => {
      if (position !== index) {
        show(position)
      }
    })
    head?.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return
      }

      event.preventDefault()

      const target = (position + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length

      heads[target]?.focus()
      show(target)
    })
  }

  const pause = (): void => {
    isPaused = true
    stop()
  }

  const resume = (): void => {
    isPaused = false
    schedule()
  }

  panel?.addEventListener('pointerenter', pause)
  panel?.addEventListener('pointerleave', resume)
  panel?.addEventListener('focusin', pause)
  panel?.addEventListener('focusout', resume)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause()
    } else {
      resume()
    }
  })

  // Автолистание идёт только пока секция на экране
  new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting === true) {
        resume()
      } else {
        pause()
      }
    },
    { threshold: 0.35 },
  ).observe(root)

  show(0)
  initSticky(root)
}
