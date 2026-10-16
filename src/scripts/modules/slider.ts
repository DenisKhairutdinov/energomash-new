const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const ACTIVE_CLASS = 'is-active'
const PLAYING_CLASS = 'is-playing'

/**
 * Слайдер наличия: слайды лежат стопкой, виден помеченный is-active.
 * Листается стрелками, клавишами и сам (data-autoplay секунд на слайд); пауза при наведении, фокусе и скрытой вкладке.
 */
export const initSlider = (): void => {
  const root = document.querySelector<HTMLElement>('[data-slider]')

  if (!root) {
    return
  }

  const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')]
  const previous = root.querySelector<HTMLButtonElement>('[data-prev]')
  const next = root.querySelector<HTMLButtonElement>('[data-next]')
  const current = root.querySelector<HTMLElement>('[data-current]')
  const bar = root.querySelector<HTMLElement>('[data-progress]')
  const viewport = root.querySelector<HTMLElement>('.stock__viewport')
  const seconds = Number(root.dataset['autoplay'] ?? 0)
  const isReduced = matchMedia(REDUCED_MOTION_QUERY).matches
  const canAutoplay = seconds > 0 && !isReduced && slides.length > 1

  let index = 0
  let timer: number | undefined
  let isPaused = false

  root.style.setProperty('--autoplay', `${String(seconds)}s`)

  const restartProgress = (): void => {
    root.classList.remove(PLAYING_CLASS)

    // Принудительный перерасчёт стилей, чтобы анимация индикатора началась заново
    bar?.getBoundingClientRect()

    if (canAutoplay && !isPaused) {
      root.classList.add(PLAYING_CLASS)
    }
  }

  const stop = (): void => {
    window.clearTimeout(timer)
    root.classList.remove(PLAYING_CLASS)
  }

  const schedule = (): void => {
    window.clearTimeout(timer)

    if (!canAutoplay || isPaused) {
      return
    }

    restartProgress()
    timer = window.setTimeout(() => {
      show(index + 1)
    }, seconds * 1000)
  }

  const show = (target: number): void => {
    index = (target + slides.length) % slides.length

    for (const [position, slide] of slides.entries()) {
      const isCurrent = position === index

      slide.classList.toggle(ACTIVE_CLASS, isCurrent)
      slide.toggleAttribute('inert', !isCurrent)
    }

    if (current) {
      current.textContent = String(index + 1)
    }

    schedule()
  }

  previous?.addEventListener('click', () => {
    show(index - 1)
  })

  next?.addEventListener('click', () => {
    show(index + 1)
  })

  const pause = (): void => {
    isPaused = true
    stop()
  }

  const resume = (): void => {
    isPaused = false
    schedule()
  }

  viewport?.addEventListener('pointerenter', pause)
  viewport?.addEventListener('pointerleave', resume)
  viewport?.addEventListener('focusin', pause)
  viewport?.addEventListener('focusout', resume)

  viewport?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      show(index - 1)
    } else if (event.key === 'ArrowRight') {
      show(index + 1)
    }
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause()
    } else {
      resume()
    }
  })

  show(0)
}
