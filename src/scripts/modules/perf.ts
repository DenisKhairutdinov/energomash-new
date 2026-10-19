import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { getLenis } from './smooth'

// Слабые машины: на них тормозят размытие под стеклом (backdrop-filter), сглаженная прокрутка и привязанные к ней анимации.
// Режим включается заранее по железу и во время работы, если прокрутка идёт рывками. В режиме `data-perf="low"`
// остаются нативная прокрутка и плоское стекло, а привязанные к прокрутке анимации (scrub) отключаются.
const LOW_CORES = 4
const LOW_MEMORY_GB = 4
const PROBE_FRAMES = 45
const SLOW_FRAME_MS = 28
const SLOW_SHARE = 0.4

interface NavigatorHints {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

export const isLowPower = (): boolean => document.documentElement.dataset['perf'] === 'low'

/** Железо заведомо слабое: мало ядер или памяти, либо включена экономия трафика. */
export const isWeakDevice = (): boolean => {
  const hints = navigator as Navigator & NavigatorHints
  const cores = navigator.hardwareConcurrency

  return (
    cores <= LOW_CORES ||
    (hints.deviceMemory !== undefined && hints.deviceMemory <= LOW_MEMORY_GB) ||
    hints.connection?.saveData === true
  )
}

/** Включает облегчённый режим: убирает Lenis и scrub-анимации, CSS отключает размытие. */
const enableLowPower = (): void => {
  if (isLowPower()) {
    return
  }

  document.documentElement.dataset['perf'] = 'low'
  getLenis()?.destroy()

  for (const trigger of ScrollTrigger.getAll()) {
    const scrubbed = trigger.vars.scrub !== undefined && trigger.vars.scrub !== false

    if (scrubbed && !trigger.vars.pin) {
      trigger.animation?.progress(0)
      trigger.kill()
    }
  }
}

/** Режим задаётся до запуска модулей (по железу) и следит за кадрами во время прокрутки (по факту). */
export const initPerformance = (): void => {
  if (isWeakDevice()) {
    document.documentElement.dataset['perf'] = 'low'

    return
  }

  let frames = 0
  let slow = 0
  let last = 0
  let scrolling = false
  let scrollTimer: number | undefined

  window.addEventListener(
    'scroll',
    () => {
      scrolling = true
      window.clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(() => {
        scrolling = false
        last = 0
      }, 150)
    },
    { passive: true },
  )

  // Меряем только кадры, пока страница прокручивается: простой и загрузка в счёт не идут
  const probe = (time: number): void => {
    if (!scrolling || document.hidden) {
      last = 0

      return
    }

    if (last !== 0) {
      frames += 1
      slow += time - last > SLOW_FRAME_MS ? 1 : 0
    }

    last = time

    if (frames >= PROBE_FRAMES) {
      gsap.ticker.remove(tick)

      if (slow / frames > SLOW_SHARE) {
        enableLowPower()
      }
    }
  }

  const tick = (time: number): void => {
    probe(time * 1000)
  }

  gsap.ticker.add(tick)
}
