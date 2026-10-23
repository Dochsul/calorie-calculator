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

- `index.html` is bind-mounted as the only file in the web root, so the rest of
  the checkout (including `.git`) is never served. **If you add JS/CSS/asset
  files, add a matching bind mount in `docker-compose.base44.yml`** — otherwise
  they will 404.
- nginx reads the mounted file from disk on every request, so edits appear on a
  plain reload; there is no watcher and no build to wait for.
- The page is a static file with no server-side logic, so the compose stack has
  no state to reset: `docker compose -f docker-compose.base44.yml down` and
  `up -d` is always a clean start.

## Verifying it works

Load `/`, fill Возраст / Вес / Рост, press **Рассчитать** and confirm the
`#result` block shows calories plus protein/fat/carbohydrate grams.

## Known pre-existing quirks (not environment issues)

- The **Дети** checkbox has no handler attached, so `#childSection` (the child age
  group select) stays hidden and the child branch of the calculation is
  unreachable from the UI.
- The activity multiplier is applied to the child calorie presets as well as to
  the adult BMR.
