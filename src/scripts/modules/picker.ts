import { enhanceSelect } from './select'

/** Быстрый подбор: набор назначений и подсказка по объёму зависят от выбранного типа техники. Форм может быть несколько (варианты hero). */
export const initPicker = (): void => {
  for (const form of document.querySelectorAll<HTMLFormElement>('[data-picker]')) {
    setupPicker(form)
  }
}

const setupPicker = (form: HTMLFormElement): void => {
  const purpose = form.querySelector<HTMLSelectElement>('[data-picker-purpose]')
  const from = form.querySelector<HTMLInputElement>('[data-volume-from]')
  const to = form.querySelector<HTMLInputElement>('[data-volume-to]')
  const groups = purpose?.querySelectorAll<HTMLOptGroupElement>('optgroup') ?? []
  const custom = purpose
    ? enhanceSelect(purpose, purpose.dataset['labelId'] ?? 'picker-purpose-label')
    : undefined

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

    custom?.refresh()
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
