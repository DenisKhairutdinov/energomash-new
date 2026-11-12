// Основа будущих карточек. Текущий каталог и страницы моделей не изменяются.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'

const root = new URL('../', import.meta.url)
const sourcePath = 'public/data/catalog.json'
const outputDirectory = new URL('src/data/catalog-cards/', root)
const outputPath = new URL('semitrailers.json', outputDirectory)
const tablePath = new URL('semitrailers-table.md', outputDirectory)
const { items } = JSON.parse(readFileSync(new URL(sourcePath, root), 'utf8'))
const { catalog } = JSON.parse(readFileSync(new URL('src/data/catalog.json', root), 'utf8'))
const { semitrailerCharacteristics } = JSON.parse(
  readFileSync(new URL('src/data/catalog-cards/characteristics.json', root), 'utf8'),
)
const { semitrailerFullCharacteristics } = JSON.parse(
  readFileSync(new URL('src/data/catalog-cards/full-characteristics.json', root), 'utf8'),
)
const sourceItems = items.filter((item) => item.type === 'semitrailer')
const groups = new Map()
const sourceById = new Map(sourceItems.map((item) => [item.id, item]))
const categoryNames = {
  fuel: { modelPrefix: 'ППЦ', typeLabel: 'Полуприцеп-цистерна для светлых нефтепродуктов' },
  oil: { modelPrefix: 'ППЦН', typeLabel: 'Полуприцеп-цистерна для тёмных нефтепродуктов' },
  'tech-water': { modelPrefix: 'ППЦТВ', typeLabel: 'Полуприцеп-цистерна для технической воды' },
  vacuum: { modelPrefix: 'ППЦВ', typeLabel: 'Вакуумный полуприцеп-цистерна' },
}

// Варианты берём только из модификаций конкретной карточки.
const sourceCharacteristicsFor = (card) => {
  const modifications = card.sourceItems.map(({ id }) => sourceById.get(id))
  const items = catalog.filters.flatMap((filter) => {
    if (
      !['shape', 'suspension', 'axle', 'tyres', 'construction', 'insulated', 'pump'].includes(
        filter.name,
      )
    )
      return []
    const values = filter.options
      .filter((option) => modifications.some((item) => item.params[filter.name] === option.value))
      .map((option) => option.label)
    return values.length
      ? [{ id: filter.name, label: filter.label, values, source: 'catalog.params.byCard' }]
      : []
  })
  const axles = [
    ...new Set(
      modifications.flatMap((item) => (item.params.axles ? [Number(item.params.axles)] : [])),
    ),
  ].sort((a, b) => a - b)
  if (axles.length)
    items.push({
      id: 'axleCount',
      label: 'Количество осей',
      values: axles,
      source: 'catalog.params.byCard',
    })
  if (card.availableSsuMm.length)
    items.push({
      id: 'ssuHeight',
      label: 'Высота ССУ',
      values: card.availableSsuMm.map((height) => `${height} мм`),
      source: 'catalog.params.byCard',
    })
  return { title: 'Краткие характеристики', items }
}

const axleCountsFor = (purpose, volume) => {
  const override = semitrailerCharacteristics[purpose]?.axleCountsByVolume?.[volume]
  const values = override ?? [
    ...new Set(
      sourceItems
        .filter(
          (item) =>
            item.purpose === purpose && item.params.volume === volume && item.params.axles != null,
        )
        .map((item) => Number(item.params.axles)),
    ),
  ]
  assert(
    Array.isArray(values) && values.every((value) => Number.isInteger(value) && value > 0),
    `Некорректное количество осей: ${purpose}, ${volume}`,
  )
  return {
    values: [...new Set(values)].sort((a, b) => a - b),
    source: override ? 'characteristics.axleCountsByVolume' : 'catalog.params.axles.byVolume',
    status: values.length ? 'specified' : 'needs-confirmation',
  }
}

for (const item of sourceItems) {
  // ППЦ-28/3К, ППЦН-20Т и ППЦТВ-32ТК: буквы после чисел не меняют объём и секции.
  // Числовой code — код исполнения; объём/секции записаны в обозначении model.
  const match = /^[^-]+-(\d+(?:[.,]\d+)?)(?:\/(\d+))?[^\d/-]*(?=-|$)/u.exec(item.model)
  assert(match, `Не удалось разобрать обозначение ${item.id}: ${item.model}`)

  const volume = Number(match[1].replace(',', '.'))
  const sections = Number(match[2] ?? 1)
  assert(volume > 0 && Number.isInteger(sections) && sections > 0, item.id)
  assert.equal(volume, item.params.volume, `Объём расходится с характеристиками: ${item.id}`)
  assert.equal(sections, Number(item.params.sections), `Секции расходятся: ${item.id}`)

  // ССУ берём из характеристик, не из хвоста обозначения модели.
  const ssuMm = item.params.ssu == null ? null : Number(item.params.ssu)
  assert(ssuMm === null || (Number.isFinite(ssuMm) && ssuMm > 0), `Некорректный ССУ: ${item.id}`)

  const id = `semitrailer-${item.purpose}-${volume}-${sections}`
  let card = groups.get(id)

  if (!card) {
    card = {
      id,
      designation: `${volume}/${sections}`,
      volume,
      sections,
      availableSsuMm: [],
      photos: [],
      sourceItems: [],
    }
    groups.set(id, card)
  }

  if (ssuMm !== null && !card.availableSsuMm.includes(ssuMm)) {
    card.availableSsuMm.push(ssuMm)
  }
  for (const photo of [
    ...item.photos,
    ...(item.stock?.units ?? []).flatMap((unit) => unit.photos ?? []),
  ]) {
    if (!card.photos.includes(photo)) card.photos.push(photo)
  }
  card.sourceItems.push({
    id: item.id,
    model: item.model,
    code: item.code,
    ssuMm,
    // Сохраняем различия вакуумных исполнений внутри объединённой карточки.
    ...(item.purpose === 'vacuum' ? { params: item.params } : {}),
  })
}

const categories = catalog.purposes.flatMap(({ value, label }) => {
  const cards = [...groups.values()]
    .filter((card) => card.id.startsWith(`semitrailer-${value}-`))
    .sort(
      (a, b) =>
        a.volume - b.volume ||
        a.sections - b.sections ||
        a.designation.localeCompare(b.designation, 'ru') ||
        a.id.localeCompare(b.id, 'en', { numeric: true }),
    )

  if (cards.length === 0) return []

  for (const card of cards) {
    card.availableSsuMm.sort((a, b) => a - b)
    card.sourceItems.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
    const details = semitrailerCharacteristics[value]
    if (details) {
      card.briefCharacteristics = {
        title: details.briefCharacteristics.title,
        items: details.briefCharacteristics.items.map((item) => {
          if (!item.byVolume) return structuredClone(item)
          const characteristic = structuredClone(item)
          delete characteristic.byVolume
          return { ...characteristic, ...axleCountsFor(value, card.volume) }
        }),
      }
      card.optionalEquipment = structuredClone(details.optionalEquipment)
    } else {
      card.briefCharacteristics = sourceCharacteristicsFor(card)
    }
    const full = semitrailerFullCharacteristics[card.id] ?? semitrailerFullCharacteristics[value]
    if (full) {
      card.fullCharacteristics = {
        title: full.title,
        documentHref: `/downloads/${card.id}-specifications.docx`,
        groups: full.groups.map((group) => ({
          id: group.id,
          title: group.title,
          items: group.items.map(
            ({ label, value, briefId, field, suffix = '', valueLabels = {} }) => {
              let values = value ? [value] : []
              if (field) {
                assert(['volume', 'sections', 'availableSsuMm'].includes(field), field)
                values = Array.isArray(card[field]) ? card[field] : [card[field]]
              }
              if (briefId) {
                values =
                  card.briefCharacteristics.items.find((item) => item.id === briefId)?.values ?? []
              }
              assert(values.length, `Нет значения полной характеристики: ${card.id}, ${label}`)
              return {
                label,
                value: values.map((item) => `${valueLabels[item] ?? item}${suffix}`).join(' / '),
              }
            },
          ),
        })),
      }
    }
  }

  return [
    {
      purpose: value,
      label,
      ...categoryNames[value],
      grouping: 'volume-sections',
      total: cards.length,
      cards,
    },
  ]
})

const groupedItems = categories.flatMap((category) =>
  category.cards.flatMap((card) => card.sourceItems),
)
assert.equal(groupedItems.length, sourceItems.length, 'Потеряны исходные позиции')
assert.equal(
  new Set(groupedItems.map((item) => item.id)).size,
  sourceItems.length,
  'Дубли исходных позиций',
)
assert.equal(
  categories.reduce((sum, category) => sum + category.total, 0),
  groups.size,
)

const result = {
  semitrailerCards: {
    source: {
      catalog: sourcePath,
      groupBy: ['purpose', 'volume', 'sections'],
      sectionsRule: 'Число после / в обозначении model; без / — одна секция.',
      ssuField: 'params.ssu',
      characteristics: 'src/data/catalog-cards/characteristics.json',
      fullCharacteristics: 'src/data/catalog-cards/full-characteristics.json',
      sourceItemCount: sourceItems.length,
      sourceItemsWithoutSsu: sourceItems
        .filter((item) => item.params.ssu == null)
        .map((item) => item.id)
        .sort(),
    },
    type: 'semitrailer',
    units: { volume: 'м³', ssu: 'мм' },
    total: groups.size,
    categories,
  },
}

mkdirSync(outputDirectory, { recursive: true })
const prettierConfig = await resolveConfig(fileURLToPath(outputPath))
writeFileSync(
  outputPath,
  await format(JSON.stringify(result), { ...prettierConfig, parser: 'json' }),
)

const lines = [
  '# Полуприцепы-цистерны — будущие карточки',
  '',
  'Источник: [semitrailers.json](semitrailers.json). Все категории, включая вакуумные, объединены по объёму и количеству секций.',
  '',
  `Всего карточек: **${groups.size}**. Исходных модификаций: **${sourceItems.length}**.`,
  '',
  'Вопрос разделения рамных и безрамных исполнений остаётся открытым.',
]
const escapeCell = (value) =>
  String(value ?? 'Не указан')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ')
for (const category of categories) {
  lines.push('', `## ${category.label} (${category.total})`, '')
  const details = semitrailerCharacteristics[category.purpose]
  if (details) {
    lines.push(
      `### ${details.briefCharacteristics.title}`,
      '',
      '| Характеристика | Варианты |',
      '| --- | --- |',
    )
    for (const item of details.briefCharacteristics.items) {
      lines.push(
        `| ${escapeCell(item.label)} | ${escapeCell(item.byVolume ? 'Индивидуально по объёму, см. колонку «Осей»' : item.values.join('; '))} |`,
      )
    }
    lines.push(
      '',
      `### ${details.optionalEquipment.title}`,
      '',
      ...details.optionalEquipment.items.map((item) => `- ${item}`),
      '',
      '### Карточки',
      '',
    )
  }
  lines.push(
    details
      ? '| Обозначение | Объём, м³ | Секций | Осей | Доступные ССУ, мм | Модификаций | Из них без ССУ |'
      : '| Обозначение | Объём, м³ | Секций | Доступные ССУ, мм | Модификаций | Из них без ССУ |',
    details
      ? '| --- | ---: | ---: | --- | --- | ---: | ---: |'
      : '| --- | ---: | ---: | --- | ---: | ---: |',
  )
  for (const card of category.cards) {
    const heights = card.availableSsuMm.length ? card.availableSsuMm.join(', ') : 'Не указан'
    const cells = [
      card.designation,
      card.volume,
      card.sections,
      ...(details
        ? [
            card.briefCharacteristics.items
              .find((item) => item.id === 'axleCount')
              .values.join(', ') || 'Требует уточнения',
          ]
        : []),
      heights,
      card.sourceItems.length,
      card.sourceItems.filter((sourceItem) => sourceItem.ssuMm === null).length,
    ]
    lines.push(`| ${cells.map(escapeCell).join(' | ')} |`)
  }
}
lines.push(
  '',
  'Количество осей для светлых нефтепродуктов: ниже 20 м³ — только 2; начиная с 20 м³ доступно 3. Для 20 и 24 м³ также сохранён вариант с 2 осями из исходного каталога. Значения задаются в characteristics.json по объёму.',
  '',
  'ССУ перечислены только по известным характеристикам исходных модификаций каждой группы. «Без ССУ» означает отсутствие характеристики в источнике.',
  '',
)
writeFileSync(tablePath, await format(lines.join('\n'), { ...prettierConfig, parser: 'markdown' }))
console.log(`semitrailer-cards: ${sourceItems.length} позиций → ${groups.size} карточек`)
for (const category of categories) console.log(`  ${category.label}: ${category.total}`)
console.log(
  `ССУ не указан у ${result.semitrailerCards.source.sourceItemsWithoutSsu.length} исходных позиций`,
)
console.log(fileURLToPath(outputPath))
