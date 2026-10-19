interface Purpose {
  value: string
  title: string
}

const NBSP = ' '

/**
 * Быстрый подбор на главной. При смене типа техники меняются набор назначений (чипы) и границы объёма (полуприцепы 16–40 м³,
 * автоцистерны 9–22 м³); ползунки объёма двойные, читаемое значение рядом. Каталог не грузится. Без скрипта остаётся обычная форма:
 * type, purpose, volume-from, volume-to, in-stock уходят в каталог через адрес.
 */
export const initPicker = (): void => {
  for (const form of document.querySelectorAll<HTMLFormElement>('[data-picker]')) {
    setupPicker(form)
  }
}

const setupPicker = (form: HTMLFormElement): void => {
  const chipsBox = form.querySelector<HTMLElement>('[data-picker-chips]')
  const fromInput = form.querySelector<HTMLInputElement>('[data-volume-from]')
  const toInput = form.querySelector<HTMLInputElement>('[data-volume-to]')
  const slider = form.querySelector<HTMLElement>('[data-picker-slider]')
  const output = form.querySelector<HTMLOutputElement>('[data-picker-volume]')

  if (!chipsBox || !fromInput || !toInput || !slider) {
    return
  }

  let purposesByType: Record<string, Purpose[]> = {}
  let lastChecked: HTMLInputElement | null = null

  try {
    purposesByType = JSON.parse(form.dataset['purposes'] ?? '{}') as Record<string, Purpose[]>
  } catch {
    purposesByType = {}
  }

  const checkedType = (): HTMLInputElement | null =>
    form.querySelector<HTMLInputElement>('input[name="type"]:checked')

  const bounds = (): [number, number] => {
    const radio = checkedType()

    return [Number(radio?.dataset['volumeMin'] ?? 0), Number(radio?.dataset['volumeMax'] ?? 0)]
  }

  const renderChips = (type: string, keep: string): void => {
    const options: Purpose[] = purposesByType[type] ?? []
    const selected = options.some((option) => option.value === keep) ? keep : ''

    lastChecked = null

    chipsBox.replaceChildren(
      ...options.map((option) => {
        const label = document.createElement('label')
        const input = document.createElement('input')
        const text = document.createElement('span')

        label.className = 'picker__chip'
        input.className = 'picker__chip-input'
        input.type = 'radio'
        input.name = 'purpose'
        input.value = option.value
        input.checked = option.value === selected
        text.className = 'picker__chip-label'
        text.textContent = option.title
        label.append(input, text)

        return label
      }),
    )
  }

  const paint = (): void => {
    const [min, max] = bounds()
    const span = Math.max(max - min, 1)
    const from = Number(fromInput.value)
    const to = Number(toInput.value)

    slider.style.setProperty('--from', String(((from - min) / span) * 100))
    slider.style.setProperty('--to', String(((to - min) / span) * 100))

    if (output) {
      output.textContent = `${String(from)}–${String(to)}${NBSP}м³`
    }
  }

  const applyType = (): void => {
    const [min, max] = bounds()
    const keep = form.querySelector<HTMLInputElement>('input[name="purpose"]:checked')?.value ?? ''

    for (const input of [fromInput, toInput]) {
      input.min = String(min)
      input.max = String(max)
    }

    fromInput.value = String(min)
    toInput.value = String(max)
    renderChips(checkedType()?.value ?? '', keep)
    paint()
  }

  form.addEventListener('input', (event) => {
    // Ползунки не пересекаются: тот, что тянут, упирается во второй
    if (event.target === fromInput && Number(fromInput.value) > Number(toInput.value)) {
      fromInput.value = toInput.value
    }

    if (event.target === toInput && Number(toInput.value) < Number(fromInput.value)) {
      toInput.value = fromInput.value
    }

    paint()
  })

  // Назначение необязательно: повторный клик по выбранному чипу снимает выбор
  chipsBox.addEventListener('click', (event) => {
    const input = event.target

    if (!(input instanceof HTMLInputElement) || input.name !== 'purpose') {
      return
    }

    if (lastChecked === input) {
      input.checked = false
      lastChecked = null
    } else {
      lastChecked = input
    }
  })

  form.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.name === 'type') {
      applyType()
    }
  })

  // Значения по умолчанию (весь диапазон объёма) не попадают в адрес
  form.addEventListener('submit', () => {
    const [min, max] = bounds()

    if (Number(fromInput.value) <= min) {
      fromInput.disabled = true
    }

    if (Number(toInput.value) >= max) {
      toInput.disabled = true
    }
  })

  window.addEventListener('pageshow', () => {
    for (const control of form.querySelectorAll<HTMLInputElement>('input')) {
      control.disabled = false
    }
  })

  renderChips(checkedType()?.value ?? '', '')
  paint()
}
