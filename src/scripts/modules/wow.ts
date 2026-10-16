import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

/** Заявление: слова проявляются по мере прокрутки, акцентные слова меняют цвет. */
const initStatement = (): void => {
  const text = document.querySelector<HTMLElement>('[data-words]')

  if (!text) {
    return
  }

  const accent = new Set((text.dataset['accent'] ?? '').split('|'))
  const words = text.textContent.trim().split(/\s+/)

  text.textContent = ''

  const spans = words.map((word) => {
    const span = document.createElement('span')

    span.className = accent.has(word) ? 'word word--accent' : 'word'
    span.textContent = word
    text.append(span, ' ')

    return span
  })

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    gsap.fromTo(
      spans,
      { opacity: 0.16, filter: 'blur(6px)' },
      {
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 48%', scrub: 0.6 },
      },
    )
  })
}

/** «Цистерна наполняется»: чертёж заливается акцентом слева направо, число единиц считается вместе с ним. */
const initFill = (): void => {
  const root = document.querySelector<HTMLElement>('[data-fill]')
  const level = root?.querySelector<HTMLElement>('[data-fill-level]')
  const counter = root?.querySelector<HTMLElement>('[data-fill-count]')

  if (!root || !level || !counter) {
    return
  }

  const total = Number(counter.dataset['fillCount'] ?? 0)

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    const state = { progress: 0 }

    gsap.set(level, { clipPath: 'inset(0 100% 0 0)' })
    counter.textContent = '0'

    gsap.to(state, {
      progress: 1,
      ease: 'none',
      onUpdate: () => {
        level.style.clipPath = `inset(0 ${String(100 - state.progress * 100)}% 0 0)`
        counter.textContent = String(Math.round(total * state.progress))
      },
      scrollTrigger: { trigger: root, start: 'top 82%', end: 'top 30%', scrub: 0.4 },
    })
  })
}

export const initWow = (): void => {
  gsap.registerPlugin(ScrollTrigger)
  initStatement()
  initFill()
}
