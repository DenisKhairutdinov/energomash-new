// Готовые страницы моделей: dist/model/<id>.html для каждой позиции каталога (public/data/catalog.json).
// Оболочка product.html строится скриптом в браузере, поэтому поиск её содержимое не видит. Здесь из собранного product.html
// делаются отдельные страницы со своим title и описанием, canonical, названием, характеристиками и описанием назначения прямо в HTML
// и разметкой Product и BreadcrumbList. Скрипт product.ts на такой странице берёт id из data-model-id и перестраивает те же блоки.
// Запуск после сборки (vite build) и до prefix-base: node scripts/prerender-models.mjs [dist]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = process.argv[2] ?? 'dist'
const { site } = JSON.parse(readFileSync('src/data/site.json', 'utf8'))
const { items } = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'))
const template = readFileSync(join(dist, 'product.html'), 'utf8')

const STATUS = {
  in: 'В наличии',
  expected: 'Ожидается поступление',
  order: 'Изготовление под заказ',
}
const MAX_TITLE = 68
const MAX_DESCRIPTION = 165

const escape = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`

const copy = (() => {
  const match = /<script type="application\/json" id="product-copy">([\s\S]*?)<\/script>/.exec(
    template,
  )
  const parsed = match ? JSON.parse(match[1]) : undefined

  return parsed && 'product' in parsed ? parsed.product : parsed
})()

// Каждая замена обязана сработать: иначе шаблон изменился и страницы вышли бы без своего содержимого
// value — строка (вставляется как есть) или функция от найденных групп
const replaceOnce = (html, pattern, value) => {
  if (!pattern.test(html)) {
    throw new Error(`prerender-models: в product.html не найдено ${String(pattern)}`)
  }

  return html.replace(pattern, typeof value === 'function' ? value : () => value)
}

// Одна модель встречается несколько раз (варианты шасси, позиция склада и заказная): у таких страниц название получает
// отличие, чтобы title и описание не повторялись. Сначала код модели, затем наличие, затем номер позиции
const sameModel = new Map()

for (const item of items) {
  sameModel.set(item.model, [...(sameModel.get(item.model) ?? []), item])
}

const markOf = (item) => {
  const group = sameModel.get(item.model) ?? []

  if (group.length < 2) {
    return ''
  }

  const byCode = item.code ? `код ${item.code}` : ''
  const byStatus =
    item.stock.status === 'in'
      ? 'в наличии'
      : item.stock.status === 'expected'
        ? 'ожидается'
        : 'под заказ'
  const unique = (mark) =>
    group.filter((other) => markFor(other, mark) === markFor(item, mark)).length === 1
  const markFor = (target, mark) =>
    mark === 'code'
      ? target.code
        ? `код ${target.code}`
        : ''
      : mark === 'status'
        ? target.stock.status
        : String(target.nid)

  if (byCode && unique('code')) {
    return byCode
  }

  if (unique('status')) {
    return byStatus
  }

  return `№ ${String(item.nid)}`
}

const buildTitle = (item) => {
  const mark = markOf(item)
  const name = mark ? `${item.model} (${mark})` : item.model
  const full = `${name}: ${item.typeLabel} — ${site.name}`

  return full.length <= MAX_TITLE ? full : `${name}: ${item.typeLabel}`
}

const buildDescription = (item) => {
  const status = STATUS[item.stock.status] ?? STATUS.order
  const mark = markOf(item)
  const name = mark ? `${item.model} (${mark})` : item.model
  const tail = `${status}. Завод «${site.name}»: лизинг, доставка по России.`
  let specs = item.specs.map(([label, value]) => `${label.toLowerCase()} ${String(value)}`)

  while (specs.length > 0) {
    const text = `${item.typeLabel} ${name}: ${specs.join(', ')}. ${tail}`

    if (text.length <= MAX_DESCRIPTION) {
      return text
    }

    specs = specs.slice(0, -1)
  }

  return `${item.typeLabel} ${name}. ${tail}`
}

const renderSpecs = (item) => {
  const rows = item.specs.map(([label, value]) => [label, String(value)])

  if (item.code) {
    rows.push(['Код', item.code])
  }

  return rows
    .map(
      ([label, value]) =>
        `<div class="pdp__spec"><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`,
    )
    .join('')
}

const renderPage = (item) => {
  const url = `${site.url}/model/${encodeURIComponent(item.id)}.html`
  const title = buildTitle(item)
  const description = buildDescription(item)
  const status = STATUS[item.stock.status] ?? STATUS.order
  const purpose = copy?.purposes?.[item.purpose]
  let html = template

  html = html.replace(/<meta name="robots"[^>]*>\s*/, '')
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escape(description)}" />\n    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />`,
  )
  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escape(title)}" />`,
  )
  html = replaceOnce(
    html,
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escape(description)}" />`,
  )
  html = replaceOnce(
    html,
    /<article class="pdp" data-product>/,
    `<article class="pdp" data-product data-model-id="${escape(item.id)}">`,
  )
  html = replaceOnce(
    html,
    /<p class="pdp__type" data-pdp-type>[^<]*<\/p>/,
    `<p class="pdp__type" data-pdp-type>${escape(item.typeLabel)}</p>`,
  )
  html = replaceOnce(
    html,
    /<h1 class="pdp__title" id="pdp-title" data-pdp-title>[^<]*<\/h1>/,
    `<h1 class="pdp__title" id="pdp-title" data-pdp-title>${escape(item.model)}</h1>`,
  )
  html = replaceOnce(
    html,
    /<p class="pdp__status" data-pdp-status hidden><\/p>/,
    `<p class="pdp__status" data-pdp-status>${status}</p>`,
  )
  html = replaceOnce(
    html,
    /<dl class="pdp__specs" data-pdp-specs hidden><\/dl>/,
    `<dl class="pdp__specs" data-pdp-specs>${renderSpecs(item)}</dl>`,
  )

  if (purpose) {
    const features = purpose.features.map((feature) => `<li>${escape(feature)}</li>`).join('')
    const about = `${purpose.text} ${copy.types?.[item.type] ?? ''}`.trim()

    html = replaceOnce(
      html,
      /<section class="pdp__about"([^>]*?) hidden data-pdp-about>/,
      (_, attributes) => `<section class="pdp__about"${attributes} data-pdp-about>`,
    )
    html = replaceOnce(
      html,
      /(<h2 [^>]*data-pdp-about-title[^>]*>)[^<]*(<\/h2>)/,
      (_, open, close) => `${open}${escape(purpose.title)}${close}`,
    )
    html = replaceOnce(
      html,
      /(<p class="pdp__about-text" data-pdp-about-text>)(<\/p>)/,
      (_, open, close) => `${open}${escape(about)}${close}`,
    )
    html = replaceOnce(
      html,
      /(<ul class="pdp__features" data-pdp-features>)(<\/ul>)/,
      (_, open, close) => `${open}${features}${close}`,
    )
  }

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.model,
    description,
    category: item.typeLabel,
    sku: item.code ?? item.id,
    url,
    brand: { '@type': 'Brand', name: site.name },
    manufacturer: { '@type': 'Organization', name: site.legalName, url: site.url },
    additionalProperty: item.specs.map(([label, value]) => ({
      '@type': 'PropertyValue',
      name: label,
      value: String(value),
    })),
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${site.url}/` },
      { '@type': 'ListItem', position: 2, name: 'Каталог', item: `${site.url}/catalog.html` },
      { '@type': 'ListItem', position: 3, name: item.model, item: url },
    ],
  }

  return replaceOnce(html, /<\/head>/, `${jsonLd(product)}\n    ${jsonLd(breadcrumbs)}\n  </head>`)
}

mkdirSync(join(dist, 'model'), { recursive: true })

for (const item of items) {
  writeFileSync(join(dist, 'model', `${item.id}.html`), renderPage(item))
}

console.log(`prerender-models: ${String(items.length)} страниц в ${dist}/model/`)
