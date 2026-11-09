const STORAGE_KEY = 'theme'

type Theme = 'dark' | 'light'

const currentTheme = (): Theme =>
  document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light'

/** Переключатель темы: светлая по умолчанию, выбор хранится в браузере. Начальную тему ставит скрипт в <head>, чтобы страница не мигала. */
export const initTheme = (): void => {
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')

  if (!button) {
    return
  }

  const sync = (): void => {
    const isDark = currentTheme() === 'dark'
    button.setAttribute('aria-pressed', String(isDark))
    button.title = isDark ? 'Включить светлую тему' : 'Включить тёмную тему'
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#0e0e0f' : '#fcfdfe')
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
