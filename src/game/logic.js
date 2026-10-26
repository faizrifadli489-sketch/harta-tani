import { CROPS, UPGRADES, LEVEL_XP, upgradeCost, WEATHER } from './data.js'

export const SAVE_KEY = 'harta-tani-v1'

export const initialState = () => ({
  money: 120,
  xp: 0,
  level: 1,
  inv: {},                                  // cropId -> jumlah
  plots: Array.from({ length: 24 }, () => ({ s: 'grass', crop: null, start: 0, dur: 0, boost: 1 })),
  upg: { sprinkler: 0, traktor: 0, gudang: 0, pasar: 0 },
  stats: { harvest: 0, earned: 0 },
  weather: pickWeather(),
  lastSeen: Date.now(),
})

export function capsule() { return 24 + 12 * 3 } // 24 lahan awal + 36 dari gudang? -> lihat plotCap

export const plotCap = st => Math.min(24, 6 + (st.level >= 3 ? 6 : 0) + (st.level >= 6 ? 6 : 0) + (st.level >= 9 ? 6 : 0))
export const invCap = st => 60 + 50 * st.upg.gudang
export const sellMul = st => 1 + 0.08 * st.upg.pasar
export const growMul = st => WEATHER[st.weather].growth * Math.pow(0.9, 0.1 * st.upg.sprinkler) * 0.95

export function pickWeather() {
  const total = Object.values(WEATHER).reduce((a, w) => a + w.weight, 0)
  let r = Math.random() * total
  for (const [k, w] of Object.entries(WEATHER)) if ((r -= w.weight) <= 0) return k
  return 'cerah'
}

export function plotState(p, now = Date.now()) {
  if (p.s !== 'growing') return p.s
  return now >= p.start + p.dur ? 'ready' : 'growing'
}

export const plotProgress = (p, now = Date.now()) =>
  p.s === 'growing' ? Math.min(1, (now - p.start) / (p.dur || 1)) : 0

export const cost = (u, st) => upgradeCost(UPGRADES[u], st.upg[u])

// Semua aksi murni: (state, args) -> state baru. Return null kalau aksi tidak valid.
export const actions = {
  bajak(st, i) {
    const n = st.upg.traktor ? 3 : 1
    const plots = st.plots.slice()
    let done = 0, spent = 0
    for (let k = i; k < Math.min(st.plots.length, i + n); k++) {
      const p = plots[k]
      if (p.s !== 'grass' || st.money - spent < 2) continue
      plots[k] = { ...p, s: 'tilled' }
      spent += 2; done++
    }
    if (!done) return null
    return { ...st, money: st.money - spent, plots, _msg: `${done} lahan dibajak (-💰2${done > 1 ? '×' + done : ''})` }
  },

  tanam(st, i, cropId) {
    const c = CROPS[cropId]
    const p = st.plots[i]
    if (!c || p.s !== 'tilled') return null
    if (st.level < c.unlock) return null
    if (st.money < c.seed) return { ...st, _msg: 'Uang kurang' }
    const plots = st.plots.slice()
    plots[i] = { s: 'growing', crop: cropId, start: Date.now(), dur: c.grow * 1000 / growMul(st), boost: 1 }
    return { ...st, money: st.money - c.seed, plots, _msg: `${c.name} ditanam (-💰${c.seed})` }
  },

  panen(st, i) {
    const p = st.plots[i]
    if (plotState(p) !== 'ready') return null
    const c = CROPS[p.crop]
    const inv = { ...st.inv }
    const room = invCap(st) - Object.values(inv).reduce((a, b) => a + b, 0)
    const amount = Math.min(c.yield, room)
    if (amount <= 0) return { ...st, _msg: 'Gudang penuh — jual dulu' }
    inv[p.crop] = (inv[p.crop] || 0) + amount
    const plots = st.plots.slice()
    plots[i] = { s: 'tilled', crop: null, start: 0, dur: 0, boost: 1 }
    let xp = st.xp + c.xp, level = st.level
    while (xp >= LEVEL_XP(level)) { xp -= LEVEL_XP(level); level++ }
    return {
      ...st, plots, inv, xp, level,
      stats: { ...st.stats, harvest: st.stats.harvest + amount },
      _msg: `Panen ${c.icon} ${c.name} +${amount}${level > st.level ? ` · Naik level ${level}!` : ''}`,
    }
  },

  siram(st, i) {
    const p = st.plots[i]
    if (plotState(p) !== 'growing' || st.money < 1) return null
    const plots = st.plots.slice()
    // ponytail: siram = potong sisa durasi 15%, sekali per tanaman (boost flag); upgrade ke berlapis kalau perlu
    if (p.boost < 1) return null
    plots[i] = { ...p, dur: p.start + p.dur * 0.85 - p.start, boost: 0.85 }
    return { ...st, money: st.money - 1, plots, _msg: 'Disiram — tumbuh 15% lebih cepat' }
  },

  jual(st, cropId) {
    const have = st.inv[cropId] || 0
    if (!have) return null
    const gain = Math.round(have * CROPS[cropId].sell * sellMul(st))
    const inv = { ...st.inv }
    delete inv[cropId]
    return {
      ...st, inv, money: st.money + gain,
      stats: { ...st.stats, earned: st.stats.earned + gain },
      _msg: `Jual ${CROPS[cropId].icon} ${have}× = +💰${gain}`,
    }
  },

  beli(st, key) {
    const u = UPGRADES[key]
    if (!u || st.upg[key] >= u.max) return null
    const c = upgradeCost(u, st.upg[key])
    if (st.money < c) return { ...st, _msg: 'Uang kurang' }
    return { ...st, money: st.money - c, upg: { ...st.upg, [key]: st.upg[key] + 1 }, _msg: `${u.icon} ${u.name} dibeli!` }
  },

  // dipanggil ticker: selesaikan tanaman yang sudah matang (fix durasi saat offline)
  advance(st) {
    const now = Date.now()
    let dirty = false
    const plots = st.plots.map(p => {
      if (p.s === 'growing' && now >= p.start + p.dur) { dirty = true; return p }
      return p
    })
    return { ...st, plots, weather: st.weather, _advanced: dirty }
  },
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return initialState()
    const s = JSON.parse(raw)
    const base = initialState()
    const st = { ...base, ...s, upg: { ...base.upg, ...s.upg }, stats: { ...base.stats, ...s.stats } }
    // validasi bentuk minimal — data lama/rusak jangan bikin crash
    if (!Array.isArray(st.plots) || st.plots.length !== 24) return base
    // tanaman matang saat offline: pertahankan, ticker akan tandai ready
    return st
  } catch { return initialState() }
}

export function save(st) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...st, lastSeen: Date.now() })) } catch {}
}
