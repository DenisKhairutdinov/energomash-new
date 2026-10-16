const STORAGE_KEY = 'theme'

type Theme = 'dark' | 'light'

const currentTheme = (): Theme =>
  document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark'

/** Переключатель темы: тёмная по умолчанию, выбор хранится в браузере. Начальную тему ставит скрипт в <head>, чтобы страница не мигала. */
export const initTheme = (): void => {
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')

  if (!button) {
    return
  }

  const sync = (): void => {
    button.setAttribute('aria-pressed', String(currentTheme() === 'light'))
  }

  button.addEventListener('click', () => {
    const next: Theme = currentTheme() === 'light' ? 'dark' : 'light'

    document.documentElement.dataset['theme'] = next

    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // без хранилища выбор действует до перезагрузки страницы
    }

    sync()
  })

  sync()
}
