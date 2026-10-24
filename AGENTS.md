# Development notes

## What this project is

A single static page, `index.html`: a calorie and macros (БЖУ) calculator written
in plain HTML/CSS/JS with an inline `<script>`. There is no package manager, no
build step, no backend, no database and no external services, so **no credentials
or environment variables are required**.

## Running it

```sh
docker compose -f docker-compose.base44.yml up -d
```

Serves the page on <http://localhost:3000> through `nginx:alpine`.

## Non-obvious details

- Only the page files are bind-mounted into the web root (`index.html`, `calc.js`),
  so the rest of the checkout (including `.git`) is never served. **If you add
  JS/CSS/asset files, add a matching bind mount in `docker-compose.base44.yml`** —
  otherwise they will 404 and the page silently loses that script.
- **Never "simplify" this into a whole-directory mount.** Mounting the checkout
  root (e.g. `./:/usr/share/nginx/html:ro`) makes nginx answer **403 Forbidden**
  for every request: the sandbox checkout directory is only traversable by root
  (`drwx------ root:root`), so nginx's worker user cannot reach the files below it
  (verified by running `nginx:alpine` with that mount and curling it). Mounting the
  individual files works because their parent directory belongs to nginx's own image.
- The compose healthcheck fetches **both** `/` and `/calc.js`, so a dropped script
  mount turns the container unhealthy instead of leaving a page that loads but
  cannot calculate anything.
- nginx reads the mounted file from disk on every request, so edits appear on a
  plain reload; there is no watcher and no build to wait for.
- The page is a static file with no server-side logic, so the compose stack has
  no state to reset: `docker compose -f docker-compose.base44.yml down` and
  `up -d` is always a clean start.

## Tests

The pure calculation functions (`calcBmr`, `calcChildCalories`, `CHILD_CALORIES`)
live in `calc.js`, shared by the page and the tests via a `module.exports` guard
(in the browser they stay global). Run the tests with Node:

```sh
docker run --rm -v "$PWD":/app -w /app node:22-alpine node tests/calc.test.js
```

## Verifying it works

Load `/`, fill Возраст / Вес / Рост, press **Рассчитать** and confirm the
`#result` block shows calories plus protein/fat/carbohydrate grams.

## App behavior notes

- The **Дети** checkbox toggles `#childSection`; while it is checked, the adult
  fields (age/weight/height/formula/goal) and the pregnancy/breastfeeding/cycle
  extras are hidden, since the child branch of the calculation ignores them.
- The pregnancy/breastfeeding/cycle extras are only enabled when Пол is
  Женщина; switching to Мужчина clears them.
- Missing/invalid age, weight or height shows an inline error instead of
  producing NaN results.
- The activity multiplier is applied to the child calorie presets as well as to
  the adult BMR (intentional, kept from the original logic).
- The formulas (Mifflin-St Jeor, Harris-Benedict), activity multipliers, goal
  factors, child presets and the 30/30/40 macro split are unchanged from the
  original single-file version — treat them as the source of truth.
