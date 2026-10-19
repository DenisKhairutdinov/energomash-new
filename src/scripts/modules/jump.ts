/**
 * Навигация по разделам страницы в тёмной шапке: ссылки собираются из заголовков секций `.ip__sec h2[id]`.
 * Плавный переход к якорю делает общий обработчик в smooth.ts.
 */
export const initJump = (): void => {
  const nav = document.querySelector<HTMLElement>('[data-jump]')

  if (!nav) {
    return
  }

  const headings = document.querySelectorAll<HTMLElement>('.ip__sec h2[id]')

  for (const heading of headings) {
    const link = document.createElement('a')

    link.href = `#${heading.id}`
    link.textContent = heading.textContent.replaceAll(/\s+/g, ' ').trim()
    nav.append(link)
  }

  nav.hidden = headings.length === 0
}
