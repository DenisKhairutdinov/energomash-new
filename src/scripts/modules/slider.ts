const ACTIVE = 'is-active'
const PLAYING = 'is-playing'

/**
 * Шапка прячется, пока блок «Техника в наличии» виден больше чем наполовину.
 * Прокрутка блоком не удерживается и не «примагничивается»: страница едет без задержек (убрано по просьбе владельца 2026-11-09).
 */
const initHeaderAway = (root: HTMLElement): void => {
  const header = document.querySelector<HTMLElement>('[data-header]')

  new IntersectionObserver(
    ([entry]) => {
      header?.classList.toggle('is-away', (entry?.intersectionRatio ?? 0) >= 0.5)
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  ).observe(root)
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
  initHeaderAway(root)
}
