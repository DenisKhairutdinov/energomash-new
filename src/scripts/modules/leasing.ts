const PRICE_MIN = 500_000
const PRICE_MAX = 15_000_000
const MONTHS_IN_YEAR = 12

// Неразрывный пробел между суммой и знаком рубля
const NBSP = '\u00A0'

const formatMoney = (value: number): string =>
  `${Math.round(value).toLocaleString('ru-RU')}${NBSP}₽`

const parseNumber = (text: string): number => Number(text.replaceAll(/\D/g, ''))

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/**
 * Калькулятор лизинга. Расчёт ориентировочный: удорожание считается простым процентом за срок,
 * субсидия уменьшает финансируемую сумму. Точные условия подтверждает лизинговая компания.
 */
export const initLeasing = (): void => {
  const root = document.querySelector<HTMLElement>('[data-leasing]')

  if (!root) {
    return
  }

  const pick = (selector: string): Element | null => root.querySelector(selector)
  const pickInput = (selector: string): HTMLInputElement | null =>
    root.querySelector<HTMLInputElement>(selector)

  const priceInput = pickInput('[data-price]')
  const priceRange = pickInput('[data-price-range]')
  const advanceRange = pickInput('[data-advance-range]')
  const termRange = pickInput('[data-term-range]')
  const subsidyToggle = pickInput('[data-subsidy]')
  const advanceOut = pick('[data-advance-out]')
  const termOut = pick('[data-term-out]')
  const payment = pick('[data-payment]')
  const advanceSum = pick('[data-advance-sum]')
  const subsidySum = pick('[data-subsidy-sum]')
  const subsidyRow = pick('[data-subsidy-row]')
  const total = pick('[data-total]')
  const overpay = pick('[data-overpay]')
  const note = pick('[data-note]')

  if (!priceInput || !priceRange || !advanceRange || !termRange) {
    return
  }

  const subsidyShare = Number(root.dataset['subsidyShare'] ?? 0)
  const subsidyCap = Number(root.dataset['subsidyCap'] ?? 0)

  const partner = (): HTMLInputElement | null =>
    root.querySelector<HTMLInputElement>('input[name="partner"]:checked')

  const setText = (element: Element | null, value: string): void => {
    if (element) {
      element.textContent = value
    }
  }

  const calculate = (): void => {
    const chosen = partner()
    const minAdvance = Number(chosen?.dataset['advance'] ?? 0)
    const maxTerm = Number(chosen?.dataset['term'] ?? 60)
    const rate = Number(chosen?.dataset['rate'] ?? 0)

    // Условия партнёра ограничивают ползунки: аванс не меньше, срок не больше его значений
    advanceRange.min = String(minAdvance)
    termRange.max = String(maxTerm)

    const price = clamp(parseNumber(priceInput.value), PRICE_MIN, PRICE_MAX)
    const advancePercent = Math.max(Number(advanceRange.value), minAdvance)
    const term = Math.min(Number(termRange.value), maxTerm)
    const isSubsidy = subsidyToggle?.checked ?? false

    const advance = (price * advancePercent) / 100
    const subsidy = isSubsidy ? Math.min((price * subsidyShare) / 100, subsidyCap) : 0
    const financed = Math.max(price - advance - subsidy, 0)
    const payments = financed * (1 + (rate / 100) * (term / MONTHS_IN_YEAR))
    const monthly = payments / term

    setText(advanceOut, String(advancePercent))
    setText(termOut, String(term))
    setText(payment, formatMoney(monthly))
    setText(advanceSum, formatMoney(advance))
    setText(subsidySum, formatMoney(subsidy))
    setText(total, formatMoney(advance + payments))
    setText(overpay, formatMoney(payments - financed))
    setText(
      note,
      `${chosen?.dataset['name'] ?? 'Партнёр'}: аванс от ${String(minAdvance)}%, срок до ${String(maxTerm)} мес., удорожание ${String(rate)}% в год. Расчёт ориентировочный.`,
    )

    if (subsidyRow instanceof HTMLElement) {
      subsidyRow.hidden = !isSubsidy
    }
  }

  const syncPriceFromInput = (): void => {
    const price = clamp(parseNumber(priceInput.value), PRICE_MIN, PRICE_MAX)

    priceRange.value = String(price)
    calculate()
  }

  priceInput.addEventListener('input', syncPriceFromInput)
  priceInput.addEventListener('blur', () => {
    const price = clamp(parseNumber(priceInput.value), PRICE_MIN, PRICE_MAX)

    priceInput.value = price.toLocaleString('ru-RU')
  })

  priceRange.addEventListener('input', () => {
    priceInput.value = Number(priceRange.value).toLocaleString('ru-RU')
    calculate()
  })

  for (const element of [advanceRange, termRange]) {
    element.addEventListener('input', calculate)
  }

  subsidyToggle?.addEventListener('change', calculate)
  root.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.name === 'partner') {
      calculate()
    }
  })

  calculate()
}
