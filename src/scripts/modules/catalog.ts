import { loadCatalog, photoUrl } from './catalog-data'
import { createProductCard, type CardItem } from './product-card'
import { isSearchMatch, parseQuery } from './search-match'
import { enhanceSelect } from './select'

const GROUP_SELECTOR = '[data-catalog-group]'
const OPTION_SELECTOR = '[data-catalog-option]'

const SEARCH_PARAMETER = 'q'
const SEARCH_INPUT_SELECTOR = '[data-search-input]'

const TYPE_FIELD = 'type'
const VOLUME_FIELD = 'volume'
const VOLUME_MAX_LENGTH = 3
// Пока тип техники не выбран, тип в отборе не участвует
const NO_TYPE = 'none'
// Переключатель «Навесное оборудование»: выключен — такие позиции скрыты, включён — только навесное оборудование
const KIT_FIELD = 'kit'
const KIT_VALUE = 'kit'
// Ссылки с главной передают наличие как in-stock=1; в фильтре это значение «в наличии» группы stock
const STOCK_FLAG = 'in-stock'
const STOCK_FIELD = 'stock'
const STOCK_IN = 'in'
// Снятие одного значения может сделать недоступным другое: пересчёт повторяется, пока выбор не устоится
const NORMALIZE_PASSES = 5
// Карточек в порции: кратно восьми (ритм сетки: одна широкая карточка и семь обычных)
const BATCH_SIZE = 16
const PRELOAD_MARGIN = '0px 0px 100% 0px'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
// Появление карточек при прокрутке: вошедшие вместе выезжают друг за другом
const PENDING_CLASS = 'is-pending'
const REVEALED_CLASS = 'is-revealed'
const REVEAL_VISIBLE_SHARE = 0.12
const REVEAL_STAGGER = 60
const REVEAL_STAGGER_LIMIT = 360
const REVEAL_TIME = 1200

type ParameterValue = string | number | string[] | null

interface CatalogItem extends CardItem {
  type: string
  params: Record<string, ParameterValue>
}

interface FilterState {
  type: string
  volumeFrom: number
  volumeTo: number
  selected: Map<string, Set<string>>
}

// Склонение слова «модель» по числу: 1 модель, 2–4 модели, 5–20 и 11–14 моделей
const pluralModels = (count: number): string => {
  const lastTwo = count % 100

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'моделей'
  }

  const last = count % 10

  if (last === 1) {
    return 'модель'
  }

  return last >= 2 && last <= 4 ? 'модели' : 'моделей'
}

// Пустое поле — «границы нет», а не ноль
const readNumber = (input: HTMLInputElement | null): number =>
  input && input.value.trim() !== '' ? Number(input.value) : Number.NaN

// Значение параметра всегда список строк: у машины может быть несколько подходящих шасси
const getValues = (item: CatalogItem, name: string): string[] => {
  const value = item.params[name]

  if (value === null || value === undefined) {
    return []
  }

  return Array.isArray(value) ? value : [String(value)]
}

const getVolume = (item: CatalogItem): number => Number(item.params[VOLUME_FIELD] ?? Number.NaN)

// Сортировка выдачи. По умолчанию сначала модели с фото, затем в наличии: карточки с чертежом-заглушкой уходят в конец
const SORT_FIELD = 'sort'
const SORT_DEFAULT = 'rec'
const SORT_VALUES = new Set([SORT_DEFAULT, 'stock', 'volume-asc', 'volume-desc', 'name'])

const hasPhoto = (item: CatalogItem): boolean =>
  item.photos.some((name) => photoUrl(name) !== undefined)

const isInStock = (item: CatalogItem): boolean => item.stock.status === 'in'

const byVolume = (first: CatalogItem, second: CatalogItem, direction: 1 | -1): number => {
  const a = getVolume(first)
  const b = getVolume(second)

  // Без объёма (навесное оборудование) всегда в конце
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return Number.isNaN(a) ? (Number.isNaN(b) ? 0 : 1) : -1
  }

  return (a - b) * direction
}

const sortItems = (list: CatalogItem[], mode: string): CatalogItem[] => {
  const sorted = [...list]

  switch (mode) {
    case 'stock':
      return sorted.sort((a, b) => Number(isInStock(b)) - Number(isInStock(a)))
    case 'volume-asc':
      return sorted.sort((a, b) => byVolume(a, b, 1))
    case 'volume-desc':
      return sorted.sort((a, b) => byVolume(a, b, -1))
    case 'name':
      return sorted.sort((a, b) => a.model.localeCompare(b.model, 'ru'))
    default:
      return sorted.sort(
        (a, b) =>
          Number(hasPhoto(b)) - Number(hasPhoto(a)) || Number(isInStock(b)) - Number(isInStock(a)),
      )
  }
}

/**
 * Каталог: загружает модели из JSON, отбирает их по выбранным параметрам и держит выбор в адресе страницы.
 * Карточки выводятся порциями по мере прокрутки: моделей сотни, а видно десяток.
 * Выбрать можно только то, что даст результат: значения, которых нет у техники выбранного типа, скрыты,
 * а несовместимые с уже выбранным заблокированы. Объём принимает только цифры и не выходит за пределы ряда.
 * При открытии читает параметры из адреса: так работают ссылки меню и подбор с главной.
 */
export const initCatalog = (): void => {
  const form = document.querySelector<HTMLFormElement>('[data-catalog-filter]')
  const list = document.querySelector<HTMLElement>('[data-catalog-list]')
  const template = document.querySelector<HTMLTemplateElement>('[data-catalog-template]')

  if (!form || !list || !template) {
    return
  }

  const groups = [...form.querySelectorAll<HTMLFieldSetElement>(GROUP_SELECTOR)]
  const dropdownAnimations = new WeakMap<HTMLElement, Animation>()
  const setDropdownOpen = (group: HTMLFieldSetElement, open: boolean): void => {
    const trigger = group.querySelector<HTMLButtonElement>('[data-filter-trigger]')
    const dropdown = group.querySelector<HTMLElement>('.cfilter__dropdown')

    if (!trigger || !dropdown || trigger.getAttribute('aria-expanded') === String(open)) return
    dropdownAnimations.get(dropdown)?.cancel()
    trigger.setAttribute('aria-expanded', String(open))
    group.classList.toggle('is-open', open)
    dropdown.inert = !open

    if (matchMedia(REDUCED_MOTION_QUERY).matches) {
      dropdown.hidden = !open
      return
    }

    dropdown.hidden = false
    const frames = [
      { opacity: 0, transform: 'translateY(-6px) scale(0.98)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ]
    const animation = dropdown.animate(open ? frames : [...frames].reverse(), {
      duration: open ? 180 : 120,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    })
    dropdownAnimations.set(dropdown, animation)
    animation.onfinish = (): void => {
      dropdown.hidden = trigger.getAttribute('aria-expanded') !== 'true'
    }
  }

  for (const group of groups) {
    const trigger = group.querySelector<HTMLButtonElement>('[data-filter-trigger]')
    if (!trigger) continue
    const open = (): void => {
      for (const other of groups) setDropdownOpen(other, other === group)
    }

    trigger.addEventListener('click', () => {
      if (trigger.getAttribute('aria-expanded') === 'true') setDropdownOpen(group, false)
      else open()
    })
    group.addEventListener('change', (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
        trigger.focus()
        setDropdownOpen(group, false)
      }
    })
    group.querySelector<HTMLButtonElement>('[data-filter-clear]')?.addEventListener('click', () => {
      const checked = [...group.querySelectorAll<HTMLInputElement>('input:checked')]
      for (const input of checked) input.checked = false
      trigger.focus()
      setDropdownOpen(group, false)
      checked[0]?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    group.addEventListener('focusout', (event) => {
      // Clicking a label can briefly move focus to the document before its checkbox receives it.
      // Keep the list interactive until the checkbox change or an actual move outside the group.
      if (event.relatedTarget instanceof Node && !group.contains(event.relatedTarget)) {
        setDropdownOpen(group, false)
      }
    })
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        trigger.focus()
        setDropdownOpen(group, false)
      }
      if (event.key === 'ArrowDown' && event.target === trigger) {
        event.preventDefault()
        open()
        group.querySelector<HTMLInputElement>('.chip:not([hidden]) input:not(:disabled)')?.focus()
      }
    })
  }
  document.addEventListener('pointerdown', (event) => {
    for (const group of groups) {
      if (event.target instanceof Node && !group.contains(event.target)) {
        setDropdownOpen(group, false)
      }
    }
  })
  const optionInputs = [...form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
  const volumeFromInput = form.querySelector<HTMLInputElement>('[name="volume-from"]')
  const volumeToInput = form.querySelector<HTMLInputElement>('[name="volume-to"]')
  const viewInputs = [
    ...document.querySelectorAll<HTMLInputElement>('input[name="view"][form="catalog-filter"]'),
  ]
  const sortSelect = document.querySelector<HTMLSelectElement>('[data-catalog-sort]')
  const sortUi = sortSelect ? enhanceSelect(sortSelect, 'catalog-sort-label') : null
  const activeList = form.querySelector<HTMLElement>('[data-active-list]')
  const sidebar = document.querySelector<HTMLElement>('.cside')
  const siteHeader = document.querySelector<HTMLElement>('[data-header]')
  const sentinel = document.querySelector<HTMLElement>('[data-catalog-sentinel]')
  const counters = document.querySelectorAll<HTMLElement>('[data-catalog-count]')
  const empty = document.querySelector<HTMLElement>('[data-catalog-empty]')
  const error = document.querySelector<HTMLElement>('[data-catalog-error]')
  const resets = document.querySelectorAll<HTMLButtonElement>('[data-catalog-reset]')
  // Поля типа техники стоят вне формы и привязаны к ней атрибутом form
  const typeInputs = [...form.elements].filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.name === TYPE_FIELD,
  )

  const syncSidebar = (): void => {
    sidebar?.style.setProperty(
      '--cside-top',
      siteHeader?.classList.contains('is-hidden')
        ? 'var(--section-gap)'
        : 'calc(var(--header-h) + var(--section-gap))',
    )
  }

  if (siteHeader) {
    new MutationObserver(syncSidebar).observe(siteHeader, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }
  syncSidebar()

  // Появление карточек: каждая выезжает снизу с проявлением (стили .ccard.is-pending и .is-revealed).
  // При «уменьшить движение» карточки видны сразу
  // Показ карточек по очереди: пачка вошедших в окно идёт со сдвигом по задержке
  const revealCards = (cards: HTMLElement[]): void => {
    for (const [index, card] of cards.entries()) {
      const delay = Math.min(index * REVEAL_STAGGER, REVEAL_STAGGER_LIMIT)

      cardObserver?.unobserve(card)
      card.style.setProperty('--reveal-delay', `${String(delay)}ms`)
      card.classList.remove(PENDING_CLASS)
      card.classList.add(REVEALED_CLASS)

      // После показа состояние снимается: дальше карточка живёт обычной жизнью (наведение, переходы)
      setTimeout(() => {
        card.classList.remove(REVEALED_CLASS)
        card.style.removeProperty('--reveal-delay')
      }, REVEAL_TIME + delay)
    }
  }

  const cardObserver = matchMedia(REDUCED_MOTION_QUERY).matches
    ? undefined
    : new IntersectionObserver(
        (entries) => {
          revealCards(
            entries
              .filter((entry) => entry.isIntersecting)
              .map((entry) => entry.target as HTMLElement),
          )
        },
        { threshold: REVEAL_VISIBLE_SHARE },
      )

  // Страховка: карточки, которые уже на экране, но наблюдатель о них не сообщил (первый экран после загрузки), показываются сами
  const revealVisible = (): void => {
    const visible = [...list.querySelectorAll<HTMLElement>(`.${PENDING_CLASS}`)].filter((card) => {
      const box = card.getBoundingClientRect()

      return box.bottom > 0 && box.top < window.innerHeight * 0.95
    })

    if (visible.length > 0) {
      revealCards(visible)
    }
  }

  // Поиск по коду и названию приходит из шапки в адресе страницы (?q=…) и держится, пока его не сбросят
  let searchQuery = new URLSearchParams(location.search).get(SEARCH_PARAMETER)?.trim() ?? ''
  let searchTokens = parseQuery(searchQuery)

  // Строка поиска в шапке показывает действующий запрос
  const headerSearch = document.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR)

  if (headerSearch) {
    headerSearch.value = searchQuery
  }

  let items: CatalogItem[] = []
  // Отобранные модели и сколько из них уже выведено
  let matches: CatalogItem[] = []
  let renderedCount = 0

  const getType = (): string => typeInputs.find((input) => input.checked)?.value ?? NO_TYPE

  // Группа другого типа техники отключена целиком и в отборе не участвует
  const isGroupActive = (input: HTMLInputElement): boolean =>
    !input.closest<HTMLFieldSetElement>(GROUP_SELECTOR)?.disabled

  const readState = (): FilterState => {
    const selected = new Map<string, Set<string>>()

    for (const input of optionInputs) {
      if (input.checked && isGroupActive(input)) {
        selected.set(input.name, (selected.get(input.name) ?? new Set()).add(input.value))
      }
    }

    return {
      type: getType(),
      volumeFrom: readNumber(volumeFromInput),
      volumeTo: readNumber(volumeToInput),
      selected,
    }
  }

  // Область отбора, которую не меняют остальные параметры: выбранный тип техники и поиск из шапки (?q=)
  const isTypeMatch = (item: CatalogItem, state: FilterState): boolean =>
    (state.type === NO_TYPE || item.type === state.type) && isSearchMatch(item, searchTokens)

  // skip — параметр, который не учитывается: так проверяется, что даст ещё одно значение в его группе
  const isMatch = (item: CatalogItem, state: FilterState, skip?: string): boolean => {
    const volume = getVolume(item)

    return (
      isTypeMatch(item, state) &&
      (skip === KIT_FIELD ||
        (item.params[KIT_FIELD] === KIT_VALUE) ===
          Boolean(state.selected.get(KIT_FIELD)?.has(KIT_VALUE))) &&
      (skip === VOLUME_FIELD ||
        ((Number.isNaN(state.volumeFrom) || volume >= state.volumeFrom) &&
          (Number.isNaN(state.volumeTo) || volume <= state.volumeTo))) &&
      [...state.selected].every(
        ([name, values]) =>
          name === skip ||
          name === KIT_FIELD ||
          getValues(item, name).some((value) => values.has(value)),
      )
    )
  }

  const hasValue = (item: CatalogItem, input: HTMLInputElement): boolean =>
    getValues(item, input.name).includes(input.value)

  // Крайние объёмы техники, подходящей под остальные параметры
  const getVolumeRange = (state: FilterState): [number, number] | undefined => {
    const volumes = items
      .filter((item) => isMatch(item, state, VOLUME_FIELD))
      .map((item) => getVolume(item))
      .filter((volume) => volume > 0)

    return volumes.length > 0 ? [Math.min(...volumes), Math.max(...volumes)] : undefined
  }

  // Показываем группы параметров выбранного типа и общие для всей техники
  const syncGroups = (): void => {
    const type = getType()

    for (const group of groups) {
      const groupTypes = group.dataset['catalogTypes']
      const isActive = type === NO_TYPE || !groupTypes || groupTypes.split(' ').includes(type)

      group.hidden = !isActive
      group.disabled = !isActive
    }
  }

  // Снимает выбор, который больше ничего не находит: значение из адреса, которого нет у этого типа,
  // или объём, оставшийся от другого типа техники
  const normalize = (): void => {
    for (let pass = 0; pass < NORMALIZE_PASSES; pass += 1) {
      const state = readState()
      const range = getVolumeRange(state)
      let isChanged = false

      // Сначала объём: оставшись от другого типа техники, он обнулил бы весь остальной выбор
      if (
        range &&
        volumeFromInput &&
        (state.volumeFrom > range[1] || state.volumeFrom < range[0])
      ) {
        volumeFromInput.value = ''
        isChanged = true
      }

      if (range && volumeToInput && (state.volumeTo < range[0] || state.volumeTo > range[1])) {
        volumeToInput.value = ''
        isChanged = true
      }

      if (isChanged) {
        continue
      }

      for (const input of optionInputs) {
        const isValid = items.some(
          (item) => hasValue(item, input) && isMatch(item, state, input.name),
        )

        if (!isValid && input.checked && isGroupActive(input)) {
          input.checked = false
          isChanged = true
        }
      }

      if (!isChanged) {
        return
      }
    }
  }

  // Значение скрыто, если его нет у техники выбранного типа, и заблокировано,
  // если вместе с остальным выбором оно ничего не найдёт
  const syncOptions = (state: FilterState): void => {
    for (const input of optionInputs) {
      const option = input.closest<HTMLElement>(OPTION_SELECTOR)
      const inScope = items.filter((item) => isTypeMatch(item, state) && hasValue(item, input))
      const available = inScope.filter((item) => isMatch(item, state, input.name))
      const isAvailable = available.length > 0

      input.disabled = !isAvailable && !input.checked

      if (option) {
        option.hidden = inScope.length === 0

        // Сколько моделей даст это значение вместе с остальным выбором
        const counter = option.querySelector<HTMLElement>('[data-chip-count]')

        if (counter) {
          counter.textContent = String(available.length)
        }
      }
    }

    // Группа без единого значения для этого типа техники не показывается
    for (const group of groups) {
      const options = [...group.querySelectorAll<HTMLElement>(OPTION_SELECTOR)]

      if (!group.disabled && options.length > 0) {
        group.hidden = options.every((option) => option.hidden)
      }

      // Группа блокируется, когда у выбранных моделей нет ни одного её значения (УВТ у технической воды и т. п.)
      const visible = options.filter((option) => !option.hidden)
      const isBlocked =
        !group.hidden &&
        visible.length > 0 &&
        visible.every((option) => {
          const input = option.querySelector<HTMLInputElement>('input')

          return input?.disabled === true && !input.checked
        })

      group.classList.toggle('is-blocked', isBlocked)
      const selected = group.querySelector<HTMLElement>('[data-filter-selected]')
      const selectedInputs = [...group.querySelectorAll<HTMLInputElement>('input:checked')]
      const selectedCount = selectedInputs.length

      if (selected) {
        selected.textContent = selectedInputs
          .map(
            (input) =>
              input
                .closest('label')
                ?.querySelector('[data-filter-option-label]')
                ?.textContent.trim() ?? input.value,
          )
          .join(', ')
      }
      const clear = group.querySelector<HTMLButtonElement>('[data-filter-clear]')
      if (clear) clear.hidden = selectedCount === 0
      group.classList.toggle('has-selection', selectedCount > 0)
      if (group.hidden) setDropdownOpen(group, false)
    }

    // Подсказка в полях объёма: доступные сейчас крайние значения
    const range = getVolumeRange(state)

    if (volumeFromInput) {
      volumeFromInput.placeholder = range ? String(range[0]) : ''
    }

    if (volumeToInput) {
      volumeToInput.placeholder = range ? String(range[1]) : ''
    }
  }

  // Следующая порция карточек. Пока метка конца списка остаётся в зоне догрузки, добавляем ещё:
  // наблюдатель сообщает только о входе в зону, а не о том, что метка всё ещё в ней
  const renderBatch = (): void => {
    const batch = matches.slice(renderedCount, renderedCount + BATCH_SIZE)

    if (batch.length === 0) {
      return
    }

    const fragment = document.createDocumentFragment()

    for (const item of batch) {
      fragment.append(createProductCard(template, item))
    }

    // Карточки прячутся сразу при вставке, до первого кадра: иначе они мелькнули бы и только потом выехали
    const cards = [...fragment.children]

    if (cardObserver) {
      for (const card of cards) {
        card.classList.add(PENDING_CLASS)
      }
    }

    list.append(fragment)
    renderedCount += batch.length

    for (const card of cards) {
      cardObserver?.observe(card)
    }

    if (sentinel && sentinel.getBoundingClientRect().top < window.innerHeight * 2) {
      renderBatch()
    }
  }

  const applyFilter = (state: FilterState): void => {
    matches = sortItems(
      items.filter((item) => isMatch(item, state)),
      sortSelect?.value ?? SORT_DEFAULT,
    )
    renderedCount = 0
    cardObserver?.disconnect()
    list.replaceChildren()
    renderBatch()
    window.setTimeout(revealVisible, 200)

    for (const counter of counters) {
      counter.textContent = `${String(matches.length)} ${pluralModels(matches.length)}`
    }

    if (empty) {
      empty.hidden = matches.length > 0
    }

    // Адрес повторяет текущий выбор: страницу с подбором можно обновить или отправить ссылкой
    const parameters = new URLSearchParams()

    for (const [name, value] of new FormData(form)) {
      // Вид «сетка» по умолчанию в адрес не попадает
      if (
        typeof value === 'string' &&
        value !== '' &&
        !(name === 'view' && value === 'grid') &&
        !(name === SORT_FIELD && value === SORT_DEFAULT)
      ) {
        parameters.append(name, value)
      }
    }

    if (searchQuery !== '') {
      parameters.set(SEARCH_PARAMETER, searchQuery)
    }

    const query = parameters.toString()

    // Сбрасывать нечего, пока ничего не выбрано
    for (const reset of resets) {
      reset.disabled = query === ''
    }

    history.replaceState(undefined, '', query ? `${location.pathname}?${query}` : location.pathname)
  }

  // Пункты меню следуют за фильтром: акцентным «Каталог» бывает только страница без «в наличии»
  const syncMenu = (): void => {
    const isStock = optionInputs.some(
      (input) => input.name === STOCK_FIELD && input.value === STOCK_IN && input.checked,
    )

    document.querySelector('.menu__link--catalog')?.classList.toggle('is-current', !isStock)
    document.querySelector('.menu__link--stock')?.classList.toggle('is-current', isStock)
  }

  // Выбранные параметры в панели: каждый снимается крестиком
  const syncActive = (): void => {
    if (!activeList) {
      return
    }

    const tags: { label: string; remove: () => void }[] = []

    for (const input of optionInputs) {
      if (input.checked && isGroupActive(input)) {
        // Подпись чипа без счётчика количества (он лежит в дочернем элементе)
        const label =
          input.closest('label')?.querySelector('.chip__label')?.firstChild?.textContent?.trim() ??
          input.value

        tags.push({
          label,
          remove: () => {
            input.checked = false
            update()
          },
        })
      }
    }

    const from = volumeFromInput?.value.trim() ?? ''
    const to = volumeToInput?.value.trim() ?? ''

    if (from !== '' || to !== '') {
      tags.push({
        label:
          `Объём ${from === '' ? 'до' : 'от'} ${[from, to].filter((part) => part !== '').join(' до ')} м³`.replace(
            'от  до',
            'до',
          ),
        remove: () => {
          for (const input of [volumeFromInput, volumeToInput]) {
            if (input) {
              input.value = ''
            }
          }

          update()
        },
      })
    }

    if (searchQuery !== '') {
      tags.push({
        label: `Поиск: ${searchQuery}`,
        remove: () => {
          searchQuery = ''
          searchTokens = []

          if (headerSearch) {
            headerSearch.value = ''
          }

          update()
        },
      })
    }

    activeList.replaceChildren(
      ...tags.map((tag) => {
        const item = document.createElement('li')
        const button = document.createElement('button')

        button.type = 'button'
        button.className = 'cfilter__tag'
        button.setAttribute('aria-label', `Убрать: ${tag.label}`)
        button.textContent = tag.label
        button.addEventListener('click', tag.remove)
        item.append(button)

        return item
      }),
    )
  }

  // Пересчёт по ходу ввода: без снятия выбора
  const refresh = (): void => {
    const state = readState()

    syncMenu()
    syncOptions(state)
    applyFilter(state)
    syncActive()
  }

  const update = (): void => {
    syncGroups()
    normalize()
    refresh()
  }

  // Предустановка из адреса: тип, затем группы этого типа, затем значения
  const applyQuery = (): void => {
    const parameters = new URLSearchParams(location.search)
    const requested = parameters.get(TYPE_FIELD)
    // Без предустановки (или с неизвестным типом) выбран первый тип
    const type = typeInputs.some((input) => input.value === requested)
      ? requested
      : typeInputs[0]?.value

    if (parameters.get(STOCK_FLAG) === '1') {
      parameters.append(STOCK_FIELD, STOCK_IN)
    }

    for (const input of typeInputs) {
      input.checked = input.value === type
    }

    syncGroups()

    for (const input of optionInputs) {
      if (isGroupActive(input)) {
        input.checked = parameters.getAll(input.name).includes(input.value)
      }
    }

    for (const input of [volumeFromInput, volumeToInput]) {
      if (input) {
        input.value = (parameters.get(input.name) ?? '').replaceAll(/\D/g, '')
      }
    }

    for (const input of viewInputs) {
      input.checked = input.value === (parameters.get('view') === 'list' ? 'list' : 'grid')
    }

    if (sortSelect) {
      const requestedSort = parameters.get(SORT_FIELD) ?? SORT_DEFAULT

      sortSelect.value = SORT_VALUES.has(requestedSort) ? requestedSort : SORT_DEFAULT
      sortUi?.refresh()
    }

    syncView()
  }

  // Тип выбран всегда и сам не снимается. Поле стоит вне формы, поэтому его change до формы не всплывает
  for (const input of typeInputs) {
    input.addEventListener('change', update)
  }

  for (const input of [volumeFromInput, volumeToInput]) {
    // В поле объёма попадают только цифры: буквы, знаки и лишние разряды отбрасываются при вводе
    input?.addEventListener('input', () => {
      input.value = input.value.replaceAll(/\D/g, '').slice(0, VOLUME_MAX_LENGTH)
    })
    // По завершении ввода объём подгоняется под доступный ряд, а «от» не может оказаться больше «до»
    input?.addEventListener('change', () => {
      const state = readState()
      const range = getVolumeRange(state)
      const value = readNumber(input)

      if (!range || Number.isNaN(value)) {
        return
      }

      const isFrom = input === volumeFromInput
      const other = isFrom ? state.volumeTo : state.volumeFrom
      const lowest = !isFrom && !Number.isNaN(other) ? Math.max(range[0], other) : range[0]
      const highest = isFrom && !Number.isNaN(other) ? Math.min(range[1], other) : range[1]

      input.value = String(Math.min(Math.max(value, lowest), Math.max(lowest, highest)))
    })
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
  })

  // Вид списка: сетка или список. Выбор виден в адресе (?view=list)
  const syncView = (): void => {
    const view = viewInputs.find((input) => input.checked)?.value ?? 'grid'

    list.dataset['view'] = view
  }

  for (const input of viewInputs) {
    input.addEventListener('change', () => {
      syncView()
      refresh()
    })
  }

  sortSelect?.addEventListener('change', refresh)

  if (sentinel) {
    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          renderBatch()
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    )

    loadObserver.observe(sentinel)
  }

  // Выбор из адреса виден сразу, отбор включается, когда данные загрузились
  applyQuery()

  const start = async (): Promise<void> => {
    try {
      items = (await loadCatalog()).items as CatalogItem[]
    } catch (loadError) {
      if (error) {
        error.hidden = false
      }

      console.error('Каталог не загрузился:', loadError)
      return
    }

    // Сколько моделей у каждого типа техники: подпись во вкладках типа (навесное оборудование не считается)
    for (const counter of document.querySelectorAll<HTMLElement>('[data-type-count]')) {
      const total = items.filter(
        (item) =>
          item.type === counter.dataset['typeCount'] && item.params[KIT_FIELD] !== KIT_VALUE,
      ).length

      counter.textContent = `${String(total)} ${pluralModels(total)}`
    }

    // Поиск из шапки без явного типа в адресе: если у выбранного по умолчанию типа совпадений нет, а у другого есть,
    // выбирается тот, где модель нашлась, а не пустой список
    if (searchTokens.length > 0 && !new URLSearchParams(location.search).has(TYPE_FIELD)) {
      const hasMatches = (type: string): boolean =>
        items.some((item) => item.type === type && isSearchMatch(item, searchTokens))
      const checked = typeInputs.find((input) => input.checked)
      const fallback = typeInputs.find((input) => hasMatches(input.value))

      if (checked && fallback && !hasMatches(checked.value)) {
        checked.checked = false
        fallback.checked = true
      }
    }

    form.addEventListener('change', update)
    form.addEventListener('input', refresh)
    // Браузер очищает поля уже после события reset, поэтому пересчитываем на следующем шаге.
    // Сброс убирает и поиск: строка в шапке очищается вместе с остальными параметрами
    form.addEventListener('reset', () => {
      searchQuery = ''
      searchTokens = []

      if (headerSearch) {
        headerSearch.value = ''
      }

      setTimeout(() => {
        sortUi?.refresh()
        syncView()
        update()
      }, 0)
    })

    update()
  }

  void start()
}
