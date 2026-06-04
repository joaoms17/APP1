import React from 'react'
import { PALETTE, hexToRgba, genId, SERVICE_LABEL } from '../data'
import { Icon, Card, Label, Btn, Eucalyptus } from '../ui'

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12, border: '1px solid rgba(74,63,53,0.16)', background: 'var(--paper-card)', fontFamily: 'var(--sans)', fontSize: 14, color: PALETTE.nearBlack, outline: 'none' }
const lbl = { fontFamily: 'var(--sans)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: PALETTE.inkSoft, marginBottom: 6, display: 'block' }

export default function SettingsScreen({ ctx }) {
  const { lang, accent, settings, priceItems, saveSettings } = ctx
  const [tab, setTab] = React.useState('marca')
  const tabs = [
    { id: 'marca', label: lang === 'pt' ? 'Marca' : 'Brand' },
    { id: 'precos', label: lang === 'pt' ? 'Tabela de preços' : 'Price table' },
    { id: 'textos', label: lang === 'pt' ? 'Textos' : 'Texts' },
  ]
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '30px 18px 6px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 500, fontSize: 32, color: PALETTE.nearBlack, lineHeight: 1.1, marginBottom: 4 }}>{lang === 'pt' ? 'Definições' : 'Settings'}</div>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 13, color: PALETTE.inkSoft, marginBottom: 16 }}>{lang === 'pt' ? 'Preparação das propostas comerciais' : 'Proposal preparation'}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ flex: 1, padding: '9px', borderRadius: 50, border: `1px solid ${tab === tb.id ? accent : 'rgba(74,63,53,0.12)'}`, background: tab === tb.id ? hexToRgba(accent, 0.1) : 'transparent', color: tab === tb.id ? accent : PALETTE.inkSoft, fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>{tb.label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 32px' }}>
        {!settings
          ? <Card style={{ padding: '24px 18px', textAlign: 'center' }}>
              <Eucalyptus size={22} stem={PALETTE.terracotta} leaf={PALETTE.sage} style={{ margin: '0 auto 10px' }} />
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: PALETTE.inkSoft, lineHeight: 1.5 }}>{lang === 'pt' ? 'Corra o SQL supabase/proposals.sql no Supabase para ativar este módulo.' : 'Run supabase/proposals.sql in Supabase to enable this module.'}</div>
            </Card>
          : tab === 'marca' ? <MarcaTab ctx={ctx} />
          : tab === 'precos' ? <PrecosTab ctx={ctx} />
          : <TextosTab ctx={ctx} />}
      </div>
    </div>
  )
}

function MarcaTab({ ctx }) {
  const { lang, accent, settings, saveSettings } = ctx
  const [d, setD] = React.useState({ company_name: settings.company_name || '', location: settings.location || '', phone: settings.phone || '', logo_url: settings.logo_url || '' })
  const [saved, setSaved] = React.useState(false)
  const fileRef = React.useRef(null)

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 600000) { alert(lang === 'pt' ? 'Imagem demasiado grande (máx ~500KB).' : 'Image too large (max ~500KB).'); return }
    const r = new FileReader()
    r.onload = () => setD(p => ({ ...p, logo_url: r.result }))
    r.readAsDataURL(f)
  }
  const save = async () => { await saveSettings(d); setSaved(true); setTimeout(() => setSaved(false), 1800) }

  return (
    <div>
      <Label size={10.5} style={{ marginBottom: 8 }}>{lang === 'pt' ? 'Logótipo' : 'Logo'}</Label>
      <Card style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 84, height: 84, borderRadius: 16, background: 'var(--paper)', border: '1px solid rgba(74,63,53,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {d.logo_url ? <img src={d.logo_url} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <Eucalyptus size={26} stem={accent} leaf={PALETTE.sage} />}
        </div>
        <div style={{ flex: 1 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
          <Btn variant="soft" accent={accent} size="sm" icon="plus" onClick={() => fileRef.current?.click()}>{lang === 'pt' ? 'Carregar logótipo' : 'Upload logo'}</Btn>
          {d.logo_url && <button onClick={() => setD(p => ({ ...p, logo_url: '' }))} style={{ marginLeft: 10, background: 'none', border: 'none', color: PALETTE.clay, fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer' }}>{lang === 'pt' ? 'Remover' : 'Remove'}</button>}
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: PALETTE.inkSoft, marginTop: 8 }}>PNG/JPG · máx ~500KB</div>
        </div>
      </Card>

      <label style={lbl}>{lang === 'pt' ? 'Nome da empresa' : 'Company name'}</label>
      <input style={{ ...inputStyle, marginBottom: 14 }} value={d.company_name} onChange={e => setD(p => ({ ...p, company_name: e.target.value }))} />
      <label style={lbl}>{lang === 'pt' ? 'Localização' : 'Location'}</label>
      <input style={{ ...inputStyle, marginBottom: 14 }} value={d.location} onChange={e => setD(p => ({ ...p, location: e.target.value }))} />
      <label style={lbl}>{lang === 'pt' ? 'Telefone' : 'Phone'}</label>
      <input style={{ ...inputStyle, marginBottom: 18 }} value={d.phone} onChange={e => setD(p => ({ ...p, phone: e.target.value }))} />

      <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={save}>{saved ? (lang === 'pt' ? 'Guardado ✓' : 'Saved ✓') : (lang === 'pt' ? 'Guardar' : 'Save')}</Btn>
    </div>
  )
}

function TextosTab({ ctx }) {
  const { lang, accent, settings, saveSettings } = ctx
  const [d, setD] = React.useState({ about: settings.about || '', payment_terms: settings.payment_terms || '', terms: settings.terms || '', deslocacao_rate: settings.deslocacao_rate ?? 0.5 })
  const [saved, setSaved] = React.useState(false)
  const save = async () => { await saveSettings(d); setSaved(true); setTimeout(() => setSaved(false), 1800) }
  const ta = { ...inputStyle, resize: 'vertical', minHeight: 90, lineHeight: 1.5 }
  return (
    <div>
      <label style={lbl}>{lang === 'pt' ? 'Sobre mim' : 'About'}</label>
      <textarea style={{ ...ta, marginBottom: 16 }} rows={5} value={d.about} onChange={e => setD(p => ({ ...p, about: e.target.value }))} />
      <label style={lbl}>{lang === 'pt' ? 'Deslocação (€/km)' : 'Travel (€/km)'}</label>
      <input type="number" step="0.05" style={{ ...inputStyle, marginBottom: 16 }} value={d.deslocacao_rate} onChange={e => setD(p => ({ ...p, deslocacao_rate: Number(e.target.value) }))} />
      <label style={lbl}>{lang === 'pt' ? 'Condições de pagamento' : 'Payment terms'}</label>
      <textarea style={{ ...ta, marginBottom: 16 }} rows={4} value={d.payment_terms} onChange={e => setD(p => ({ ...p, payment_terms: e.target.value }))} />
      <label style={lbl}>{lang === 'pt' ? 'Termos e condições' : 'Terms & conditions'}</label>
      <textarea style={{ ...ta, marginBottom: 18 }} rows={7} value={d.terms} onChange={e => setD(p => ({ ...p, terms: e.target.value }))} />
      <Btn variant="solid" accent={accent} size="md" full icon="check" onClick={save}>{saved ? (lang === 'pt' ? 'Guardado ✓' : 'Saved ✓') : (lang === 'pt' ? 'Guardar' : 'Save')}</Btn>
    </div>
  )
}

function PrecosTab({ ctx }) {
  const { lang, accent, priceItems } = ctx
  const cats = [
    { id: 'noiva', label: lang === 'pt' ? 'Noiva' : 'Bride' },
    { id: 'convidadas', label: lang === 'pt' ? 'Convidadas' : 'Guests' },
    { id: 'extra', label: lang === 'pt' ? 'Outros serviços' : 'Extras' },
  ]
  const addItem = (category) => ctx.create('price_items', { id: genId(), category, title: lang === 'pt' ? 'Novo item' : 'New item', description: '', price: 0, unit: '', services: [], sort: 99 })
  return (
    <div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.inkSoft, lineHeight: 1.5, marginBottom: 18 }}>
        {lang === 'pt' ? 'A proposta escolhe automaticamente o item cujos serviços batem certo com os da lead. Ex.: "Maquilhagem e Penteado" exige maquilhagem + cabelo.' : 'The proposal auto-picks the item whose services match the lead. E.g. "Makeup & Hair" needs both.'}
      </div>
      {cats.map(c => (
        <div key={c.id} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Label size={11}>{c.label}</Label>
            <button onClick={() => addItem(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: accent, fontFamily: 'var(--sans)', fontSize: 12.5 }}>
              <Icon name="plus" size={15} color={accent} stroke={2} />{lang === 'pt' ? 'Adicionar' : 'Add'}
            </button>
          </div>
          {priceItems.filter(p => p.category === c.id).map(item => <PriceRow key={item.id} ctx={ctx} item={item} withServices={c.id !== 'extra'} />)}
        </div>
      ))}
    </div>
  )
}

function PriceRow({ ctx, item, withServices }) {
  const { lang, accent } = ctx
  const [d, setD] = React.useState({ title: item.title, description: item.description || '', price: item.price ?? 0, unit: item.unit || '', services: item.services || [] })
  const dirty = d.title !== item.title || d.description !== (item.description || '') || Number(d.price) !== Number(item.price ?? 0) || d.unit !== (item.unit || '') || JSON.stringify(d.services) !== JSON.stringify(item.services || [])
  const toggleSvc = (k) => setD(p => ({ ...p, services: p.services.includes(k) ? p.services.filter(x => x !== k) : [...p.services, k] }))
  return (
    <Card style={{ marginBottom: 10, padding: '14px' }}>
      <input value={d.title} onChange={e => setD(p => ({ ...p, title: e.target.value }))} style={{ ...inputStyle, fontFamily: 'var(--serif-display)', fontSize: 16, fontWeight: 600, marginBottom: 8 }} />
      <textarea value={d.description} onChange={e => setD(p => ({ ...p, description: e.target.value }))} rows={2} placeholder={lang === 'pt' ? 'Descrição / o que inclui' : 'Description'} style={{ ...inputStyle, resize: 'vertical', fontSize: 12.5, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: withServices ? 10 : 0 }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>{lang === 'pt' ? 'Preço (€)' : 'Price (€)'}</label>
          <input type="number" value={d.price} onChange={e => setD(p => ({ ...p, price: Number(e.target.value) }))} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={lbl}>{lang === 'pt' ? 'Unidade' : 'Unit'}</label>
          <input value={d.unit} onChange={e => setD(p => ({ ...p, unit: e.target.value }))} placeholder="look / pessoa / cada" style={inputStyle} />
        </div>
      </div>
      {withServices && (
        <>
          <label style={lbl}>{lang === 'pt' ? 'Ativa quando os serviços incluem' : 'Triggers when services include'}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {Object.keys(SERVICE_LABEL[lang]).map(k => {
              const on = d.services.includes(k)
              return <button key={k} onClick={() => toggleSvc(k)} style={{ fontFamily: 'var(--sans)', fontSize: 12, padding: '6px 11px', borderRadius: 50, cursor: 'pointer', border: `1px solid ${on ? PALETTE.sage : 'rgba(74,63,53,0.16)'}`, background: on ? hexToRgba(PALETTE.sage, 0.16) : 'transparent', color: on ? PALETTE.terracottaDark : PALETTE.inkSoft, fontWeight: on ? 500 : 400 }}>{SERVICE_LABEL[lang][k]}</button>
            })}
          </div>
        </>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={() => ctx.remove('price_items', item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.clay, fontFamily: 'var(--sans)', fontSize: 12.5 }}>{lang === 'pt' ? 'Eliminar' : 'Delete'}</button>
        <div style={{ flex: 1 }} />
        {dirty && <Btn variant="solid" accent={accent} size="sm" icon="check" onClick={() => ctx.update('price_items', item.id, d)}>{lang === 'pt' ? 'Guardar' : 'Save'}</Btn>}
      </div>
    </Card>
  )
}
