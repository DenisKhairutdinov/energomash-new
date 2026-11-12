export const initNewCatalog = (): void => {
  const root = document.querySelector<HTMLElement>('[data-new-catalog]')
  const form = root?.querySelector<HTMLFormElement>('[data-new-filter]')
  if (!root || !form) return
  const cards = [...root.querySelectorAll<HTMLElement>('[data-new-card]')]
  // Размер скрываемых деталей меняется только при загрузке и изменении ширины.
  // При наведении двигаем готовый слой, не анимируем раскладку карточки.
  const detailsObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const card = entry.target.closest<HTMLElement>('[data-new-card]')
      const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
      const value = `${String(height)}px`
      if (card && height > 0 && card.style.getPropertyValue('--new-card-details-height') !== value)
        card.style.setProperty('--new-card-details-height', value)
    }
  })
  for (const card of cards) {
    const details = card.querySelector<HTMLElement>('.new-catalog__card-reveal')
    if (details) detailsObserver.observe(details)
  }
  const sidebar = root.querySelector<HTMLElement>('[data-new-sidebar]')
  const sidebarToggle = root.querySelector<HTMLButtonElement>('[data-new-sidebar-toggle]')
  const inputs = [...form.querySelectorAll<HTMLInputElement>('input')]
  const count = root.querySelector<HTMLElement>('[data-new-count]')
  const reset = root.querySelector<HTMLButtonElement>('[data-new-reset]')
  const empty = root.querySelector<HTMLElement>('[data-new-empty]')
  const title = root.querySelector<HTMLElement>('[data-new-empty-title]')
  const text = root.querySelector<HTMLElement>('[data-new-empty-text]')
  const field = (name: string): HTMLInputElement | undefined =>
    inputs.find((input) => input.name === name)
  const values = (name: string): string[] =>
    inputs.filter((input) => input.name === name && input.checked).map((input) => input.value)
  const type = (): string => values('type')[0] ?? 'semitrailer'
  let lastScrollY = window.scrollY
  const head = root.querySelector<HTMLElement>('.new-catalog__head')
  const updateSidebarPosition = (): void => {
    if (!sidebar || !head) return
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    // Measure the header's normal height even while it slides out on scroll.
    const header = document.querySelector<HTMLElement>('.header')
    const headerBottom = header ? header.offsetTop + header.offsetHeight : 5 * rem
    const top = Math.max(
      headerBottom + rem,
      head.getBoundingClientRect().bottom + window.scrollY + rem,
    )
    sidebar.style.setProperty('--new-filter-top', `${String(top)}px`)
  }
  const setSidebarOpen = (open: boolean): void => {
    if (!sidebar || !sidebarToggle) return
    if (!open) {
      if (form.contains(document.activeElement)) sidebarToggle.focus({ preventScroll: true })
    }
    sidebar.classList.toggle('is-open', open)
    sidebarToggle.setAttribute('aria-expanded', String(open))
    form.inert = !open
  }
  sidebarToggle?.addEventListener('click', () => {
    setSidebarOpen(sidebarToggle.getAttribute('aria-expanded') !== 'true')
  })
  sidebar?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      setSidebarOpen(false)
      sidebarToggle?.focus({ preventScroll: true })
    }
  })
  window.addEventListener(
    'scroll',
    () => {
      if (Math.abs(window.scrollY - lastScrollY) >= 2) {
        lastScrollY = window.scrollY
        if (sidebar?.classList.contains('is-open')) setSidebarOpen(false)
      }
    },
    { passive: true },
  )
  window.addEventListener('resize', updateSidebarPosition)
  new ResizeObserver(updateSidebarPosition).observe(head ?? root)
  updateSidebarPosition()
  const allowedPurposes = (): string[] =>
    type() === 'semitrailer'
      ? ['fuel', 'oil', 'tech-water', 'vacuum']
      : ['fuel', 'refueler', 'oil', 'tech-water', 'drinking-water', 'oil-gathering', 'municipal']
  const matches = (card: HTMLElement, ignoreSections = false): boolean => {
    const purposes = values('purpose'),
      sections = values('sections')
    const from = field('volume-from')?.value ?? '',
      to = field('volume-to')?.value ?? ''
    const volume = Number(card.dataset['volume'])
    return (
      card.dataset['type'] === type() &&
      (!purposes.length || purposes.includes(card.dataset['purpose'] ?? '')) &&
      (ignoreSections || !sections.length || sections.includes(card.dataset['sections'] ?? '')) &&
      (!from || volume >= Number(from)) &&
      (!to || volume <= Number(to))
    )
  }
  const render = (saveUrl = true): void => {
    syncFilterTabs(form)
    for (const label of form.querySelectorAll<HTMLElement>('[data-new-purpose]')) {
      label.hidden = !allowedPurposes().includes(label.dataset['newPurpose'] ?? '')
      const input = label.querySelector<HTMLInputElement>('input')
      if (label.hidden && input) input.checked = false
    }
    let found = 0
    for (const card of cards) {
      card.hidden = !matches(card)
      if (!card.hidden) found++
    }
    for (const input of inputs.filter((input) => input.name === 'sections')) {
      input.disabled =
        !input.checked &&
        !cards.some((card) => matches(card, true) && card.dataset['sections'] === input.value)
    }
    const word =
      found % 10 === 1 && found % 100 !== 11
        ? 'модель'
        : found % 10 >= 2 && found % 10 <= 4 && (found % 100 < 12 || found % 100 > 14)
          ? 'модели'
          : 'моделей'
    if (count) count.textContent = `${String(found)} ${word}`
    if (empty) empty.hidden = found > 0
    const pending = !cards.some((card) => card.dataset['type'] === type())
    if (title)
      title.textContent = pending
        ? 'Модели этого раздела скоро появятся'
        : 'Моделей с такими параметрами нет'
    if (text) text.textContent = 'Измените условия или сбросьте фильтры.'
    if (reset)
      reset.disabled =
        type() === 'semitrailer' &&
        !inputs.some((input) =>
          input.type === 'checkbox' ? input.checked : input.type === 'text' && !!input.value,
        )
    if (saveUrl) {
      const url = new URL(location.href)
      for (const name of ['type', 'purpose', 'sections', 'volume-from', 'volume-to', 'volume'])
        url.searchParams.delete(name)
      if (type() !== 'semitrailer') url.searchParams.set('type', type())
      for (const name of ['purpose', 'sections'])
        if (values(name).length) url.searchParams.set(name, values(name).join(','))
      for (const name of ['volume-from', 'volume-to']) {
        const value = field(name)?.value
        if (value) url.searchParams.set(name, value)
      }
      history.replaceState(null, '', url)
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault()
  })
  form.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'text') {
      event.target.value = event.target.value.replace(/\D/g, '').slice(0, 3)
      render()
    }
  })
  form.addEventListener('change', () => {
    for (const input of inputs.filter((input) => input.type === 'text'))
      if (input.value) input.value = String(Math.min(40, Math.max(16, Number(input.value))))
    const from = field('volume-from'),
      to = field('volume-to')
    if (from?.value && to?.value && Number(from.value) > Number(to.value))
      [from.value, to.value] = [to.value, from.value]
    render()
  })
  form.addEventListener('reset', (event) => {
    event.preventDefault()
    for (const input of inputs) {
      input.checked = input.defaultChecked
      if (input.type === 'text') input.value = ''
      input.disabled = false
    }
    render()
  })
  const readUrl = (): void => {
    const params = new URLSearchParams(location.search)
    for (const input of inputs) {
      if (input.type === 'radio')
        input.checked =
          input.value === (params.get('type') === 'chassis' ? 'chassis' : 'semitrailer')
      else if (input.type === 'checkbox')
        input.checked = (params.get(input.name)?.split(',') ?? []).includes(input.value)
      else
        input.value = (params.get(input.name) ?? params.get('volume') ?? '')
          .replace(/\D/g, '')
          .slice(0, 3)
    }
    render(false)
  }
  window.addEventListener('popstate', readUrl)
  setSidebarOpen(true)
  readUrl()
}

const syncFilterTabs = (root: HTMLElement): void => {
  for (const tabs of root.querySelectorAll<HTMLElement>('.new-product__config-options--switch')) {
    const radios = [...tabs.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    if (radios.length)
      tabs.style.setProperty(
        '--switch-index',
        String(
          Math.max(
            0,
            radios.findIndex((input) => input.checked),
          ),
        ),
      )
  }
}

export const initNewProduct = (): void => {
  const products = [...document.querySelectorAll<HTMLElement>('[data-new-product]')]
  if (!products.length) return
  for (const product of products) {
    const config = product.querySelector<HTMLFormElement>('[data-product-config]')
    if (!config) continue
    const referenceTile = product.querySelector<HTMLElement>('.pdp__specs .pdp__spec')
    if (referenceTile) {
      const syncMaxHeight = (): void => {
        const height = referenceTile.getBoundingClientRect().height
        if (height > 0) config.style.setProperty('--product-spec-height', `${String(height)}px`)
      }
      new ResizeObserver(syncMaxHeight).observe(referenceTile)
      syncMaxHeight()
    }
    const updateConfiguration = (): void => {
      syncFilterTabs(config)
      const lines = [...config.querySelectorAll<HTMLInputElement>('[data-config-fixed]')].map(
        (input) => `${input.dataset['configLabel'] ?? 'Параметр'}: ${input.value}`,
      )
      for (const group of config.querySelectorAll<HTMLElement>('[data-config-group]')) {
        const value =
          group.dataset['configValue'] ??
          group.querySelector<HTMLInputElement>('input:checked')?.value ??
          'Уточнить с менеджером'
        lines.push(`${group.dataset['configLabel'] ?? 'Параметр'}: ${value}`)
      }
      const options = [
        ...product.querySelectorAll<HTMLInputElement>('[data-config-option]:checked'),
      ].map((input) => input.value)
      if (options.length) lines.push(`Опции: ${options.join('; ')}`)
      for (const button of product.querySelectorAll<HTMLElement>('[data-modal-open="quote"]'))
        button.dataset['modalConfiguration'] = lines.join('\n')
    }
    config.addEventListener('submit', (event) => {
      event.preventDefault()
    })
    config.addEventListener('change', updateConfiguration)
    // Поля сбрасываются после события reset.
    config.addEventListener('reset', () => {
      queueMicrotask(updateConfiguration)
    })
    updateConfiguration()
  }
  const id = new URLSearchParams(location.search).get('id')
  let found = false
  for (const product of products) {
    product.hidden = product.dataset['newProduct'] !== id
    if (!product.hidden) {
      found = true
      document.title = `${product.querySelector('h1')?.textContent ?? 'Модель'} — Энергомаш`
    }
  }
  const missing = document.querySelector<HTMLElement>('[data-new-product-missing]')
  if (missing) missing.hidden = found
}
