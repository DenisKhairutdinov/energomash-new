/**
 * Чат помощника. Отвечает по данным сайта (без обращения к серверу и без выдуманных фактов).
 * Заявка собирается пошагово; отправка в почту и Max подключается на втором этапе (нужен сервер).
 */

type Part = string | { href: string; text: string }
type Reply = Part[]
type Step = 'name' | 'phone' | 'topic' | 'consent' | 'confirm'

const PHONE = '8 (800) 101-22-00'
const EMAIL = '1@bik55.ru'

interface Draft {
  name: string
  phone: string
  topic: string
}

const has = (text: string, ...words: string[]): boolean => words.some((word) => text.includes(word))
const isYes = (text: string): boolean =>
  /^(да|ага|угу|ок|окей|согласен|согласна|даю|верно|отправ)/i.test(text.trim())

export function mountAssistantChat(root: HTMLElement, base: string): void {
  const log = root.querySelector<HTMLElement>('.assistant__log')
  const form = root.querySelector<HTMLFormElement>('.assistant__form')
  const input = root.querySelector<HTMLInputElement>('.assistant__input')
  const chips = root.querySelector<HTMLElement>('.assistant__chips')
  if (!log || !form || !input || !chips) return

  const link = (path: string, text: string): Part => ({ href: `${base}${path}`, text })
  let step: Step | null = null
  const draft: Draft = { name: '', phone: '', topic: '' }

  const add = (who: 'bot' | 'user', parts: Reply): void => {
    const item = document.createElement('p')
    item.className = `assistant__msg assistant__msg--${who}`
    for (const part of parts) {
      if (typeof part === 'string') {
        item.append(part)
      } else {
        const a = document.createElement('a')
        a.href = part.href
        a.textContent = part.text
        item.append(a)
      }
    }
    log.append(item)
    log.scrollTop = log.scrollHeight
  }

  const contacts = (): Reply => [
    `Телефон: ${PHONE}, почта: ${EMAIL}. Офисы: Челябинск, ул. Кирова, 159, офис 1709; Набережные Челны, проспект Хасана Туфана, 12, офис 1910. `,
    link('contacts.html', 'Страница контактов'),
  ]

  const startRequest = (): Reply => {
    step = 'name'
    return ['Оформим заявку. Как вас зовут?']
  }

  const answerRequest = (text: string): Reply => {
    if (has(text.toLowerCase(), 'отмена', 'отменить', 'стоп')) {
      step = null
      return ['Хорошо, заявку отменил. Спрашивайте о технике и сайте.']
    }
    switch (step) {
      case 'name':
        draft.name = text.slice(0, 80)
        step = 'phone'
        return [`${draft.name}, оставьте номер телефона для связи.`]
      case 'phone': {
        const digits = text.replace(/\D/g, '')
        if (digits.length < 10 || digits.length > 12)
          return ['Не похоже на номер телефона. Напишите его цифрами, например 8 900 000-00-00.']
        draft.phone = text.slice(0, 30)
        step = 'topic'
        return [
          'Какая техника или вопрос вас интересует? Например: полуприцеп для светлых нефтепродуктов, 28 м³.',
        ]
      }
      case 'topic':
        draft.topic = text.slice(0, 400)
        step = 'consent'
        return [
          'Для связи нужно согласие на обработку персональных данных (имя и телефон). Даёте согласие? Ответьте «да» или «нет».',
        ]
      case 'consent':
        if (isYes(text)) {
          step = 'confirm'
          return [
            `Проверьте заявку. Имя: ${draft.name}. Телефон: ${draft.phone}. Запрос: ${draft.topic}. Всё верно? Ответьте «да», чтобы отправить, или «нет», чтобы отменить.`,
          ]
        }
        step = null
        return [
          `Без согласия заявку оформить нельзя. Вы можете позвонить: ${PHONE}, или написать на ${EMAIL}.`,
        ]
      case 'confirm':
        step = null
        if (isYes(text)) {
          return [
            `Отправка заявок на сайте пока не подключена, поэтому ваша заявка не ушла. Чтобы не потерять время, позвоните ${PHONE} или напишите на ${EMAIL}: назовите запрос «${draft.topic}».`,
          ]
        }
        return ['Заявку не отправляю. Если захотите, начнём заново.']
      default:
        return []
    }
  }

  const answer = (raw: string): Reply => {
    const text = raw.toLowerCase().replace(/ё/g, 'е')

    if (
      has(
        text,
        'заяв',
        'перезвон',
        'оставить',
        'связаться со мной',
        'коммерческ',
        'кп ',
        'заказать',
      )
    )
      return startRequest()
    if (has(text, 'привет', 'здравств', 'добрый')) {
      return [
        'Здравствуйте! Подскажу по технике, каталогу, лизингу и контактам завода. Могу принять заявку. Что вас интересует?',
      ]
    }
    if (has(text, 'спасибо', 'благодар')) return ['Пожалуйста! Если нужно что-то ещё, пишите.']
    if (
      has(
        text,
        'телефон',
        'позвон',
        'почт',
        'email',
        'адрес',
        'офис',
        'контакт',
        'где наход',
        'как связ',
      )
    )
      return contacts()
    if (has(text, 'лизинг'))
      return [
        'Условия и расчёт лизинга на странице ',
        link('leasing.html', 'Лизинг'),
        '. Если нужен расчёт под конкретную модель, оставьте заявку.',
      ]
    if (has(text, 'субсид'))
      return ['Про субсидию подробно на странице ', link('subsidies.html', 'Субсидия'), '.']
    if (has(text, 'документ', 'допуск', 'сертификат', 'птс', 'одобрен'))
      return [
        link('docs.html', 'Документы и допуски'),
        ': здесь собраны документы, которые идут с техникой.',
      ]
    if (has(text, 'сервис', 'запчаст', 'ремонт'))
      return [link('services.html', 'Сервис и запчасти'), '.']
    if (has(text, 'гарант'))
      return [
        'Гарантия: 12 месяцев или 30 000 км. Подробности по обслуживанию на странице ',
        link('services.html', 'Сервис и запчасти'),
        '.',
      ]
    if (has(text, 'дилер'))
      return ['Для дилеров есть страница ', link('dealers.html', 'Дилерам'), '.']
    if (has(text, 'о заводе', 'о компании', 'производств'))
      return [link('about.html', 'О заводе'), ' и ', link('production.html', 'Производство'), '.']
    if (has(text, 'блог', 'стат')) return ['Полезные статьи в ', link('blog.html', 'блоге'), '.']
    if (has(text, 'цена', 'цены', 'стоим', 'сколько стоит', 'прайс')) {
      return [
        'Точную цену называет менеджер: она зависит от модели и комплектации. Могу принять заявку на расчёт или подобрать модель в ',
        link('catalog.html', 'каталоге'),
        '.',
      ]
    }
    if (has(text, 'налич', 'склад')) {
      return [
        'Сейчас в наличии 162 единицы из 892 моделей каталога. Посмотреть: ',
        link('catalog.html', 'каталог'),
        '.',
      ]
    }

    const purposes: [string[], string, string][] = [
      [
        ['светл', 'бензин', 'дизел', 'нефтепродукт'],
        'type=semitrailer&purpose=fuel',
        'полуприцепы-цистерны для светлых нефтепродуктов',
      ],
      [
        ['темн', 'мазут', 'битум'],
        'type=semitrailer&purpose=oil',
        'полуприцепы-цистерны для тёмных нефтепродуктов',
      ],
      [
        ['техническ'],
        'type=semitrailer&purpose=tech-water',
        'полуприцепы-цистерны для технической воды',
      ],
      [['вакуум'], 'type=semitrailer&purpose=vacuum', 'вакуумные полуприцепы-цистерны'],
      [['заправщик'], 'type=chassis&purpose=refueler', 'автотопливозаправщики'],
      [['питьев'], 'type=chassis&purpose=drinking-water', 'автоцистерны для питьевой воды'],
      [
        ['сбор нефти', 'сбора нефти'],
        'type=chassis&purpose=oil-gathering',
        'автоцистерны для сбора нефти',
      ],
      [['коммунал'], 'type=chassis&purpose=municipal', 'коммунальные автоцистерны'],
    ]
    for (const [words, query, title] of purposes) {
      if (has(text, ...words))
        return [
          `Подходящий раздел: ${title}. `,
          link(`catalog.html?${query}`, 'Открыть в каталоге'),
        ]
    }

    const model = /[a-zа-я]{2,}-?\d{1,3}[a-zа-я0-9-]*/i.exec(raw)
    if (has(text, 'полуприцеп'))
      return [
        'Полуприцепов-цистерн в каталоге 631 модель. ',
        link('catalog.html?type=semitrailer', 'Смотреть полуприцепы'),
        '. Для чего нужна цистерна (светлые или тёмные нефтепродукты, вода, вакуум)?',
      ]
    if (has(text, 'автоцистерн'))
      return [
        'Автоцистерн в каталоге 261 модель. ',
        link('catalog.html?type=chassis', 'Смотреть автоцистерны'),
        '. Для чего нужна цистерна?',
      ]
    if (has(text, 'каталог', 'модел', 'техник', 'подобр'))
      return [
        'В каталоге 892 модели, 162 из них в наличии. ',
        link('catalog.html', 'Открыть каталог'),
        '. Подскажите назначение (нефтепродукты, вода, вакуум) и объём, помогу выбрать раздел.',
      ]
    if (model)
      return [
        `Поищу «${model[0]}» в каталоге: `,
        link(`catalog.html?q=${encodeURIComponent(model[0])}`, 'открыть результаты'),
      ]

    return [
      'Не уверен, что понял вопрос. Я знаю про каталог и наличие, лизинг, субсидию, документы, сервис, гарантию и контакты, а ещё могу принять заявку. О чём рассказать?',
    ]
  }

  const send = (raw: string): void => {
    const text = raw.trim()
    if (!text) return
    add('user', [text])
    const reply = step ? answerRequest(text) : answer(text)
    window.setTimeout(() => {
      add('bot', reply)
    }, 250)
  }

  add('bot', [
    'Здравствуйте! Я помощник завода «Энергомаш». Расскажу о технике и сайте, подскажу раздел каталога и приму заявку.',
  ])

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const value = input.value
    input.value = ''
    send(value)
  })
  chips.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button')
    if (button?.dataset['q']) send(button.dataset['q'])
  })
}
