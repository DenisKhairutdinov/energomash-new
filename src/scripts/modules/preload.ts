/**
 * Пока идёт интро, сайт догружается: ленивые картинки главной запрашиваются и декодируются сразу,
 * а не при прокрутке (нет «вспышек» и подтормаживания при первом проезде по странице).
 * Тяжёлую работу (разбор файлов, WebGL) делаем в простое браузера, чтобы не мешать анимации интро.
 */
const whenIdle = (task: () => void): void => {
  // requestIdleCallback есть не во всех браузерах (старый Safari): тогда запускаем с небольшой задержкой
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(
      () => {
        task()
      },
      { timeout: 2500 },
    )
  } else {
    window.setTimeout(task, 300)
  }
}

export function preloadDuringIntro(): void {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]'))

  for (const image of images) {
    // Снимаем ленивую загрузку: браузер запрашивает файл сейчас, пока играет интро
    image.loading = 'eager'
  }

  whenIdle(() => {
    for (const image of images) {
      // Декодирование вне основного потока, чтобы первый показ не тормозил
      void image.decode().catch(() => undefined)
    }
  })
}

/** Запустить `task`, когда браузер свободен (используется для прогрева тяжёлых модулей). */
export const runWhenIdle = whenIdle
