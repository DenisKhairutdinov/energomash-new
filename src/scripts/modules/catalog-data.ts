// Данные каталога из базы лежат в public/data/catalog.json и грузятся запросом в момент, когда они нужны.
// Один файл на всю страницу: каталог, поиск в шапке и страница модели берут его отсюда

const BASE_URL = import.meta.env.BASE_URL

const requests = new Map<string, Promise<unknown>>()

// Файл запрашивается один раз: повторные вызовы получают тот же запрос
const fetchOnce = <Data>(path: string): Promise<Data> => {
  let request = requests.get(path)

  if (!request) {
    request = (async (): Promise<unknown> => {
      const response = await fetch(`${BASE_URL}${path}`)

      if (!response.ok) {
        throw new Error(`${path}: ${String(response.status)} ${response.statusText}`)
      }

      return response.json()
    })()
    requests.set(path, request)
  }

  return request as Promise<Data>
}

/**
 * Адрес страницы модели. В сборке это готовая страница model/<id>.html (её делает scripts/prerender-models.mjs: свой title,
 * характеристики в HTML, разметка Product), в dev-сервере таких файлов нет, там работает оболочка product.html?id=.
 */
export const modelUrl = (id: string): string =>
  import.meta.env.PROD
    ? `${BASE_URL}model/${encodeURIComponent(id)}.html`
    : `${BASE_URL}product.html?id=${encodeURIComponent(id)}`

/** Модели и позиции склада со всеми параметрами фильтра (около 0,8 МБ). */
export const loadCatalog = (): Promise<{ items: unknown[] }> =>
  fetchOnce<{ items: unknown[] }>('data/catalog.json')

// Фотографии техники: в данных только имена файлов, а адреса знает сборка (Vite кладёт файлы в dist с хешем).
// Берутся лёгкие превью из папки thumbs: исходники по 4–5 тысяч пикселей браузер раскодировал бы целиком ради рамки в тысячу
const PHOTO_DIR = '/src/assets/models/thumbs/'
const photoUrls = import.meta.glob<string>('/src/assets/models/thumbs/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** Адрес превью по имени файла из данных; undefined, если файла нет в сборке. */
export const photoUrl = (name: string): string | undefined => photoUrls[`${PHOTO_DIR}${name}`]
