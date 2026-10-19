/** Отладочная подсветка 12 колонок: клавиша G, только на локальном сервере. Помогает сверять композицию с сеткой. */
export const initGridOverlay = (): void => {
  if (!import.meta.env.DEV) {
    return
  }

  const overlay = document.createElement('div')
  const container = document.createElement('div')
  const columns = document.createElement('div')

  overlay.className = 'grid-overlay'
  overlay.setAttribute('aria-hidden', 'true')
  container.className = 'container'
  container.style.blockSize = '100%'
  columns.className = 'grid-overlay__cols'

  for (let index = 0; index < 12; index += 1) {
    columns.append(document.createElement('span'))
  }

  container.append(columns)
  overlay.append(container)
  document.body.append(overlay)

  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null
    const typing = target?.matches('input, textarea, select, [contenteditable]')

    if (event.key.toLowerCase() === 'g' && !typing && !event.metaKey && !event.ctrlKey) {
      overlay.classList.toggle('is-on')
    }
  })
}
