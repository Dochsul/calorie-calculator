# Калькулятор калорий и БЖУ

A single-file static web app ([`index.html`](index.html)) in Russian that calculates daily
calories and macronutrients (БЖУ). There is no build step, no dependencies, no backend and
no external services — everything runs in the browser.

Features:

- BMR formulas: Mifflin-St Jeor and Harris-Benedict
- Activity levels (minimal → high)
- Goals: maintain weight, lose 15%, lose 20%, gain muscle mass
- Children by age group (0-1, 1-3, 4-8, 9-13, 14-18)
- Pregnancy (+300 kcal), breastfeeding (+500 kcal), menstrual cycle (+100 kcal)
- Output: calories, protein, fat and carbohydrate grams
- Input validation with Russian messages, plus hints in the form itself

## Using the calculator

1. Enter age, weight and height (weight and height accept decimals).
2. Choose gender, the BMR formula, the goal and the activity level.
3. Optionally tick the extras — each one is labelled with what it adds: pregnancy
   +300 kcal, breastfeeding +500 kcal, menstrual cycle +100 kcal. They apply to the adult
   calculation only; a note under them says so.
4. For a child, tick **Дети** and choose the age group. Calories then follow the age group
   multiplied by the activity level — age, weight and height are ignored, as the hint under
   the selector explains — and the extras above are not applied.
5. Press **Рассчитать**. The result panel lists calories and the БЖУ split (30% protein,
   30% fat, 40% carbs), one value per row.

## Input validation

In adult mode the three numeric fields are checked before anything is calculated:

| Field | Accepted range | Required |
| --- | --- | --- |
| Возраст | 10–120 | yes |
| Вес (кг) | 20–400 | yes |
| Рост (см) | 80–250 | yes |

An empty field, a non-numeric value or a value outside its range is outlined in red and the
reason is listed in a message box above the button. A failing check also clears the previous
result, so stale numbers are never left next to an error. Decimals are typed with a dot
(`70.5`); browsers that treat the comma as the decimal separator also accept `70,5`, and a
comma the field itself rejects is reported as a number that still needs to be entered.

In child mode only the age group is used, so age, weight and height are neither required nor
validated.

## Run with Docker Compose

The configured setup runs a single `web` service that bind-mounts this repository and serves
it with Python's built-in HTTP server. The app is exposed on **host port 3000**.

```bash
docker compose -f docker-compose.base44.yml up -d
```

Then open <http://localhost:3000>.

Common commands:

```bash
docker compose -f docker-compose.base44.yml ps      # status + health
docker compose -f docker-compose.base44.yml logs -f web   # follow logs
docker compose -f docker-compose.base44.yml restart web   # restart the server
docker compose -f docker-compose.base44.yml down          # stop and remove
```

Because `index.html` is bind-mounted, edits are visible on page reload — no rebuild or
restart is needed. The container's healthcheck requests `/` and reports the service as
`healthy` once the page is served.

> `docker-compose.base44.yml` is part of this app's Base44 environment configuration, kept
> outside the repository. In the sandbox it is available at
> `$BASE44_CONFIG_ROOT/docker-compose.base44.yml`. The command above works from a directory
> where the file is present.

## Run without Docker

Any static file server works:

```bash
python3 -m http.server 3000 --directory .
```

Then open <http://localhost:3000>.

## Food diary format and adding products

The diary parser (`js/parser.js`) turns free Russian text into structured meals. A meal
marker (`Завтрак` / `Обед` / `Ужин` / `Перекус` / `Полдник`) starts a meal; the text that
follows (up to the next marker) is split into phrases and matched against product aliases.
Quantities are recognised as grams (`60 г`, ranges `100-150 г`), measures (`ст.л.`, `ч.л.`,
`стакан`, `шт`, `ломтик`), or a bare number for piece products. Anything unmatched is ignored.

```
Завтрак: овсянка 60 г, молоко 150 г, мёд 1 ч.л., яйцо 1 шт
Обед: гречка 70 г, куриная грудка 150 г, огурец, оливковое масло 1 ст.л.
Ужин: лосось 150 г, брокколи 120 г, рис 50 г
Перекус: творог 5% 150 г, банан 1 шт, яблоко
```

`parseDiary(text)` returns an array of meals — the JSON shape that the rest of the app
(Diary table, totals, PDF) consumes:

```jsonc
[
  {
    "name": "Завтрак",                 // marker, capitalised
    "ingredients": [
      { "productId": "oats",        "grams": 60 },  // productId from data.js, grams >= 1
      { "productId": "milk_25",     "grams": 150 },
      { "productId": "honey",       "grams": 5 },   // 1 ч.л. → 1 * 5
      { "productId": "egg",         "grams": 50 }   // 1 шт  → 1 * perUnit(50)
    ]
  }
]
```

`grams` is always a positive finite number in `[1, 2000]` (`MIN_GRAMS`…`MAX_GRAMS`); values
outside the range are clamped, and invalid/empty quantities fall back to the alias default.

### Adding a new product

Two edits are required — one in `js/data.js`, one in `js/parser.js`.

**1. Register the product** in `js/data.js` (the `PRODUCTS` array). Fields are nutrients per
100 g in the raw/dry state; `yield` is the cooked-to-raw mass ratio (cooked = raw × yield).

```jsonc
{
  "id": "buckwheat",          // unique key, referenced by parser aliases and menu/diary
  "name": "Гречка",           // display name (Russian)
  "cat": "Злаки и крупы",      // category, used for grouping in shopping list & PDF
  "kcal": 330,                // kcal per 100 g
  "p": 12.6,                  // protein  per 100 g
  "f": 3.3,                   // fat      per 100 g
  "c": 62,                    // carbs    per 100 g
  "yield": 3.0,               // cooked mass = raw mass × yield (e.g. 70 g → 210 g)
  "tags": ["grain"]           // optional tags (vegetarian filter, etc.)
}
```

**2. Add an alias** in `js/parser.js` (the `ALIASES` array) so free text maps to the product
`id`. Aliases are matched as lower-case substrings on normalised text; **order matters** —
list specific keys before generic ones (e.g. `оливк масло` before any bare `масло`), because
the first match wins and the matched text is then masked out. Do not add a bare generic key
that can be left over from a more specific alias (the standalone `масло` fallback was removed
for this reason — it spawned a duplicate "Сливочное масло" after `оливковое масло`).

```jsonc
{
  "id": "buckwheat",          // must match a product id from data.js
  "keys": ["гречк", "гречнев"],// lower-case substrings; word-boundary checked before the key
  "grams": 70,                // default weight when the text has no quantity
  "perUnit": 60               // optional: weight per piece for шт/bare-number matching
                              // (omit for non-piece products; resolveGrams uses grams instead)
}
```

Quantity resolution (`resolveGrams`): `г` → the number (or the average of a range);
`ст.л.` × 15; `ч.л.` × 5; `стакан` × 200; `шт` and bare numbers × `perUnit` (or `grams` if
`perUnit` is absent); `ломтик/кусок` × `grams`.

### Verifying a new product

```bash
node --test tests/parser.test.js   # existing parser tests still pass
```

Then add a phrase that uses the new alias to `tests/parser.test.js` (or check it live on the
**Дневник** tab with the «Вставить тестовый дневник» button, which loads a sample diary
covering grams, `ч.л.`/`ст.л.`, `шт`, and default-weight products).

## Tests

The unit tests use Node's built-in test runner — no test framework or extra dependencies to
install. You only need **Node.js 18+** (the `node --test` runner is built in).

```bash
# run every unit test (tests/*.test.js)
node --test

# run a single suite
node --test tests/input.test.js
node --test tests/parser.test.js
node --test tests/pdf.test.js
```

Or via the npm script:

```bash
npm test
```

A green run reports `# pass 44 / # fail 0`. There is no `package-lock.json` and nothing to
`npm install` first — `npm test` works on a fresh clone.

## Монетизация: подписка по кодам доступа

Приложение работает по модели **подписки по кодам доступа** — без backend и без платёжного
API. Это удобно, когда нет готового эквайринга или самозанятости в РФ: вы получаете оплату
вручную (например, переводом на карту Сбербанка), затем в админ-панели генерируете
индивидуальный код и отправляете его каждому клиенту отдельно. Клиент вводит код при входе —
приложение открывается на срок подписки.

### Как настроить (один раз)

1. **Реквизиты и цена.** Откройте `js/config.js` и впишите реальные значения в объект `PAYMENT`:
   - `price` — цена подписки в ₽ (за период, по умолчанию `"1500"`)
   - `period` — период подписки (по умолчанию `"в месяц"`)
   - `method` — способ оплаты (по умолчанию `"Перевод на карту Сбербанка"`)
   - `recipient` — ФИО получателя (по умолчанию `"Мусхаджиева А. С."`)
   - `details` — номер карты / реквизиты (по умолчанию `"2202 2036 1000 3412"`)
   - `phone` — номер телефона для СБП (по умолчанию `"+7 966 720-09-97"`)
   - `note` — подсказка под инструкцией, показывается клиентам на экране оплаты

   Все эти поля отображаются на экране оплаты (`js/views/paywall.js`) всем клиентам —
   впишите реальные значения перед публикацией.

2. **PIN администратора.** В `js/config.js` смените `ADMIN_PIN` на свой. Он нужен для
   входа в панель генерации кодов. Текущий рабочий PIN — `8899`; смените его перед
   публикацией, если у вас есть сомнения в его безопасности.

> ⚠️ Не коммитьте реальную карту в публичный репозиторий. Используйте отдельный платёжный
> аккаунт или ссылку на оплату, если репозиторий публичный.

### Смена PIN-кода администратора

PIN-код защищает вход в панель генерации кодов доступа. Он хранится в `js/config.js`:

```js
export const ADMIN_PIN = "8899";   // смените перед публикацией
```

**Как сменить:**

1. Откройте `js/config.js`.
2. Замените значение `ADMIN_PIN` на новый код (только цифры или буквы, без пробелов).
3. Сохраните файл — изменения вступают в силу при перезагрузке страницы.

**Правила безопасности:**

- Не используйте значение по умолчанию (`aina2026`) — оно публично известно в репозитории.
- Не коммитьте реальный PIN в публичный репозиторий.
- После смены PIN проверьте вход через **«Вход для администратора»** на экране оплаты.
- PIN хранится в исходном коде (статический сайт), поэтому защита мягкая — для настоящей
  безопасности нужен backend с серверной проверкой (см. раздел «Ограничения»).

### Процесс оплаты для пользователя

Когда у клиента нет активной подписки, приложение показывает **экран оплаты** (paywall) с
фирменным дизайном Aina Évidence:

1. **Цена и реквизиты.** Клиент видит крупную плашку с ценой и периодом, ниже — пошаговую
   инструкцию:
   - **Шаг 1.** Оплатить подписку указанным способом (перевод на карту Сбербанка), с
     указанием реквизитов — номер карты, ФИО получателя.
   - **Шаг 2.** Прислать чек администратору (мессенджер, email — на усмотрение владельца),
     после чего клиент получает индивидуальный код доступа.
   - **Шаг 3.** Ввести полученный код в поле «Код доступа» и нажать «Открыть доступ».

2. **Ввод кода.** Поле принимает код в формате `AINA-30D-XXXXXX-XXXX`. Пробелы и регистр
   игнорируются. При успешном вводе приложение сразу открывается — подписка активируется
   на срок, зашифрованный в коде (30 / 90 / 365 дней), начиная с момента ввода.

3. **Ошибки.** Если код введён неверно, под полем появляется сообщение:
   - «Неверный формат кода» — опечатка в структуре (не `AINA-NNND-XXXXXX-XXXX`).
   - «Код недействителен» — контрольная сумма не совпала (опечатка в токене).
   - «Неверный срок действия» — количество дней вне допустимого диапазона.

4. **Продление.** Когда подписка заканчивается, экран оплаты появляется снова. Клиент
   вводит новый код — срок **суммируется** с текущим, если подписка ещё активна, или
   начинается заново от момента ввода, если истекла.

5. **Смена темы.** На экране оплаты работает переключатель светлой/тёмной темы (кнопка в
   правом верхнем углу) — как и в основном приложении.

### Управление кодами через админ-панель

Админ-панель (`js/views/admin.js`) позволяет генерировать коды доступа и вести журнал.
Доступ к панели — только через экран оплаты.

#### Вход в админ-панель

1. Откройте приложение (если подписка активна — выйдите из неё, очистив
   `localStorage["aina_subscription"]`, или откройте в режиме инкогнито).
2. На экране оплаты нажмите ссылку **«Вход для администратора»** (внизу карточки).
3. Введите PIN-код (значение `ADMIN_PIN` из `js/config.js`).
4. Нажмите «Войти». Доступ к панели открывается на текущую вкладку браузера
   (сессия в `sessionStorage`, очищается при закрытии вкладки).

#### Генерация кодов

1. В панели выберите **срок подписки** из выпадающего списка:
   - 30 дней (1 месяц)
   - 90 дней (3 месяца)
   - 365 дней (1 год)
2. Выберите **количество кодов** для генерации: 1, 5, 10, 25 или 50.
3. Нажмите **«Сгенерировать»**.
4. Новые коды появятся в текстовом поле — нажмите **«Скопировать новые»**, чтобы
   скопировать их в буфер обмена.
5. Отправьте каждый код отдельному клиенту (мессенджер, email). Не публикуйте коды
   в открытых каналах — код одноразовый, но не привязан к конкретному устройству.

> Каждый код имеет формат `AINA-<дней>D-<6-символьный токен>-<4-символьная контрольная сумма>`.
> Контрольная сумма вычисляется от срока и токена с солью (`js/auth.js`, функция `checksum`),
> поэтому опечатка или подделка «на глаз» не пройдёт валидацию.

#### Журнал кодов

Под формой генерации находится **журнал всех сгенерированных кодов**:

- Каждый код показан строкой: сам код, срок (в днях), дата создания.
- Кнопка **«Скопировать все»** копирует весь журнал в буфер обмена.
- Кнопка **«Копировать»** рядом с каждым кодом копирует его отдельно.
- Журнал хранится в `localStorage["aina_access_codes"]` — локально в браузере
  администратора. Это не серверная база: при очистке браузера журнал удаляется,
  поэтому при необходимости делайте резервные копии кнопкой «Скопировать все».

#### Выход из админ-панели

Нажмите **«Выйти»** в правом верхнем углу панели. Сессия администратора закрывается,
экран возвращается к оплате. Сессия также закрывается автоматически при закрытии вкладки
браузера (хранится в `sessionStorage`).

### Ограничения (важно)

- Защита кодов **мягкая**: подпись вычисляется в браузере (соль зашита в исходном коде),
  поэтому технически подкованный человек может сгенерировать код, изучив код. Для продажи
  широкому кругу лиц и настоящей защиты от «расшаривания» кодов нужен backend с проверкой
  кодов на сервере — это следующий шаг, если бизнес вырастет.
- Кто и как принимает рубли — юридический вопрос владельца. Для регулярного приёма платежей
  в РФ рекомендуется оформить самозанятость/ИП; приложение само платежи не обрабатывает.
- PIN администратора и реквизиты хранятся в исходном коде (статический сайт) — не
  коммитьте реальную карту в публичный репозиторий, либо используйте отдельный платёжный
  аккаунт/ссылку.
- Журнал кодов хранится локально в браузере администратора. При смене устройства или
  очистке браузера журнал теряется — регулярно копируйте его кнопкой «Скопировать все».

## Publishing

`index.html` is the entire app: no build, no environment variables, no server-side code. Any
static host will serve it — copy the file to the document root of a web server, or push the
repository to GitHub Pages, Netlify, Vercel, Cloudflare Pages or an S3 bucket.

Nothing in this repository is wired to a host yet, and the Base44 sandbox preview (port 3000)
is a development environment rather than a public deployment, so publishing means picking a
host and uploading `index.html`.

## Project layout

```
index.html   # the whole app: markup, styles and calculation logic
README.md
```
