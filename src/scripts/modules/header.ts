const SOLID_AFTER = 24
const HIDE_AFTER = 240

/** Шапка: над фото прозрачное стекло, после прокрутки плотнее; прячется при движении вниз и возвращается при движении вверх. */
export const initHeader = (): void => {
  const header = document.querySelector<HTMLElement>('[data-header]')

  if (!header) {
    return
  }

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
