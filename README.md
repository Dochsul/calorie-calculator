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

## Project layout

```
index.html   # the whole app: markup, styles and calculation logic
README.md
```
