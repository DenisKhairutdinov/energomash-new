import portrait from '../../assets/assistant-engineer.png'
import modelUrl from '../../assets/assistant-model.glb?url'
import { mountAssistantModel } from './assistant-model'
import { mountAssistantChat } from './assistant-chat'
import { runWhenIdle } from './preload'

/** Прогрев во время интро: файл модели и код three качаются заранее, сама сцена строится после интро. */
export function warmAssistant(): void {
  runWhenIdle(() => {
    void fetch(modelUrl).catch(() => undefined)
    void import('three')
    void import('three/examples/jsm/loaders/GLTFLoader.js')
  })
}

/** Помощник завода: 3D-образ и чат по данным сайта; сообщения на сервер не отправляются. */
export function initAssistant(): void {
  const root = document.createElement('aside')
  root.className = 'assistant'
  root.setAttribute('aria-label', 'Помощник завода')
  const base = import.meta.env.BASE_URL
  root.innerHTML = `
    <button class="assistant__launcher" type="button" aria-haspopup="dialog" aria-controls="assistant-dialog" aria-label="Открыть помощника завода">
      <span class="assistant__hint" aria-hidden="true">Нужна помощь?<br />Нажмите, подскажу</span>
      <canvas class="assistant__model" aria-hidden="true"></canvas>
    </button>
    <dialog id="assistant-dialog" class="assistant__dialog" aria-labelledby="assistant-title" data-lenis-prevent>
      <button type="button" class="assistant__close" aria-label="Закрыть помощника">×</button>
      <div class="assistant__intro">
        <img src="${portrait}" alt="Инженер в каске: объёмный чёрно-белый чертёж с золотыми деталями" width="220" height="220" />
        <div><p class="assistant__eyebrow">Энергомаш</p><h2 id="assistant-title">Помощник завода</h2></div>
      </div>
      <div class="assistant__log" role="log" aria-live="polite" aria-label="Переписка с помощником" tabindex="0"></div>
      <div class="assistant__chips">
        <button type="button" data-q="Подобрать технику">Подобрать технику</button>
        <button type="button" data-q="Что в наличии?">В&nbsp;наличии</button>
        <button type="button" data-q="Лизинг">Лизинг</button>
        <button type="button" data-q="Контакты">Контакты</button>
        <button type="button" data-q="Оставить заявку">Оставить заявку</button>
      </div>
      <form class="assistant__form">
        <input class="assistant__input" type="text" name="message" aria-label="Ваше сообщение" placeholder="Напишите вопрос" required maxlength="400" autocomplete="off" />
        <button type="submit" aria-label="Отправить сообщение">→</button>
      </form>
    </dialog>
  `
  document.body.append(root)
  const launcher = root.querySelector<HTMLButtonElement>('.assistant__launcher')
  const dialog = root.querySelector<HTMLDialogElement>('dialog')
  const close = root.querySelector<HTMLButtonElement>('.assistant__close')
  if (!launcher || !dialog || !close) return

  launcher.addEventListener('click', () => {
    dialog.showModal()
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
  dialog.addEventListener('close', () => {
    launcher.focus()
  })

  const canvas = root.querySelector<HTMLCanvasElement>('.assistant__model')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (canvas) void mountAssistantModel(canvas, modelUrl, !reducedMotion.matches)
  mountAssistantChat(dialog, base)
}
