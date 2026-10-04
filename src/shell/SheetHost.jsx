import { Suspense, useEffect, useState } from 'react'
import { useRoute, closeSheet, navigate } from '../router.js'
import { FEATURES } from '../features.js'
import { AttachmentViewer, Sheet, Skeleton } from '../ui'
import { Boundary, ErrorPanel, errorDetail, lazyWithPreload, screenErrorText } from './lazy.jsx'

// Folhas abertas por cima da rota (s=tipo[:id] no URL). Cada folha desenha o seu <Sheet>
// e recebe onClose (= closeSheet, que volta atrás no histórico). Código carregado a pedido.
const EventSheet = lazyWithPreload(() => import('../screens/Event/EventSheet.jsx'))
const ExpenseSheet = lazyWithPreload(() => import('../screens/Expenses/ExpenseSheet.jsx'))
const ProjectSheet = lazyWithPreload(() => import('../screens/Settings/ProjectSheet.jsx'))
const GcalSheet = lazyWithPreload(() => import('../screens/Settings/GcalSheet.jsx'))
const MonthPicker = lazyWithPreload(() => import('../screens/Agenda/MonthPicker.jsx'))
const MapSheet = lazyWithPreload(() => import('../screens/Agenda/MapSheet.jsx'))
const docs = (name) => lazyWithPreload(() => import('../screens/Documents/index.jsx').then((m) => ({ default: m[name] })))
const QuoteSheet = docs('QuoteSheet')
const ScheduleSheet = docs('ScheduleSheet')
const PricesSheet = docs('PricesSheet')

// preset = parâmetros da folha sem "kind", com params.preset (objeto) por cima:
//   openSheet('novo', { kind: 'evento', data: '2026-10-17' })   → preset { data }
//   openSheet('novo', { kind: 'despesa', files: [file] })        → preset { files }
//   openSheet('novo', { kind: 'evento', preset: cópia })         → preset = cópia
//   openSheet('registar', { key }) ou openSheet('registar', key) → preset { key }
const presetOf = ({ kind, preset, ...rest } = {}) => ({ ...rest, ...(preset || {}) })
const num = (v) => (v == null || v === '' ? undefined : Number(v))

// tipo → (sheet) => [Componente, props]
const REGISTRY = {
  evento: (s) => [EventSheet, { mode: 'detail', id: s.id }],
  'evento-editar': (s) => [EventSheet, { mode: 'edit', id: s.id, preset: presetOf(s.params) }], // { foco: 'notas' }
  registar: (s) => [EventSheet, { mode: 'google', id: null, preset: { ...presetOf(s.params), key: s.params.key || s.id } }],
  novo: (s) => [FEATURES.expenses && s.params.kind === 'despesa' ? ExpenseSheet : EventSheet, { mode: 'new', id: null, preset: presetOf(s.params) }],
  despesa: (s) => [ExpenseSheet, { mode: 'edit', id: s.id }],
  projeto: (s) => [ProjectSheet, { id: s.id }],
  'projeto-novo': () => [ProjectSheet, { id: null }],
  'calendario-novo': (s) => [GcalSheet, { preset: presetOf(s.params) }], // { projeto: id }
  mes: (s) => [MonthPicker, { year: num(s.params.year), month: num(s.params.month), onPick: s.params.onPick }],
  mapa: (s) => [MapSheet, { year: num(s.params.year), month: num(s.params.month) }],
  anexo: (s) => [AttachmentViewer, { id: s.id }],
  ...(FEATURES.docs && {
    orcamento: (s) => [QuoteSheet, { id: s.id, preset: presetOf(s.params) }],
    cronograma: (s) => [ScheduleSheet, { id: s.id, preset: presetOf(s.params) }],
    precos: () => [PricesSheet, {}],
  }),
}

// o código de todas as folhas desce quando a app fica parada: Novo e Detalhe abrem logo e, se a
// rede cair depois de a app abrir, todas as folhas continuam a abrir (os dados já estão em memória).
// As mais usadas primeiro; Documentos só com a funcionalidade ligada.
export function preloadSheets() {
  EventSheet.preload()
  ExpenseSheet.preload()
  MonthPicker.preload()
  ProjectSheet.preload()
  GcalSheet.preload()
  if (FEATURES.docs) QuoteSheet.preload()
}

// enquanto o código da folha chega: nada nos primeiros 300 ms, depois uma folha com esqueleto
function SheetLoading() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <Sheet onClose={closeSheet} title="A abrir…">
      <Skeleton lines={4} label="A abrir…" />
    </Sheet>
  )
}

export default function SheetHost() {
  const { sheet } = useRoute()
  const make = sheet && REGISTRY[sheet.type]

  // tipo desconhecido (ou Documentos desligados): fecha; "texto" é um ecrã das Definições
  useEffect(() => {
    if (!sheet || make) return
    closeSheet()
    if (sheet.type === 'texto') navigate('#/definicoes/texto')
  }, [sheet, make])

  if (!make) return null
  const [Comp, props] = make(sheet)
  return (
    <Boundary resetKey={`${sheet.type}:${sheet.id}`} fallback={(error, retry) => (
      <Sheet onClose={closeSheet} title="Não foi possível abrir">
        <ErrorPanel title="Não foi possível abrir." text={screenErrorText(error)}
          detail={errorDetail(error)} onRetry={retry} />
      </Sheet>
    )}>
      <Suspense fallback={<SheetLoading />}>
        <Comp {...props} onClose={closeSheet} />
      </Suspense>
    </Boundary>
  )
}
