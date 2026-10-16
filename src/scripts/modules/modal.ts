import { getLenis } from './smooth'

interface ModalKind {
  title: string
  text: string
}

const KINDS: Record<string, ModalKind> = {
  call: {
    title: 'Заказать звонок',
    text: 'Оставьте телефон. Менеджер перезвонит в рабочее время, уточнит задачу и подскажет подходящую модель.',
  },
  calc: {
    title: 'Получить расчёт',
    text: 'Оставьте телефон. Менеджер уточнит модель и условия, пришлёт расчёт платежа с учётом лизинга и субсидии.',
  },
  consult: {
    title: 'Получить консультацию',
    text: 'Оставьте телефон. Ответим на вопросы по срокам, лизингу, гарантии и документам.',
  },
  price: {
    title: 'Узнать стоимость',
    text: 'Оставьте телефон. Рассчитаем стоимость, подберём комплектацию и пришлём коммерческое предложение.',
  },
}

const PHONE_MIN_DIGITS = 10

const hasPhone = (value: string): boolean => value.replaceAll(/\D/g, '').length >= PHONE_MIN_DIGITS

const setHidden = (element: Element | null, isHidden: boolean): void => {
  if (element instanceof HTMLElement) {
    element.hidden = isHidden
  }
}

/** Проверка и отправка формы заявки. Отправки на сервер пока нет: показываем подтверждение. */
const initForm = (form: HTMLFormElement): void => {
  form.addEventListener('submit', (event) => {
    event.preventDefault()

    const data = new FormData(form)
    const phoneValue = data.get('phone')
    const phone = typeof phoneValue === 'string' ? phoneValue : ''
    const isPhoneValid = hasPhone(phone)
    const isConsentGiven = data.get('consent') === 'on'

    setHidden(form.querySelector('[data-error="phone"]'), isPhoneValid)
    setHidden(form.querySelector('[data-error="consent"]'), isConsentGiven)
    form.querySelector('[name="phone"]')?.setAttribute('aria-invalid', String(!isPhoneValid))

    if (!isPhoneValid || !isConsentGiven) {
      form.querySelector<HTMLElement>(isPhoneValid ? '[name="consent"]' : '[name="phone"]')?.focus()

      return
    }

    // TODO: подключить отправку заявки, когда появится бэкенд
    setHidden(form.querySelector('[data-form-done]'), false)
    form.reset()
  })
}

export const initModal = (): void => {
  const dialog = document.querySelector<HTMLDialogElement>('[data-modal]')

  for (const form of document.querySelectorAll<HTMLFormElement>('[data-request-form]')) {
    initForm(form)
  }

  if (!dialog) {
    return
  }

  const title = dialog.querySelector('[data-modal-title]')
  const text = dialog.querySelector('[data-modal-text]')
  const modelRow = dialog.querySelector('[data-modal-model-row]')
  const modelName = dialog.querySelector('[data-modal-model]')
  const kindField = dialog.querySelector<HTMLInputElement>('[name="kind"]')
  const modelField = dialog.querySelector<HTMLInputElement>('[name="model"]')

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    const opener = event.target.closest<HTMLElement>('[data-modal-open]')

    if (!opener) {
      return
    }

    const kind = opener.dataset['modalOpen'] ?? 'call'
    const model = opener.dataset['modalModel'] ?? ''
    const content = KINDS[kind] ?? KINDS['call']

    if (title && text && content) {
      title.textContent = content.title
      text.textContent = content.text
    }

    if (kindField) {
      kindField.value = kind
    }

    if (modelField) {
      modelField.value = model
    }

    if (modelName) {
      modelName.textContent = model
    }

    setHidden(modelRow, model === '')
    setHidden(dialog.querySelector('[data-form-done]'), true)
    getLenis()?.stop()
    dialog.showModal()
  })

  dialog.addEventListener('close', () => {
    getLenis()?.start()
  })

  dialog.addEventListener('click', (event) => {
    const isClose =
      event.target instanceof Element && event.target.closest('[data-modal-close]') !== null

    // Клик по подложке: цель события сам dialog, а не его содержимое
    if (isClose || event.target === dialog) {
      dialog.close()
    }
  })
}
