// Для деплоя на подкаталог (GitHub Pages: /energomash-new/): Vite префиксует только ресурсы, а корневые ссылки страниц
// (href="/catalog.html", action="/catalog.html") остаются как есть. Скрипт дописывает базу к ним в уже собранном dist.
// Запуск: node scripts/prefix-base.mjs /energomash-new/ dist
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const [base = '/', dir = 'dist'] = process.argv.slice(2)

if (base === '/') {
  process.exit(0)
}

const walk = (folder) =>
  readdirSync(folder).flatMap((name) => {
    const path = join(folder, name)

    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.html') ? [path] : []
  })

const pattern = new RegExp(`\\b(href|action)="/(?!/|${base.replaceAll('/', '')}/)`, 'g')
let count = 0

for (const file of walk(dir)) {
  const html = readFileSync(file, 'utf8')
  const next = html.replace(pattern, (_, attribute) => {
    count += 1

    return `${attribute}="${base}`
  })

  if (next !== html) {
    writeFileSync(file, next)
  }
}

console.log(`prefix-base: ${count} ссылок получили префикс ${base}`)
