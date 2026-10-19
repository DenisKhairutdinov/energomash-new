// SEO-обработка собранных страниц (после vite build и prerender-models, до prefix-base).
// 1. Несколько блоков FAQPage на одной странице (страница вопросов собирает их по темам) объединяются в один.
// 2. В статьях блок «Частые вопросы» (пары h3 + p) получает разметку FAQPage: статьи пишутся как обычный HTML, поэтому
//    вопросы и ответы берутся из готовой страницы, а не дублируются в данных.
// Запуск: node scripts/seo-postbuild.mjs [dist]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = process.argv[2] ?? 'dist'
const LD = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g

const plain = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&laquo;', '«')
    .replaceAll('&raquo;', '»')
    .replace(/\s+/g, ' ')
    .trim()

const ldBlock = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`

const articleFaq = (html) => {
  const start = html.indexOf('<h2>Частые вопросы</h2>')

  if (start < 0) {
    return []
  }

  const rest = html.slice(start + '<h2>Частые вопросы</h2>'.length)
  const end = rest.search(/<h2[ >]|<p>Читайте также/)
  const segment = end < 0 ? rest : rest.slice(0, end)

  return [...segment.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map(
    ([, question, answer]) => ({
      '@type': 'Question',
      name: plain(question),
      acceptedAnswer: { '@type': 'Answer', text: plain(answer) },
    }),
  )
}

let merged = 0
let articles = 0

for (const name of readdirSync(dist).filter((file) => file.endsWith('.html'))) {
  const path = join(dist, name)
  let html = readFileSync(path, 'utf8')
  const before = html

  // Объединение нескольких FAQPage
  const faqBlocks = [...html.matchAll(LD)].filter(([, json]) => json.includes('"FAQPage"'))

  if (faqBlocks.length > 1) {
    const entities = faqBlocks.flatMap(([, json]) => JSON.parse(json).mainEntity)

    for (const [block] of faqBlocks) {
      html = html.replace(block, '')
    }

    html = html.replace(
      '</head>',
      () =>
        `${ldBlock({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entities })}\n  </head>`,
    )
    merged += 1
  }

  // FAQPage для статей, у которых его ещё нет
  if (name.startsWith('blog-') && name !== 'blog.html' && !html.includes('"FAQPage"')) {
    const mainEntity = articleFaq(html)

    if (mainEntity.length > 0) {
      html = html.replace(
        '</head>',
        () =>
          `${ldBlock({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity })}\n  </head>`,
      )
      articles += 1
    }
  }

  if (html !== before) {
    writeFileSync(path, html)
  }
}

console.log(
  `seo-postbuild: объединено FAQPage на ${String(merged)} стр., вопросы статей размечены на ${String(articles)} стр.`,
)
