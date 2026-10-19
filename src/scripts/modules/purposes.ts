const HOVER_QUERY = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

/** Вариант 1: пока курсор над плиткой, кадр слегка смещается вслед за ним (до 1.5%), при уходе возвращается. */
export const initTiles = (root: HTMLElement): void => {
  if (!matchMedia(HOVER_QUERY).matches) {
    return
  }

  for (const tile of root.querySelectorAll<HTMLElement>('[data-tile]')) {
    let frame = 0

    tile.addEventListener('pointermove', (event) => {
      if (frame !== 0) {
        return
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0

        const box = tile.getBoundingClientRect()

        tile.style.setProperty('--px', String(((event.clientX - box.left) / box.width - 0.5) * 2))
        tile.style.setProperty('--py', String(((event.clientY - box.top) / box.height - 0.5) * 2))
      })
    })

    tile.addEventListener('pointerleave', () => {
      tile.style.setProperty('--px', '0')
      tile.style.setProperty('--py', '0')
    })
  }
}

/** Каталог по назначению: кадр плиток следует за курсором. */
export const initPurposes = (): void => {
  const root = document.querySelector<HTMLElement>('section[data-purposes]')

  if (!root) {
    return
  }

  initTiles(root)
}
