import { loadCatalog } from './catalog-data'
import { createProductCard, type CardItem } from './product-card'
import { isSearchMatch, parseQuery } from './search-match'
import { getLenis } from './smooth'

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
  const optionInputs = [...form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
  const volumeFromInput = form.querySelector<HTMLInputElement>('[name="volume-from"]')
  const volumeToInput = form.querySelector<HTMLInputElement>('[name="volume-to"]')
  const drawer = form.querySelector<HTMLDialogElement>('[data-filter-drawer]')
  const bar = document.querySelector<HTMLElement>('[data-filter-bar]')
  const dock = document.querySelector<HTMLElement>('[data-filter-dock]')
  const sentinel = document.querySelector<HTMLElement>('[data-catalog-sentinel]')
  const counters = document.querySelectorAll<HTMLElement>('[data-catalog-count]')
  const badges = document.querySelectorAll<HTMLElement>('[data-filter-badge]')
  const empty = document.querySelector<HTMLElement>('[data-catalog-empty]')
  const error = document.querySelector<HTMLElement>('[data-catalog-error]')
  const resets = document.querySelectorAll<HTMLButtonElement>('[data-catalog-reset]')
  // Поля типа техники стоят вне формы и привязаны к ней атрибутом form
  const typeInputs = [...form.elements].filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.name === TYPE_FIELD,
  )

  // Появление карточек: каждая выезжает снизу с проявлением (стили .ccard.is-pending и .is-revealed).
  // При «уменьшить движение» карточки видны сразу
  const cardObserver = matchMedia(REDUCED_MOTION_QUERY).matches
    ? undefined
    : new IntersectionObserver(
        (entries, observer) => {
          const entered = entries.filter((entry) => entry.isIntersecting)

          for (const [index, entry] of entered.entries()) {
            const card = entry.target as HTMLElement
            const delay = Math.min(index * REVEAL_STAGGER, REVEAL_STAGGER_LIMIT)

            observer.unobserve(card)
            card.style.setProperty('--reveal-delay', `${String(delay)}ms`)
            card.classList.remove(PENDING_CLASS)
            card.classList.add(REVEALED_CLASS)

            // После показа состояние снимается: дальше карточка живёт обычной жизнью (наведение, переходы)
            setTimeout(() => {
              card.classList.remove(REVEALED_CLASS)
              card.style.removeProperty('--reveal-delay')
            }, REVEAL_TIME + delay)
          }
        },
        { threshold: REVEAL_VISIBLE_SHARE },
      )

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
      const isAvailable = inScope.some((item) => isMatch(item, state, input.name))

      input.disabled = !isAvailable && !input.checked

      if (option) {
        option.hidden = inScope.length === 0
      }
    }

    // Группа без единого значения для этого типа техники не показывается
    for (const group of groups) {
      const options = [...group.querySelectorAll<HTMLElement>(OPTION_SELECTOR)]

      if (!group.disabled && options.length > 0) {
        group.hidden = options.every((option) => option.hidden)
      }
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

  // Число выбранных параметров в боковой панели: на кнопках «Фильтры»
  const syncBadges = (): void => {
    const inDrawer = [...(drawer?.querySelectorAll<HTMLInputElement>('input:checked') ?? [])].length
    const volumes = [volumeFromInput, volumeToInput].filter(
      (input) => input !== null && input.value.trim() !== '',
    ).length
    const total = inDrawer + (volumes > 0 ? 1 : 0)

    for (const badge of badges) {
      badge.textContent = String(total)
      badge.hidden = total === 0
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
    matches = items.filter((item) => isMatch(item, state))
    renderedCount = 0
    cardObserver?.disconnect()
    list.replaceChildren()
    renderBatch()

    for (const counter of counters) {
      counter.textContent = `${String(matches.length)} ${pluralModels(matches.length)}`
    }

    if (empty) {
      empty.hidden = matches.length > 0
    }

    // Адрес повторяет текущий выбор: страницу с подбором можно обновить или отправить ссылкой
    const parameters = new URLSearchParams()

    for (const [name, value] of new FormData(form)) {
      if (typeof value === 'string' && value !== '') {
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

  // Пересчёт по ходу ввода: без снятия выбора
  const refresh = (): void => {
    const state = readState()

    syncMenu()
    syncOptions(state)
    applyFilter(state)
    syncBadges()
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

  // Боковая панель: открывается кнопками «Фильтры», закрывается крестиком, кнопкой «Показать» и кликом по подложке.
  // Пока она открыта, плавная прокрутка страницы остановлена
  if (drawer) {
    for (const opener of document.querySelectorAll<HTMLElement>('[data-filter-open]')) {
      opener.addEventListener('click', () => {
        getLenis()?.stop()
        drawer.showModal()
      })
    }

    drawer.addEventListener('click', (event) => {
      const isClose =
        event.target instanceof Element && event.target.closest('[data-filter-close]') !== null

      // Клик по подложке: цель события сам dialog, а не его содержимое
      if (isClose || event.target === drawer) {
        drawer.close()
      }
    })

    drawer.addEventListener('close', () => {
      getLenis()?.start()
    })
  }

  // Плавающая плашка показывается, когда верхняя панель фильтров ушла с экрана
  if (bar && dock) {
    new IntersectionObserver(([entry]) => {
      dock.classList.toggle('is-visible', entry !== undefined && !entry.isIntersecting)
    }).observe(bar)
  }

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

      setTimeout(update, 0)
    })

    update()
  }

  void start()
}
