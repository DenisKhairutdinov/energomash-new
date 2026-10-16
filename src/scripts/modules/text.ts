import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

const NO_PREFERENCE = '(prefers-reduced-motion: no-preference)'

/** Заголовки секций ([data-split]): буквы волной выезжают из-под маски строки, когда секция входит в экран. */
export const initText = (): void => {
  gsap.registerPlugin(ScrollTrigger, SplitText)

  const titles = gsap.utils.toArray<HTMLElement>('[data-split]')

  if (titles.length === 0) {
    return
  }

  gsap.matchMedia().add(NO_PREFERENCE, () => {
    for (const title of titles) {
      SplitText.create(title, {
        type: 'lines,chars',
        mask: 'lines',
        autoSplit: true,
        linesClass: 'split-line',
        // GSAP-анимация «thenable», но SplitText ждёт именно её: по возвращённой анимации он синхронизирует повторную разбивку
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSplit: (split) =>
          gsap.from(split.chars, {
            yPercent: 120,
            rotate: 6,
            duration: 1.1,
            ease: 'power4.out',
            stagger: { each: 0.025, from: 'start' },
            scrollTrigger: { trigger: title, start: 'top 88%', once: true },
          }),
      })
    }
  })
}
