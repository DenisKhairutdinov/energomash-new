# Источники референсов: что где искать

Справочник к правилу «Референсы» в `CLAUDE.md`. Изучено 2026-10-17 через WebFetch (структура, категории, механика). Браузерного просмотра с прокруткой на тот момент не было (расширение не подключено): перед первой реальной задачей открыть каждый нужный источник в браузере и дописать выводы сюда и в `docs/references.md`.

## Итоги просмотра в браузере (2026-10-17)

Открыты и прокручены: Lapa Ninja (меню, категории Automotive и Hardware, карточка поста), T3.tech (живой сайт по ссылке из Lapa), Minimal Gallery, recent.design, Landingfolio (Components), SaaSFrame (главная, Statistics), Nicelydone (главная), Component Gallery (Accordion с разбором), 60fps.design (Shots, App Sites), ReUI (Filter Sidebar), Hover States.

**Доступ из браузера Claude:**

- **Godly** (godly.website): навигация запрещена. Адрес редиректит на recent.design, это галерея с лентой Design (Web, Interface, Branding, Motion, Illustration, Posters, Print) и разделами Websites, OG Images. Считаем recent.design заменой Godly, но владельцу стоит подтвердить.
- **Landingfolio:** `www.landingfolio.com` запрещён, `landingfolio.com` без `www` открывается.
- **Lapa Ninja:** в браузере открывается, для WebFetch 403.
- **Hover States:** по-прежнему заглушка «Launching Soon». Не использовать.
- **Nicelydone:** поиск и экраны после регистрации. Аккаунты не создаём, смотреть только публичную главную.
- **SaaSFrame:** бесплатно видно 3 примера из каждой категории (например, Statistics: 3 из 51), остальное Pro.
- **60fps.design:** примеры это короткие видео в рамке телефона. Чтобы увидеть движение, нужно нажимать play. Для сайтов полезнее разделы App Sites (93) и Motion.

**Что оказалось ценным (к нише не привязываемся, берём приёмы):**

- **Component Gallery:** на странице компонента есть разборы разметки, поведения и стилей. Для аккордеона: два подхода (кнопка в заголовке с `aria-expanded` и `aria-controls`, либо `details/summary` без JS); стрелка поворачивается на 180° через `button[aria-expanded=true] > svg`; для `summary` ставить `cursor: pointer`; в аккордеон не прятать важное; режим «открыт только один» применять осторожно (пользователь может сравнивать). Плюс 101 пример из дизайн-систем (GOV.UK, Carbon, Red Hat, Porsche и др.) и ссылки на NN/g и Адриана Роселли. Лучший источник для компонентов с доступностью.
- **Lapa Ninja:** меню категорий большое, фильтры по цвету, платформе (Webflow, Framer) и году. Подходят категории Automotive, Hardware, Corporate, Marketplace, Architecture, Furniture & Interiors, Government. Карточка поста ведёт на живой сайт, так и надо работать: из карточки на сайт.
- **Minimal Gallery:** тёмная галерея с рядом тегов-типов, скрытой шапкой, которая появляется при прокрутке. Много строгой типографики (JARCOS, GRNDWRK, DRAȘA: огромный дисплейный шрифт, сетка на белом или чёрном). Фильтры по типу (E-commerce, Architecture, Branding, Product) и платформе.
- **Recent (бывший Godly?):** лента-кладка (masonry) из разных жанров, боковое меню, фильтры по жанрам. Больше про арт-дирекшн и OG-карточки, чем про структуру сайтов.
- **Landingfolio Components:** индекс типов секций (Feature 1018, Hero 474, Footer 400, Header 390, Testimonial 304, CTA 303, Logo Cloud 183, Pricing 89, FAQ 41, Stats 41) с фильтрами Theme и Style. Примеры шаблонные, брать как быстрое сравнение раскладок, а не как идеи.
- **ReUI Filter Sidebar** (фасетный поиск): счётчики рядом с вариантами, применённые фильтры чипами сверху с «Clear all», ползунок цены с подписью диапазона «$40 – $180», выбор цвета кружками, размеры кнопками, внизу «Apply filters» и «Reset», мобильная шторка. Код React/shadcn не берём. Совпадает с тем, что уже сделано в каталоге.

**Приёмы с живого сайта T3.tech (Webflow, 2026):**

- мелкая моноширинная подпись капсом («WHY WE WERE BUILT») в левой колонке и крупный текст-заявление правее, асимметричная редакционная сетка;
- изометрические линейные чертежи машин, соединённые тонкой линией с квадратным узлом, как схема модельного ряда;
- hero: полноэкранное тёмное фото и стеклянные панели интерфейса поверх;
- смена фона блоков с тёмного на тёплый кремовый, шапка при прокрутке меняет цвет под фон;
- ряд из трёх разнородных медиа с короткими подписями (чертёж, скриншот карты, фото);
- мелкий моноширинный шрифт для меню и кнопок, кнопки прямоугольные.

## Что считается глубоким изучением

Поверхностно: открыть главную галереи, посмотреть превью, взять первое попавшееся. Так не делаем.

Глубоко:

1. **Сформулировать вопрос до поиска.** Например: «как подают технические характеристики на карточке модели» или «как раскрывается аккордеон FAQ». Без вопроса просмотр превращается в листание.
2. **Выбрать источник по назначению** (таблица ниже), для задачи обычно 3–5 источников, а не один.
3. **Открывать сами сайты и страницы, а не превью.** Прокрутить страницу до конца, на десктопе и в мобильной ширине, навести курсор, открыть меню, раскрыть аккордеон, проверить состояния. Превью в галерее скрывает движение, адаптив и состояния.
4. **Минимум 5 примеров на элемент**, из них минимум 2 вне нашей ниши. Для каждого записать конкретный приём (что именно сделано: размер, ритм, тайминг, поведение), а не «красиво».
5. **Сравнить и выбрать.** Что общее у сильных примеров, чем они отличаются, что подходит B2B-витрине тяжёлой техники и нашим правилам из `docs/design-brief.md`.
6. **Записать в `docs/references.md`**: источник, что смотрел, что взял, что отбросил и почему. Без записи просмотр не засчитывается.
7. **Если источник не открылся** (403, вход, пустая страница), так и написать. Подменять просмотр памятью или догадкой нельзя.

## Источники по назначению

| Источник                                             | Что это                                                                                                                                                                         | Когда брать                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Awwwards** (awwwards.com)                          | Победители конкурса: композиция, типографика, анимация целых сайтов                                                                                                             | Концепция страницы, hero, ритм секций, смелые приёмы. Категории и подборки по индустриям                                       |
| **Godly** (godly.website)                            | Галерея сильных сайтов. Адрес перенаправляет на recent.design (разделы Web, Interface, Branding, Motion, Websites, OG Images)                                                   | Сайты с характером: сетка, шрифты, цвет. Проверить, что редирект не ведёт на другой проект                                     |
| **Minimal Gallery** (minimal.gallery)                | Сдержанные сайты с 2013 года; типы (E-commerce, Architecture, Branding, Product, Pricing, Startup), платформы (Framer, Webflow)                                                 | Чистая типографика и воздух, e-commerce, архитектура, продуктовые страницы                                                     |
| **Lapa Ninja** (lapa.ninja)                          | Каталог лендингов по индустриям и стилям                                                                                                                                        | Структура посадочной по нише. Через WebFetch отдаёт 403: смотреть только в браузере                                            |
| **Landingfolio** (landingfolio.com)                  | Целые страницы (Landing, Pricing, About, Login, 404) и секции (Hero 474, Feature, Footer, Header, Testimonial, CTA), отрасли, Mobile                                            | Секция за секцией: hero, шапка, подвал, отзывы, CTA. Фильтр по цвету и поиск по `⌘K`                                           |
| **SaaSFrame** (saasframe.io)                         | Тысячи примеров: Websites, Products, Patterns, Sections, Flows. Секции: Bento Grid, Statistics, FAQ, Calculator, Steps, Timeline                                                | Секции и паттерны: калькулятор, FAQ, цифры, шаги, сравнение, подвал, cookie-баннер, 404. Поиск по тексту на скриншотах (Pro)   |
| **Nicelydone** (nicelydone.club)                     | Экраны, флоу и компоненты из реальных продуктов; поиск по тексту на скриншотах и словами                                                                                        | Формы, модалки, пустые состояния, уведомления, пошаговые сценарии (заявка, фильтры, подтверждение)                             |
| **Component Gallery** (component.gallery)            | Справочник из 60 компонентов и 95 дизайн-систем, у каждого компонента синонимы и примеры                                                                                        | Как называют и решают компонент (accordion, tabs, carousel, popover, pagination, tree view), доступность, поведение, состояния |
| **60fps.design** (60fps.design)                      | Анимации и взаимодействия приложений: Shots, Motion; фильтры по жесту, эффекту, элементу                                                                                        | Тайминг и характер анимации: загрузка, пустое состояние, меню, вкладки, тосты, parallax, stagger                               |
| **Hover States** (hoverstat.es)                      | Настоящая галерея: сайты с интересными интерактивными приёмами, у каждого одно предложение, что именно сделано. Адрес hoverstates.com, который был у нас в начале, это заглушка | Hover, меню, курсор, переходы, интерактивная типографика. Читать подписи, они называют приём                                   |
| **Site Inspire** (siteinspire.com)                   | Галерея с фильтрами Popular, Styles, Types, Subjects, Platforms (Typographic, Grid Layout, Unusual Layout, E-Commerce, Minimal)                                                 | Сетка, типографика, нестандартная раскладка, e-commerce                                                                        |
| **Fonts In Use** (fontsinuse.com)                    | Архив типографики в реальных проектах, поиск по шрифту, формату, теме                                                                                                           | Подбор и сочетание шрифтов (только с кириллицей, проверять), примеры применения                                                |
| **Refero** (refero.design)                           | Каталог экранов и флоу реальных продуктов, режим исследования; много продуктовых приложений                                                                                     | Формы, фильтры, таблицы, сценарии. Часть функций платная                                                                       |
| **ReUI** (reui.io)                                   | Реестр компонентов поверх shadcn (React, Tailwind): Data Grid, Filters, Kanban, Stepper, eCommerce (Product Card, Filter Sidebar)                                               | Только идеи структуры и состояний (фильтры, таблицы, карточка товара). Код не брать: у нас vanilla TS и свой CSS               |
| **web-element-repositories** (github.com/ZenithFr/…) | Один README: около 300 ссылок по 20 разделам (иконки, шрифты, цвета, анимации, a11y, типографика, Web Components)                                                               | Как каталог инструментов: шрифты с кириллицей, палитры, a11y-проверки, анимационные библиотеки. Ссылки проверять, список общий |

## Репозиторий ZenithFr/web-element-repositories как источник

Это справочник ссылок (`README.md`, 20 разделов), а не галерея. Правило то же: перед задачей открыть подходящий раздел и пройти выбранные ресурсы в браузере. Ваши ресурсы SaaSFrame, Godly, Landingfolio, Nicelydone, 60fps.design и ReUI в списке отсутствуют, они идут отдельно. В списке есть: Awwwards, Lapa Ninja, Minimal Gallery, Component Gallery, Hover States (hoverstat.es).

| Задача                        | Раздел и ресурсы (все по ссылкам из списка)                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Композиция, целые сайты       | Галереи: Site Inspire, Land Book, One Page Love, Httpster, Admire the Web, Best Website Gallery, Made for Design, Refero, Dribbble |
| Шрифты и типографика          | Fonts In Use, Fontshare, Fontsource, Font Pair, Fontjoy, Font Flipper, Type Scale, Gridlover, Better Web Type, Free Faces          |
| Цвет и градиенты              | Realtime Colors, Coolors, Huemint, Color Hunt, Mesh Gradient, Grabient, Contrast Ratio, Color.review, Accessible Colors            |
| Анимация (CSS)                | Animista, Keyframes.app, Magic Animations, Animate.css, CSS Wind                                                                   |
| Анимация (JS)                 | GSAP, Lenis, Splitting.js, Barba.js, Theatre.js, Motion One, Swiper, ScrollReveal                                                  |
| Кнопки и hover                | Hover States, Buttons.cool, CSS Scan Buttons, Hover.css, Marko's CSS Buttons                                                       |
| Раскладка, тени, формы        | CSS Layout, Grid by Example, Flexbox Patterns, Layoutit, Shadows, Smooth Shadow, Clippy, Fancy Border Radius, Glassmorphism        |
| Доступность                   | WAI-ARIA Authoring Practices, Inclusive Components, The A11Y Project, WebAIM, axe DevTools, WAVE, Accessibility Insights           |
| Веб-компоненты (идеи, не код) | Shoelace, Lit, Material Web, FAST, Ariakit, React Aria                                                                             |

Оговорки: в списке много платных или частично платных ресурсов, отмечены в README; код React, Tailwind, shadcn не берём, только приёмы.

## Какой источник под какой элемент

- **Шапка, меню, подвал:** Awwwards, Landingfolio (Header, Footer), SaaSFrame (Footer), Component Gallery (navigation).
- **Hero и первая секция:** Awwwards, Godly, Minimal Gallery, Landingfolio (Hero).
- **Каталог, фильтры, карточка модели:** Awwwards (E-commerce, Automotive), Minimal Gallery (E-commerce), ReUI (Filter Sidebar, Product Card, Product Detail, как идея), Nicelydone (поиск, фильтры), SaaSFrame (Patterns: Filter, Search, Table, Card).
- **Цифры, преимущества, шаги, процесс:** SaaSFrame (Statistics, Steps, Timeline, Bento Grid), Landingfolio (Feature).
- **Калькулятор, формы заявок, модалки:** SaaSFrame (Calculator, Contact Form, Modal), Nicelydone (формы, подтверждения), Component Gallery.
- **FAQ, аккордеон, вкладки, карусель:** Component Gallery (Accordion, Tabs, Carousel), SaaSFrame (FAQ, Tabs).
- **Отзывы, партнёры, блог:** Landingfolio (Testimonial), SaaSFrame (Customer Logos, Blog Cards).
- **Анимация и hover:** 60fps.design, Awwwards (Motion-подборки); hover-состояния смотреть на живых сайтах.
- **Шрифты, цвет, иконки, a11y-инструменты:** web-element-repositories (Fontsource, Fontshare, Fonts In Use, Realtime Colors, axe, WAI-ARIA Authoring Practices).

## Оговорки

- Часть функций платная (SaaSFrame Pro: закладки, мобильные версии, Figma; Landingfolio Pro: фильтр по цвету). Смотрим то, что доступно бесплатно.
- Много примеров из SaaS-ниши. Берём приём (структура, ритм, поведение), а не SaaS-подачу и SaaS-тексты: у нас B2B-завод, а не подписочный продукт.
- Чужой код не копируем: смотрим приём и пишем свой в vanilla TS и CSS с нашими токенами.
