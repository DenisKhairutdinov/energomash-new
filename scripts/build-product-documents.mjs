// DOCX (OOXML в ZIP), без зависимости от установленного Word.
// Страница и документ используют одни и те же характеристики карточки.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

const root = new URL('../', import.meta.url)
const { site } = JSON.parse(readFileSync(new URL('src/data/site.json', root), 'utf8'))
const { home } = JSON.parse(readFileSync(new URL('src/data/home.json', root), 'utf8'))
const { documentBranding } = JSON.parse(
  readFileSync(new URL('src/data/document-branding.json', root), 'utf8'),
)
const siteUrl = new URL(site.url)
assert.equal(siteUrl.protocol, 'https:')
const logo = readFileSync(new URL(`.${documentBranding.logo}`, root))
const qr = await QRCode.toBuffer(siteUrl.href, {
  type: 'png',
  errorCorrectionLevel: 'M',
  margin: 4,
  scale: 10,
  color: { dark: '#000000', light: '#ffffff' },
})
const { semitrailerCards } = JSON.parse(
  readFileSync(new URL('src/data/catalog-cards/semitrailers.json', root), 'utf8'),
)
const xml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
const paragraph = (text, style = 'Normal') =>
  `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`
const drawing = (relationship, id, name, width, height) => {
  const cx = Math.round(width * 914400),
    cy = Math.round(height * 914400)
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${xml(name)}" descr="${xml(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${xml(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationship}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
}
const namespaces = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"`
const brandCell = (content, width) =>
  `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${content}</w:tc>`
const brandTable = (cells, widths, footer = false) =>
  `<w:tbl><w:tblPr><w:tblW w:w="10206" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((side) => `<w:${side} w:val="${footer && side === 'top' ? 'single' : 'nil'}" w:sz="4" w:color="D9D9D9"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="${footer ? 140 : 0}" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.map((content, index) => brandCell(content, widths[index])).join('')}</w:tr></w:tbl>`
const brandEnd =
  '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr></w:r></w:p>'
const header = `<w:hdr ${namespaces}>${brandTable(
  [
    `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${drawing('rIdLogo', 1, `Логотип ${site.name}`, 2.55, (2.55 * 27) / 176)}</w:p>`,
    paragraph(documentBranding.description, 'BrandDescription'),
  ],
  [4500, 5706],
)}${brandEnd}</w:hdr>`
const requisites = home.requisites
  .map((item) =>
    paragraph(
      item.title === 'Наименование' ? item.text : `${item.title}: ${item.text}`,
      item.title === 'Наименование' ? 'BrandCompany' : 'BrandFooter',
    ),
  )
  .join('')
const bank = documentBranding.bank
const websiteLink = `<w:p><w:pPr><w:pStyle w:val="BrandFooter"/></w:pPr><w:hyperlink r:id="rIdSite"><w:r><w:t>${xml(siteUrl.hostname)}</w:t></w:r></w:hyperlink></w:p>`
const footer = `<w:ftr ${namespaces}>${brandTable(
  [
    requisites +
      paragraph(bank.name, 'BrandFooter') +
      paragraph(`Р/с ${bank.account}`, 'BrandFooter') +
      paragraph(`БИК ${bank.bic} · К/с ${bank.correspondentAccount}`, 'BrandFooter'),
    paragraph(home.contacts.phone, 'BrandCompany') +
      paragraph(home.contacts.email, 'BrandFooter') +
      websiteLink +
      paragraph(documentBranding.legalAddress, 'BrandFooter'),
    `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>${drawing('rIdQr', 2, `QR-код на ${siteUrl.href}`, 0.9, 0.9)}</w:p><w:p><w:pPr><w:pStyle w:val="BrandFooter"/><w:jc w:val="center"/></w:pPr><w:r><w:t>Стр. </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p>`,
  ],
  [4800, 3900, 1506],
  true,
)}${brandEnd}</w:ftr>`
const cell = (text, width, header = false) =>
  `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/>${header ? '<w:shd w:fill="E9ECEF"/>' : ''}</w:tcPr>${paragraph(text, header ? 'TableHeader' : 'TableText')}</w:tc>`
const table = (items) => {
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((side) => `<w:${side} w:val="single" w:sz="4" w:color="D9D9D9"/>`)
    .join('')
  return `<w:tbl><w:tblPr><w:tblW w:w="10206" w:type="dxa"/><w:tblLayout w:type="fixed"/>
    <w:tblBorders>${borders}</w:tblBorders><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>
    <w:tblGrid><w:gridCol w:w="3600"/><w:gridCol w:w="6606"/></w:tblGrid>
    <w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${cell('Характеристика', 3600, true)}${cell('Значение', 6606, true)}</w:tr>
    ${items.map(({ label, value }) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(label, 3600)}${cell(value, 6606)}</w:tr>`).join('')}</w:tbl>`
}

// ZIP method 0 (stored). Небольшой файл собирается средствами Node.js.
const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
const zip = (files) => {
  const records = [],
    directory = []
  let offset = 0
  for (const [filename, source] of Object.entries(files)) {
    const name = Buffer.from(filename),
      data = Buffer.from(source),
      crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(0x0021, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0x0021, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    records.push(local, name, data)
    directory.push(central, name)
    offset += local.length + name.length + data.length
  }
  const directoryBuffer = Buffer.concat(directory),
    end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(directoryBuffer.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...records, directoryBuffer, end])
}

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="000000"/><w:sz w:val="20"/><w:lang w:val="ru-RU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b w:val="0"/><w:color w:val="000000"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="220" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="25"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableHeader"><w:name w:val="Table Header"/><w:basedOn w:val="TableText"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="BrandDescription"><w:name w:val="Brand Description"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="right"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:b w:val="0"/><w:color w:val="000000"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="BrandFooter"><w:name w:val="Brand Footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="20" w:line="220" w:lineRule="auto"/></w:pPr><w:rPr><w:b w:val="0"/><w:color w:val="000000"/><w:sz w:val="16"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="BrandCompany"><w:name w:val="Brand Company"/><w:basedOn w:val="BrandFooter"/><w:rPr><w:b/><w:sz w:val="17"/></w:rPr></w:style>
</w:styles>`

let written = 0
for (const category of semitrailerCards.categories) {
  for (const card of category.cards) {
    const full = card.fullCharacteristics
    if (!full) continue
    assert.equal(full.documentHref, `/downloads/${card.id}-specifications.docx`)
    const name = `${category.modelPrefix}-${card.designation}`
    const parts = [
      paragraph('Технические характеристики', 'Title'),
      paragraph(`${name} · ${category.typeLabel}`),
    ]
    for (const group of full.groups) {
      parts.push(paragraph(group.title, 'Heading1'), table(group.items))
      if (['tank-construction', 'equipment'].includes(group.id))
        parts.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    }
    if (card.optionalEquipment?.items.length) {
      parts.push(paragraph(card.optionalEquipment.title, 'Heading1'))
      for (const option of card.optionalEquipment.items) parts.push(paragraph(option))
    }
    const body = `<w:document ${namespaces}><w:body>${parts.join('')}<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1450" w:right="850" w:bottom="2450" w:left="850" w:header="425" w:footer="425"/></w:sectPr></w:body></w:document>`
    const docx = zip({
      '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
      '_rels/.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`,
      'word/_rels/document.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`,
      'word/header1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${header}`,
      'word/footer1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${footer}`,
      'word/_rels/header1.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>`,
      'word/_rels/footer1.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdQr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/site-qr.png"/><Relationship Id="rIdSite" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(siteUrl.href)}" TargetMode="External"/></Relationships>`,
      'word/media/logo.png': logo,
      'word/media/site-qr.png': qr,
      'word/styles.xml': styles,
      'docProps/core.xml': `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(`${name} — технические характеристики`)}</dc:title><dc:creator>Энергомаш</dc:creator></cp:coreProperties>`,
    })
    const output = new URL(`public${full.documentHref}`, root)
    mkdirSync(new URL('.', output), { recursive: true })
    writeFileSync(output, docx)
    written++
    console.log(
      `${name}: ${full.groups.reduce((sum, group) => sum + group.items.length, 0)} характеристик → ${full.documentHref}`,
    )
  }
}
assert(written > 0, 'Нет полных характеристик для документов')
