const GRAY_CLASS = 'request--gray'

const isTransparent = (color: string): boolean =>
  color === 'transparent' || /rgba\(.*,\s*0\)$/.test(color)

// Фон секции над формой: берём последнюю секцию страницы; без своего фона (прозрачная) цвет даёт страница
const previousBackground = (): string => {
  const main = document.querySelector<HTMLElement>('main')
  let section: Element | null | undefined = main?.lastElementChild

  while (
    section?.lastElementChild &&
    section.tagName !== 'SECTION' &&
    section.tagName !== 'FOOTER'
  ) {
    const next: Element | null =
      [...section.children]
        .toReversed()
        .find((child) => !['SCRIPT', 'STYLE'].includes(child.tagName)) ?? null

    if (!next) {
      break
    }

    section = next
  }

  const color = section ? getComputedStyle(section).backgroundColor : ''

  return isTransparent(color) ? getComputedStyle(document.body).backgroundColor : color
}

/**
 * Форма заявки перед футером на внутренних страницах: если секция над ней того же цвета, что сама форма (белая),
 * форма переключается на серую тему, чтобы границы секций читались.
 */
export const initRequestTone = (): void => {
  const request = document.querySelector<HTMLElement>('.request')

  if (!request || document.body.classList.contains('page--home')) {
    return
  }

  if (previousBackground() === getComputedStyle(request).backgroundColor) {
    request.classList.add(GRAY_CLASS)
  }
}
