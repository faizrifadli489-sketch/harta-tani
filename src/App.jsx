import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { CROPS, WEATHER, UPGRADES, LEVEL_XP, fmt, fmtTime, upgradeCost } from './game/data.js'
import { actions, load, save, initialState, plotState, plotProgress, plotCap, invCap, sellMul } from './game/logic.js'

const CROP_LIST = Object.entries(CROPS)

function reducer(st, a) {
  if (a.type === 'reset') return initialState()
  if (a.type === 'weather') return { ...st, weather: a.weather }
  const next = actions[a.type]?.(st, ...(a.args || []))
  return next || st
}

export default function App() {
  const [st, dispatch] = useReducer(reducer, undefined, load)
  const [tool, setTool] = useState('bajak')
  const [seed, setSeed] = useState('gandum')
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('benih')
  const [, tick] = useState(0)
  const toastTimer = useRef(0)

  // ticker global: 250ms untuk progress bar, cukup ringan
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { save(st) }, [st])
  useEffect(() => save(st), [])

  // cuaca ganti tiap 3 menit
  useEffect(() => {
    const id = setInterval(() => {
      const keys = Object.keys(WEATHER)
      dispatch({ type: 'weather', weather: keys[Math.floor(Math.random() * keys.length)] })
    }, 180_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!st._msg) return
    setToast(st._msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [st._msg])

  const now = Date.now()
  const visible = plotCap(st)
  const readyCount = st.plots.slice(0, visible).filter(p => plotState(p, now) === 'ready').length
  const invTotal = Object.values(st.inv).reduce((a, b) => a + b, 0)
  const invRoom = invCap(st)
  const xpNeed = LEVEL_XP(st.level)
  const w = WEATHER[st.weather]

  function clickPlot(i) {
    dispatch({ type: tool, args: tool === 'tanam' ? [i, seed] : [i] })
    if (tool === 'panen' && plotState(st.plots[i], now) === 'ready') {
      // auto-tanam ulang benih yang sama? tidak — biar user pilih sadar
    }
  }

  function panenSemua() {
    st.plots.slice(0, visible).forEach((p, i) => {
      if (plotState(p, now) === 'ready') dispatch({ type: 'panen', args: [i] })
    })
  }

  const streak = readyCount

  return (
    <div className="app">
      <header className="hud">
        <div className="brand">
          <span className="logo">🌱</span>
          <div>
            <h1>Harta Tani</h1>
            <div className="lvl">Lv {st.level} · <span className="xpbar"><i style={{ width: Math.min(100, (st.xp / xpNeed) * 100) + '%' }} /></span></div>
          </div>
        </div>
        <div className="pills">
          <div className="pill gold"><span>💰</span><b>{fmt(st.money)}</b></div>
          <div className="pill"><span>{w.icon}</span><b>{w.name}</b></div>
          <div className="pill"><span>📦</span><b>{invTotal}/{invRoom}</b></div>
        </div>
      </header>

      <main className="field-wrap">
        <div className="field-meta">
          <span>{visible} lahan aktif</span>
          <span className={streak ? 'hot' : ''}>{streak ? `${streak} siap panen` : 'tidak ada yang siap'}</span>
        </div>
        <div className="field" style={{ '--cols': visible > 12 ? 6 : 3 }}>
          {st.plots.slice(0, visible).map((p, i) => (
            <Plot key={i} p={p} i={i} now={now} onAct={clickPlot} />
          ))}
        </div>
        {visible < 24 && (
          <div className="locked">🔒 {24 - visible} lahan lagi terbuka di level {st.level < 3 ? 3 : st.level < 6 ? 6 : 9}</div>
        )}
      </main>

      <nav className="toolbar">
        {[['bajak', '⛏️'], ['tanam', '🌱'], ['siram', '💧'], ['panen', '🧺']].map(([k, ic]) => (
          <button key={k} className={'tool ' + (tool === k ? 'on' : '')} onClick={() => setTool(k)}>
            <span>{ic}</span>{k}
          </button>
        ))}
        <button className={'tool panenAll ' + (readyCount ? 'pulse' : '')} disabled={!readyCount} onClick={panenSemua}>
          <span>🧺</span>Semua
        </button>
      </nav>

      <section className="panel">
        <div className="tabs">
          <button className={tab === 'benih' ? 'on' : ''} onClick={() => setTab('benih')}>Benih</button>
          <button className={tab === 'gudang' ? 'on' : ''} onClick={() => setTab('gudang')}>Gudang</button>
          <button className={tab === 'upgrade' ? 'on' : ''} onClick={() => setTab('upgrade')}>Upgrade</button>
          <button className={tab === 'stat' ? 'on' : ''} onClick={() => setTab('stat')}>Stat</button>
        </div>

        {tab === 'benih' && (
          <div className="shop">
            {CROP_LIST.map(([id, c]) => {
              const locked = st.level < c.unlock
              const profit = c.sell * c.yield - c.seed
              return (
                <button
                  key={id}
                  className={'card ' + (seed === id ? 'sel' : '') + (locked ? ' locked' : '')}
                  disabled={locked}
                  onClick={() => { setSeed(id); setTool('tanam') }}
                >
                  <div className="ic">{c.icon}</div>
                  <div className="nm">{c.name}</div>
                  <div className="sub">{locked ? `🔒 Lv ${c.unlock}` : `💰${c.seed} → ${fmt(c.sell * c.yield * sellMul(st))}`}</div>
                  <div className="sub dim">{fmtTime(c.grow * 1000)} · +{profit} profit</div>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'gudang' && (
          <div className="shop">
            {invTotal === 0 && <div className="empty">Gudang kosong. Panen dulu.</div>}
            {CROP_LIST.filter(([id]) => st.inv[id]).map(([id, c]) => (
              <button key={id} className="card" onClick={() => dispatch({ type: 'jual', args: [id] })}>
                <div className="ic">{c.icon}</div>
                <div className="nm">{c.name} ×{st.inv[id]}</div>
                <div className="sub gold">+💰{fmt(Math.round(st.inv[id] * c.sell * sellMul(st)))}</div>
                <div className="sub dim">tap untuk jual</div>
              </button>
            ))}
            {invTotal > 0 && (
              <button className="card sellAll" onClick={() => CROP_LIST.forEach(([id]) => st.inv[id] && dispatch({ type: 'jual', args: [id] }))}>
                <div className="ic">🏪</div>
                <div className="nm">Jual Semua</div>
                <div className="sub gold">+💰{fmt(CROP_LIST.reduce((a, [id, c]) => a + (st.inv[id] || 0) * c.sell * sellMul(st), 0))}</div>
              </button>
            )}
          </div>
        )}

        {tab === 'upgrade' && (
          <div className="shop">
            {Object.entries(UPGRADES).map(([k, u]) => {
              const owned = st.upg[k]
              const maxed = owned >= u.max
              const c = upgradeCost(u, owned)
              return (
                <button
                  key={k}
                  className={'card ' + (maxed || st.money < c ? 'locked' : '')}
                  disabled={maxed}
                  onClick={() => dispatch({ type: 'beli', args: [k] })}
                >
                  <div className="ic">{u.icon}</div>
                  <div className="nm">{u.name} <span className="dim">Lv {owned}/{u.max}</span></div>
                  <div className="sub">{u.desc}</div>
                  <div className="sub gold">{maxed ? 'MAX' : `💰${fmt(c)}`}</div>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'stat' && (
          <div className="stats">
            <div><span>Total panen</span><b>{fmt(st.stats.harvest)}</b></div>
            <div><span>Total pendapatan</span><b>💰{fmt(st.stats.earned)}</b></div>
            <div><span>Cuaca</span><b>{w.icon} {w.name} (tumbuh ×{w.growth})</b></div>
            <div><span>Bonus jual</span><b>+{Math.round((sellMul(st) - 1) * 100)}%</b></div>
            <button className="danger" onClick={() => { if (confirm('Hapus semua progres?')) dispatch({ type: 'reset' }) }}>Reset progres</button>
          </div>
        )}
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Plot({ p, i, now, onAct }) {
  const s = plotState(p, now)
  const prog = plotProgress(p, now)
  const c = p.crop ? CROPS[p.crop] : null
  const stage = prog < 0.25 ? '🌱' : prog < 0.6 ? '🌿' : prog < 0.9 ? '🌾' : '🌾'
  const cls = 'plot ' + s + (s === 'ready' ? ' ready' : '')
  return (
    <button className={cls} onClick={() => onAct(i)} aria-label={`lahan ${i + 1}`}>
      {s === 'grass' && <span className="em">🌿</span>}
      {s === 'tilled' && <span className="em soil">🟫</span>}
      {s === 'growing' && (
        <>
          <span className="em grow" style={{ '--p': prog }}>{prog < 0.25 ? '🌱' : prog < 0.6 ? '🌿' : '🍃'}</span>
          <span className="prog"><i style={{ width: prog * 100 + '%' }} /></span>
        </>
      )}
      {s === 'ready' && <span className="em bounce">{c.icon}</span>}
      {s === 'growing' && <span className="t">{fmtTime(p.start + p.dur - now)}</span>}
    </button>
  )
}
