const ACTIVE = 'is-active'
const PARAMETER = 'rubric'
const ALL = 'all'

/**
 * Фильтр рубрик на странице блога: кнопки скрывают статьи других рубрик, выбор держится в адресе (?rubric=…),
 * поэтому ссылки из меню и со страниц статей открывают нужную рубрику. Без скрипта виден весь список.
 */
export const initBlog = (): void => {
  const root = document.querySelector<HTMLElement>('[data-blog]')
  const chips = [...(root?.querySelectorAll<HTMLButtonElement>('[data-rubric].bl__chip') ?? [])]
  const items = [...(root?.querySelectorAll<HTMLElement>('[data-blog-list] > li') ?? [])]

  if (!root || chips.length === 0) {
    return
  }

  const apply = (rubric: string): void => {
    for (const chip of chips) {
      chip.classList.toggle(ACTIVE, chip.dataset['rubric'] === rubric)
    }

    for (const item of items) {
      item.hidden = rubric !== ALL && item.dataset['rubric'] !== rubric
    }
  }

  const known = new Set(chips.map((chip) => chip.dataset['rubric'] ?? ''))
  const fromUrl = new URLSearchParams(location.search).get(PARAMETER) ?? ALL

  apply(known.has(fromUrl) ? fromUrl : ALL)

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const rubric = chip.dataset['rubric'] ?? ALL
      const url = new URL(location.href)

      apply(rubric)

      if (rubric === ALL) {
        url.searchParams.delete(PARAMETER)
      } else {
        url.searchParams.set(PARAMETER, rubric)
      }

      history.replaceState(null, '', url)
    })
  }
}
