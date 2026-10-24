# Working in this repo

## What this project is

A single static page: `index.html` holds the markup, the styles and the calorie/BMR
calculator script inline. There is **no build step, no package manifest, no
dependencies, and no database or external service** — nothing needs to be installed,
migrated or seeded, and no credentials are required.

## Running it here

```bash
docker compose -f docker-compose.base44.yml up -d   # serve on http://localhost:3000
docker compose -f docker-compose.base44.yml ps
docker compose -f docker-compose.base44.yml logs -f web
```

The `web` service serves the checkout directly from a read-only bind mount, so the
page is always the current source — no rebuild or dependency install on restart.

## Non-obvious details

- **Why the service uses a Python image rather than nginx:** the sandbox checkout
  directory is only traversable by root (`drwx------ root:root`), so an nginx
  container's worker user cannot read `index.html` and returns **403 Forbidden**.
  The Python runtime image runs as root and serves the mount correctly. If you swap
  in another server, check this first.
- **Reloading the preview:** there is no live-reload dev server, so an edit is
  visible only after `reload_preview` (a browser refresh) — the file itself changes
  on disk instantly.

## How to verify it works

`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` returns `200`, and the
page shows the "Калькулятор калорий и БЖУ" form. Filling age/weight/height and pressing
**Рассчитать** prints calorie and protein/fat/carb figures into the result area.

There is no test suite and no linter in this repo.
