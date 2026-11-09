/**
 * Видео-карточки блога: по клику ролик открывается в окне-плеере (dialog).
 * Без автозапуска со звуком в карточке; Escape и клик мимо закрывают окно, фокус возвращается на карточку.
 */
const videoUrls = import.meta.glob<string>('../../assets/videos/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
})
const posterUrls = import.meta.glob<string>('../../assets/videos/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function initBlogVideo(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-video-dialog]')
  const player = dialog?.querySelector<HTMLVideoElement>('[data-video-player]')
  const caption = dialog?.querySelector<HTMLElement>('[data-video-caption]')
  const close = dialog?.querySelector<HTMLButtonElement>('[data-video-close]')
  if (!dialog || !player || !caption || !close) return

  let opener: HTMLElement | null = null

  const open = (card: HTMLElement): void => {
    const id = card.dataset['blogVideo']
    if (!id) return
    const src = videoUrls[`../../assets/videos/${id}.mp4`]
    if (!src) return
    opener = card
    player.poster = posterUrls[`../../assets/videos/${id}.jpg`] ?? ''
    player.src = src
    caption.textContent = card.dataset['blogVideoTitle'] ?? ''
    dialog.showModal()
    close.focus()
  }

  document.querySelectorAll<HTMLElement>('[data-blog-video]').forEach((card) => {
    card.addEventListener('click', () => {
      open(card)
    })
  })
  close.addEventListener('click', () => {
    dialog.close()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return
    const box = dialog.getBoundingClientRect()
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dialog.close()
  })
  // При закрытии ролик останавливается и освобождает файл
  dialog.addEventListener('close', () => {
    player.pause()
    player.removeAttribute('src')
    player.load()
    opener?.focus({ preventScroll: true })
  })
}
