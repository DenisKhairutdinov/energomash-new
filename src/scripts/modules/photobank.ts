import logoUrl from '../../assets/images/logo.svg?url'

import { runWhenIdle } from './preload'

/**
 * Фотобанк: мозаика из фотографий техники в форме логотипа «Энергомаш».
 * Наведение увеличивает мозаику, касание выбирает кадр под ней; dialog открывает фото крупно.
 * Фото берутся из каталога сайта (src/assets/models), подписи из данных главной.
 */
interface Photo {
  file: string
  title: string
}

const PHOTOS: Photo[] = [
  {
    file: 'IMG_4431.webp',
    title: 'ППЦТВ-26-П3-BPW-1500: полуприцеп-цистерна для технической воды',
  },
  { file: 'IMG_0550.webp', title: 'ППЦ-28/3-Р3-PLT-1500: полуприцеп-цистерна для ГСМ' },
  { file: 'IMG_4974.webp', title: 'АЦПТ-10/1: автоцистерна для питьевой воды' },
  { file: 'IMG_4623_1.webp', title: 'АТЗ-12/2-Б КАМАЗ-43118: автотопливозаправщик' },
  { file: '91804 IMG_0524.webp', title: 'ППЦН-18-П2-PLT-1500: полуприцеп-цистерна для нефти' },
  { file: 'IMG_4530.webp', title: 'Техника для тёмных нефтепродуктов' },
  { file: 'IMG_4496.webp', title: 'Техника для технической воды' },
  { file: 'IMG_2119.webp', title: 'Техника для светлых нефтепродуктов' },
  { file: 'IMG_4613.webp', title: 'Автотопливозаправщик' },
  { file: 'IMG_5060.webp', title: 'Техника для сбора нефти' },
  { file: 'IMG_0231_0.webp', title: 'Вакуумная цистерна' },
]

const fullUrls = import.meta.glob<string>(
  '../../assets/models/{IMG_4431,IMG_0550,IMG_4974,IMG_4623_1,91804 IMG_0524,IMG_4530,IMG_4496,IMG_2119,IMG_4613,IMG_5060,IMG_0231_0}.webp',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
)
const thumbUrls = import.meta.glob<string>(
  '../../assets/models/thumbs/{IMG_4431,IMG_0550,IMG_4974,IMG_4623_1,91804 IMG_0524,IMG_4530,IMG_4496,IMG_2119,IMG_4613,IMG_5060,IMG_0231_0}.webp',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
)

const fullOf = (file: string): string => fullUrls[`../../assets/models/${file}`] ?? ''
const thumbOf = (file: string): string => thumbUrls[`../../assets/models/thumbs/${file}`] ?? ''

// Размер ячейки мозаики: чем шире окно, тем больше ячеек; мелкая ячейка нужна, чтобы читались тонкие буквы логотипа
const CELL = 20
const LENS_ZOOM = 8
const LOGO_WIDTH = 176
const LOGO_RATIO = 27 / LOGO_WIDTH
// Знак занимает первые 30 единиц логотипа, дальше девять букв; границы букв в долях ширины надписи
const MARK_WIDTH = 30
const LETTER_EDGES = [0.08, 0.19, 0.31, 0.4, 0.5, 0.61, 0.75, 0.87, 1]
// Условная ёмкость мозаики: чем больше фото в списке PHOTOS, тем полнее знак и буквы. Это параметр макета, не показатель
// для посетителя. Общий уровень = число фото / ёмкость; у каждой части он свой, поэтому заполнение выглядит живым.
const CAPACITY = 24
const FILL = Math.min(1, PHOTOS.length / CAPACITY)

/** Прогрев во время интро: миниатюры и логотип мозаики загружаются заранее (мозаика строится после интро). */
export function warmPhotobank(): void {
  runWhenIdle(() => {
    for (const photo of PHOTOS) new Image().src = thumbOf(photo.file)
    new Image().src = logoUrl
  })
}

// Тип элемента задаёт вызывающий: так не нужны приведения типов на каждой выборке
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const q = <T extends Element>(root: ParentNode, selector: string): T | null =>
  root.querySelector<T>(selector)

export function initPhotobank(): void {
  const root = document.querySelector<HTMLElement>('[data-photobank]')
  if (!root) return
  const stage = q<HTMLElement>(root, '[data-photobank-stage]')
  const grid = q<HTMLElement>(root, '[data-photobank-grid]')
  const empty = q<HTMLElement>(root, '[data-photobank-empty]')
  const preview = q<HTMLElement>(root, '[data-photobank-preview]')
  const previewImage = q<HTMLImageElement>(root, '[data-photobank-preview-image]')
  const previewTitle = q<HTMLElement>(root, '[data-photobank-preview-title]')
  const dialog = q<HTMLDialogElement>(root, '[data-photobank-dialog]')
  const dialogImage = q<HTMLImageElement>(root, '[data-photobank-image]')
  const caption = q<HTMLElement>(root, '[data-photobank-caption]')
  const counter = q<HTMLElement>(root, '[data-photobank-counter]')
  const lens = q<HTMLElement>(root, '[data-photobank-lens]')
  const lensContent = q<HTMLElement>(root, '[data-photobank-lens-content]')
  if (
    !stage ||
    !grid ||
    !empty ||
    !preview ||
    !previewImage ||
    !previewTitle ||
    !dialog ||
    !dialogImage ||
    !caption ||
    !counter ||
    !lens ||
    !lensContent
  )
    return

  let tiles: HTMLButtonElement[] = []
  let selected = 0
  let opener: HTMLElement | null = null
  let built = 0
  let previewSelected = 0
  let pointerType = ''
  const touchLayout = matchMedia('(hover: none), (pointer: coarse), (max-width: 767px)')

  const hideInspection = (): void => {
    lens.hidden = true
    if (!touchLayout.matches) preview.hidden = true
  }

  const selectPreview = (index: number): void => {
    const photo = PHOTOS[index]
    if (!photo) return
    previewSelected = index
    previewImage.src = fullOf(photo.file)
    previewImage.alt = photo.title
    previewTitle.textContent = photo.title
    const previewButton = q<HTMLButtonElement>(preview, '[data-photobank-preview-open]')
    if (previewButton) previewButton.tabIndex = touchLayout.matches ? 0 : -1
    preview.hidden = false
  }

  const moveLens = (x: number, y: number): void => {
    const box = stage.getBoundingClientRect()
    const localX = Math.max(0, Math.min(x - box.left, box.width))
    const localY = Math.max(0, Math.min(y - box.top, box.height))
    lens.hidden = false
    // Край лупы остаётся в секции, увеличенный участок следует точно за курсором.
    const left = Math.max(lens.offsetWidth / 2, Math.min(localX, box.width - lens.offsetWidth / 2))
    lens.style.left = `${String(left)}px`
    lens.style.top = `${String(localY)}px`
    lensContent.style.transform = `translate(${String(lens.clientWidth / 2 - localX * LENS_ZOOM)}px, ${String(lens.clientHeight / 2 - localY * LENS_ZOOM)}px) scale(${String(LENS_ZOOM)})`
  }

  const showPhoto = (index: number): void => {
    selected = (index + PHOTOS.length) % PHOTOS.length
    const photo = PHOTOS[selected]
    if (!photo) return
    dialogImage.src = fullOf(photo.file)
    dialogImage.alt = photo.title
    caption.textContent = photo.title
    counter.textContent = `${String(selected + 1).padStart(2, '0')} / ${String(PHOTOS.length).padStart(2, '0')}`
  }

  const openPhoto = (index: number, from: HTMLElement | null): void => {
    opener = from
    showPhoto(index)
    if (!touchLayout.matches) preview.hidden = true
    lens.hidden = true
    if (!dialog.open) dialog.showModal()
    q<HTMLButtonElement>(dialog, '[data-photobank-close]')?.focus()
  }

  const movePreview = (x: number, y: number): void => {
    const width = preview.offsetWidth
    const height = preview.offsetHeight
    const view = document.documentElement
    const left = Math.max(16, Math.min(x + 24, view.clientWidth - width - 16))
    let top = y - height - 20
    if (top < 16) top = y + 28
    top = Math.max(16, Math.min(top, view.clientHeight - height - 16))
    preview.style.setProperty('--preview-x', `${String(left)}px`)
    preview.style.setProperty('--preview-y', `${String(top)}px`)
  }

  const showPreview = (tile: HTMLButtonElement, x: number, y: number): void => {
    selectPreview(Number(tile.dataset['photo']))
    if (!touchLayout.matches) movePreview(x, y)
  }

  const build = async (): Promise<void> => {
    const ticket = ++built
    const columns = Math.max(36, Math.min(190, Math.round(stage.clientWidth / CELL)))
    const rows = Math.max(4, Math.round(columns * LOGO_RATIO))
    const logo = new Image()
    logo.src = logoUrl
    try {
      await logo.decode()
    } catch {
      return
    }
    if (ticket !== built) return

    // Маска: ячейка попадает в мозаику, если под ней достаточно логотипа
    const probe = 4
    const canvas = document.createElement('canvas')
    canvas.width = columns * probe
    canvas.height = rows * probe
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(logo, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data

    // Порядок фото перемешан детерминированно, чтобы соседние ячейки не повторялись подряд
    const order = PHOTOS.map((_, index) => index)
    let seed = 5917
    for (let index = order.length - 1; index > 0; index--) {
      seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0
      const swap = seed % (index + 1)
      const a = order[index] ?? 0
      order[index] = order[swap] ?? 0
      order[swap] = a
    }

    // Ячейки логотипа и их части: знак слева и девять букв; у каждой части свой уровень наполнения
    interface Cell {
      row: number
      col: number
      group: number
    }
    const cells: Cell[] = []
    const bounds = new Map<number, { first: number; last: number }>()
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        let alpha = 0
        for (let y = 0; y < probe; y++) {
          for (let x = 0; x < probe; x++)
            alpha += pixels[((row * probe + y) * canvas.width + col * probe + x) * 4 + 3] ?? 0
        }
        if (alpha / (probe * probe * 255) < 0.05) continue
        const sourceX = ((col + 0.5) / columns) * LOGO_WIDTH
        const nameX = (sourceX - MARK_WIDTH) / (LOGO_WIDTH - MARK_WIDTH)
        const group = sourceX < MARK_WIDTH ? 0 : 1 + LETTER_EDGES.findIndex((edge) => nameX <= edge)
        cells.push({ row, col, group })
        const range = bounds.get(group) ?? { first: row, last: row }
        range.first = Math.min(range.first, row)
        range.last = Math.max(range.last, row)
        bounds.set(group, range)
      }
    }

    const fragment = document.createDocumentFragment()
    const next: HTMLButtonElement[] = []
    for (const { row, col, group } of cells) {
      const range = bounds.get(group)
      if (!range) continue
      // Уровень части: общий уровень плюс разброс по частям; кромка слегка волнистая; нижний ряд всегда заполнен
      const groupFill = Math.max(
        0.3,
        Math.min(
          1,
          0.35 + 0.5 * FILL + 0.3 * Math.sin(group * 2.3 + 0.8) + 0.12 * Math.cos(group * 1.4),
        ),
      )
      const localY = (row - range.first + 0.5) / (range.last - range.first + 1)
      const edge = 0.06 * Math.sin(col * 1.7 + group)
      if (row !== range.last && localY < 1 - groupFill + edge) continue
      const index = order[(col * 7 + row * 3 + next.length) % order.length] ?? 0
      const photo = PHOTOS[index]
      if (!photo) continue
      const tile = document.createElement('button')
      tile.type = 'button'
      tile.className = 'photobank__tile'
      tile.dataset['photo'] = String(index)
      tile.dataset['col'] = String(col)
      tile.dataset['row'] = String(row)
      tile.tabIndex = next.length ? -1 : 0
      tile.setAttribute('aria-label', `${photo.title}. Открыть фото`)
      tile.style.gridColumn = String(col + 1)
      tile.style.gridRow = String(row + 1)
      tile.style.setProperty('--photo', `url("${thumbOf(photo.file)}")`)
      fragment.append(tile)
      next.push(tile)
    }
    // Сетка и слой «пустых» мест обрезаются настоящей векторной маской логотипа: контур чёткий при любом размере ячейки
    const mask = `url("${logoUrl}") center / 100% 100% no-repeat`
    for (const layer of [grid, empty]) {
      layer.style.setProperty('mask', mask)
      layer.style.setProperty('-webkit-mask', mask)
    }
    stage.style.setProperty('--columns', String(columns))
    stage.style.setProperty('--rows', String(rows))
    grid.replaceChildren(fragment)
    // Только визуальная копия: inert исключает повторные кнопки из фокуса и кликов.
    const magnified = grid.cloneNode(true) as HTMLElement
    magnified.removeAttribute('data-photobank-grid')
    magnified.removeAttribute('role')
    magnified.removeAttribute('aria-label')
    lensContent.style.width = `${String(stage.clientWidth)}px`
    lensContent.style.height = `${String(stage.clientHeight)}px`
    const magnifiedEmpty = empty.cloneNode(true) as HTMLElement
    magnifiedEmpty.removeAttribute('data-photobank-empty')
    lensContent.replaceChildren(magnifiedEmpty, magnified)
    hideInspection()
    if (touchLayout.matches) selectPreview(previewSelected)
    tiles = next
    root.dataset['ready'] = ''
  }

  // Мышь исследует увеличенную мозаику; касание выбирает кадр под логотипом.
  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || touchLayout.matches || dialog.open) return
    preview.hidden = true
    moveLens(event.clientX, event.clientY)
  })
  stage.addEventListener('pointerleave', hideInspection)
  grid.addEventListener('pointerdown', (event) => {
    pointerType = event.pointerType
  })
  grid.addEventListener('focusin', (event) => {
    const tile = (event.target as HTMLElement).closest<HTMLButtonElement>('.photobank__tile')
    if (!tile) return
    const box = tile.getBoundingClientRect()
    showPreview(tile, box.left, box.top)
  })
  grid.addEventListener('focusout', () => {
    if (!touchLayout.matches) preview.hidden = true
  })
  grid.addEventListener('click', (event) => {
    const tile = (event.target as HTMLElement).closest<HTMLButtonElement>('.photobank__tile')
    if (!tile) return
    if (event.detail !== 0 && (touchLayout.matches || pointerType === 'touch')) {
      selectPreview(Number(tile.dataset['photo']))
    } else {
      openPhoto(Number(tile.dataset['photo']), tile)
    }
  })
  q<HTMLButtonElement>(root, '[data-photobank-preview-open]')?.addEventListener(
    'click',
    (event) => {
      openPhoto(previewSelected, event.currentTarget as HTMLButtonElement)
    },
  )
  touchLayout.addEventListener('change', () => {
    hideInspection()
    preview.hidden = !touchLayout.matches
    if (touchLayout.matches) selectPreview(previewSelected)
  })
  // Стрелки двигают фокус по ячейкам (в мозаике один tab-stop)
  grid.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    const tile = (event.target as HTMLElement).closest<HTMLButtonElement>('.photobank__tile')
    if (!tile) return
    event.preventDefault()
    const col = Number(tile.dataset['col'])
    const row = Number(tile.dataset['row'])
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    const along = (item: HTMLButtonElement): number =>
      Number(item.dataset[horizontal ? 'col' : 'row'])
    const across = (item: HTMLButtonElement): number =>
      Number(item.dataset[horizontal ? 'row' : 'col'])
    const here = horizontal ? col : row
    const line = horizontal ? row : col
    const candidates = tiles
      .filter((item) => (forward ? along(item) > here : along(item) < here))
      .sort(
        (a, b) =>
          Math.abs(across(a) - line) * 1000 +
          Math.abs(along(a) - here) -
          (Math.abs(across(b) - line) * 1000 + Math.abs(along(b) - here)),
      )
    const target = candidates[0]
    if (!target) return
    tile.tabIndex = -1
    target.tabIndex = 0
    target.focus({ preventScroll: true })
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideInspection()
  })
  addEventListener('scroll', hideInspection, { passive: true })

  // Окно крупного просмотра
  q<HTMLButtonElement>(dialog, '[data-photobank-close]')?.addEventListener('click', () => {
    dialog.close()
  })
  q<HTMLButtonElement>(dialog, '[data-photobank-prev]')?.addEventListener('click', () => {
    showPhoto(selected - 1)
  })
  q<HTMLButtonElement>(dialog, '[data-photobank-next]')?.addEventListener('click', () => {
    showPhoto(selected + 1)
  })
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      showPhoto(selected + (event.key === 'ArrowRight' ? 1 : -1))
    }
  })
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return
    const box = dialog.getBoundingClientRect()
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dialog.close()
  })
  dialog.addEventListener('close', () => {
    opener?.focus({ preventScroll: true })
    if (touchLayout.matches) selectPreview(previewSelected)
  })

  // Перестройка при смене ширины сохраняет точное совпадение мозаики и её увеличенной копии.
  let lastWidth = stage.clientWidth
  let timer = 0
  new ResizeObserver(() => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      const width = stage.clientWidth
      if (Math.abs(width - lastWidth) < 1) return
      lastWidth = width
      void build()
    }, 200)
  }).observe(stage)

  void build()
}
