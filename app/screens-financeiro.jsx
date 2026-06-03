// screens-financeiro.jsx — Finance overview + pending payments
// ctx = { t, lang, accent, push, pop, goTab }

function FinanceiroScreen({ ctx }) {
  const { t, lang, accent } = ctx;
  const months = lang === 'pt' ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const vals = [4200, 5100, 4800, 6400, 7550, 8450];
  const max = Math.max(...vals);
  const pendentes = RESERVAS.filter((r) => r.pay !== 'pago' && r.total - r.pago > 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '54px 18px 6px', flexShrink: 0 }}>
        <Serif size={32} weight={500}>{t('tab_financeiro')}</Serif>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 24px' }}>
        {/* main revenue card */}
        <Card style={{ marginBottom: 16, padding: '20px 18px 18px' }}>
          <Label size={10}>{t('receita_mes')} · {lang === 'pt' ? 'Junho' : 'June'}</Label>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 46, color: accent, lineHeight: 1 }}>€ 8.450</div>
            <div style={{ textAlign: 'right', paddingBottom: 6 }}>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: PALETTE.sage, fontWeight: 600 }}>▲ 12%</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: PALETTE.inkSoft }}>vs. {lang === 'pt' ? 'Maio' : 'May'}</div>
            </div>
          </div>
          {/* chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96, marginTop: 20 }}>
            {vals.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: '100%', height: `${(v / max) * 80}px`, borderRadius: 5, background: i === vals.length - 1 ? accent : hexToRgba(PALETTE.sage, 0.4) }} />
                <span style={{ fontFamily: 'var(--sans)', fontSize: 9.5, color: PALETTE.inkSoft }}>{months[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* indicators */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
          <Card style={{ flex: 1, padding: '15px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Icon name="sparkle" size={14} color={PALETTE.sage} stroke={1.7} />
              <Label size={9.5}>{t('receita_prevista')}</Label>
            </div>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 26, color: PALETTE.nearBlack }}>€ 14.200</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 2 }}>{lang === 'pt' ? 'do pipeline ativo' : 'from active pipeline'}</div>
          </Card>
          <Card style={{ flex: 1, padding: '15px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Icon name="clock" size={14} color={PALETTE.clay} stroke={1.7} />
              <Label size={9.5}>{t('pagamentos_pendentes')}</Label>
            </div>
            <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 26, color: PALETTE.clay }}>€ 3.150</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 2 }}>{pendentes.length} {lang === 'pt' ? 'reservas' : 'bookings'}</div>
          </Card>
        </div>

        {/* pending payments list */}
        <Label size={10.5} style={{ marginBottom: 12 }}>{t('pagamentos_pendentes')}</Label>
        {pendentes.map((r) => {
          const divida = r.total - r.pago;
          const payTone = { pago: PALETTE.sage, parcial: PALETTE.gold, nao_pago: PALETTE.clay }[r.pay];
          return (
            <Card key={r.id} onClick={() => ctx.push('reserva', { id: r.id })} style={{ marginBottom: 10, padding: '13px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar initials={r.initials} color={r.color} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 16, color: PALETTE.nearBlack }}>{r.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: payTone }} />
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: PALETTE.inkSoft }}>{PAY_LABEL[lang][r.pay]} · {r.data}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: 17, color: PALETTE.clay, whiteSpace: 'nowrap' }}>€ {divida.toLocaleString('pt-PT')}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: PALETTE.inkSoft }}>{t('em_divida').toLowerCase()}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { FinanceiroScreen });
