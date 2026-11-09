import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getLenis } from './smooth'

const DESKTOP_QUERY = '(min-width: 900px) and (prefers-reduced-motion: no-preference)'
const SNAP_IN = 0.6
const SNAP_OUT = 0.4
const SETTLE_MS = 260
const SNAP_SECONDS = 1.1
const GESTURE_GAP_MS = 220
const INPUT_WINDOW_MS = 700
const REARM_DISTANCE = 60
const RELEASE_GAIN = 1
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])

const ACTIVE = 'is-active'
const PLAYING = 'is-playing'

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

/** Слайдер техники: широкое фото, сведения о модели и ручное или автоматическое переключение. */
export const initSlider = (): void => {
  const root = document.querySelector<HTMLElement>('[data-showcase]')

  if (!root) {
    return
  }

  const slides = [...root.querySelectorAll<HTMLAnchorElement>('[data-slide]')]
  const infos = [...root.querySelectorAll<HTMLElement>('[data-slide-info]')]
  const current = root.querySelector<HTMLElement>('[data-slide-current]')
  const previous = root.querySelector<HTMLButtonElement>('[data-slide-prev]')
  const next = root.querySelector<HTMLButtonElement>('[data-slide-next]')
  const seconds = Number(root.dataset['autoplay'] ?? 0)
  const canAutoplay = seconds > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!slides.length || slides.length !== infos.length) {
    return
  }

  let index = 0
  let layer = 1
  let visible = false
  let timer: number | undefined

  root.style.setProperty('--autoplay', `${String(seconds)}s`)

  const stop = (): void => {
    window.clearTimeout(timer)
    root.classList.remove(PLAYING)
  }

  const schedule = (): void => {
    stop()

    if (!canAutoplay || !visible || document.hidden || slides.length < 2) {
      return
    }

    // Перезапускаем полоску прогресса при ручном и автоматическом переключении.
    root.getBoundingClientRect()
    root.classList.add(PLAYING)
    timer = window.setTimeout(() => {
      show(index + 1)
    }, seconds * 1000)
  }

  const show = (target: number): void => {
    const selected = (target + slides.length) % slides.length

    if (selected !== index) {
      layer += 1
      const slide = slides[selected]

      if (slide) {
        slide.style.zIndex = String(layer)
      }
    }

    index = selected

    for (const [position, slide] of slides.entries()) {
      const active = position === index
      slide.classList.toggle(ACTIVE, active)
      slide.inert = !active

      if (active) {
        slide.removeAttribute('aria-hidden')
      } else {
        slide.setAttribute('aria-hidden', 'true')
      }
    }

    for (const [position, info] of infos.entries()) {
      const active = position === index
      info.classList.toggle(ACTIVE, active)
      info.inert = !active

      if (active) {
        info.removeAttribute('aria-hidden')
      } else {
        info.setAttribute('aria-hidden', 'true')
      }
    }

    if (current) {
      current.textContent = String(index + 1).padStart(2, '0')
    }

    schedule()
  }

  previous?.addEventListener('click', () => {
    show(index - 1)
  })
  next?.addEventListener('click', () => {
    show(index + 1)
  })

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()
    show(index + (event.key === 'ArrowRight' ? 1 : -1))
  })

  document.addEventListener('visibilitychange', schedule)

  new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting === true
      schedule()
    },
    { threshold: 0.25 },
  ).observe(root)

  show(0)
  initSticky(root)
}
