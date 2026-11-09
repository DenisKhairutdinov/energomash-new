import { gsap } from 'gsap'
import { getLenis } from './smooth'

const SESSION_KEY = 'energomash-intro-v1'

/** One continuous reveal; the real hero starts only after the tracing stage. */
export function initIntro(): Promise<void> {
  const root = document.documentElement
  const overlay = document.querySelector<HTMLElement>('[data-intro]')
  const hero = document.querySelector<HTMLElement>('[data-hero]')
  if (!overlay || !hero || !root.hasAttribute('data-intro-pending')) {
    root.removeAttribute('data-intro-pending')
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const select = (name: string): HTMLElement | null =>
      overlay.querySelector(`[data-intro-${name}]`)
    const art = select('art')
    const photo = overlay.querySelector<HTMLImageElement>('[data-intro-photo]')
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
      root.removeAttribute('data-intro-pending')
      root.removeAttribute('data-intro-revealing')
      getLenis()?.start()
      try {
        sessionStorage.setItem(SESSION_KEY, 'seen')
      } catch {
        /* Storage may be unavailable. */
      }
      reveal()
      if (
        document.activeElement === document.body ||
        document.activeElement === overlay ||
        document.activeElement === skip
      ) {
        if (previousFocus instanceof HTMLElement && previousFocus !== document.body)
          previousFocus.focus({ preventScroll: true })
      }
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') finish()
      if (event.key === 'Tab') {
        event.preventDefault()
        skip?.focus()
      }
    }
    const onResize = (): void => {
      finish()
    }
    const watchdog = window.setTimeout(finish, 6500)
    skip?.addEventListener('click', finish)
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

    const width = Math.max(innerWidth, hero.offsetHeight * 2)
    const height = width / 2
    const initialScale = Math.min((innerWidth / width) * 0.94, (innerHeight / height) * 0.86)
    // Same object-fit: cover and bottom alignment as the real hero photograph.
    gsap.set(art, { width, height, xPercent: -50, bottom: innerHeight - hero.offsetHeight })
    const initialY =
      innerHeight / 2 - (hero.offsetHeight - height + height / 2 + height * 0.07 * initialScale)
    gsap.set(art, { scale: initialScale, y: initialY })
    const outer = gsap.utils.toArray<SVGGeometryElement>('[data-intro-outline] path', overlay)
    const details = gsap.utils.toArray<SVGGeometryElement>(
      '[data-intro-details] path, [data-intro-details] circle',
      overlay,
    )
    for (const path of [...outer, ...details]) {
      const length = path.getTotalLength()
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
    }
    timeline
      .fromTo(
        select('mark'),
        { opacity: 0, y: 12, filter: 'blur(5px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8 },
        0,
      )
      .fromTo(
        select('name'),
        { yPercent: 110, letterSpacing: '0.09em' },
        { yPercent: 0, letterSpacing: '0.025em', duration: 0.8 },
        0.3,
      )
      .fromTo(select('caption'), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.7)
      .to(outer, { strokeDashoffset: 0, duration: 1.25, stagger: 0.12, ease: 'power1.inOut' }, 0.95)
      .to(
        details,
        { strokeDashoffset: 0, duration: 0.7, stagger: 0.025, ease: 'power1.inOut' },
        1.45,
      )
      .to(select('brand'), { opacity: 0, duration: 0.45 }, 2.5)
      .to(select('caption'), { opacity: 0, duration: 0.3 }, 2.5)
      .to(art, { scale: 1, y: 0, duration: 1.05, ease: 'power3.inOut' }, 2.65)
      .to(photo, { opacity: 1, duration: 0.9, ease: 'power2.inOut' }, 2.65)
      .to(select('drawing'), { opacity: 0, duration: 0.6 }, 2.95)
      .call(reveal, [], 3.45)
      .to(overlay, { opacity: 0, duration: 0.65, ease: 'power2.inOut' }, 3.45)
      .call(finish)

    // Begin together with decoded imagery; the watchdog always releases the page.
    void Promise.allSettled([photo?.decode(), document.fonts.ready]).then(() => {
      if (!finished) {
        const previewFrame = import.meta.env.DEV
          ? new URLSearchParams(location.search).get('intro-frame')
          : null
        if (previewFrame !== null)
          timeline.pause(Math.min(4, Math.max(0, Number(previewFrame) || 0)))
        else timeline.play()
      }
    })
  })
}
