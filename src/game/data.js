// Data & aturan game. Angka di sini satu-satunya sumber kebenaran.

export const CROPS = {
  gandum: { name: 'Gandum', icon: '🌾', seed: 5, sell: 14, grow: 45, yield: 2, xp: 3, unlock: 0 },
  jagung: { name: 'Jagung', icon: '🌽', seed: 14, sell: 38, grow: 120, yield: 3, xp: 7, unlock: 0 },
  wortel: { name: 'Wortel', icon: '🥕', seed: 30, sell: 95, grow: 300, yield: 3, xp: 15, unlock: 2 },
  stroberi: { name: 'Stroberi', icon: '🍓', seed: 70, sell: 240, grow: 600, yield: 3, xp: 32, unlock: 4 },
  labu: { name: 'Labu', icon: '🎃', seed: 160, sell: 620, grow: 1500, yield: 2, xp: 70, unlock: 6 },
  naga: { name: 'Buah Naga', icon: '🐉', seed: 400, sell: 1700, grow: 3600, yield: 2, xp: 160, unlock: 9 },
}

export const PLOTS = {
  bajak: { cost: 2, label: 'Bajak' },
  tanam: { cost: 0, label: 'Tanam' },
  panen: { cost: 0, label: 'Panen' },
  siram: { cost: 1, label: 'Siram', speed: 0.85, dur: 30_000 },
}

export const WEATHER = {
  cerah: { icon: '☀️', name: 'Cerah', growth: 1, weight: 55 },
  mendung: { icon: '⛅', name: 'Mendung', growth: 0.9, weight: 25 },
  hujan: { icon: '🌧️', name: 'Hujan', growth: 0.7, water: true, weight: 20 },
}

export const UPGRADES = {
  sprinkler: { name: 'Sprinkler', icon: '💧', desc: 'Penyiraman otomatis, +10% kecepatan tumbuh permanen', base: 250, max: 5 },
  traktor: { name: 'Traktor', icon: '🚜', desc: 'Bajak 1 klik untuk 3 lahan sekaligus', base: 600, max: 3 },
  gudang: { name: 'Gudang', icon: '🏚️', desc: '+50 kapasitas simpan hasil', base: 300, max: 6 },
  pasar: { name: 'Pasar', icon: '🏪', desc: '+8% harga jual', base: 800, max: 5 },
}

export const LEVEL_XP = lvl => Math.round(40 * Math.pow(lvl, 1.55))
export const upgradeCost = (u, owned) => Math.round(u.base * Math.pow(1.9, owned))

export const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B'
  : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M'
  : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k'
  : Math.round(n).toLocaleString('id-ID')

export const fmtTime = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return s + 's'
  const m = Math.floor(s / 60)
  return m >= 60 ? Math.floor(m / 60) + 'j ' + (m % 60) + 'm' : m + 'm ' + (s % 60) + 's'
}
