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
