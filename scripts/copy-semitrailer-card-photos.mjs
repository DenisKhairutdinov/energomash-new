// Копии оригиналов для будущих карточек; исходные фотографии остаются на месте.
import assert from 'node:assert/strict'
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'

const root = new URL('../', import.meta.url)
const sourceDirectory = fileURLToPath(new URL('src/assets/models/', root))
const outputDirectory = fileURLToPath(new URL('src/assets/catalog-cards/', root))
const { items } = JSON.parse(readFileSync(new URL('public/data/catalog.json', root), 'utf8'))
const { semitrailerCards } = JSON.parse(
  readFileSync(new URL('src/data/catalog-cards/semitrailers.json', root), 'utf8'),
)
const byId = new Map(items.map((item) => [item.id, item]))
const cards = []

// Сначала проверяем все ссылки и исходники, затем копируем.
for (const category of semitrailerCards.categories) {
  for (const card of category.cards) {
    assert(/^[a-z0-9-]+$/u.test(card.id), `Некорректный ID папки: ${card.id}`)
    const photos = new Map()
    for (const reference of card.sourceItems) {
      const item = byId.get(reference.id)
      assert(item, `Нет исходной позиции ${reference.id}`)
      const names = new Set([
        ...item.photos,
        ...(item.stock?.units ?? []).flatMap((unit) => unit.photos ?? []),
      ])
      for (const name of names) {
        assert.equal(name, basename(name), `Ожидалось имя файла: ${name}`)
        assert(!/[\\/]/u.test(name), `Путь вместо имени файла: ${name}`)
        const sourcePath = join(sourceDirectory, name)
        assert(existsSync(sourcePath), `Не найден оригинал: ${sourcePath}`)
        const sourceItemIds = photos.get(name) ?? []
        sourceItemIds.push(item.id)
        photos.set(name, sourceItemIds)
      }
    }
    cards.push({
      id: card.id,
      purpose: category.purpose,
      designation: card.designation,
      photoCount: photos.size,
      photos: [...photos].map(([file, sourceItemIds]) => ({ file, sourceItemIds })),
    })
  }
}

let copied = 0
let unchanged = 0
for (const card of cards) {
  const directory = join(outputDirectory, card.id)
  mkdirSync(directory, { recursive: true })
  for (const photo of card.photos) {
    const sourcePath = join(sourceDirectory, photo.file)
    const targetPath = join(directory, photo.file)
    if (existsSync(targetPath)) {
      assert(
        readFileSync(sourcePath).equals(readFileSync(targetPath)),
        `Копия изменена вручную, перезапись отменена: ${targetPath}`,
      )
      unchanged++
    } else {
      copyFileSync(sourcePath, targetPath, constants.COPYFILE_EXCL)
      assert(readFileSync(sourcePath).equals(readFileSync(targetPath)), targetPath)
      copied++
    }
  }
  if (card.photoCount === 0) {
    writeFileSync(
      join(directory, 'README.md'),
      `# ${card.id}\n\nУ исходных модификаций карточки ${card.designation} фотографий в каталоге нет.\n`,
    )
  }
}

const manifestPath = join(outputDirectory, 'manifest.json')
const manifest = {
  source: 'src/assets/models',
  catalog: 'public/data/catalog.json',
  cardsSource: 'src/data/catalog-cards/semitrailers.json',
  totalCards: cards.length,
  totalPhotos: cards.reduce((sum, card) => sum + card.photoCount, 0),
  cards,
}
const prettierConfig = await resolveConfig(manifestPath)
writeFileSync(
  manifestPath,
  await format(JSON.stringify(manifest), { ...prettierConfig, parser: 'json' }),
)
const emptyCards = cards.filter((card) => card.photoCount === 0)
writeFileSync(
  join(outputDirectory, 'README.md'),
  [
    '# Фотографии будущих карточек полуприцепов-цистерн',
    '',
    `Папок карточек: ${cards.length}. Копий фотографий: ${manifest.totalPhotos}.`,
    '',
    'Каждая подпапка названа по ID карточки из `src/data/catalog-cards/semitrailers.json`.',
    'В ней находятся копии оригиналов из `src/assets/models`, с исходными именами файлов.',
    'Учтены фотографии модификаций и вложенных складских единиц. Превью из `thumbs` не копируются.',
    'Повторяющиеся фото внутри карточки сохранены один раз; общие для разных карточек скопированы в каждую.',
    '',
    '`manifest.json` связывает фотографии каждой карточки с ID исходных модификаций.',
    '',
    'Без фотографий в исходном каталоге:',
    '',
    ...emptyCards.map((card) => '- `' + card.id + '`'),
    '',
    'Повторить копирование: `node scripts/copy-semitrailer-card-photos.mjs`.',
    'Скрипт добавляет недостающие копии, проверяет содержимое существующих и не удаляет файлы.',
    'Если копия изменена вручную, скрипт остановится, сохранив её.',
    '',
  ].join('\n'),
)
console.log(
  `Папок: ${cards.length}; скопировано: ${copied}; уже совпадают: ${unchanged}; без фото: ${emptyCards.length}`,
)
console.log(outputDirectory)
