# Дизайнерские скиллы: роли и разбор расхождений

Справочник. В сессию автоматически не грузится; читать, когда два дизайнерских скилла дают противоречивые советы.

## Слои (сверху вниз по приоритету)

1. **Бриф пользователя и проект.** Слова пользователя, CLAUDE.md, PRODUCT.md/DESIGN.md (если есть), фирменные цвета и шрифты Энергомаша.
2. **Пол качества.** WCAG 2.2 AA, `prefers-reduced-motion`, контраст, видимый `:focus-visible`, цели ≥ 44px, LCP/INP/CLS в бюджете, адаптив от 375px. Скиллы: `accessibility`, `frontend-a11y-*`, `core-web-vitals`, `performance`, `frontend-core-design-philosophy`.
3. **Технические ограничения.** Vanilla TS + Vite, без React/Tailwind/shadcn. Токены: CSS-переменные в `@layer`, OKLCH, три уровня primitive → semantic → component (`design-system`, `frontend-impl-design-tokens`). Хардкод hex не допускается.
4. **Направление и композиция.** `frontend-design`, `mega-frontend-design`, `awwwards`, `ui-ux-pro-max`, `design`.
5. **Полировка и проверка.** `impeccable`, `design-motion-principles`, `front-review`, проверка в браузере.

## Разделение ответственности

- Что делаем и как выглядит: `frontend-design` + `mega-frontend-design` + `ui-ux-pro-max`.
- Из чего собрано: `design-system` + `frontend-impl-*` + `frontend-theming-*`.
- Как движется: `design-motion-principles` решает, нужна ли анимация; `mega-frontend-design` и `gsap-*` дают реализацию; `frontend-perf-*` проверяют цену.
- Достаточно ли хорошо: `impeccable` + `accessibility` + `web-quality-audit`.
- Тексты: `copywriting`, `copy-editing`.

## Известные расхождения

- **Eyebrow-подписи капсом** (`mega-frontend-design`: всегда; `frontend-design`, `impeccable`: избегать): только когда подпись несёт информацию.
- **Анимации, зерно, magnetic, кастомный курсор** против сдержанности: один оркестрованный момент на страницу плюс отклик на действия; анимируем `transform`/`opacity`.
- **Шрифты:** обязательна кириллица. В списках `mega-frontend-design` её нет у Cabinet Grotesk, Satoshi, Clash Display.
- **Hex против OKLCH:** храним OKLCH, hex только запасной.
- **Свой конвейер у скилла** (`awwwards`, `impeccable`): запускать только подходящий; `awwwards` для промо-страниц и героев.
- **Чужие проекты:** Switchyard, Arabic/RTL, `~/CLAUDE.md`, Magic MCP, `color-expert`, `agent-browser` пропускать.
- **Шаблонные приметы ИИ** (кремовый + терракота, чёрный + кислотный акцент, одинаковые карточки): только если решено осознанно под бренд.
