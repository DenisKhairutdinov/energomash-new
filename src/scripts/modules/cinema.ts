import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'
const DESKTOP = '(min-width: 900px)'

/**
 * Индикатор глав справа: столбец номеров 01…N без панели, текущий акцентом и крупнее, названия глав видны у текущей и при наведении.
 * Цвет номеров (чёрный или белый) берётся по фону под каждым номером (см. updateTone), поэтому читается на любом фоне.
 */
const layoutTop = (element: HTMLElement): number => {
  let top = 0
  let node: HTMLElement | null = element

  while (node) {
    top += node.offsetTop
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null
  }

  return top
}

const buildChapters = (): void => {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-chapter]')]

  if (sections.length < 2) {
    return
  }

  const nav = document.createElement('nav')

  nav.className = 'chapters'
  nav.setAttribute('aria-label', 'Главы страницы')

  // Цвет номеров по фактическому фону под навигатором: светлый фон даёт чёрные номера, тёмный и фото белые
  const parse = (value: string): { luma: number; alpha: number } | null => {
    const match =
      /(?:rgba?|color)\(\s*(?:srgb\s+)?([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?/.exec(
        value,
      )

    if (!match) {
      return null
    }

    const scale = value.startsWith('color(') ? 255 : 1
    const [r, g, b] = [match[1], match[2], match[3]].map((part) => Number(part) * scale)

    return {
      luma: (0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)) / 255,
      alpha: match[4] === undefined ? 1 : Number(match[4]),
    }
  }

  // Тон каждого номера отдельно по фону под ним: светлый фон чёрный номер, тёмный фон и фото белый. Нужен потому, что столбец
  // может лежать на границе светлой и тёмной секций
  const toneOf = (x: number, y: number): boolean => {
    const probe = document.elementsFromPoint(x, y).find((element) => !nav.contains(element))

    if (
      probe instanceof HTMLImageElement ||
      probe instanceof HTMLVideoElement ||
      probe instanceof HTMLCanvasElement
    ) {
      return false
    }

    let node: Element | null = probe ?? null

    while (node) {
      const color = parse(getComputedStyle(node).backgroundColor)

      if (color && color.alpha > 0.5) {
        return color.luma > 0.55
      }

      node = node.parentElement
    }

    return false
  }

  let toneFrame = 0

  const updateTone = (): void => {
    toneFrame = 0

    for (const item of nav.querySelectorAll<HTMLElement>('.chapters__item')) {
      const box = item.getBoundingClientRect()
      const light = toneOf(box.right - 2, box.top + box.height / 2)

      item.style.color = light ? 'var(--c-black)' : 'var(--c-white)'
    }
  }

  const scheduleTone = (): void => {
    if (toneFrame === 0) {
      toneFrame = window.requestAnimationFrame(updateTone)
    }
  }

  window.addEventListener('scroll', scheduleTone, { passive: true })
  window.addEventListener('resize', scheduleTone)

  const links = sections.map((section, index) => {
    const id = section.id || `chapter-${String(index + 1)}`
    const link = document.createElement('a')
    const name = document.createElement('span')
    const number = document.createElement('span')

    section.id = id
    link.className = 'chapters__item'
    link.href = `#${id}`
    link.setAttribute('aria-label', section.dataset['chapter'] ?? '')
    name.className = 'chapters__name'
    name.textContent = section.dataset['chapter'] ?? ''
    number.className = 'chapters__number'
    number.textContent = String(index + 1).padStart(2, '0')
    link.append(name, number)
    nav.append(link)

    return link
  })

  document.body.append(nav)

  // Текущая глава: последняя, чей верх выше 55% высоты окна. Верх считается по раскладке (offsetTop игнорирует transform соседей
  // пина) и пересчитывается после каждого пересчёта ScrollTrigger, когда распорка пина уже стоит; пока лента едет по
  // горизонтали, глава «Отгрузки» остаётся текущей
  let tops: number[] = []
  let current = -1

  const measure = (): void => {
    tops = sections.map(layoutTop)
  }

  const activate = (): void => {
    const line = window.scrollY + window.innerHeight * 0.55
    let next = 0

    for (const [index, top] of tops.entries()) {
      if (top <= line) {
        next = index
      }
    }

    if (next === current) {
      return
    }

    current = next

    for (const [index, link] of links.entries()) {
      link.classList.toggle('is-active', index === next)
    }

    scheduleTone()
  }

  measure()
  ScrollTrigger.addEventListener('refresh', () => {
    measure()
    activate()
  })
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: activate })
  activate()

  scheduleTone()
}

/**
 * Вариант 2 «Кинотеатр»: горизонтальная плёнка отгрузок с пином (на экранах от 900 px) и индикатор глав.
 * Секции на телефоне остаются обычной колонкой.
 */
export const initCinema = (): void => {
  gsap.registerPlugin(ScrollTrigger)

  if (import.meta.env.DEV) {
    // Для проверки в браузере: window.ScrollTrigger.getAll()
    Reflect.set(window, 'ScrollTrigger', ScrollTrigger)
  }

  gsap.matchMedia().add(`${NO_PREFERENCE} and ${DESKTOP}`, () => {
    const pin = document.querySelector<HTMLElement>('[data-shipments-pin]')
    const track = document.querySelector<HTMLElement>('[data-shipments-track]')
    const viewport = document.querySelector<HTMLElement>('[data-shipments-viewport]')

    if (!pin || !track || !viewport) {
      return
    }

    // Лента едет, пока последняя карточка не дойдёт до правого края окна справа от левой колонки
    const distance = (): number => Math.max(track.scrollWidth - viewport.clientWidth, 0)

    const section = pin.closest<HTMLElement>('.shipments')
    const above = section?.previousElementSibling
    const below = section?.nextElementSibling
    const setAbove = above instanceof HTMLElement ? gsap.quickSetter(above, 'y', 'px') : undefined
    const setBelow = below instanceof HTMLElement ? gsap.quickSetter(below, 'y', 'px') : undefined

    // Соседние секции всегда вплотную к закреплённому блоку и считаются от прогресса самого пина (один триггер, один тик),
    // поэтому не расходятся с ним даже при пересчёте: верхняя сдвигается вниз на столько, на сколько прокручено (после пина остаётся
    // сдвинутой и уезжает вместе с блоком), нижняя до начала пина стоит впритык под блоком и доезжает до места к концу пина
    // Сдвинутая вниз верхняя секция заходит в область секции отгрузок (у неё тёмный фон и она идёт позже в разметке),
    // поэтому поднимаем верхнюю над ней, иначе тёмный фон закрывает её низ полосой
    if (above instanceof HTMLElement) {
      above.style.position = 'relative'
      above.style.zIndex = '1'
    }

    const follow = (self: ScrollTrigger): void => {
      const length = self.end - self.start

      setAbove?.(self.progress * length)
      setBelow?.(-(1 - self.progress) * length)
    }

    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        // Пин начинается, когда середина блока совпала с серединой окна (а не его верх с верхом)
        start: 'center center',
        end: () => `+=${String(distance())}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        // Пин пересчитывается первым: распорка пина (длина ленты) должна существовать, когда считаются триггеры секций ниже
        refreshPriority: -10,
        onUpdate: follow,
        onRefresh: follow,
      },
    })

    return () => {
      gsap.set(
        [above, below].filter((item) => item instanceof HTMLElement),
        {
          clearProps: 'transform',
        },
      )

      if (above instanceof HTMLElement) {
        above.style.removeProperty('position')
        above.style.removeProperty('z-index')
      }
    }
  })

  // Главы создаются после пина: к этому моменту распорка пина уже стоит, и границы глав считаются с её длиной
  buildChapters()
}
