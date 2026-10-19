const ACTIVE = 'is-active'
const COUNT = 4
const STORAGE_PREFIX = 'dv:'
const PARAMETER = 'v'

type Choices = Record<string, number>

const readChoices = (): Choices => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${location.pathname}`)

    return raw ? (JSON.parse(raw) as Choices) : {}
  } catch {
    return {}
  }
}

const writeChoices = (choices: Choices): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${location.pathname}`, JSON.stringify(choices))
  } catch {
    // без хранилища выбор действует до перезагрузки
  }
}

const sectionMax = (section: HTMLElement): number => Number(section.dataset['vmax']) || COUNT

const makeButtons = (
  current: number,
  max: number,
  onPick: (value: number) => void,
): HTMLElement => {
  const group = document.createElement('span')

  group.className = 'dv-group'

  for (let value = 0; value <= max; value += 1) {
    const button = document.createElement('button')

    button.type = 'button'
    button.className = `dv-button${value === current ? ` ${ACTIVE}` : ''}`
    button.textContent = value === 0 ? 'Тек.' : String(value)
    button.setAttribute('aria-label', value === 0 ? 'Текущий дизайн' : `Вариант ${String(value)}`)
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onPick(value)
    })
    group.append(button)
  }

  return group
}

/**
 * Временный выбор дизайна секций (на странице несколько вариантов каждой секции, `data-vsec` — идентификатор).
 * Секция показывает мини-переключатель в углу при наведении, общая панель внизу применяет вариант ко всем секциям страницы.
 * Выбор хранится в localStorage по адресу страницы; ?v=N применяет вариант ко всем секциям. 0 — текущий дизайн.
 */
export const initVariants = (): void => {
  const sections = [...document.querySelectorAll<HTMLElement>('[data-vsec]')]

  if (sections.length === 0) {
    return
  }

  const choices = readChoices()
  const fromUrl = Number(new URLSearchParams(location.search).get(PARAMETER))
  const urlValue =
    Number.isInteger(fromUrl) && fromUrl >= 1 && fromUrl <= COUNT ? fromUrl : undefined
  const bars = new Map<HTMLElement, HTMLElement>()

  const apply = (section: HTMLElement, value: number): void => {
    if (value === 0) {
      delete section.dataset['v']
    } else {
      section.dataset['v'] = String(value)
    }

    const bar = bars.get(section)

    if (bar) {
      for (const [index, button] of [...bar.querySelectorAll('.dv-button')].entries()) {
        button.classList.toggle(ACTIVE, index === value)
      }
    }
  }

  for (const section of sections) {
    const id = section.dataset['vsec'] ?? ''
    const bar = document.createElement('div')

    bar.className = 'dv-bar'
    bar.append(
      makeButtons(0, sectionMax(section), (value) => {
        choices[id] = value
        writeChoices(choices)
        apply(section, value)
      }),
    )
    section.append(bar)
    bars.set(section, bar)
    apply(section, Math.min(urlValue ?? choices[id] ?? 0, sectionMax(section)))
  }

  const panel = document.createElement('div')
  const label = document.createElement('span')

  panel.className = 'dv-panel'
  label.className = 'dv-label'
  label.textContent = 'Все секции'
  panel.append(
    label,
    makeButtons(0, COUNT, (value) => {
      for (const section of sections) {
        const next = Math.min(value, sectionMax(section))

        choices[section.dataset['vsec'] ?? ''] = next
        apply(section, next)
      }

      writeChoices(choices)
    }),
  )
  document.body.append(panel)
}
