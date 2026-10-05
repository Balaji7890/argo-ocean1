import { useEffect, useRef, useState } from 'react'
import './App.css'
import Ocean4DModule from './components/Ocean4D/Ocean4DModule'
import { exportArgoJson, exportArgoCsv } from './utils/exportArgoData'
import RegionComparatorModal from './components/Features/RegionComparatorModal'

/* ============================================================
   EDIT YOUR CONTENT HERE (text, team, features, FAQ, photos)
   ============================================================ */
const CONFIG = {
  story:
    "The ocean holds the planet's memory, yet most of its data sits in tables nobody reads. Argo Explorer turns thousands of drifting float readings into a journey you can see, scrub and share, from the sunlit surface to two kilometres down.",
  stats: [
    { end: 4000, suffix: '+', label: 'Argo floats drifting worldwide' },
    { end: 2000, suffix: ' m', label: 'typical profile depth' },
    { end: 71, suffix: '%', label: 'of Earth is ocean' },
    { end: 10, suffix: ' days', label: 'typical float cycle' },
  ],
  marquee: ['Temperature', 'Salinity', 'Pressure', 'Currents', 'Argo Floats', 'Deep Ocean', 'Open Data', 'Explore'],
  features: [
    {
      icon: 'map',
      title: 'Live Float Map',
      text: 'See every drifting float on a living world map and tap one to follow its journey.',
      buttons: [
        { label: 'Explore in 4D Ocean ↗', action: 'open_4d_map', primary: true },
      ],
    },
    {
      icon: 'clock',
      title: 'Time Travel',
      text: 'Scrub through months of readings and watch the ocean change over time.',
      buttons: [
        { label: 'NOAA Argo Archive ↗', url: 'https://www.ncei.noaa.gov/products/global-argo-data-management', primary: true },
        { label: 'Scrub 4D Timeline ⏱', action: 'open_timeline', primary: false },
      ],
    },
    {
      icon: 'bell',
      title: 'Anomaly Alerts',
      text: 'Get highlighted when temperature or salinity breaks from the normal pattern.',
      buttons: [
        { label: 'View 4D Anomalies ⚠️', action: 'open_anomalies', primary: true },
      ],
    },
    {
      icon: 'bars',
      title: 'Compare Regions',
      text: 'Put two ocean regions side by side and spot the differences instantly.',
      buttons: [
        { label: 'Launch Basin Comparator ⚖️', action: 'open_comparator', primary: true },
      ],
    },
    {
      icon: 'book',
      title: 'Story Mode',
      text: 'Guided narratives that explain what the data means in plain language.',
      buttons: [
        { label: 'Read Guided Story 📖', action: 'open_story', primary: true },
      ],
    },
    {
      icon: 'down',
      title: 'Open Data Export',
      text: 'Download clean datasets for classrooms, research and your own projects.',
      buttons: [
        { label: 'Export JSON 📥', action: 'export_json', primary: true },
        { label: 'Export CSV 📊', action: 'export_csv', primary: false },
      ],
    },
  ],
  team: [
    { name: 'Bhagavathi Thiruselvan', role: 'Product & Vision', avatar: '🧭' },
    { name: 'Balaji V', role: 'Frontend & Design', avatar: '🌊' },
    { name: 'Benedict Alvin Raj B', role: 'Data & Backend', avatar: '📡' },
    { name: 'Akshitha MP', role: 'Research & Story', avatar: '🐙' },
  ],
  roadmap: [
    { t: 'Idea', d: 'Make ocean data feel alive.' },
    { t: 'Prototype', d: 'Interactive profiles and zones.' },
    { t: 'Hackathon Demo', d: 'Live telemetry and storytelling.' },
    { t: 'Launch', d: 'Real float data and open access.' },
  ],
  faq: [
    { q: 'What is Argo Explorer?', a: 'A visual, interactive way to explore what ocean floats measure (temperature, salinity and pressure), turning raw numbers into a story anyone can follow.' },
    { q: 'Where does the data come from?', a: 'From the international Argo programme, whose free-drifting floats measure the upper 2,000 m of the ocean and share data openly. The charts on this page are illustrative profiles; the full build connects to real float data.' },
    { q: 'Who is it for?', a: 'Students, teachers, researchers and anyone curious about the ocean who wants answers without wrestling with spreadsheets.' },
    { q: 'What comes next?', a: 'A live float map, regional comparisons, anomaly alerts and downloadable datasets.' },
  ],
  /* Put your photos in  public/images/  with these names (see notes). */
  photos: [
    { src: '/images/ocean-1.jpg', cap: 'Sunlit coral reef', emoji: '🐠', cls: 'g1' },
    { src: '/images/ocean-2.jpg', cap: 'Open ocean waves', emoji: '🌊', cls: 'g2' },
    { src: '/images/ocean-3.jpg', cap: 'Sea turtle gliding', emoji: '🐢', cls: 'g3' },
    { src: '/images/ocean-4.jpg', cap: 'Jellyfish in the blue', emoji: '🪼', cls: 'g4' },
    { src: '/images/ocean-5.jpg', cap: 'Whale in deep water', emoji: '🐋', cls: 'g5' },
    { src: '/images/ocean-6.jpg', cap: 'Underwater light rays', emoji: '✨', cls: 'g6' },
  ],
}

const ZONES = [
  { id: 'sun', name: 'Sunlight Zone', min: 0, max: 200, temp: '≈ 10–28 °C', light: 'Bright', text: 'Warm, bright water where algae grow and most marine life gathers. Reefs, turtles, dolphins and schools of fish live here.' },
  { id: 'twilight', name: 'Twilight Zone', min: 200, max: 1000, temp: '≈ 4–10 °C', light: 'Faint blue glow', text: 'Sunlight fades fast. Animals rise at night to feed and many glow to hide, hunt or signal.' },
  { id: 'midnight', name: 'Midnight Zone', min: 1000, max: 4000, temp: '≈ 2–4 °C', light: 'Only bioluminescence', text: 'No sunlight at all. Creatures make their own light, under pressure hundreds of times stronger than at the surface.' },
  { id: 'abyss', name: 'Abyss & Trenches', min: 4000, max: 11000, temp: '≈ 0–3 °C', light: 'Total darkness', text: 'Near freezing and crushing. Life survives on falling food scraps and chemicals from hot vents.' },
]

const NAV = [
  ['story', 'Story'], ['descent', 'Descent'], ['telemetry', 'Telemetry'],
  ['4d-ocean', '4D Ocean & AI'],
  ['features', 'Features'], ['gallery', 'Gallery'], ['team', 'Team'],
]

/* ---------- shared live state (read in animation loops) ---------- */
const live = { p: 0, mx: 0.5, my: 0.5, px: -999, py: -999, mv: 0 }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

/* ============================================================
   WEBGL OCEAN BACKGROUND
   ============================================================ */
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform vec2 uMouse; uniform float uVel;
#define TAU 6.28318530718

float caustic(vec2 uv, float t){
  vec2 p = mod(uv * TAU, TAU) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++){
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(asp, 1.0);
  vec2 m = (uMouse - 0.5) * vec2(asp, 1.0);
  float t = uTime;
  float s = clamp(uScroll, 0.0, 1.0);

  vec3 c0 = vec3(0.00, 0.62, 0.86);
  vec3 c1 = vec3(0.00, 0.30, 0.55);
  vec3 c2 = vec3(0.00, 0.10, 0.25);
  vec3 c3 = vec3(0.00, 0.02, 0.08);
  vec3 base = mix(c0, c1, smoothstep(0.0, 0.25, s));
  base = mix(base, c2, smoothstep(0.2, 0.55, s));
  base = mix(base, c3, smoothstep(0.5, 0.9, s));
  base *= 0.75 + 0.45 * uv.y * (1.0 - 0.5 * s);

  float d = length(p - m);
  float rip = sin(d * 45.0 - t * 5.0) * exp(-d * 6.0) * clamp(uVel, 0.0, 1.0);

  float shallow = 1.0 - smoothstep(0.0, 0.4, s);
  vec2 cuv = uv * vec2(asp, 1.0) * 0.9 + rip * 0.02;
  float ca = caustic(cuv, t * 0.5 + 23.0) * shallow * (0.35 + 0.65 * uv.y);

  float ray = pow(max(0.0, sin(p.x * 7.0 + p.y * 2.0 + t * 0.35) * sin(p.x * 3.3 - p.y * 1.2 - t * 0.22)), 2.0);
  ray *= uv.y * (1.0 - smoothstep(0.0, 0.6, s));

  vec3 col = base;
  col += ca * vec3(0.55, 0.95, 1.0) * 0.5;
  col += ray * vec3(0.35, 0.8, 1.0) * 0.26;
  col += rip * vec3(0.4, 0.8, 1.0) * 0.12;

  float deep = smoothstep(0.55, 1.0, s);
  col += deep * vec3(0.0, 0.25, 0.3) * 0.12 * (0.5 + 0.5 * sin(t * 0.6 + p.x * 3.0));

  float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.1;
  col *= clamp(vig, 0.0, 1.0);
  float g = fract(sin(dot(gl_FragCoord.xy + t, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`

function OceanGL() {
  const ref = useRef(null)
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const canvas = ref.current
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) { setOk(false); return }

    const compile = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s))
        return null
      }
      return s
    }
    const v = compile(gl.VERTEX_SHADER, VERT)
    const f = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!v || !f) { setOk(false); return }
    const prog = gl.createProgram()
    gl.attachShader(prog, v)
    gl.attachShader(prog, f)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setOk(false); return }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const U = (n) => gl.getUniformLocation(prog, n)
    const uRes = U('uRes'), uTime = U('uTime'), uScroll = U('uScroll'), uMouse = U('uMouse'), uVel = U('uVel')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scale = 0.55
    let raf, sp = 0, mx = 0.5, my = 0.5, vel = 0
    const start = performance.now()

    const resize = () => {
      canvas.width = Math.max(2, Math.floor(window.innerWidth * scale))
      canvas.height = Math.max(2, Math.floor(window.innerHeight * scale))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = (now) => {
      const t = still ? 5 : (now - start) / 1000
      sp += (live.p - sp) * 0.06
      mx += (live.mx - mx) * 0.08
      my += (live.my - my) * 0.08
      vel += (live.mv - vel) * 0.1
      live.mv *= 0.93
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, t)
      gl.uniform1f(uScroll, sp)
      gl.uniform2f(uMouse, mx, my)
      gl.uniform1f(uVel, vel)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      {!ok && <div className="gl-fallback" />}
      <canvas ref={ref} className="gl" />
    </>
  )
}

/* ============================================================
   LIFE LAYER: fish school, bubbles, marine snow, glow lights
   ============================================================ */
function Life() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const c = ref.current
    const ctx = c.getContext('2d')
    let w = 0, h = 0, raf, t = 0
    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      c.width = w * d
      c.height = h * d
      ctx.setTransform(d, 0, 0, d, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const fish = Array.from({ length: 46 }, () => ({
      x: Math.random() * w, y: h * (0.2 + Math.random() * 0.5),
      vx: -1 - Math.random(), vy: (Math.random() - 0.5) * 0.3, s: 5 + Math.random() * 4,
    }))
    const snow = Array.from({ length: 110 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 1.8, s: 0.15 + Math.random() * 0.5, d: Math.random() * 6 }))
    const lights = Array.from({ length: 30 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 6 + Math.random() * 14, ph: Math.random() * 6, hue: [185, 170, 300][Math.floor(Math.random() * 3)] }))
    const bubbles = Array.from({ length: 24 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 2 + Math.random() * 6, s: 0.4 + Math.random() * 0.9, wob: Math.random() * 6 }))

    const step = () => {
      t += 1 / 60
      ctx.clearRect(0, 0, w, h)
      const p = live.p

      /* fish */
      const fa = (1 - smooth(0.04, 0.4, p)) * 0.9
      if (fa > 0.01) {
        let cx = 0, cy = 0, avx = 0, avy = 0
        for (const f of fish) { cx += f.x; cy += f.y; avx += f.vx; avy += f.vy }
        const n = fish.length
        cx /= n; cy /= n; avx /= n; avy /= n
        for (const f of fish) {
          f.vx += (cx - f.x) * 0.00004
          f.vy += (cy - f.y) * 0.00008
          f.vx += (avx - f.vx) * 0.02
          f.vy += (avy - f.vy) * 0.02
          for (const o of fish) {
            if (o === f) continue
            const dx = f.x - o.x, dy = f.y - o.y, d2 = dx * dx + dy * dy
            if (d2 < 400 && d2 > 0) { f.vx += (dx / d2) * 2; f.vy += (dy / d2) * 2 }
          }
          const dx = f.x - live.px, dy = f.y - live.py, d = Math.hypot(dx, dy)
          if (d < 170 && d > 0) { f.vx += (dx / d) * 0.35; f.vy += (dy / d) * 0.35 }
          if (f.y < h * 0.15) f.vy += 0.03
          if (f.y > h * 0.8) f.vy -= 0.03
          if (f.x < 60) f.vx += 0.05
          if (f.x > w - 60) f.vx -= 0.05
          const sp = Math.hypot(f.vx, f.vy)
          if (sp > 3.2) { f.vx = (f.vx / sp) * 3.2; f.vy = (f.vy / sp) * 3.2 }
          else if (sp < 1.1 && sp > 0) { f.vx = (f.vx / sp) * 1.1; f.vy = (f.vy / sp) * 1.1 }
          f.x += f.vx
          f.y += f.vy
          ctx.save()
          ctx.translate(f.x, f.y)
          ctx.rotate(Math.atan2(f.vy, f.vx))
          ctx.fillStyle = `rgba(225,248,255,${fa})`
          ctx.beginPath()
          ctx.ellipse(0, 0, f.s * 1.6, f.s * 0.6, 0, 0, Math.PI * 2)
          ctx.fill()
          const wag = Math.sin(t * 9 + f.s) * f.s * 0.35
          ctx.beginPath()
          ctx.moveTo(-f.s * 1.4, 0)
          ctx.lineTo(-f.s * 2.4, -f.s * 0.7 + wag)
          ctx.lineTo(-f.s * 2.4, f.s * 0.7 + wag)
          ctx.fill()
          ctx.restore()
        }
      }

      /* bubbles */
      const ba = 0.5 * (1 - smooth(0.6, 1, p))
      if (ba > 0.01) {
        for (const b of bubbles) {
          b.y -= b.s
          b.wob += 0.02
          b.x += Math.sin(b.wob) * 0.4
          if (b.y < -20) { b.y = h + 20; b.x = Math.random() * w }
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,255,255,${ba})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      /* marine snow */
      const sa = smooth(0.08, 0.5, p) * 0.55
      if (sa > 0.01) {
        ctx.fillStyle = `rgba(220,240,255,${sa})`
        for (const s of snow) {
          s.y += s.s
          s.x += Math.sin(t + s.d) * 0.2
          if (s.y > h + 5) { s.y = -5; s.x = Math.random() * w }
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      /* bioluminescent lights */
      const la = smooth(0.45, 0.8, p)
      if (la > 0.01) {
        for (const l of lights) {
          l.x += Math.sin(t * 0.4 + l.ph) * 0.25
          l.y += Math.cos(t * 0.3 + l.ph) * 0.2
          const dx = live.px - l.x, dy = live.py - l.y, d = Math.hypot(dx, dy)
          if (d < 240 && d > 0) { l.x += (dx / d) * 0.4; l.y += (dy / d) * 0.4 }
          if (l.x < -20) l.x = w + 20
          if (l.x > w + 20) l.x = -20
          if (l.y < -20) l.y = h + 20
          if (l.y > h + 20) l.y = -20
          const a = (0.4 + 0.6 * Math.sin(t * 1.5 + l.ph)) * la
          const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 3)
          g.addColorStop(0, `hsla(${l.hue},100%,70%,${a})`)
          g.addColorStop(1, `hsla(${l.hue},100%,60%,0)`)
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(l.x, l.y, l.r * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="life" />
}

/* ============================================================
   UI HELPERS
   ============================================================ */
function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.documentElement.classList.add('has-cursor')
    let x = -100, y = -100, rx = -100, ry = -100, raf
    const move = (e) => {
      x = e.clientX
      y = e.clientY
      if (dot.current) dot.current.style.transform = `translate(${x}px,${y}px)`
    }
    const over = (e) => {
      const hot = e.target.closest && e.target.closest('a,button,input,select,[data-hover],.tilt')
      if (ring.current) ring.current.classList.toggle('big', !!hot)
    }
    const loop = () => {
      rx += (x - rx) * 0.16
      ry += (y - ry) * 0.16
      if (ring.current) ring.current.style.transform = `translate(${rx}px,${ry}px)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseover', over)
    raf = requestAnimationFrame(loop)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <>
      <div ref={ring} className="cur-ring" />
      <div ref={dot} className="cur-dot" />
    </>
  )
}

function Preloader({ onDone }) {
  const [n, setN] = useState(0)
  const [out, setOut] = useState(false)
  useEffect(() => {
    let v = 0
    const id = setInterval(() => {
      v += Math.random() * 7 + 2
      if (v >= 100) {
        clearInterval(id)
        setN(100)
        setTimeout(() => setOut(true), 350)
        setTimeout(onDone, 1250)
      } else setN(Math.floor(v))
    }, 60)
    return () => clearInterval(id)
  }, [onDone])
  return (
    <div className={`preloader ${out ? 'out' : ''}`}>
      <div className="pre-inner">
        <div className="pre-ring"><span>{n}%</span></div>
        <p>Descending… <b>{Math.round(n * 20).toLocaleString()} m</b></p>
      </div>
    </div>
  )
}

function Reveal({ children, delay = 0, dir = 'up', className = '' }) {
  const ref = useRef(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShow(true); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${dir} ${show ? 'show' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function Counter({ end, suffix = '' }) {
  const ref = useRef(null)
  const [value, setValue] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        obs.disconnect()
        const start = performance.now()
        const tick = (now) => {
          const p = Math.min((now - start) / 1700, 1)
          setValue(Math.floor(end * (1 - Math.pow(1 - p, 3))))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [end])
  return <span ref={ref}>{value.toLocaleString()}{suffix}</span>
}

function Btn({ children, className = '', onClick, type = 'button' }) {
  const ref = useRef(null)
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    ref.current.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`
  }
  const leave = () => { if (ref.current) ref.current.style.transform = '' }
  return (
    <button ref={ref} type={type} className={`btn ${className}`} onClick={onClick} onMouseMove={move} onMouseLeave={leave}>
      <span>{children}</span>
    </button>
  )
}

function Tilt({ children, className = '' }) {
  const ref = useRef(null)
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    ref.current.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 14}deg) translateY(-6px)`
    ref.current.style.setProperty('--gx', `${x * 100}%`)
    ref.current.style.setProperty('--gy', `${y * 100}%`)
  }
  const leave = () => { if (ref.current) ref.current.style.transform = '' }
  return (
    <div ref={ref} className={`tilt ${className}`} onMouseMove={move} onMouseLeave={leave}>
      {children}
    </div>
  )
}

function ScrollWords({ text }) {
  const ref = useRef(null)
  const words = text.split(' ')
  const [lit, setLit] = useState(0)
  useEffect(() => {
    const upd = () => {
      const r = ref.current.getBoundingClientRect()
      const vh = window.innerHeight
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1)
      setLit(Math.round(p * words.length))
    }
    upd()
    window.addEventListener('scroll', upd, { passive: true })
    window.addEventListener('resize', upd)
    return () => {
      window.removeEventListener('scroll', upd)
      window.removeEventListener('resize', upd)
    }
  }, [words.length])
  return (
    <p ref={ref} className="story-text">
      {words.map((w, i) => (
        <span key={i} className={i < lit ? 'lit' : ''}>{w} </span>
      ))}
    </p>
  )
}

function Icon({ name }) {
  const paths = {
    map: <><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    bell: <><path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    bars: <path d="M5 20V10M12 20V4M19 20v-7" />,
    book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 5v16" /></>,
    down: <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />,
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

const PHOTO_FALLBACKS = {
  '/images/ocean-1.jpg': 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80',
  '/images/ocean-2.jpg': 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80',
  '/images/ocean-3.jpg': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
  '/images/ocean-4.jpg': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/A_close-up_shot_of_a_Chrysaora_agulhensis_swimming_in_the_deep_blue_ocean.jpg',
  '/images/ocean-5.jpg': 'https://upload.wikimedia.org/wikipedia/commons/e/e6/HIHWNMS_Humpback_Whale_Underwater_%2849530678743%29.jpg',
  '/images/ocean-6.jpg': 'https://images.unsplash.com/photo-1530053190459-2b3a69cad5cd?auto=format&fit=crop&w=1200&q=80',
}

function Photo({ p, className = '' }) {
  const [src, setSrc] = useState(p.src)
  const [bad, setBad] = useState(false)

  const onError = () => {
    if (src !== PHOTO_FALLBACKS[p.src] && PHOTO_FALLBACKS[p.src]) {
      setSrc(PHOTO_FALLBACKS[p.src])
    } else {
      setBad(true)
    }
  }

  if (bad)
    return (
      <div className={`art-ph ${p.cls} ${className}`}>
        <span>{p.emoji}</span>
        <small>{p.cap}</small>
      </div>
    )
  return <img className={className} src={src} alt={p.cap} loading="lazy" onError={onError} />
}

/* ============================================================
   ILLUSTRATIONS
   ============================================================ */
function ArgoFloat() {
  return (
    <svg viewBox="0 0 120 340" className="float-svg" aria-hidden="true">
      <defs>
        <linearGradient id="fb" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#bfeaff" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#6fb6d8" />
        </linearGradient>
        <radialGradient id="fl">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#67e8f900" />
        </radialGradient>
      </defs>
      <line x1="60" y1="8" x2="60" y2="62" stroke="#d6f3ff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="8" r="5" fill="#ffb066" />
      <rect x="38" y="60" width="44" height="190" rx="22" fill="url(#fb)" />
      <rect x="38" y="125" width="44" height="14" fill="#ff9f43" />
      <rect x="38" y="145" width="44" height="4" fill="#0b4a73" opacity=".5" />
      <ellipse cx="60" cy="272" rx="26" ry="22" fill="#0e3a5c" />
      <circle className="float-light" cx="60" cy="305" r="22" fill="url(#fl)" />
      <circle cx="60" cy="305" r="6" fill="#67e8f9" />
    </svg>
  )
}

function ZoneArt({ id }) {
  if (id === 'sun')
    return (
      <svg viewBox="0 0 320 220" className="art">
        <defs>
          <radialGradient id="sunG"><stop offset="0" stopColor="#fff7c2" /><stop offset="1" stopColor="#fff7c200" /></radialGradient>
        </defs>
        <circle cx="250" cy="50" r="75" fill="url(#sunG)" />
        <circle cx="250" cy="50" r="18" fill="#fff3a8" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(0 ${70 + i * 28})`}>
            <g className="swim" style={{ animationDelay: `${-i * 1.7}s`, animationDuration: `${8 + i}s` }}>
              <path d="M0 0 C10 -9 28 -9 36 0 C28 9 10 9 0 0Z M36 0 L48 -9 L48 9Z" fill="#e6fbff" />
              <circle cx="8" cy="-1" r="1.8" fill="#06304d" />
            </g>
          </g>
        ))}
      </svg>
    )
  if (id === 'twilight')
    return (
      <svg viewBox="0 0 320 220" className="art">
        <defs>
          <linearGradient id="jG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c4b5fd" /><stop offset="1" stopColor="#22d3ee" stopOpacity=".45" /></linearGradient>
          <radialGradient id="jGlow"><stop offset="0" stopColor="#a78bfa" stopOpacity=".5" /><stop offset="1" stopColor="#a78bfa00" /></radialGradient>
        </defs>
        <circle cx="160" cy="95" r="95" fill="url(#jGlow)" />
        <g className="jelly">
          <path d="M90 100 C90 38 230 38 230 100 C200 114 182 100 160 114 C138 100 120 114 90 100Z" fill="url(#jG)" opacity=".92" />
          {[112, 136, 160, 184, 208].map((x, i) => (
            <path key={x} className="tent" style={{ animationDelay: `${-i * 0.4}s` }} d={`M${x} 108 C${x - 12} 140 ${x + 12} 160 ${x} 198`} stroke="#c4b5fd" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
          ))}
        </g>
      </svg>
    )
  if (id === 'midnight')
    return (
      <svg viewBox="0 0 320 220" className="art">
        <defs>
          <radialGradient id="lure"><stop offset="0" stopColor="#67e8f9" /><stop offset="1" stopColor="#67e8f900" /></radialGradient>
        </defs>
        <circle className="lure-glow" cx="62" cy="48" r="44" fill="url(#lure)" />
        <path d="M122 80 C112 30 80 20 62 48" stroke="#2b4a6a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="62" cy="48" r="9" fill="#d9fbff" />
        <g className="angler">
          <ellipse cx="175" cy="125" rx="82" ry="56" fill="#0b1d2e" stroke="#2b4a6a" strokeWidth="2" />
          <path d="M245 125 L292 92 L292 158Z" fill="#0b1d2e" stroke="#2b4a6a" strokeWidth="2" />
          <path d="M96 128 L112 112 L120 130 L134 112 L142 132 L156 114 L164 134" stroke="#e6f9ff" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <circle cx="135" cy="98" r="10" fill="#fff" />
          <circle cx="132" cy="98" r="4.5" fill="#06182a" />
        </g>
      </svg>
    )
  return (
    <svg viewBox="0 0 320 220" className="art">
      <defs>
        <radialGradient id="vent"><stop offset="0" stopColor="#ff9f43" stopOpacity=".9" /><stop offset="1" stopColor="#ff9f4300" /></radialGradient>
      </defs>
      <ellipse cx="170" cy="168" rx="110" ry="40" fill="url(#vent)" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} className="smoke" style={{ animationDelay: `${-i * 1.2}s` }} cx={168 + i * 3} cy="150" r={8 + i * 2} fill="#cbd5e1" />
      ))}
      <path d="M0 220 L0 190 C60 170 90 150 130 162 C160 124 200 124 222 162 C262 152 300 172 320 190 L320 220Z" fill="#0a1420" />
      {[90, 112, 130, 214, 236].map((x, i) => (
        <g key={x} className="worm" style={{ animationDelay: `${-i * 0.7}s` }}>
          <rect x={x} y={120 + (i % 2) * 10} width="9" height={50 - (i % 2) * 10} rx="4.5" fill="#f1f5f9" />
          <rect x={x} y={120 + (i % 2) * 10} width="9" height="14" rx="4.5" fill="#ef4444" />
        </g>
      ))}
    </svg>
  )
}

/* ============================================================
   TELEMETRY DATA
   ============================================================ */
const TABS = {
  temp: { label: 'Temperature', unit: '°C', min: 0, max: 26, color: '#ffb066', f: (d) => 2 + 23 * Math.exp(-d / 300), fmt: (v) => v.toFixed(1) },
  sal: { label: 'Salinity', unit: 'PSU', min: 34.2, max: 35.3, color: '#c4b5fd', f: (d) => 34.7 + 0.5 * Math.exp(-d / 200) - 0.45 * Math.exp(-Math.pow((d - 800) / 400, 2)), fmt: (v) => v.toFixed(2) },
  pres: { label: 'Pressure', unit: 'atm', min: 0, max: 210, color: '#5ef2ff', f: (d) => 1 + d / 10, fmt: (v) => Math.round(v) },
  light: { label: 'Sunlight', unit: '%', min: 0, max: 100, color: '#fde047', f: (d) => 100 * Math.exp(-d / 40), fmt: (v) => (v >= 1 ? v.toFixed(0) : v.toFixed(2)) },
}
const CL = 60, CR = 520, CT = 20, CB = 320

/* ============================================================
   NAVBAR + GAUGE
   ============================================================ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    )
    ;['home', ...NAV.map((n) => n[0]), 'contact'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])
  const pick = (id) => { setOpen(false); go(id) }
  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <button className="brand" onClick={() => pick('home')}>
        <span className="brand-dot" />FloatChat · Argo<b>Explorer</b>
      </button>
      <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu">{open ? '✕' : '☰'}</button>
      <nav className={open ? 'open' : ''}>
        {NAV.map(([id, label]) => (
          <button key={id} className={`nav-link ${active === id ? 'active' : ''}`} onClick={() => pick(id)}>{label}</button>
        ))}
        <button className="nav-cta" onClick={() => pick('contact')}>Join ↗</button>
      </nav>
    </header>
  )
}

function DepthGauge() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const upd = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? clamp(window.scrollY / max, 0, 1) : 0)
    }
    upd()
    window.addEventListener('scroll', upd, { passive: true })
    window.addEventListener('resize', upd)
    return () => {
      window.removeEventListener('scroll', upd)
      window.removeEventListener('resize', upd)
    }
  }, [])
  const m = Math.round((p * 11000) / 10) * 10
  return (
    <div className="gauge" aria-hidden="true">
      <span className="gauge-label">{m.toLocaleString()} m</span>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ height: `${p * 100}%` }} />
        <div className="gauge-dot" style={{ top: `${p * 100}%` }} />
      </div>
    </div>
  )
}

/* ============================================================
   APP
   ============================================================ */
function App() {
  const [ready, setReady] = useState(false)
  const [zi, setZi] = useState(0)
  const [tab, setTab] = useState('temp')
  const [depth, setDepth] = useState(300)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('')
  const [lb, setLb] = useState(null)
  const [faq, setFaq] = useState(0)
  const [toast, setToast] = useState('')
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [error, setError] = useState('')
  const [showComparator, setShowComparator] = useState(false)
  const toastTimer = useRef(null)
  const cycleRef = useRef(0)

  const showToast = (m) => {
    setToast(m)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }

  /* Features backend action handler */
  const handleFeatureAction = (action) => {
    if (action === 'open_4d_map') {
      go('4d-ocean')
      showToast('🛰 Navigated to 4D Live Float Map')
    } else if (action === 'open_timeline') {
      go('4d-ocean')
      showToast('⏱ 4D Timeline Activated: 2020–2025 Argo Epochs')
    } else if (action === 'open_anomalies') {
      go('4d-ocean')
      showToast('🚨 Marine Heatwave & Anomaly Detection Layer Active in 4D')
    } else if (action === 'open_comparator') {
      setShowComparator(true)
    } else if (action === 'open_story') {
      go('story')
      showToast('📖 Navigating to Guided Ocean Story')
    } else if (action === 'export_json') {
      exportArgoJson()
      showToast('📥 argo_ocean_dataset_2020_2025.json exported successfully!')
    } else if (action === 'export_csv') {
      exportArgoCsv()
      showToast('📊 argo_ocean_ctd_profiles_2020_2025.csv exported successfully!')
    }
  }

  /* global listeners */
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      live.p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
      document.documentElement.style.setProperty('--p', live.p.toFixed(4))
    }
    const onMove = (e) => {
      live.mx = e.clientX / window.innerWidth
      live.my = 1 - e.clientY / window.innerHeight
      live.px = e.clientX
      live.py = e.clientY
      live.mv = Math.min(1, live.mv + Math.hypot(e.movementX || 0, e.movementY || 0) / 40)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  /* active zone */
  useEffect(() => {
    const els = document.querySelectorAll('.zone-card')
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setZi(Number(e.target.dataset.i))),
      { rootMargin: '-45% 0px -45% 0px' }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [ready])

  /* lock scroll while loading / lightbox open */
  useEffect(() => {
    document.body.style.overflow = !ready || lb !== null ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [ready, lb])

  /* keyboard for lightbox */
  useEffect(() => {
    const n = CONFIG.photos.length
    const onKey = (e) => {
      if (e.key === 'Escape') setLb(null)
      if (e.key === 'ArrowRight') setLb((v) => (v === null ? null : (v + 1) % n))
      if (e.key === 'ArrowLeft') setLb((v) => (v === null ? null : (v + n - 1) % n))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => cancelAnimationFrame(cycleRef.current), [])

  /* float cycle */
  const runCycle = () => {
    if (running) {
      cancelAnimationFrame(cycleRef.current)
      setRunning(false)
      setPhase('')
      return
    }
    setRunning(true)
    const start = performance.now()
    const dur = 9000
    const step = (now) => {
      const k = (now - start) / dur
      if (k >= 1) { setDepth(0); setRunning(false); setPhase(''); return }
      const v = k < 0.5 ? k * 2 : (1 - k) * 2
      setDepth(Math.round((2000 * v) / 10) * 10)
      setPhase(k < 0.5 ? 'Descending' : 'Ascending')
      cycleRef.current = requestAnimationFrame(step)
    }
    cycleRef.current = requestAnimationFrame(step)
  }

  const onChartMove = (e) => {
    if (running) return
    const r = e.currentTarget.getBoundingClientRect()
    const yy = ((e.clientY - r.top) / r.height) * 360
    setDepth(clamp(Math.round((((yy - CT) / (CB - CT)) * 2000) / 10) * 10, 0, 2000))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Please enter your name.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email.')
    setError('')
    setSent(true)
    showToast('🚢 Welcome aboard, ' + form.name.trim().split(' ')[0] + '!')
  }

  /* chart maths */
  const T = TABS[tab]
  const X = (v) => CL + ((v - T.min) / (T.max - T.min)) * (CR - CL)
  const Y = (d) => CT + (d / 2000) * (CB - CT)
  const pts = []
  for (let d = 0; d <= 2000; d += 20) pts.push([X(T.f(d)), Y(d)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${CL} ${Y(2000)} L${CL} ${Y(0)} Z`
  const cv = T.f(depth)
  const zone = ZONES[zi]

  return (
    <div className={`app ${ready ? 'ready' : ''}`}>
      {!ready && <Preloader onDone={() => setReady(true)} />}
      <OceanGL />
      <Life />
      <div className="vignette" />
      <div className="progress" />
      <Cursor />
      <DepthGauge />
      <Navbar />

      <main>
        {/* ---------------- HERO ---------------- */}
        <section className="hero" id="home">
          <div className="hero-inner">
            <p className="kicker"><i />Hackathon Project · 2026</p>
            <h1 className="mega" aria-label="Argo Explorer">
              <span className="line">
                {'ARGO'.split('').map((c, i) => <span className="ch" style={{ '--i': i }} key={i}>{c}</span>)}
              </span>
              <span className="line out">
                {'EXPLORER'.split('').map((c, i) => <span className="ch" style={{ '--i': i + 4 }} key={i}>{c}</span>)}
              </span>
            </h1>
            <p className="hero-sub">
              Dive into the ocean's hidden data. Explore temperature, salinity and pressure from the surface to
              2,000 metres, as a story instead of a spreadsheet.
            </p>
            <div className="hero-cta">
              <Btn className="primary" onClick={() => go('4d-ocean')}>Explore 4D Ocean (X, Y, Z, T) ↗</Btn>
              <Btn className="ghost" onClick={() => go('descent')}>Start the dive ↓</Btn>
              <Btn className="ghost" onClick={() => go('telemetry')}>Float telemetry</Btn>
            </div>
          </div>
          <div className="hero-float"><ArgoFloat /></div>
          <div className="scroll-cue"><span />Scroll to descend</div>
        </section>

        {/* ---------------- MARQUEE ---------------- */}
        <div className="marquee" aria-hidden="true">
          <div className="track">
            {[...CONFIG.marquee, ...CONFIG.marquee, ...CONFIG.marquee, ...CONFIG.marquee].map((w, i) => (
              <span key={i}>{w}<em>✦</em></span>
            ))}
          </div>
        </div>

        {/* ---------------- STORY ---------------- */}
        <section className="section story" id="story">
          <Reveal><p className="eyebrow">The story</p></Reveal>
          <ScrollWords text={CONFIG.story} />
          <div className="stats">
            {CONFIG.stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 120}>
                <div className="stat glass">
                  <h3><Counter end={s.end} suffix={s.suffix} /></h3>
                  <p>{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- DESCENT ---------------- */}
        <section className="section descent" id="descent">
          <Reveal>
            <p className="eyebrow">The descent</p>
            <h2 className="h2">Four worlds. <span className="grad">One dive.</span></h2>
          </Reveal>
          <div className="descent-grid">
            <aside className="depth-panel">
              <div className="dp glass" key={zi}>
                <small>You are at</small>
                <div className="big-depth">{zone.min.toLocaleString()}<em>m</em></div>
                <h3>{zone.name}</h3>
                <div className="dp-facts">
                  <div><small>Temperature</small><b>{zone.temp}</b></div>
                  <div><small>Light</small><b>{zone.light}</b></div>
                  <div><small>Pressure at top</small><b>≈ {Math.round(1 + zone.min / 10)} atm</b></div>
                </div>
                <div className="dots">
                  {ZONES.map((z, i) => (
                    <button
                      key={z.id}
                      className={i === zi ? 'on' : ''}
                      aria-label={z.name}
                      onClick={() => document.querySelectorAll('.zone-card')[i].scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    />
                  ))}
                </div>
              </div>
            </aside>
            <div className="zone-list">
              {ZONES.map((z, i) => (
                <div className="zone-card glass" data-i={i} key={z.id}>
                  <div className="zone-art"><ZoneArt id={z.id} /></div>
                  <div className="zone-text">
                    <span className="num">0{i + 1}</span>
                    <h3>{z.name}</h3>
                    <p>{z.text}</p>
                    <div className="pills">
                      <span>{z.min.toLocaleString()}–{z.max.toLocaleString()} m</span>
                      <span>{z.temp}</span>
                      <span>{z.light}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- TELEMETRY ---------------- */}
        <section className="section" id="telemetry">
          <Reveal>
            <p className="eyebrow">Float telemetry</p>
            <h2 className="h2">Ride along with <span className="grad">an Argo float</span></h2>
            <p className="lead">Drag over the chart to read any depth, or send the float on a full descent and return.</p>
          </Reveal>
          <Reveal dir="zoom">
            <div className="telemetry glass">
              <div className="tm-top">
                <div className="tm-tabs">
                  {Object.entries(TABS).map(([k, v]) => (
                    <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{v.label}</button>
                  ))}
                </div>
                <Btn className="primary small" onClick={runCycle}>{running ? '⏸ Stop' : '▶ Run float cycle'}</Btn>
              </div>

              <div className="tm-body">
                <svg
                  className="chart"
                  viewBox="0 0 540 360"
                  onPointerMove={onChartMove}
                  onPointerDown={onChartMove}
                >
                  <defs>
                    <linearGradient id="areaG" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor={T.color} stopOpacity="0.05" />
                      <stop offset="1" stopColor={T.color} stopOpacity="0.35" />
                    </linearGradient>
                  </defs>
                  {[0, 500, 1000, 1500, 2000].map((d) => (
                    <g key={d}>
                      <line x1={CL} x2={CR} y1={Y(d)} y2={Y(d)} className="grid-l" />
                      <text x={CL - 8} y={Y(d) + 4} textAnchor="end" className="axis">{d} m</text>
                    </g>
                  ))}
                  {[0, 1, 2, 3, 4].map((i) => {
                    const v = T.min + ((T.max - T.min) * i) / 4
                    return (
                      <g key={i}>
                        <line y1={CT} y2={CB} x1={X(v)} x2={X(v)} className="grid-l faint" />
                        <text x={X(v)} y={CB + 22} textAnchor="middle" className="axis">
                          {T.max > 50 ? Math.round(v) : v.toFixed(1)}
                        </text>
                      </g>
                    )
                  })}
                  <path key={'a' + tab} d={area} fill="url(#areaG)" className="area" />
                  <path key={'l' + tab} d={line} className="curve" pathLength="1" stroke={T.color} />
                  <line x1={CL} x2={CR} y1={Y(depth)} y2={Y(depth)} className="cross" />
                  <circle cx={X(cv)} cy={Y(depth)} r="7" fill={T.color} className="marker" />
                  <circle cx={X(cv)} cy={Y(depth)} r="14" fill={T.color} opacity=".25" className="marker-halo" />
                </svg>

                <div className="tm-side">
                  <div className="tm-depth">
                    <small>{phase || 'Depth'}</small>
                    <b>{depth.toLocaleString()} m</b>
                  </div>
                  {Object.entries(TABS).map(([k, v]) => (
                    <div key={k} className={`tm-read ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)} data-hover>
                      <small>{v.label}</small>
                      <b style={{ color: v.color }}>{v.fmt(v.f(depth))} <em>{v.unit}</em></b>
                    </div>
                  ))}
                  <p className="note">Illustrative profile. Connect real Argo float data here.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ---------------- 4D OCEAN & FLOATCHAT AI ---------------- */}
        <section className="section" id="4d-ocean">
          <Reveal>
            <p className="eyebrow">4D Ocean & FloatChat AI</p>
            <h2 className="h2">Interactive Ocean in <span className="grad">4 Dimensions</span></h2>
            <p className="lead">
              Spatiotemporal ARGO float data exploration: <b>Longitude (X)</b>, <b>Latitude (Y)</b>, <b>Depth (Z)</b>, and <b>Time (T)</b>.
              Ask FloatChat AI to synthesize scientific queries and analyze anomalies.
            </p>
          </Reveal>
          <Reveal dir="zoom">
            <Ocean4DModule />
          </Reveal>
        </section>

        {/* ---------------- FEATURES ---------------- */}
        <section className="section" id="features">
          <Reveal>
            <p className="eyebrow">Features</p>
            <h2 className="h2">Built for <span className="grad">discovery</span></h2>
          </Reveal>
          <div className="feat-grid">
            {CONFIG.features.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <Tilt className="feat glass">
                  <div className="feat-icon"><Icon name={f.icon} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  <div className="feat-actions">
                    {f.buttons && f.buttons.map((b, bIdx) => (
                      b.url ? (
                        <a
                          key={bIdx}
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`feat-btn ${b.primary ? 'primary' : ''}`}
                        >
                          {b.label}
                        </a>
                      ) : (
                        <button
                          key={bIdx}
                          type="button"
                          className={`feat-btn ${b.primary ? 'primary' : ''}`}
                          onClick={() => handleFeatureAction(b.action)}
                        >
                          {b.label}
                        </button>
                      )
                    ))}
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- GALLERY ---------------- */}
        <section className="section" id="gallery">
          <Reveal>
            <p className="eyebrow">Gallery</p>
            <h2 className="h2">Glimpses from <span className="grad">below</span></h2>
            <p className="lead">Click any image to open it full screen.</p>
          </Reveal>
          <div className="gallery">
            {CONFIG.photos.map((p, i) => (
              <Reveal key={p.src} delay={i * 80} className={`gi gi${i}`}>
                <button className="ph" onClick={() => setLb(i)}>
                  <Photo p={p} />
                  <span className="cap">{p.cap}</span>
                </button>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- ROADMAP ---------------- */}
        <section className="section" id="roadmap">
          <Reveal>
            <p className="eyebrow">Journey</p>
            <h2 className="h2">From idea to <span className="grad">launch</span></h2>
          </Reveal>
          <Reveal>
            <div className="road">
              <div className="road-line" />
              {CONFIG.roadmap.map((r, i) => (
                <div className="road-step" key={r.t} style={{ '--d': `${i * 220}ms` }}>
                  <div className="road-dot">{i + 1}</div>
                  <h4>{r.t}</h4>
                  <p>{r.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ---------------- TEAM ---------------- */}
        <section className="section" id="team">
          <Reveal>
            <p className="eyebrow">The crew</p>
            <h2 className="h2">Meet the <span className="grad">expedition team</span></h2>
          </Reveal>
          <div className="team-grid">
            {CONFIG.team.map((m, i) => (
              <Reveal key={m.name} delay={i * 100}>
                <Tilt className="member glass">
                  <div className="avatar">{m.avatar}</div>
                  <h3>{m.name}</h3>
                  <p>{m.role}</p>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section className="section narrow" id="faq">
          <Reveal>
            <p className="eyebrow">Questions</p>
            <h2 className="h2">Good to <span className="grad">know</span></h2>
          </Reveal>
          <div className="faq">
            {CONFIG.faq.map((f, i) => (
              <div key={f.q} className={`faq-item glass ${faq === i ? 'open' : ''}`}>
                <button className="faq-q" onClick={() => setFaq(faq === i ? -1 : i)}>
                  <span>{f.q}</span><i>+</i>
                </button>
                <div className="faq-a"><div><p>{f.a}</p></div></div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- CONTACT ---------------- */}
        <section className="section" id="contact">
          <Reveal dir="zoom">
            <div className="cta glass">
              <h2 className="h2">Ready to dive <span className="grad">deeper?</span></h2>
              <p className="lead">Join the expedition and be first to explore the ocean with us.</p>
              {sent ? (
                <div className="success">
                  <div className="big">🚢</div>
                  <h3>You're on board, {form.name.trim().split(' ')[0]}!</h3>
                  <p>We'll write to {form.email}.</p>
                  <Btn className="ghost" onClick={() => { setSent(false); setForm({ name: '', email: '' }) }}>Add another person</Btn>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <input type="text" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input type="email" placeholder="Your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  {error && <p className="error">⚠ {error}</p>}
                  <Btn className="primary" type="submit">Join the expedition</Btn>
                </form>
              )}
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="footer">
        <p><span className="brand-dot" /> Argo Explorer · © 2026 · Built with React + WebGL</p>
        <Btn className="ghost small" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑ Back to surface</Btn>
      </footer>

      {showComparator && (
        <RegionComparatorModal
          onClose={() => setShowComparator(false)}
          onSelectRegionFor4D={(region) => {
            go('4d-ocean')
            showToast(`🌊 Focused 4D view on ${region.toUpperCase()}`)
          }}
        />
      )}

      {lb !== null && (
        <div className="backdrop" onClick={() => setLb(null)}>
          <div className="lightbox" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setLb(null)} aria-label="Close">✕</button>
            <button className="lb-nav prev" onClick={() => setLb((lb + CONFIG.photos.length - 1) % CONFIG.photos.length)} aria-label="Previous">‹</button>
            <Photo p={CONFIG.photos[lb]} className="lb-img" />
            <button className="lb-nav next" onClick={() => setLb((lb + 1) % CONFIG.photos.length)} aria-label="Next">›</button>
            <p className="lb-cap">{CONFIG.photos[lb].cap} · {lb + 1}/{CONFIG.photos.length}</p>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}

export default App