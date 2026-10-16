import { gsap } from 'gsap'

const MIN_DURATION = 1.7

/**
 * Прелоадер (один раз за сессию, только на главной): чертёж цистерны «вычерчивается» слева направо,
 * счётчик идёт до 100, потом шторка уходит вверх. Возвращает промис: он выполняется, когда страница открыта.
 */
export const initLoader = (): Promise<void> =>
  new Promise((resolve) => {
    const root = document.documentElement
    const loader = document.querySelector<HTMLElement>('[data-loader]')

    if (!loader || !root.classList.contains('has-loader')) {
      loader?.remove()
      resolve()

      return
    }

    const drawing = loader.querySelector<HTMLElement>('[data-loader-drawing]')
    const scan = loader.querySelector<HTMLElement>('[data-loader-scan]')
    const count = loader.querySelector<HTMLElement>('[data-loader-count]')
    const bar = loader.querySelector<HTMLElement>('[data-loader-bar]')
    const state = { progress: 0 }

    const ready = Promise.all([
      document.fonts.ready,
      new Promise<void>((done) => {
        if (document.readyState === 'complete') {
          done()
        } else {
          window.addEventListener(
            'load',
            () => {
              done()
            },
            { once: true },
          )
        }
      }),
    ])

    const finish = (): void => {
      sessionStorage.setItem('loaded', '1')
      root.classList.remove('has-loader')
      loader.remove()
      resolve()
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()

      return
    }

    const render = (): void => {
      const percent = Math.round(state.progress * 100)

      if (drawing) {
        drawing.style.clipPath = `inset(0 ${String(100 - percent)}% 0 0)`
      }

      if (scan) {
        scan.style.insetInlineStart = `${String(percent)}%`
        scan.style.opacity = percent > 0 && percent < 100 ? '1' : '0'
      }

      if (count) {
        count.textContent = String(percent).padStart(3, '0')
      }

      if (bar) {
        bar.style.transform = `scaleX(${String(state.progress)})`
      }
    }

    const progress = gsap.to(state, {
      progress: 1,
      duration: MIN_DURATION,
      ease: 'power2.inOut',
      onUpdate: render,
    })

    // Если ресурсы ещё грузятся, ждём: шторка уходит только после загрузки
    void Promise.all([ready, progress.then()]).then(() => {
      gsap.to(loader, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 1.1,
        ease: 'expo.inOut',
        onComplete: finish,
      })
    })
  })
