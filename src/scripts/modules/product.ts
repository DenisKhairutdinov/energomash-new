import { loadCatalog, modelUrl, photoUrl } from './catalog-data'

const STOCK_IN = 'in'
const RELATED_COUNT = 4
const ACTIVE = 'is-active'

type ParameterValue = string | number | string[] | null

interface Item {
  id: string
  model: string
  code: string | null
  type: string
  purpose: string
  typeLabel: string
  icon: string
  photos: string[]
  stock: { status: string; inStock: number; expected: number }
  params: Record<string, ParameterValue> & { chassisLabels?: string[] }
  specs: [string, string | number][]
}

interface DictionaryOption {
  value: string
  label: string
}

interface DictionaryGroup {
  name: string
  label: string
  kind: string
  unit?: string
  options?: DictionaryOption[]
}

interface PurposeCopy {
  title: string
  text: string
  features: string[]
}

interface ProductCopy {
  purposes: Record<string, PurposeCopy>
  types: Record<string, string>
}

const readJson = (id: string): unknown => {
  const element = document.querySelector<HTMLScriptElement>(`#${id}`)

  return element?.textContent ? JSON.parse(element.textContent) : undefined
}

// Параметры, которые не показываем строкой таблицы: назначение и наличие вынесены выше, «дополнительно» служебное
const HIDDEN_PARAMETERS = new Set(['stock', 'purpose', 'kit'])

interface SpecTile {
  label: string
  value: string
  isNumber: boolean
}

// Значение длиннее этого числа знаков занимает две ячейки сетки плиток
const WIDE_VALUE = 22

const drawingClass = (icon: string): string => `drawing--${icon === 'shassi' ? 'chassis' : icon}`

const setText = (selector: string, text: string): void => {
  const element = document.querySelector<HTMLElement>(selector)

  if (element) {
    element.textContent = text
  }
}

const formatValue = (group: DictionaryGroup, item: Item): string | undefined => {
  const raw = item.params[group.name]

  if (group.name === 'chassis') {
    const labels = item.params.chassisLabels ?? []

    return labels.length > 0 ? labels.join(', ') : undefined
  }

  if (raw === null || raw === undefined || (Array.isArray(raw) && raw.length === 0)) {
    return undefined
  }

  if (group.kind === 'range') {
    return `${String(raw)}${group.unit ? `\u00A0${group.unit}` : ''}`
  }

  if (group.kind === 'flag') {
    return 'Да'
  }

  const values = Array.isArray(raw) ? raw : [String(raw)]
  const labels = values.map(
    (value) => group.options?.find((option) => option.value === value)?.label ?? value,
  )

  return group.name === 'ssu' ? `${labels.join(', ')}\u00A0мм` : labels.join(', ')
}

const renderGallery = (item: Item): void => {
  const stage = document.querySelector<HTMLElement>('[data-pdp-stage]')
  const thumbs = document.querySelector<HTMLUListElement>('[data-pdp-thumbs]')
  const drawing = document.querySelector<HTMLElement>('[data-pdp-drawing]')
  const soon = document.querySelector<HTMLElement>('[data-pdp-soon]')
  const label = `${item.typeLabel} ${item.model}`
  const urls = item.photos
    .map((name) => photoUrl(name))
    .filter((url): url is string => url !== undefined)

  drawing?.classList.add(drawingClass(item.icon))

  if (!stage || urls.length === 0) {
    if (soon) {
      soon.hidden = false
    }

    return
  }

  drawing?.remove()

  const main = document.createElement('img')

  main.className = 'pdp__photo'
  main.alt = label
  main.src = urls[0] ?? ''
  stage.prepend(main)

  if (!thumbs || urls.length < 2) {
    return
  }

  thumbs.hidden = false

  for (const [index, url] of urls.entries()) {
    const li = document.createElement('li')
    const button = document.createElement('button')
    const image = document.createElement('img')

    button.type = 'button'
    button.className = `pdp__thumb${index === 0 ? ` ${ACTIVE}` : ''}`
    button.setAttribute('aria-label', `Фото ${String(index + 1)}`)
    image.src = url
    image.alt = ''
    image.loading = 'lazy'
    button.append(image)
    button.addEventListener('click', () => {
      main.src = url

      for (const other of thumbs.querySelectorAll('.pdp__thumb')) {
        other.classList.toggle(ACTIVE, other === button)
      }
    })
    li.append(button)
    thumbs.append(li)
  }
}

const renderSpecs = (item: Item, dictionary: DictionaryGroup[]): void => {
  const table = document.querySelector<HTMLElement>('[data-pdp-specs]')

  if (!table) {
    return
  }

  // Готовая страница уже содержит характеристики (для поиска и без JS): строим заново из словаря, чтобы не задваивать
  table.replaceChildren()

  // Плитки: сначала числовые параметры (крупные цифры), затем текстовые; длинные значения занимают две ячейки
  const numeric: SpecTile[] = []
  const textual: SpecTile[] = []

  for (const group of dictionary) {
    if (HIDDEN_PARAMETERS.has(group.name)) {
      continue
    }

    const value = formatValue(group, item)

    if (value === undefined) {
      continue
    }

    const isNumber = group.kind === 'range'

    ;(isNumber ? numeric : textual).push({ label: group.label, value, isNumber })
  }

  const tiles = [...numeric, ...textual]

  if (item.code) {
    tiles.push({ label: 'Код', value: item.code, isNumber: false })
  }

  for (const { label, value, isNumber } of tiles) {
    const wrap = document.createElement('div')
    const dt = document.createElement('dt')
    const dd = document.createElement('dd')

    wrap.className = 'pdp__spec'
    wrap.classList.toggle('pdp__spec--num', isNumber)
    wrap.classList.toggle('pdp__spec--wide', value.length > WIDE_VALUE)
    dt.textContent = label
    dd.textContent = value
    wrap.append(dt, dd)
    table.append(wrap)
  }

  table.hidden = tiles.length === 0
}

const renderAbout = (item: Item, copy: ProductCopy | undefined): void => {
  const section = document.querySelector<HTMLElement>('[data-pdp-about]')
  const purpose = copy?.purposes[item.purpose]

  if (!section || !copy || !purpose) {
    return
  }

  setText('[data-pdp-about-title]', purpose.title)
  setText('[data-pdp-about-text]', `${purpose.text} ${copy.types[item.type] ?? ''}`.trim())

  const features = document.querySelector<HTMLElement>('[data-pdp-features]')

  // На готовой странице модели список уже есть в HTML: строим заново, чтобы не задваивать
  features?.replaceChildren()

  for (const feature of purpose.features) {
    const li = document.createElement('li')

    li.textContent = feature
    features?.append(li)
  }

  section.hidden = false
}

const STATUS_LABEL = (item: Item): string =>
  item.stock.status === STOCK_IN ? 'В наличии' : item.stock.expected > 0 ? 'Ожидается' : 'Под заказ'

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)

  node.className = className

  if (text !== undefined) {
    node.textContent = text
  }

  return node
}

// Похожие модели карточками: фото сверху, ниже название, наличие и ключевые характеристики; вся карточка ссылка
const renderRelated = (item: Item, items: Item[]): void => {
  const section = document.querySelector<HTMLElement>('[data-pdp-related-section]')
  const list = document.querySelector<HTMLElement>('[data-pdp-related]')

  if (!section || !list) {
    return
  }

  const volume = Number(item.params['volume'] ?? 0)
  const byPhoto = (a: Item, b: Item): number =>
    Number(b.photos.length > 0) - Number(a.photos.length > 0)
  const byVolume = (a: Item, b: Item): number =>
    Math.abs(Number(a.params['volume'] ?? 0) - volume) -
    Math.abs(Number(b.params['volume'] ?? 0) - volume)
  const related = items
    .filter(
      (other) => other.id !== item.id && other.type === item.type && other.purpose === item.purpose,
    )
    .toSorted((a, b) => byPhoto(a, b) || byVolume(a, b))
    .slice(0, RELATED_COUNT)

  for (const other of related) {
    const li = el('li', 'pdp__card')
    const link = el('a', 'pdp__card-link')
    const photo = el('span', 'pdp__card-photo')
    const body = el('span', 'pdp__card-body')
    const head = el('span', 'pdp__card-head')
    const specs = el('span', 'pdp__card-specs')
    const url = other.photos.map((name) => photoUrl(name)).find((value) => value !== undefined)

    link.href = modelUrl(other.id)

    if (url) {
      const image = el('img', 'pdp__card-image')

      image.src = url
      image.alt = `${other.typeLabel} ${other.model}`
      image.width = 1200
      image.height = 800
      image.loading = 'lazy'
      photo.append(image)
    } else {
      photo.classList.add('drawing', drawingClass(other.icon))
    }

    head.append(
      el('span', 'pdp__card-title', other.model),
      el('span', 'pdp__card-badge', STATUS_LABEL(other)),
    )

    for (const [name, value] of other.specs.slice(0, 4)) {
      const spec = el('span', 'pdp__card-spec')

      spec.append(
        el('span', 'pdp__card-spec-label', name),
        el('span', 'pdp__card-spec-value', String(value)),
      )
      specs.append(spec)
    }

    body.append(head, el('span', 'pdp__card-type', other.typeLabel), specs)
    link.append(photo, body)
    li.append(link)
    list.append(li)
  }

  section.hidden = related.length === 0
}

/**
 * Страница модели (product.html?id=…): находит модель в общем файле каталога и показывает галерею, таблицу параметров,
 * описание назначения и похожие модели. Подписи берёт из встроенного словаря фильтров. Модели нет — сообщение со ссылкой в каталог.
 */
export const initProduct = async (): Promise<void> => {
  const root = document.querySelector<HTMLElement>('[data-product]')

  if (!root) {
    return
  }

  // Готовая страница модели несёт id в атрибуте, оболочка product.html получает его из адреса
  const id = root.dataset['modelId'] ?? new URLSearchParams(location.search).get('id')
  const dictionary = (readJson('catalog-dictionary') as DictionaryGroup[] | undefined) ?? []
  const copy = readJson('product-copy') as { product: ProductCopy } | ProductCopy | undefined
  const productCopy = copy && 'product' in copy ? copy.product : copy
  const missing = root.querySelector<HTMLElement>('[data-pdp-missing]')

  try {
    const { items } = (await loadCatalog()) as { items: Item[] }
    const item = items.find((candidate) => candidate.id === id)

    if (!item) {
      root.querySelector<HTMLElement>('.pdp__hero')?.setAttribute('hidden', '')

      if (missing) {
        missing.hidden = false
      }

      return
    }

    if (!root.dataset['modelId']) {
      document.title = `${item.model} — Энергомаш`
    }
    setText('[data-pdp-type]', item.typeLabel)
    setText('[data-pdp-title]', item.model)

    const status = root.querySelector<HTMLElement>('[data-pdp-status]')

    if (status) {
      status.hidden = false
      status.textContent =
        item.stock.status === STOCK_IN
          ? 'В наличии'
          : item.stock.expected > 0
            ? 'Ожидается'
            : 'Под заказ'
    }

    for (const button of root.querySelectorAll<HTMLElement>('[data-modal-model]')) {
      button.dataset['modalModel'] = item.code ? `${item.model} (код ${item.code})` : item.model
    }

    renderGallery(item)
    renderSpecs(item, dictionary)
    renderAbout(item, productCopy)
    renderRelated(item, items)
  } catch {
    if (missing) {
      missing.hidden = false
    }
  }
}
