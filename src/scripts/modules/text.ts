import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

/** Заголовки секций ([data-split]): строки по очереди выезжают из-под маски, когда секция входит в экран. */
export const initText = (): void => {
  gsap.registerPlugin(ScrollTrigger, SplitText)

  const titles = gsap.utils.toArray<HTMLElement>('[data-split]')

  if (titles.length === 0) {
    return
  }

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    for (const title of titles) {
      SplitText.create(title, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        linesClass: 'split-line',
        // GSAP-анимация «thenable», но SplitText ждёт именно её: по возвращённой анимации он синхронизирует повторную разбивку
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSplit: (split) =>
          gsap.from(split.lines, {
            yPercent: 100,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.09,
            scrollTrigger: { trigger: title, start: 'top 88%', once: true },
          }),
      })
    }
  })
}
