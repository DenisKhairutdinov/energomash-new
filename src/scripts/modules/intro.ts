import { gsap } from 'gsap'
import { getLenis } from './smooth'

const SESSION_KEY = 'energomash-intro-v1'

/** Интро считается показанным с момента старта: перезагрузка, переходы по сайту и возврат на главную его не повторяют (один раз за сессию). */
const markSeen = (): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, 'seen')
  } catch {
    /* Storage may be unavailable. */
  }
}

/**
 * Интро полностью закончено: чёрный экран растворился и убран (без интро разрешается сразу). Тяжёлые модули (3D-помощник,
 * фотобанк) стартуют только после этого, чтобы их работа не попадала на растворение и не вызывала подёргивание.
 */
let resolveFinished: () => void = () => undefined
export const introFinished = new Promise<void>((resolve) => {
  resolveFinished = resolve
})

/** Draw the brand, hold briefly, then reveal the home page. Разрешается, когда интро открыло страницу. */
export function initIntro(): Promise<void> {
  const root = document.documentElement
  const overlay = document.querySelector<HTMLElement>('[data-intro]')
  const hero = document.querySelector<HTMLElement>('[data-hero]')
  if (!overlay || !hero || !root.hasAttribute('data-intro-pending')) {
    root.removeAttribute('data-intro-pending')
    resolveFinished()
    return Promise.resolve()
  }
  markSeen()

  return new Promise<void>((resolve) => {
    const select = (name: string): HTMLElement | null =>
      overlay.querySelector(`[data-intro-${name}]`)
    const skip = overlay.querySelector<HTMLButtonElement>('[data-intro-skip]')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const previousFocus = document.activeElement
    const siblings = Array.from(document.body.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node !== overlay && !node.inert,
    )
    let finished = false
    let revealed = false
    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
    const reveal = (): void => {
      if (revealed) return
      revealed = true
      root.setAttribute('data-intro-revealing', '')
      resolve()
    }
    const finish = (): void => {
      if (finished) return
      finished = true
      timeline.kill()
      clearTimeout(watchdog)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pagehide', finish)
      reduced.removeEventListener('change', finish)
      for (const node of siblings) node.inert = false
      overlay.remove()
      // Сначала сообщаем, что страница открыта, и только потом снимаем атрибуты: иначе reveal() заново выставит
      // data-intro-revealing, и шапка проявлялась бы уже после интро
      reveal()
      root.removeAttribute('data-intro-pending')
      root.removeAttribute('data-intro-revealing')
      root.removeAttribute('data-intro-warm')
      getLenis()?.start()
      markSeen()
      resolveFinished()
      if (
        document.activeElement === document.body ||
        document.activeElement === overlay ||
        document.activeElement === skip
      ) {
        if (previousFocus instanceof HTMLElement && previousFocus !== document.body)
          previousFocus.focus({ preventScroll: true })
      }
    }
    // Пропуск (кнопка, Escape): не обрываем кадр, а плавно открываем страницу за 0,7 с
    let fading = false
    const fadeOut = (): void => {
      if (finished || fading) return
      fading = true
      timeline.pause()
      reveal()
      gsap.to(overlay, { opacity: 0, duration: 0.7, ease: 'power2.inOut', onComplete: finish })
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') fadeOut()
      if (event.key === 'Tab') {
        event.preventDefault()
        skip?.focus()
      }
    }
    const onResize = (): void => {
      finish()
    }
    const watchdog = window.setTimeout(finish, 14000)
    skip?.addEventListener('click', fadeOut)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    window.addEventListener('pagehide', finish)
    reduced.addEventListener('change', finish)
    overlay.hidden = false
    overlay.focus({ preventScroll: true })
    for (const node of siblings) node.inert = true
    getLenis()?.stop()

    if (reduced.matches) {
      gsap.to(overlay, { opacity: 0, delay: 0.15, duration: 0.2, onComplete: finish })
      return
    }

    const markLines = Array.from(overlay.querySelectorAll<SVGPathElement>('[data-intro-mark-line]'))
    const letters = Array.from(overlay.querySelectorAll<SVGPathElement>('[data-intro-letter]'))
    for (const path of [...markLines, ...letters]) {
      const length = path.getTotalLength()
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, autoAlpha: 0 })
    }
    gsap.set(select('sheen'), { x: 8, autoAlpha: 0 })
    timeline
      .to(
        markLines,
        {
          autoAlpha: 1,
          strokeDashoffset: 0,
          duration: 2.4,
          stagger: { amount: 0.6 },
          ease: 'power1.inOut',
        },
        0.25,
      )
      .to(
        letters,
        {
          autoAlpha: 1,
          strokeDashoffset: 0,
          duration: 1.25,
          stagger: 0.28,
          ease: 'power1.inOut',
        },
        1.1,
      )
      .to(select('mark-fill'), { opacity: 1, duration: 1.1 }, 2.6)
      .to(markLines, { opacity: 0, duration: 0.8 }, 3.1)
      .to(letters, { fillOpacity: 1, duration: 0.75, stagger: 0.28 }, 2.1)
      .set(select('sheen'), { autoAlpha: 1 }, 5.1)
      .to(select('sheen'), { x: 180, duration: 1.2, ease: 'power1.inOut' }, 5.1)
      .set(select('sheen'), { autoAlpha: 0 }, 6.3)
      .to(select('brand'), { opacity: 0, y: -12, duration: 0.8 }, 6.75)
      // Прогрев: страница рисуется под непрозрачным чёрным экраном заранее (первая отрисовка всей страницы тяжёлая),
      // поэтому в момент раскрытия подёргивания нет (см. _intro.scss)
      .call(
        () => {
          root.setAttribute('data-intro-warm', '')
        },
        [],
        4.2,
      )
      .call(reveal, [], 7.05)
      // Долгое мягкое растворение чёрного экрана: за ним уже виден hero, шапка плавно проявляется (см. _intro.scss)
      .to(overlay, { opacity: 0, duration: 1.5, ease: 'sine.inOut' }, 7.05)
      .call(finish)

    // The watchdog always releases the page if initialization stalls.
    void Promise.allSettled([document.fonts.ready]).then(() => {
      if (!finished) {
        const previewFrame = import.meta.env.DEV
          ? new URLSearchParams(location.search).get('intro-frame')
          : null
        if (previewFrame !== null)
          timeline.pause(Math.min(8, Math.max(0, Number(previewFrame) || 0)))
        else timeline.play()
      }
    })
  })
}
