// SVG-графики динамики по дням (без внешних зависимостей).
// history: [{ date, kcal, p, f, c }], goalKcal: число, goalMacros: {proteins, fats, carbs}

const W = 600, H = 180;
const PL = 40, PR = 12, PT = 14, PB = 24;
function area() {
  return { x0: PL, y0: PT, x1: W - PR, y1: H - PB, w: W - PL - PR, h: H - PT - PB };
}

function shortDate(d) {
  if (!d) return "";
  const p = d.split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}` : d;
}

function svgWrap(title, inner) {
  return `<div class="chart-block">
    <div class="chart-title">${title}</div>
    <svg viewBox="0 0 600 ${H}" class="chart-svg" preserveAspectRatio="xMidYMid meet">${inner}</svg>
  </div>`;
}

function gridlines(a, maxV, steps = 4) {
  let g = "";
  for (let i = 0; i <= steps; i++) {
    const v = (maxV / steps) * i;
    const y = a.y1 - (v / maxV) * a.h;
    g += `<line x1="${a.x0}" y1="${y}" x2="${a.x1}" y2="${y}" stroke="#e7ecef" stroke-width="1"/>`;
    g += `<text x="${a.x0 - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#9aa7b4">${Math.round(v)}</text>`;
  }
  return g;
}

export function kcalChart(history, goal) {
  if (!history.length) return "";
  const vals = history.map((h) => h.kcal);
  const maxV = Math.max(goal, ...vals) * 1.15 || 1;
  const a = area();
  const n = history.length;
  const step = a.w / n;
  const bw = Math.min(42, step * 0.55);
  const y = (v) => a.y1 - (v / maxV) * a.h;
  let bars = gridlines(a, maxV);
  history.forEach((h, i) => {
    const cx = a.x0 + step * i + step / 2;
    bars += `<rect x="${cx - bw / 2}" y="${y(h.kcal)}" width="${bw}" height="${a.y1 - y(h.kcal)}" rx="3" fill="#2f80ed"/>`;
    bars += `<text x="${cx}" y="${a.y1 + 16}" text-anchor="middle" font-size="9" fill="#5c6b7a">${shortDate(h.date)}</text>`;
    bars += `<text x="${cx}" y="${y(h.kcal) - 4}" text-anchor="middle" font-size="9" fill="#1f2933">${Math.round(h.kcal)}</text>`;
  });
  const gy = y(goal);
  bars += `<line x1="${a.x0}" y1="${gy}" x2="${a.x1}" y2="${gy}" stroke="#d64545" stroke-dasharray="5 4" stroke-width="1.5"/>`;
  bars += `<text x="${a.x1}" y="${gy - 4}" text-anchor="end" font-size="9" fill="#d64545">цель ${Math.round(goal)}</text>`;
  return svgWrap("Калории по дням, ккал", bars);
}

export function macroChart(history, goalMacros) {
  if (!history.length) return "";
  const all = [...history.flatMap((h) => [h.p, h.f, h.c]), goalMacros.proteins, goalMacros.fats, goalMacros.carbs];
  const maxV = Math.max(...all) * 1.15 || 1;
  const a = area();
  const n = history.length;
  const step = a.w / Math.max(1, n - 1);
  const x = (i) => (n === 1 ? a.x0 + a.w / 2 : a.x0 + step * i);
  const y = (v) => a.y1 - (v / maxV) * a.h;
  let g = gridlines(a, maxV);
  const series = [
    { key: "p", color: "#2faa6a", label: "Б" },
    { key: "f", color: "#e0a93b", label: "Ж" },
    { key: "c", color: "#2f80ed", label: "У" },
  ];
  for (const s of series) {
    const pts = history.map((h, i) => `${x(i)},${y(h[s.key])}`).join(" ");
    g += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2"/>`;
    history.forEach((h, i) => (g += `<circle cx="${x(i)}" cy="${y(h[s.key])}" r="2.5" fill="${s.color}"/>`));
    const gv = goalMacros[s.key === "p" ? "proteins" : s.key === "f" ? "fats" : "carbs"];
    g += `<line x1="${a.x0}" y1="${y(gv)}" x2="${a.x1}" y2="${y(gv)}" stroke="${s.color}" stroke-dasharray="4 4" stroke-width="1" opacity="0.6"/>`;
  }
  history.forEach((h, i) => (g += `<text x="${x(i)}" y="${a.y1 + 16}" text-anchor="middle" font-size="9" fill="#5c6b7a">${shortDate(h.date)}</text>`));
  const legend = `<div class="chart-legend">
    <span class="lg-item"><i class="lg-sw" style="background:#2faa6a"></i>Белки</span>
    <span class="lg-item"><i class="lg-sw" style="background:#e0a93b"></i>Жиры</span>
    <span class="lg-item"><i class="lg-sw" style="background:#2f80ed"></i>Углеводы</span>
    <span class="hint">пунктир — цель</span>
  </div>`;
  return svgWrap("БЖУ по дням, г", g) + legend;
}

export function chartsHtml(history, goalKcal, goalMacros) {
  if (!history.length) return "";
  return `<div class="charts">${kcalChart(history, goalKcal)}${macroChart(history, goalMacros)}</div>`;
}
