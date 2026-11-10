/** Гармошка склада: наведение мышью, фокус клавиатуры или нажатие на сенсорном экране. */
export const initSlider = (): void => {
  const root = document.querySelector<HTMLElement>('[data-showcase]')
  if (!root) return

  const panels = [...root.querySelectorAll<HTMLElement>('[data-stock-panel]')]
  const triggers = [...root.querySelectorAll<HTMLElement>('[data-stock-trigger]')]
  if (!panels.length || panels.length !== triggers.length) return

  const show = (index: number): void => {
    for (const [position, panel] of panels.entries()) {
      const active = position === index
      panel.classList.toggle('is-active', active)
      const content = panel.querySelector<HTMLElement>('[data-stock-content]')
      if (content) {
        content.inert = !active
        content.setAttribute('aria-hidden', String(!active))
      }
    }
  }

  for (const [index, panel] of panels.entries()) {
    panel.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') show(index)
    })
    panel.addEventListener('focusin', () => show(index))
    triggers[index]?.addEventListener('click', () => show(index))
    triggers[index]?.addEventListener('keydown', (event) => {
      let target: number
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          target = (index + 1) % panels.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          target = (index - 1 + panels.length) % panels.length
          break
        case 'Home':
          target = 0
          break
        case 'End':
          target = panels.length - 1
          break
        default:
          return
      }
      event.preventDefault()
      show(target)
      triggers[target]?.focus({ preventScroll: true })
    })
  }
  show(0)
}
