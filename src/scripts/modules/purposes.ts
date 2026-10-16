const ACTIVE = 'is-active'

/** Каталог по назначению: наведение или фокус на строке показывает её фото (окно справа или фон главы). */
export const initPurposes = (): void => {
  const root = document.querySelector<HTMLElement>('[data-purposes]')

  if (!root) {
    return
  }

  const items = [...root.querySelectorAll<HTMLElement>('[data-purposes-item]')]
  const images = [...root.querySelectorAll<HTMLElement>('[data-purposes-img]')]

  const activate = (index: number): void => {
    for (const [position, image] of images.entries()) {
      image.classList.toggle(ACTIVE, position === index)
    }

    for (const [position, item] of items.entries()) {
      item.classList.toggle(ACTIVE, position === index)
    }
  }

  for (const [index, item] of items.entries()) {
    item.addEventListener('pointerenter', () => {
      activate(index)
    })
    item.addEventListener('focus', () => {
      activate(index)
    })
  }

  activate(0)
}
