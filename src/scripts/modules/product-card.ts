import { photoUrl } from './catalog-data'

const PRODUCT_URL = `${import.meta.env.BASE_URL}product.html?id=`
const STOCK_IN = 'in'
const STOCK_BADGE = 'В наличии'

export interface CardItem {
  id: string
  photos: string[]
  model: string
  code: string | null
  typeLabel: string
  icon: string
  stock: { status: string }
  specs: [string, string | number][]
}

// В данных силуэт шасси назван shassi, а в стилях сайта класс chassis
const drawingClass = (icon: string): string => `drawing--${icon === 'shassi' ? 'chassis' : icon}`

/**
 * Карточка из заготовки (templates/catalog.njk, <template data-catalog-template>): фото или силуэт типа техники,
 * код и плашка наличия, название со ссылкой, характеристики, кнопка запроса стоимости.
 * Нет фото (или оно не загрузилось) — остаётся силуэт с подписью «фото скоро появится».
 */
export const createProductCard = (
  template: HTMLTemplateElement,
  item: CardItem,
): DocumentFragment => {
  const card = template.content.cloneNode(true) as DocumentFragment
  const drawing = card.querySelector<HTMLElement>('[data-card-icon]')
  const soon = card.querySelector<HTMLElement>('[data-card-soon]')
  const code = card.querySelector<HTMLElement>('[data-card-code]')
  const badge = card.querySelector<HTMLElement>('[data-card-badge]')
  const type = card.querySelector<HTMLElement>('[data-card-type]')
  const links = card.querySelectorAll<HTMLAnchorElement>('[data-card-link]')
  const model = card.querySelector<HTMLElement>('[data-card-model]')
  const specs = card.querySelector<HTMLElement>('[data-card-specs]')
  const sample = card.querySelector<HTMLElement>('[data-card-spec]')
  const price = card.querySelector<HTMLElement>('[data-modal-open]')
  const label = `${item.typeLabel} ${item.model}`

  // Окно заявки узнаёт, о какой модели спрашивают; код нужен менеджеру, чтобы отличить одноимённые модели
  if (price) {
    price.dataset['modalModel'] = item.code ? `${item.model} (код ${item.code})` : item.model
  }

  drawing?.classList.add(drawingClass(item.icon))
  drawing?.setAttribute('aria-label', label)

  const photoSource = item.photos.map((name) => photoUrl(name)).find((url) => url !== undefined)

  if (photoSource && drawing) {
    const photo = document.createElement('img')

    photo.className = 'ccard__image'
    photo.src = photoSource
    photo.alt = label
    photo.loading = 'lazy'
    photo.decoding = 'async'
    photo.addEventListener(
      'load',
      () => {
        photo.classList.add('is-loaded')
      },
      { once: true },
    )
    photo.addEventListener(
      'error',
      () => {
        photo.replaceWith(drawing)

        if (soon) {
          soon.hidden = false
        }
      },
      { once: true },
    )
    drawing.replaceWith(photo)
  } else if (soon) {
    soon.hidden = false
  }

  if (code) {
    if (item.code) {
      code.textContent = `Код ${item.code}`
      code.hidden = false
    } else {
      code.remove()
    }
  }

  if (badge) {
    if (item.stock.status === STOCK_IN) {
      badge.textContent = STOCK_BADGE
    } else {
      badge.remove()
    }
  }

  if (type) {
    type.textContent = item.typeLabel
  }

  for (const link of links) {
    link.href = `${PRODUCT_URL}${encodeURIComponent(item.id)}`
  }

  if (model) {
    model.textContent = item.model
  }

  if (specs && sample) {
    sample.remove()

    for (const [name, value] of item.specs) {
      const spec = sample.cloneNode(true) as HTMLElement
      const specLabel = spec.querySelector<HTMLElement>('[data-card-spec-label]')
      const specValue = spec.querySelector<HTMLElement>('[data-card-spec-value]')

      if (specLabel) {
        specLabel.textContent = name
      }

      if (specValue) {
        specValue.textContent = String(value)
      }

      specs.append(spec)
    }
  }

  return card
}
