const MAP_URL = 'https://yandex.ru/map-widget/v1/?z=14&l=map&text='
const ACTIVE = 'is-active'

/** Карта на странице контактов: выбор офиса переключает адрес в виджете Яндекс Карт. */
export const initContactsMap = (): void => {
  const root = document.querySelector<HTMLElement>('[data-contacts-map]')
  const frame = root?.querySelector<HTMLIFrameElement>('[data-map-frame]')

  if (!root || !frame) {
    return
  }

  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-map-query]')

  for (const button of buttons) {
    button.addEventListener('click', () => {
      frame.src = `${MAP_URL}${encodeURIComponent(button.dataset['mapQuery'] ?? '')}`

      for (const other of buttons) {
        const active = other === button

        other.classList.toggle(ACTIVE, active)
        other.setAttribute('aria-pressed', String(active))
      }
    })
  }
}
