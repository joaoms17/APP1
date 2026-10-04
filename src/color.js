// Cor de projeto em qualquer modo (spec §7).
// darkMark(hex): variante escura de QUALQUER cor — limita a luminosidade OKLCH a 0,66 e, para cores
// quase pretas, sobe-a até ter ≥ 2:1 com --surface escuro (faixas, pontos e barras nunca desaparecem,
// e o ponto cheio da app nunca parece o anel oco do Google).
// lightMark(hex): no claro, só as cores quase brancas (#fff, amarelo-limão…) escurecem até ≥ 1,8:1
// com --surface. As 9 predefinidas não mudam em nenhum dos modos.
// Substitui o mapa DARK_VARIANT da v1, que só cobria as 9 cores predefinidas.
const toLin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c) => Math.round(255 * Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)))

const hex2oklab = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(h.slice(i, i + 2), 16)))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}

const oklab2hex = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return '#' + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map(toSrgb).map((v) => v.toString(16).padStart(2, '0')).join('')
}

// '#abc' → '#aabbcc'; valores inválidos caem num cinzento neutro
const normHex = (hex) => {
  let h = String(hex || '').trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(h)) h = '#' + [...h.slice(1)].map((c) => c + c).join('')
  return /^#[0-9a-f]{6}$/.test(h) ? h : '#929292'
}

const LIGHT_SURFACE = '#ffffff' // --surface (claro)
const DARK_SURFACE = '#231630'  // --surface (escuro)

// muda a luminosidade OKLab (dir +1 sobe, −1 desce) até ter o contraste mínimo com o fundo
const untilContrast = (hex, bg, min, dir) => {
  let h = hex
  let [L, a, b] = hex2oklab(h)
  for (let i = 0; i < 50 && contrastRatio(h, bg) < min; i++) {
    L = Math.max(0, Math.min(1, L + dir * 0.02))
    h = oklab2hex([L, a, b])
  }
  return h
}

export const darkMark = (hex) => {
  const h = normHex(hex)
  const [L, a, b] = hex2oklab(h)
  return untilContrast(L > 0.66 ? oklab2hex([0.66, a, b]) : h, DARK_SURFACE, 2, +1)
}

export const lightMark = (hex) => untilContrast(normHex(hex), LIGHT_SURFACE, 1.8, -1)

// o único style inline permitido: <span data-p style={projectVars(p.color)}>
export const projectVars = (hex) => {
  const h = normHex(hex)
  return { '--p-l': lightMark(h), '--p-d': darkMark(h) }
}

// contraste WCAG entre duas cores (aviso da "Cor livre" quando < 1,5:1 com --surface)
const relLum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(normHex(hex).slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrastRatio = (a, b) => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
