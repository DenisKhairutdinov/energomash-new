import { gsap } from 'gsap'

const REVEALED_CLASS = 'is-revealed'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const COUNT_DURATION = 1.8
const REGION_STEP = 0.05
const EDGE_OFFSET = 16
// Секция считается появившейся, когда видна на четверть, и ушедшей, когда почти скрылась: пока она на экране, карта остаётся залитой
const ENTER_SHARE = 0.25
const LEAVE_SHARE = 0.05
const DELIVERED_LABEL = 'Были поставки'
const NO_DELIVERY_LABEL = 'Пока без поставок'

const numberFormat = new Intl.NumberFormat('ru-RU')

const pluralUnits = (count: number): string => {
  if (count % 100 >= 11 && count % 100 <= 14) {
    return 'единиц'
  }

  if (count % 10 === 1) {
    return 'единица'
  }

  return count % 10 >= 2 && count % 10 <= 4 ? 'единицы' : 'единиц'
}

/**
 * Интерактивная карта поставок (механика старого сайта): при наведении или фокусе на регион всплывает карточка
 * с названием, числом единиц техники и городами; при появлении секции регионы с поставками наливаются акцентом по очереди
 * с запада на восток, а итоги отсчитываются от нуля. Итоги считаются по самим регионам, чтобы не расходиться с картой.
 */
export const initGeography = (): void => {
  const root = document.querySelector<HTMLElement>('[data-geography]')
  const stage = root?.querySelector<HTMLElement>('[data-geography-stage]')
  const tooltip = root?.querySelector<HTMLElement>('[data-geography-tooltip]')
  const regions = [...(root?.querySelectorAll<SVGPathElement>('[data-geography-region]') ?? [])]

  if (!root || !stage || !tooltip || regions.length === 0) {
    return
  }

  const fields = {
    label: tooltip.querySelector<HTMLElement>('[data-geography-tooltip-label]'),
    name: tooltip.querySelector<HTMLElement>('[data-geography-tooltip-name]'),
    units: tooltip.querySelector<HTMLElement>('[data-geography-tooltip-units]'),
    cities: tooltip.querySelector<HTMLElement>('[data-geography-tooltip-cities]'),
  }

  const delivered = regions.filter((region) => region.classList.contains('is-delivered'))
  const total = delivered.reduce((sum, region) => sum + Number(region.dataset['units']), 0)

  const counters = [
    {
      element: root.querySelector<HTMLElement>('[data-geography-regions]'),
      value: delivered.length,
    },
    { element: root.querySelector<HTMLElement>('[data-geography-units]'), value: total },
  ]
  const counterState = { progress: 0 }
  let counterTween: gsap.core.Tween | undefined

  const paintCounters = (progress: number): void => {
    for (const { element, value } of counters) {
      if (element) {
        element.textContent = numberFormat.format(Math.round(value * progress))
      }
    }
  }

  const reveal = (): void => {
    root.classList.add(REVEALED_CLASS)
    counterTween?.kill()
    counterState.progress = 0
    counterTween = gsap.to(counterState, {
      progress: 1,
      duration: COUNT_DURATION,
      ease: 'power3.out',
      onUpdate: () => {
        paintCounters(counterState.progress)
      },
    })
  }

  const reset = (): void => {
    root.classList.remove(REVEALED_CLASS)
    counterTween?.kill()
    paintCounters(0)
  }

  // Порядок наливания: по положению региона на карте слева направо
  const ordered = delivered.toSorted((a, b) => a.getBBox().x - b.getBBox().x)

  for (const [index, region] of ordered.entries()) {
    region.style.setProperty('--delay', `${String(index * REGION_STEP)}s`)
  }

  if (matchMedia(REDUCED_MOTION_QUERY).matches) {
    paintCounters(1)
  } else {
    paintCounters(0)
    new IntersectionObserver(
      (entries) => {
        for (const { intersectionRatio } of entries) {
          if (intersectionRatio >= ENTER_SHARE && !root.classList.contains(REVEALED_CLASS)) {
            reveal()
          } else if (intersectionRatio <= LEAVE_SHARE && root.classList.contains(REVEALED_CLASS)) {
            reset()
          }
        }
      },
      { threshold: [LEAVE_SHARE, ENTER_SHARE] },
    ).observe(root)
  }

  const fill = (region: SVGPathElement): void => {
    const isDelivered = region.classList.contains('is-delivered')
    const count = Number(region.dataset['units'])

    if (fields.label) {
      fields.label.textContent = isDelivered ? DELIVERED_LABEL : NO_DELIVERY_LABEL
    }

    if (fields.name) {
      fields.name.textContent = region.dataset['name'] ?? ''
    }

    if (fields.units) {
      fields.units.textContent = isDelivered
        ? `${numberFormat.format(count)} ${pluralUnits(count)} техники`
        : ''
    }

    if (fields.cities) {
      fields.cities.textContent = region.dataset['cities'] ?? ''
    }
  }

  // Карточка стоит рядом с курсором и не выходит за край сцены: у правого и нижнего края перекидывается на другую сторону
  const place = (clientX: number, clientY: number): void => {
    const box = stage.getBoundingClientRect()
    const width = tooltip.offsetWidth
    const height = tooltip.offsetHeight
    let x = clientX - box.left + EDGE_OFFSET
    let y = clientY - box.top + EDGE_OFFSET

    if (x + width > box.width) {
      x = clientX - box.left - width - EDGE_OFFSET
    }

    if (y + height > box.height) {
      y = clientY - box.top - height - EDGE_OFFSET
    }

    tooltip.style.translate = `${String(Math.max(0, x))}px ${String(Math.max(0, y))}px`
  }

  const show = (region: SVGPathElement, clientX: number, clientY: number): void => {
    fill(region)
    tooltip.hidden = false
    place(clientX, clientY)

    for (const item of regions) {
      item.classList.toggle('is-active', item === region)
    }
  }

  const hide = (): void => {
    tooltip.hidden = true

    for (const item of regions) {
      item.classList.remove('is-active')
    }
  }

  for (const region of regions) {
    region.addEventListener('pointerenter', (event) => {
      show(region, event.clientX, event.clientY)
    })
    region.addEventListener('pointermove', (event) => {
      place(event.clientX, event.clientY)
    })
    region.addEventListener('pointerleave', hide)

    // С клавиатуры: фокус только у регионов с поставками, карточка встаёт в центр региона
    if (region.classList.contains('is-delivered')) {
      region.setAttribute('tabindex', '0')
      region.addEventListener('focus', () => {
        const box = region.getBoundingClientRect()

        show(region, box.left + box.width / 2, box.top + box.height / 2)
      })
      region.addEventListener('blur', hide)
    }
  }
}
