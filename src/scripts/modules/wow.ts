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
  // Неразрывные пробелы (после предлогов и союзов, ставит vite-plugins/nbsp.ts) остаются между словами:
  // слова режутся по обычным пробелам, а внутри «и автоцистерны» разделитель снова неразрывный
  const tokens = text.textContent.trim().split(/ +/)

  text.textContent = ''

  const spans = tokens.flatMap((token) => {
    const parts = token.split('\u00A0')

    return parts.map((word, index) => {
      const span = document.createElement('span')

      span.className = accent.has(word) ? 'word word--accent' : 'word'
      span.textContent = word
      text.append(span, index < parts.length - 1 ? '\u00A0' : ' ')

      return span
    })
  })

  const foot = document.querySelector<HTMLElement>('[data-statement-foot]')

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    gsap.fromTo(
      spans,
      { opacity: 0.2, filter: 'blur(6px)' },
      {
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: text, start: 'top 85%', end: 'bottom 70%', scrub: 0.3 },
      },
    )

    // Кнопка и пояснение поднимаются один раз, когда низ секции входит в экран
    if (foot) {
      gsap.from(foot.children, {
        y: 28,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: foot, start: 'top 92%', once: true },
      })
    }
  })
}

export const initWow = (): void => {
  gsap.registerPlugin(ScrollTrigger)
  initStatement()
}
