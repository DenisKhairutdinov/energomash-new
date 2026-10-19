const SOLID_AFTER = 24
const HIDE_AFTER = 240

const PLATE_TARGETS = '.menu__link, .header__phone, .header__tool'

/**
 * Скользящая пластина ленты: лежит под текущим разделом (акцентная), при наведении или фокусе переезжает под пункт меню,
 * телефон или значок (позиция и ширина идут с разной скоростью, получается «растяжение»), при уходе возвращается на текущий раздел.
 */
const initMenuMarker = (header: HTMLElement): void => {
  const bar = header.querySelector<HTMLElement>('.header__bar')
  const marker = bar?.querySelector<HTMLElement>('[data-menu-marker]')

  if (!bar || !marker) {
    return
  }

  const rest = bar.querySelector<HTMLElement>('.menu__link--active')

  const place = (target: HTMLElement | null): void => {
    if (!target) {
      marker.style.opacity = '0'

      return
    }

    const box = target.getBoundingClientRect()
    const base = (marker.offsetParent ?? bar).getBoundingClientRect()

    marker.classList.toggle('is-rest', target === rest)
    marker.style.setProperty('--x', `${String(box.left - base.left)}px`)
    marker.style.setProperty('--w', `${String(box.width)}px`)
    marker.style.opacity = '1'
  }

  const follow = (node: EventTarget | null): void => {
    const element = node instanceof Element ? node : null
    // Внутри открытой панели пластина остаётся под её пунктом меню
    const owner = element?.closest('.menu__dropdown')
      ? element.closest('.menu__item')?.querySelector<HTMLElement>('.menu__link')
      : element?.closest<HTMLElement>(PLATE_TARGETS)

    place(owner ?? rest)
  }

  bar.addEventListener('pointerover', (event) => {
    follow(event.target)
  })
  bar.addEventListener('focusin', (event) => {
    follow(event.target)
  })
  bar.addEventListener('pointerleave', () => {
    place(rest)
  })
  bar.addEventListener('focusout', (event) => {
    if (!(event.relatedTarget instanceof Node) || !bar.contains(event.relatedTarget)) {
      place(rest)
    }
  })
  window.addEventListener('resize', () => {
    place(rest)
  })

  place(rest)

  // Ширина пунктов меняется, когда подгружается шрифт: без повторного замера пластина остаётся по старой ширине и наезжает на соседа
  void document.fonts.ready.then(() => {
    place(rest)
  })
  window.addEventListener('load', () => {
    place(rest)
  })
}

const LIGHT_ABOVE = 0.45
const SENTINEL = '#010203'
const PROBE_WIDTH = 16
const PROBE_HEIGHT = 4

type Fit = 'contain' | 'cover' | 'fill'

interface Layer {
  luma: number
  alpha: number
}

const lumaOf = (red: number, green: number, blue: number): number =>
  (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255

/** Доля из `50%`, `0%`: для ключевых слов и пикселей берётся середина. */
const fractionOf = (token: string | undefined): number => {
  const value = token?.endsWith('%') ? Number.parseFloat(token) / 100 : Number.NaN

  return Number.isFinite(value) ? value : 0.5
}

/**
 * Тон фона под шапкой: `data-tone="dark|light"` на шапке. После прокрутки (`is-solid`) стекло на тёмном фоне светлеет,
 * на светлом темнеет (стили в `_header.scss`). Под лентой берётся самый верхний слой с заливкой: у `<img>`, `<video>`
 * и фоновых картинок измеряется средняя яркость той части кадра, что лежит под лентой (с учётом `object-fit` и позиции),
 * полупрозрачные слои сверху (затемнения) подмешиваются к результату.
 */
const initHeaderTone = (header: HTMLElement): void => {
  const bar = header.querySelector<HTMLElement>('.header__bar')
  const colorContext = document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true })
  const photoContext = document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true })

  if (!bar || !colorContext || !photoContext) {
    return
  }

  colorContext.canvas.width = 1
  colorContext.canvas.height = 1
  photoContext.canvas.width = PROBE_WIDTH
  photoContext.canvas.height = PROBE_HEIGHT

  const colorOf = (value: string): Layer | null => {
    colorContext.clearRect(0, 0, 1, 1)
    colorContext.fillStyle = SENTINEL
    colorContext.fillStyle = value
    colorContext.fillRect(0, 0, 1, 1)

    const [red = 0, green = 0, blue = 0, alpha = 0] = colorContext.getImageData(0, 0, 1, 1).data

    return alpha === 0 ? null : { luma: lumaOf(red, green, blue), alpha: alpha / 255 }
  }

  /** Средняя яркость части картинки, которая лежит под лентой. */
  const photoLuma = (
    source: HTMLImageElement | HTMLVideoElement,
    box: DOMRect,
    fit: Fit,
    position: readonly [number, number],
  ): number | null => {
    const naturalWidth =
      source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth
    const naturalHeight =
      source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
    const strip = bar.getBoundingClientRect()
    const left = Math.max(strip.left, box.left)
    const right = Math.min(strip.right, box.right)
    const top = Math.max(strip.top, box.top)
    const bottom = Math.min(strip.bottom, box.bottom)

    if (naturalWidth === 0 || naturalHeight === 0 || right <= left || bottom <= top) {
      return null
    }

    const scaleX = fit === 'fill' ? box.width / naturalWidth : 0
    const scaleY = fit === 'fill' ? box.height / naturalHeight : 0
    const uniform =
      fit === 'contain'
        ? Math.min(box.width / naturalWidth, box.height / naturalHeight)
        : Math.max(box.width / naturalWidth, box.height / naturalHeight)
    const sx = fit === 'fill' ? scaleX : uniform
    const sy = fit === 'fill' ? scaleY : uniform
    const offsetX = (box.width - naturalWidth * sx) * position[0]
    const offsetY = (box.height - naturalHeight * sy) * position[1]
    const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max)
    const fromX = clamp((left - box.left - offsetX) / sx, naturalWidth)
    const fromY = clamp((top - box.top - offsetY) / sy, naturalHeight)
    const width = clamp((right - left) / sx, naturalWidth - fromX)
    const height = clamp((bottom - top) / sy, naturalHeight - fromY)

    if (width < 1 || height < 1) {
      return null
    }

    try {
      photoContext.clearRect(0, 0, PROBE_WIDTH, PROBE_HEIGHT)
      photoContext.drawImage(source, fromX, fromY, width, height, 0, 0, PROBE_WIDTH, PROBE_HEIGHT)

      const { data } = photoContext.getImageData(0, 0, PROBE_WIDTH, PROBE_HEIGHT)
      let sum = 0

      for (let index = 0; index < data.length; index += 4) {
        sum += lumaOf(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0)
      }

      return sum / (data.length / 4)
    } catch {
      return null
    }
  }

  const backgrounds = new Map<string, HTMLImageElement>()

  const backgroundOf = (url: string): HTMLImageElement | null => {
    let image = backgrounds.get(url)

    if (!image) {
      image = new Image()
      image.addEventListener('load', schedule)
      image.src = url
      backgrounds.set(url, image)
    }

    return image.complete && image.naturalWidth > 0 ? image : null
  }

  /** Яркость фона в одной точке под лентой: основание (заливка или кадр) с подмешанными затемнениями над ним. */
  const lumaAt = (x: number, y: number): number => {
    const veils: Layer[] = []
    let base: number | null = null

    for (const element of document.elementsFromPoint(x, y)) {
      if (header.contains(element)) {
        continue
      }

      const style = getComputedStyle(element)

      if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) {
        const [px, py] = style.objectPosition.split(' ')
        const fit =
          style.objectFit === 'cover' || style.objectFit === 'contain' ? style.objectFit : 'fill'

        base = photoLuma(element, element.getBoundingClientRect(), fit, [
          fractionOf(px),
          fractionOf(py),
        ])
        break
      }

      const url = /url\(["']?(.*?)["']?\)/.exec(style.backgroundImage)?.[1]

      if (url) {
        const image = backgroundOf(url)
        const [px, py] = style.backgroundPosition.split(' ')

        base = image
          ? photoLuma(
              image,
              element.getBoundingClientRect(),
              style.backgroundSize === 'contain' ? 'contain' : 'cover',
              [fractionOf(px), fractionOf(py)],
            )
          : null
        break
      }

      const color = colorOf(style.backgroundColor)

      if (color && color.alpha >= 0.6) {
        base = color.luma
        break
      }

      if (color && color.alpha > 0.02) {
        veils.push(color)
      }
    }

    // Затемнения лежат над основанием: подмешиваем от нижнего к верхнему
    let luma = base ?? 0

    for (const veil of veils.reverse()) {
      luma = luma * (1 - veil.alpha) + veil.luma * veil.alpha
    }

    return luma
  }

  /** Пять точек по ширине ленты: карточки и просветы между ними вместе дают средний тон. */
  const measure = (): 'dark' | 'light' => {
    const box = bar.getBoundingClientRect()
    const y = Math.min(Math.max(box.top + box.height / 2, 1), window.innerHeight - 1)
    const lumas = [0.1, 0.3, 0.5, 0.7, 0.9].map((share) => lumaAt(box.left + box.width * share, y))

    return lumas.reduce((sum, value) => sum + value, 0) / lumas.length > LIGHT_ABOVE
      ? 'light'
      : 'dark'
  }

  let frame = 0

  function update(): void {
    frame = 0
    header.dataset['tone'] = measure()
  }

  function schedule(): void {
    if (frame === 0) {
      frame = window.requestAnimationFrame(update)
    }
  }

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  new MutationObserver(() => {
    window.setTimeout(schedule, 80)
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  update()
}

/** Шапка: после прокрутки стекло меняет тон под фон (`is-solid`), при движении вниз шапка прячется целиком (`is-hidden`) и возвращается при движении вверх. */
export const initHeader = (): void => {
  const header = document.querySelector<HTMLElement>('[data-header]')

  if (!header) {
    return
  }

  initMenuMarker(header)
  initHeaderTone(header)

  // «Тёплое» меню: через полсекунды после входа курсора в список пунктов шапка получает `is-menu-warm`,
  // и при переходе между пунктами стеклянный лист не выезжает заново (см. `_header.scss`)
  const menuList = header.querySelector<HTMLElement>('[data-menu-list]')
  let warmTimer = 0
  let coolTimer = 0

  menuList?.addEventListener('pointerenter', () => {
    window.clearTimeout(coolTimer)
    warmTimer = window.setTimeout(() => {
      header.classList.add('is-menu-warm')
    }, 500)
  })
  menuList?.addEventListener('pointerleave', () => {
    window.clearTimeout(warmTimer)
    coolTimer = window.setTimeout(() => {
      header.classList.remove('is-menu-warm')
    }, 250)
  })

  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]')
  const searchToggle = header.querySelector<HTMLButtonElement>('[data-search-toggle]')
  const searchInput = header.querySelector<HTMLInputElement>('.header__search-input')
  let lastY = window.scrollY

  const setSearch = (isOpen: boolean): void => {
    header.classList.toggle('is-searching', isOpen)
    searchToggle?.setAttribute('aria-expanded', String(isOpen))

    if (isOpen) {
      // Фокус после начала выезда панели: до этого поле скрыто (visibility)
      window.setTimeout(() => {
        searchInput?.focus()
      }, 50)
    }
  }

  searchToggle?.addEventListener('click', () => {
    setSearch(!header.classList.contains('is-searching'))
  })

  document.addEventListener('pointerdown', (event) => {
    if (
      header.classList.contains('is-searching') &&
      event.target instanceof Element &&
      !event.target.closest('[data-search], [data-search-toggle]')
    ) {
      setSearch(false)
    }
  })

  const update = (): void => {
    const y = window.scrollY
    const isOpen = header.classList.contains('is-open')

    header.classList.toggle('is-solid', y > SOLID_AFTER)
    header.classList.toggle('is-hidden', !isOpen && y > HIDE_AFTER && y > lastY)

    if (y < lastY) {
      header.classList.remove('is-hidden')
    }

    lastY = y
  }

  update()
  window.addEventListener('scroll', update, { passive: true })

  const setOpen = (isOpen: boolean): void => {
    header.classList.toggle('is-open', isOpen)
    toggle?.setAttribute('aria-expanded', String(isOpen))
  }

  toggle?.addEventListener('click', () => {
    setOpen(!header.classList.contains('is-open'))
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return
    }

    if (header.classList.contains('is-searching')) {
      setSearch(false)
      searchToggle?.focus()
    } else if (header.classList.contains('is-open')) {
      setOpen(false)
      toggle?.focus()
    }
  })

  header.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) {
      setOpen(false)
    }
  })
}
