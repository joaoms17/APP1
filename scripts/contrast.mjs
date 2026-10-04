// Verificação WCAG 2.x dos tokens de src/styles/tokens.css (claro + escuro).
// Uso: node scripts/contrast.mjs [--md]
// Lê o próprio tokens.css — não há valores duplicados. Sai com código 1 se houver falhas (gate de CI).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// src/ é ESM num package.json sem "type": o Node avisa ao detetar a sintaxe — só esse aviso é silenciado
const emitWarning = process.emitWarning
process.emitWarning = function (w, ...rest) {
  const code = typeof rest[0] === 'object' ? rest[0]?.code : rest[1]
  if (code === 'MODULE_TYPELESS_PACKAGE_JSON') return
  return emitWarning.call(this, w, ...rest)
}
const { darkMark } = await import('../src/color.js')

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles', 'tokens.css'), 'utf8')
const grab = (block) => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))
const light = grab(css.split('@media (prefers-color-scheme: dark)')[0])
const dark = { ...light, ...grab(css.split('@media (prefers-color-scheme: dark)')[1]) }
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const L = (h) => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const cr = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(255 * (v * t + rgb(b)[i] * (1 - t))).toString(16).padStart(2, '0')).join('')
const PROJ = ['#d46a8f', '#cf9c3f', '#12a89e', '#cd7c5a', '#9c7ed4', '#4f9f68', '#6d8ed6', '#a49b3f', '#c263ac', '#000000', '#ffffff', '#ffff00', '#0000ff']
const WASH = { light: 0.09, dark: 0.13 }

const P = [
  // [nome, fg, bg, mínimo]  (mínimo 0 = só informativo)
  ['ink / page', 'ink', 'page', 4.5], ['ink / surface', 'ink', 'surface', 4.5], ['ink / sheet', 'ink', 'sheet-bg', 4.5],
  ['ink-2 / page', 'ink-2', 'page', 4.5], ['ink-2 / surface', 'ink-2', 'surface', 4.5], ['ink-2 / sunken', 'ink-2', 'surface-sunken', 4.5], ['ink-2 / seg-on', 'ink-2', 'seg-on', 4.5],
  ['muted / page', 'muted', 'page', 4.5], ['muted / surface', 'muted', 'surface', 4.5], ['muted / sheet', 'muted', 'sheet-bg', 4.5], ['muted / sunken', 'muted', 'surface-sunken', 4.5],
  ['accent-text / page', 'accent-text', 'page', 4.5], ['accent-text / surface', 'accent-text', 'surface', 4.5],
  ['accent-text / accent-soft (tab/chip ativos)', 'accent-text', 'accent-soft', 4.5], ['accent-text / sheet', 'accent-text', 'sheet-bg', 4.5],
  ['accent-text / seg-on', 'accent-text', 'seg-on', 4.5],
  // contagens (.n) na opção ativa: usam ink-2 (seg-on) e accent-text (chip ativo); muted ali falha no escuro
  ['muted / seg-on — PROIBIDO em texto (.n ativa usa ink-2)', 'muted', 'seg-on', 0],
  ['muted / accent-soft — PROIBIDO em texto (.n do chip ativo usa accent-text)', 'muted', 'accent-soft', 0],
  ['on-accent / accent (primário)', 'on-accent', 'accent', 4.5], ['on-accent / accent-strong', 'on-accent', 'accent-strong', 4.5],
  ['accent / page — UI', 'accent', 'page', 3], ['accent / surface — UI', 'accent', 'surface', 3],
  ['field-border / surface — UI', 'field-border', 'surface', 3], ['field-border / field-bg — UI', 'field-border', 'field-bg', 3],
  ['field-border / page — UI', 'field-border', 'page', 3], ['field-border / sheet — UI', 'field-border', 'sheet-bg', 3],
  ['gold-text / page (kicker)', 'gold-text', 'page', 4.5], ['gold-text / surface', 'gold-text', 'surface', 4.5],
  ['Recebido fg / bg', 'st-paid-fg', 'st-paid-bg', 4.5], ['Recebido fg / surface', 'st-paid-fg', 'surface', 4.5], ['Recebido fg / page', 'st-paid-fg', 'page', 4.5],
  ['Sinal fg / bg', 'st-partial-fg', 'st-partial-bg', 4.5], ['Sinal fg / page', 'st-partial-fg', 'page', 4.5],
  ['Por receber fg / page', 'st-due-fg', 'page', 4.5], ['Por receber fg / surface', 'st-due-fg', 'surface', 4.5],
  ['Em atraso fg / bg', 'st-overdue-fg', 'st-overdue-bg', 4.5], ['Em atraso fg / page', 'st-overdue-fg', 'page', 4.5], ['Em atraso fg / surface', 'st-overdue-fg', 'surface', 4.5],
  ['Aviso / page', 'warn-fg', 'page', 4.5], ['Aviso / surface', 'warn-fg', 'surface', 4.5],
  ['info fg / bg', 'info-fg', 'info-bg', 4.5], ['warning fg / bg', 'warning-fg', 'warning-bg', 4.5], ['ink / warning-bg', 'ink', 'warning-bg', 4.5],
  ['critical fg / bg', 'critical-fg', 'critical-bg', 4.5],
  ['toast fg / bg', 'toast-fg', 'toast-bg', 4.5], ['toast "Anular" / bg', 'toast-action', 'toast-bg', 4.5],
  ['ponto "novidades" / surface — UI', 'dot-new', 'surface', 3],
  ['logótipo: palavra / page', 'brand-ink', 'page', 4.5], ['logótipo: palavra / surface (sidebar)', 'brand-ink', 'surface', 4.5],
  ['logótipo: traços / page — UI', 'brand-ray', 'page', 3], ['logótipo: traços / surface — UI', 'brand-ray', 'surface', 3],
  ['logótipo: traços / accent-soft (topo do Entrar) — UI', 'brand-ray', 'accent-soft', 3],
  ['surface / page (separação)', 'surface', 'page', 0], ['sheet / page (separação)', 'sheet-bg', 'page', 0], ['sunken / page', 'surface-sunken', 'page', 0],
]
const rows = []; let fails = 0
for (const [mode, t] of [['light', light], ['dark', dark]]) {
  for (const [n, a, b, min] of P) {
    if (!t[a] || !t[b]) { console.error('token em falta', mode, a, b); process.exit(2) }
    const v = cr(t[a], t[b]); const ok = min === 0 ? '—' : v >= min ? 'OK' : 'FALHA'
    if (ok === 'FALHA') fails++
    rows.push({ mode, n, v, ok, fg: t[a], bg: t[b], min })
  }
  // pior caso da lavagem de projeto (cartão de hoje) com cores predefinidas + extremas
  let worstInk = 99, worstInk2 = 99, worstMuted = 99
  for (const c of PROJ) {
    const pc = mode === 'dark' ? darkMark(c) : c
    const w = mix(pc, t.surface, WASH[mode])
    worstInk = Math.min(worstInk, cr(t.ink, w)); worstInk2 = Math.min(worstInk2, cr(t['ink-2'], w)); worstMuted = Math.min(worstMuted, cr(t.muted, w))
  }
  for (const [n, v, min] of [['ink / lavagem (pior caso)', worstInk, 4.5], ['ink-2 / lavagem (pior caso)', worstInk2, 4.5], ['muted / lavagem (pior caso) — PROIBIDO usar', worstMuted, 0]]) {
    const ok = min === 0 ? '—' : v >= min ? 'OK' : 'FALHA'; if (ok === 'FALHA') fails++
    rows.push({ mode, n, v, ok, fg: '', bg: '', min })
  }
  // anel dos pontos (ink a 30 % sobre surface) — marcador tem de ter ≥ 3:1 com qualquer cor
  const ring = mix(t.ink, t.surface, 0.55)
  let worstRing = 99
  for (const c of PROJ) { const pc = mode === 'dark' ? darkMark(c) : c; worstRing = Math.min(worstRing, Math.max(cr(pc, t.surface), cr(ring, t.surface))) }
  rows.push({ mode, n: 'marcador de projeto c/ anel / surface (pior caso)', v: worstRing, ok: worstRing >= 3 ? 'OK' : 'FALHA', min: 3 })
  if (worstRing < 3) fails++
}
if (process.argv[2] === '--md') {
  console.log('| Par | Claro | Escuro | Mín. |\n|---|---|---|---|')
  const by = {}; for (const r of rows) (by[r.n] ||= {})[r.mode] = r
  for (const [n, r] of Object.entries(by)) {
    const f = (x) => `${x.fg ? `\`${x.fg}\`/\`${x.bg}\` ` : ''}**${x.v.toFixed(2)}** ${x.ok}`
    console.log(`| ${n} | ${f(r.light)} | ${f(r.dark)} | ${r.light.min || '—'} |`)
  }
} else {
  for (const r of rows) console.log(r.mode.padEnd(6), r.ok.padEnd(6), r.v.toFixed(2).padStart(6), r.n)
}
console.log(`\n${rows.length} pares · ${fails} falhas`)
process.exit(fails ? 1 : 0)
