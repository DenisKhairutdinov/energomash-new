// Генерирует public/sitemap.xml по страницам из src/pages (кроме служебных) и каталогу. Адрес сайта берётся из src/data/site.json.
// Запуск: npm run sitemap (выполняется и перед сборкой).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const { site } = JSON.parse(readFileSync('src/data/site.json', 'utf8'))
const SKIP = new Set(['index', '403', '404', '500', '503', 'product'])

const pages = readdirSync('src/pages')
  .filter((file) => file.endsWith('.njk'))
  .map((file) => file.replace(/\.njk$/, ''))
  .filter((name) => !SKIP.has(name))
  .sort()
  .map((name) => `/${name}.html`)

const blog = JSON.parse(readFileSync('src/data/blog.json', 'utf8')).blog
const dates = new Map(blog.posts.map((post) => [post.url, post.datetime]))

const urls = ['/', ...pages]
  .map((path) => {
    const lastmod = dates.get(path)

    return `  <url><loc>${site.url}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
  })
  .join('\n')

writeFileSync(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
)
console.log(`sitemap: ${String(pages.length + 1)} адресов`)
