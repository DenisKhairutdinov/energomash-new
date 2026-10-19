# Остальные скиллы: группы, пересечения, что не применять

Справочник. В сессию автоматически не грузится. Дизайнерские скиллы разобраны в `design-skills.md`.

## Группы и ведущий скилл

| Область            | Ведущий                                                       | Помощники                                                                                                                 | Примечание                                                                                              |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Доступность        | `accessibility` (WCAG 2.2 AA)                                 | `frontend-a11y-*`, `web-interface-guidelines`                                                                             | `front-a11y` написан под WCAG 2.1 и Vue/Svelte/Astro: берём только как чек-лист, планка остаётся 2.2 AA |
| Производительность | `performance`, `core-web-vitals`                              | `frontend-perf-*`, `frontend-errors-animation-jank`, `gsap-performance`                                                   | `web-quality-audit` — общий аудит перед релизом, а не замена перечисленным                              |
| CSS и HTML         | `frontend-syntax-*`, `frontend-impl-*`                        | `frontend-errors-*`, `frontend-core-web-standards-baseline`                                                               | Нативные возможности (container queries, `:has()`, `<dialog>`, Popover) раньше JS                       |
| Анимация           | `design-motion-principles` решает, нужна ли                   | `frontend-impl-view-transitions-scroll-animations` (нативный CSS), затем `gsap-core/timeline/scrolltrigger/plugins/utils` | Сначала CSS и scroll-driven animations; GSAP для последовательностей, pin и сложного scrub              |
| Компоненты         | `frontend-component-*`, `frontend-impl-popover-dialog-anchor` | `popups` (только про конверсию)                                                                                           | Правила доступности модалок важнее маркетинговых                                                        |
| Тексты             | `copywriting`                                                 | `copy-editing`, `marketing-psychology`, `offers`, `lead-magnets`                                                          | Русский деловой текст без ИИ-примет; не копировать SaaS-шаблоны дословно                                |
| SEO                | `seo`                                                         | `seo-audit`, `schema`, `site-architecture`, `ai-seo`, `content-strategy`                                                  | Поисковик Яндекс в приоритете; `programmatic-seo` только если появится каталог на сотни страниц         |
| Конверсия          | `cro`                                                         | `analytics`, `ab-testing`                                                                                                 | Формы заявки, телефон, расчёт стоимости                                                                 |
| Код-ревью          | встроенные `code-review`, `simplify`                          | `front-review`, `web-interface-guidelines`                                                                                |                                                                                                         |
| Безопасность       | встроенный `security-review`                                  | `semgrep`, `sharp-edges`, `differential-review`, `supply-chain-risk-auditor`                                              | Перед релизом и после добавления зависимостей                                                           |

## Конфликты и решения

- **Версия WCAG:** `front-a11y` называет 2.1 AA, остальные 2.2 AA. Берём 2.2 AA.
- **Комментарии:** `front-comments` добавляет структурные комментарии в файл. В проекте комментарии пишем только по делу и в стиле окружающего кода; скилл запускаем, только если пользователь прямо попросил.
- **Рефакторинг:** `front-refactor` запускаем только по запросу, не как побочный шаг к задаче.
- **Нативное против GSAP:** по умолчанию нативный CSS; GSAP, если нужен pin, сложная очередь или scrub.
- **Градиенты, стекло, микровзаимодействия** (`frontend-visual-*`): только если выбранное направление это предполагает. Не добавлять как декор.
- **Тёмная и светлая тема** (`frontend-theming-dark-light-mode`): делаем обе, только если так решено в брифе.
- **Попапы:** `popups` оптимизирует конверсию, но модальные окна поверх страницы вредят и доступности, и скорости. Допустимы по явному запросу.

## Не применять в этом проекте

Сайт производителя цистерн (B2B, Россия), vanilla Vite, нет репозитория и нет приложений.

- **Маркетинговые скиллы включены** (владелец, 2026-10-19, убраны из `deny`), но выбирай по задаче, не вызывай подряд. Заточены под SaaS и приложения, поэтому на B2B-витрине применяются только там, где задача про это: `signup`, `onboarding`, `paywalls`, `churn-prevention`, `referrals`, `aso`, `attribution`, `revops`, `free-tools`, `directory-submissions`, `marketing-loops`.
- **Зарубежные каналы:** `ads` (Google, Meta, LinkedIn), `cold-email`, `sms`, `social`, `influencer-marketing`, `public-relations`, `co-marketing`, `community-marketing`, `events`, `launch`: брать по запросу и адаптировать под российский рынок (Яндекс Директ, Telegram, VK).
- **Процесс чужого репозитория и приложений:** `raaaf-*` (особенно `raaaf-delegate`: объявляет себя «режимом работы по умолчанию»; не включать без запроса), `gh-cli`, `agentic-actions-auditor`, `raaaf-store-assets`.
- **Каркас проекта:** `vite-agents-project-scaffolder`: проект уже создан, повторно не запускать.
- **React и фреймворки:** `gsap-react`, `gsap-frameworks`.

## Замечания

- В списке скиллов сессии есть `energomash-ai-photos` и `yandex-direct`, но в `.claude/skills/` их нет. По правилу CLAUDE.md это личные скиллы, их не используем, пока вы не решите перенести их в проект.
- `agent-browser` и браузерные инструменты Claude дублируют друг друга; для проверки страниц достаточно одного.
