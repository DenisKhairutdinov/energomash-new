import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'
const DESKTOP = '(min-width: 900px)'

/** Индикатор глав справа: список из секций с data-chapter, подсвечивает текущую. */
const buildChapters = (): void => {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-chapter]')]

  if (sections.length < 2) {
    return
  }

  const nav = document.createElement('nav')

  nav.className = 'chapters'
  nav.setAttribute('aria-label', 'Главы страницы')

  const links = sections.map((section, index) => {
    const id = section.id || `chapter-${String(index + 1)}`
    const link = document.createElement('a')
    const name = document.createElement('span')

    section.id = id
    link.className = 'chapters__item'
    link.href = `#${id}`
    name.className = 'chapters__name'
    name.textContent = section.dataset['chapter'] ?? ''
    link.append(name)
    nav.append(link)

    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => {
        link.classList.toggle('is-active', self.isActive)
      },
    })

    return link
  })

  document.body.append(nav)
  links[0]?.classList.add('is-active')
}

/**
 * Вариант 2 «Кинотеатр»: горизонтальная плёнка отгрузок с пином (на экранах от 900 px) и индикатор глав.
 * Секции на телефоне остаются обычной колонкой.
 */
export const initCinema = (): void => {
  gsap.registerPlugin(ScrollTrigger)

  buildChapters()

  gsap.matchMedia().add(`${NO_PREFERENCE} and ${DESKTOP}`, () => {
    const pin = document.querySelector<HTMLElement>('[data-shipments-pin]')
    const track = document.querySelector<HTMLElement>('[data-shipments-track]')

    if (!pin || !track) {
      return
    }

    const distance = (): number => Math.max(track.scrollWidth - window.innerWidth + 80, 0)

    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${String(distance())}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    })
  })
}
