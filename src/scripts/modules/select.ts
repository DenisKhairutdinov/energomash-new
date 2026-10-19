const OPEN = 'is-open'
const SVG_NS = 'http://www.w3.org/2000/svg'

interface EnhancedSelect {
  /** Пересобирает список после того, как скрипт скрыл или показал группы опций */
  refresh: () => void
}

const createChevron = (): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg')
  const path = document.createElementNS(SVG_NS, 'path')

  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add('select__chevron')
  path.setAttribute('d', 'M6 9l6 6 6-6')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.75')
  svg.append(path)

  return svg
}

/**
 * Заменяет системный выпадающий список своим (шрифты и стиль сайта).
 * Настоящий <select> остаётся в форме и хранит значение; кнопка и список только показывают и меняют его.
 */
export const enhanceSelect = (select: HTMLSelectElement, labelId: string): EnhancedSelect => {
  const wrapper = document.createElement('div')
  const button = document.createElement('button')
  const value = document.createElement('span')
  const list = document.createElement('ul')

  wrapper.className = 'select'
  button.type = 'button'
  button.className = 'select__button'
  button.id = `${labelId}-button`
  button.setAttribute('aria-haspopup', 'listbox')
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-labelledby', `${labelId} ${button.id}`)
  value.className = 'select__value'
  button.append(value, createChevron())

  list.className = 'select__list'
  list.id = `${labelId}-list`
  list.tabIndex = -1
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-labelledby', labelId)
  button.setAttribute('aria-controls', list.id)

  select.before(wrapper)
  select.classList.add('select__native')
  select.tabIndex = -1
  select.setAttribute('aria-hidden', 'true')
  wrapper.append(button, list, select)

  let items: HTMLLIElement[] = []
  let active = 0

  const setActive = (index: number): void => {
    active = Math.max(0, Math.min(items.length - 1, index))

    for (const [position, item] of items.entries()) {
      item.classList.toggle('is-active', position === active)
    }

    const current = items[active]

    if (current) {
      list.setAttribute('aria-activedescendant', current.id)
    }
  }

  /** Список выложен в две колонки сверху вниз: в колонке столько строк, сколько половина пунктов. */
  const rowCount = (): number => Math.max(1, Math.ceil(items.length / 2))

  const close = (restoreFocus: boolean): void => {
    wrapper.classList.remove(OPEN)
    button.setAttribute('aria-expanded', 'false')

    if (restoreFocus) {
      button.focus()
    }
  }

  const choose = (index: number): void => {
    const item = items[index]

    if (!item) {
      return
    }

    select.value = item.dataset['value'] ?? ''
    select.dispatchEvent(new Event('change', { bubbles: true }))
    close(true)
  }

  const open = (): void => {
    const selectedIndex = items.findIndex((item) => item.dataset['value'] === select.value)

    wrapper.classList.add(OPEN)
    button.setAttribute('aria-expanded', 'true')
    setActive(Math.max(0, selectedIndex))
    list.focus({ preventScroll: true })
  }

  const refresh = (): void => {
    const options = [...select.options].filter(
      (option) => !option.disabled && !option.closest('optgroup')?.disabled,
    )

    items = options.map((option, position) => {
      const item = document.createElement('li')

      item.className = 'select__option'
      item.id = `${labelId}-option-${String(position)}`
      item.dataset['value'] = option.value
      item.textContent = option.textContent
      item.setAttribute('role', 'option')
      item.style.setProperty('--i', String(position))
      item.setAttribute('aria-selected', String(option.value === select.value))
      item.addEventListener('click', () => {
        choose(position)
      })

      return item
    })

    list.replaceChildren(...items)
    list.style.setProperty('--rows', String(rowCount()))
    value.textContent = select.selectedOptions[0]?.textContent ?? ''
  }

  button.addEventListener('click', () => {
    if (wrapper.classList.contains(OPEN)) {
      close(false)
    } else {
      open()
    }
  })

  button.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      open()
    }
  })

  list.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive(active + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive(active - 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        setActive(active + rowCount())
        break
      case 'ArrowLeft':
        event.preventDefault()
        setActive(active - rowCount())
        break
      case 'Home':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
        event.preventDefault()
        setActive(items.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        break
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      case 'Tab':
        close(false)
        break
      default:
    }
  })

  document.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Node && !wrapper.contains(event.target)) {
      close(false)
    }
  })

  // Значение могли сбросить снаружи (смена типа техники, возврат на страницу)
  select.addEventListener('change', refresh)
  refresh()

  return { refresh }
}
