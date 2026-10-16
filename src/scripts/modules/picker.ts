/** Быстрый подбор: набор назначений и подсказка по объёму зависят от выбранного типа техники. */
export const initPicker = (): void => {
  const form = document.querySelector<HTMLFormElement>('[data-picker]')

  if (!form) {
    return
  }

  const purpose = form.querySelector<HTMLSelectElement>('[data-picker-purpose]')
  const from = form.querySelector<HTMLInputElement>('[data-volume-from]')
  const to = form.querySelector<HTMLInputElement>('[data-volume-to]')
  const groups = purpose?.querySelectorAll<HTMLOptGroupElement>('optgroup') ?? []

  const apply = (): void => {
    const checked = form.querySelector<HTMLInputElement>('input[name="type"]:checked')

    if (!checked) {
      return
    }

    for (const group of groups) {
      const isCurrent = group.dataset['type'] === checked.value

      group.hidden = !isCurrent
      group.disabled = !isCurrent
    }

    if (purpose?.selectedOptions[0]?.closest('optgroup')?.disabled === true) {
      purpose.value = ''
    }

    if (from) {
      from.placeholder = checked.dataset['volumeMin'] ?? ''
    }

    if (to) {
      to.placeholder = checked.dataset['volumeMax'] ?? ''
    }
  }

  form.addEventListener('change', apply)
  apply()

  // Пустые поля не попадают в адрес
  form.addEventListener('submit', () => {
    for (const input of [from, to]) {
      if (input?.value.trim() === '') {
        input.disabled = true
      }
    }

    if (purpose?.value === '') {
      purpose.disabled = true
    }
  })

  window.addEventListener('pageshow', () => {
    for (const control of form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      'input, select',
    )) {
      control.disabled = false
    }
  })
}
