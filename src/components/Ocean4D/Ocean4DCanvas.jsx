import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { getColorForValue, PARAMETERS } from '../../data/argoData'

// World coordinate bounds in Three.js units
const BOX_WIDTH = 120   // Longitude: -180 to 180 maps to -60 to 60
const BOX_DEPTH = 70    // Latitude: -70 to 70 maps to -35 to 35
const BOX_HEIGHT = 22   // Depth: 0 to 2000m maps to 0 to -22

// Depth non-linear mapping: expands upper 500m for scientific visibility
export function depthToY(depth) {
  const norm = Math.max(0, Math.min(2000, depth)) / 2000
  // Non-linear exponent gives higher resolution to epipelagic and mesopelagic zones
  return -Math.pow(norm, 0.72) * BOX_HEIGHT
}

// Inverted mapping: Y coordinate to approximate depth in meters
export function yToDepth(y) {
  const norm = Math.max(0, Math.min(1, -y / BOX_HEIGHT))
  return Math.round(Math.pow(norm, 1 / 0.72) * 2000)
}

// Convert geographic coordinates to 3D Three.js coordinates
export function geoTo3D(lon, lat, depth) {
  // Normalize lon to [-180, 180]
  let nLon = lon
  while (nLon > 180) nLon -= 360
  while (nLon < -180) nLon += 360

  const x = (nLon / 180) * (BOX_WIDTH / 2)
  const z = -(lat / 70) * (BOX_DEPTH / 2)
  const y = depthToY(depth)
  return new THREE.Vector3(x, y, z)
}

// Convert 3D world position to geographic coordinates
export function pos3DToGeo(x, y, z) {
  const lon = Math.round(((x / (BOX_WIDTH / 2)) * 180) * 10) / 10
  const lat = Math.round(((-z / (BOX_DEPTH / 2)) * 70) * 10) / 10
  const depth = yToDepth(y)
  return { lon, lat, depth }
}

export default function Ocean4DCanvas({
  points = [],
  floats = [],
  parameter = 'temp',
  activeDepth = null,
  depthRange = [0, 2000],
  currentYear = 2023,
  highlightAnomalies = true,
  cameraPreset = 'perspective',
  selectedObservation = null,
  onSelectObservation = () => {},
  onHoverObservation = () => {},
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const controlsRef = useRef(null)
  const pointsMeshRef = useRef(null)
  const trajectoryGroupRef = useRef(null)
  const depthPlaneRef = useRef(null)
  const anomalyGroupRef = useRef(null)
  const surfaceMeshRef = useRef(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2(-999, -999))
  const hoverPointRef = useRef(null)
  const pointsDataRef = useRef([])

  const [cursorCoords, setCursorCoords] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  // 1. Initialize Scene, Camera, Renderer, Controls
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020a17)
    scene.fog = new THREE.FogExp2(0x020a17, 0.011)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      1000
    )
    camera.position.set(50, 42, 75)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    rendererRef.current = renderer

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxDistance = 240
    controls.minDistance = 15
    controls.target.set(0, -8, 0)
    controls.maxPolarAngle = Math.PI / 2 + 0.05 // Don't flip under ground too far
    controlsRef.current = controls

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0x7dd3fc, 0.9)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.4)
    sunLight.position.set(30, 80, 40)
    scene.add(sunLight)

    const deepGlow = new THREE.PointLight(0x0284c7, 2.5, 120)
    deepGlow.position.set(0, -14, 0)
    scene.add(deepGlow)

    // Build Static Ocean Environment (Cage, Seabed, Surface, Axes Ticks)
    buildOceanEnvironment(scene)

    // Dynamic Groups
    const trajGroup = new THREE.Group()
    scene.add(trajGroup)
    trajectoryGroupRef.current = trajGroup

    const anomGroup = new THREE.Group()
    scene.add(anomGroup)
    anomalyGroupRef.current = anomGroup

    // Animation Loop
    let animationFrameId
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      controls.update()

      // Subtle water surface motion
      if (surfaceMeshRef.current) {
        const pos = surfaceMeshRef.current.geometry.attributes.position
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i)
          const v = pos.getY(i)
          const wave = Math.sin(u * 0.15 + elapsedTime * 1.8) * 0.2 +
                       Math.cos(v * 0.2 + elapsedTime * 1.4) * 0.15
          pos.setZ(i, wave)
        }
        pos.needsUpdate = true
      }

      // Anomaly rings pulsating
      if (anomalyGroupRef.current) {
        anomalyGroupRef.current.children.forEach((ring, idx) => {
          const scale = 1 + 0.35 * Math.sin(elapsedTime * 4 + idx)
          ring.scale.set(scale, scale, scale)
        })
      }

      // Trajectory dash offset pulse
      if (trajectoryGroupRef.current) {
        trajectoryGroupRef.current.children.forEach((child) => {
          if (child.material && child.material.dashOffset !== undefined) {
            child.material.dashOffset -= 0.02
          }
        })
      }

      renderer.render(scene, camera)
    }

    animate()

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
    }
  }, [])

  // 2. Build 3D Ocean Coordinate Framework, Bathymetry & Surface
  const buildOceanEnvironment = (scene) => {
    // A. Transparent Water Surface with Wireframe Grid
    const surfGeo = new THREE.PlaneGeometry(BOX_WIDTH, BOX_DEPTH, 28, 20)
    const surfMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.7,
      side: THREE.DoubleSide,
      wireframe: false,
    })
    const surfaceMesh = new THREE.Mesh(surfGeo, surfMat)
    surfaceMesh.rotation.x = -Math.PI / 2
    surfaceMesh.position.y = 0
    scene.add(surfaceMesh)
    surfaceMeshRef.current = surfaceMesh

    // Surface wireframe line overlay
    const surfWireGeo = new THREE.WireframeGeometry(surfGeo)
    const surfWireMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
    })
    const surfWire = new THREE.LineSegments(surfWireGeo, surfWireMat)
    surfWire.rotation.x = -Math.PI / 2
    scene.add(surfWire)

    // B. Bathymetric Seafloor (Contoured mesh with ocean trenches & ridges)
    const bedGeo = new THREE.PlaneGeometry(BOX_WIDTH, BOX_DEPTH, 36, 24)
    const bedPos = bedGeo.attributes.position
    for (let i = 0; i < bedPos.count; i++) {
      const x = bedPos.getX(i)
      const y = bedPos.getY(i)
      // Topographic features: Mid-ocean ridge & abyssal trenches
      const ridge = Math.exp(-Math.pow((x - 10) / 12, 2)) * 3.5
      const trench = -Math.exp(-Math.pow((x + 28) / 8, 2)) * 4.0
      const bumps = Math.sin(x * 0.15) * Math.cos(y * 0.2) * 1.2
      bedPos.setZ(i, ridge + trench + bumps)
    }
    bedGeo.computeVertexNormals()
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x051b34,
      roughness: 0.85,
      metalness: 0.2,
      side: THREE.DoubleSide,
      flatShading: true,
    })
    const seabedMesh = new THREE.Mesh(bedGeo, bedMat)
    seabedMesh.rotation.x = -Math.PI / 2
    seabedMesh.position.y = -BOX_HEIGHT
    scene.add(seabedMesh)

    // Seabed contour lines
    const bedWireGeo = new THREE.WireframeGeometry(bedGeo)
    const bedWireMat = new THREE.LineBasicMaterial({
      color: 0x1e3a8a,
      transparent: true,
      opacity: 0.3,
    })
    const bedWire = new THREE.LineSegments(bedWireGeo, bedWireMat)
    bedWire.rotation.x = -Math.PI / 2
    bedWire.position.y = -BOX_HEIGHT
    scene.add(bedWire)

    // C. 3D Bounding Cage / Volumetric Frame
    const boxGeo = new THREE.BoxGeometry(BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH)
    const boxEdges = new THREE.EdgesGeometry(boxGeo)
    const boxMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
    })
    const boundingBox = new THREE.LineSegments(boxEdges, boxMat)
    boundingBox.position.set(0, -BOX_HEIGHT / 2, 0)
    scene.add(boundingBox)

    // D. Depth Level Grid Lines on Cage Sides (100m, 200m, 500m, 1000m, 2000m)
    const depthsToMark = [0, 100, 200, 500, 1000, 2000]
    depthsToMark.forEach((d) => {
      const y = depthToY(d)
      const rectGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-BOX_WIDTH / 2, y, -BOX_DEPTH / 2),
        new THREE.Vector3(BOX_WIDTH / 2, y, -BOX_DEPTH / 2),
        new THREE.Vector3(BOX_WIDTH / 2, y, BOX_DEPTH / 2),
        new THREE.Vector3(-BOX_WIDTH / 2, y, BOX_DEPTH / 2),
        new THREE.Vector3(-BOX_WIDTH / 2, y, -BOX_DEPTH / 2),
      ])
      const rectMat = new THREE.LineBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: d === 0 ? 0.45 : 0.18,
      })
      scene.add(new THREE.Line(rectGeo, rectMat))

      // Text Sprites for Depth Labels
      const labelSprite = createTextSprite(`${d}m`, '#7dd3fc', 11)
      labelSprite.position.set(-BOX_WIDTH / 2 - 4.5, y, -BOX_DEPTH / 2)
      scene.add(labelSprite)
    })

    // E. Longitude & Latitude Axis Labels
    const lonMarks = [-120, -60, 0, 60, 120]
    lonMarks.forEach((lon) => {
      const x = (lon / 180) * (BOX_WIDTH / 2)
      const label = lon === 0 ? '0°' : lon > 0 ? `${lon}°E` : `${Math.abs(lon)}°W`
      const sprite = createTextSprite(label, '#94a3b8', 10)
      sprite.position.set(x, 1.5, BOX_DEPTH / 2 + 3.5)
      scene.add(sprite)
    })

    const latMarks = [-60, -30, 0, 30, 60]
    latMarks.forEach((lat) => {
      const z = -(lat / 70) * (BOX_DEPTH / 2)
      const label = lat === 0 ? '0° (EQ)' : lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`
      const sprite = createTextSprite(label, '#94a3b8', 10)
      sprite.position.set(BOX_WIDTH / 2 + 5.5, 1.5, z)
      scene.add(sprite)
    })

    // F. Dynamic Active Depth Slicing Plane
    const planeGeo = new THREE.PlaneGeometry(BOX_WIDTH, BOX_DEPTH)
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      wireframe: false,
    })
    const depthPlane = new THREE.Mesh(planeGeo, planeMat)
    depthPlane.rotation.x = -Math.PI / 2
    depthPlane.position.y = depthToY(100)
    depthPlane.visible = false
    scene.add(depthPlane)
    depthPlaneRef.current = depthPlane
  }

  // Text Sprite Generator for 3D coordinates & depth marks
  const createTextSprite = (text, color = '#ffffff', fontSize = 12) => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 48
    const ctx = canvas.getContext('2d')
    ctx.font = `Bold ${fontSize * 2}px sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 24)

    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(6, 2.2, 1)
    return sprite
  }

  // 3. Update Depth Slice Plane when activeDepth changes
  useEffect(() => {
    if (!depthPlaneRef.current) return
    if (activeDepth !== null) {
      depthPlaneRef.current.visible = true
      depthPlaneRef.current.position.y = depthToY(activeDepth)
    } else {
      depthPlaneRef.current.visible = false
    }
  }, [activeDepth])

  // 4. Update 3D Observation Points (Colored by Parameter, Sized, Raycastable)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Remove existing points
    if (pointsMeshRef.current) {
      scene.remove(pointsMeshRef.current)
      if (pointsMeshRef.current.geometry) pointsMeshRef.current.geometry.dispose()
      if (pointsMeshRef.current.material) pointsMeshRef.current.material.dispose()
      pointsMeshRef.current = null
    }

    if (!points || points.length === 0) return

    // Store points for raycasting
    pointsDataRef.current = points

    const count = points.length
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    // Clear anomalies group
    if (anomalyGroupRef.current) {
      while (anomalyGroupRef.current.children.length > 0) {
        const obj = anomalyGroupRef.current.children[0]
        anomalyGroupRef.current.remove(obj)
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) obj.material.dispose()
      }
    }

    const ringGeo = new THREE.RingGeometry(0.8, 1.15, 24)

    points.forEach((p, i) => {
      const pos = geoTo3D(p.lon, p.lat, p.depth)
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z

      // Color from parameter
      const hex = getColorForValue(parameter, p.value)
      const color = new THREE.Color(hex)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      // Sizing: larger for surface / anomalies / active depth
      let s = 4.2
      if (activeDepth !== null && Math.abs(p.depth - activeDepth) < 60) s = 6.8
      if (p.isAnomaly && highlightAnomalies) s = 7.5
      sizes[i] = s

      // Anomaly glowing ring
      if (p.isAnomaly && highlightAnomalies && anomalyGroupRef.current) {
        const ringMat = new THREE.MeshBasicMaterial({
          color: p.tempAnomaly > 0 ? 0xef4444 : 0x06b6d4,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.copy(pos)
        anomalyGroupRef.current.add(ring)
      }
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Point Texture / Shader for smooth spherical beads
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.5, 'rgba(240,248,255,0.95)')
    grad.addColorStop(0.85, 'rgba(100,200,255,0.6)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(32, 32, 30, 0, Math.PI * 2)
    ctx.fill()
    const pointTexture = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      size: 4.8,
      vertexColors: true,
      map: pointTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const pointCloud = new THREE.Points(geometry, material)
    scene.add(pointCloud)
    pointsMeshRef.current = pointCloud
  }, [points, parameter, activeDepth, highlightAnomalies])

  // 5. Render Argo Float Trajectories (3D Spline Ribbons & Dive Profiles)
  useEffect(() => {
    const trajGroup = trajectoryGroupRef.current
    if (!trajGroup) return

    // Clear previous trajectories
    while (trajGroup.children.length > 0) {
      const obj = trajGroup.children[0]
      trajGroup.remove(obj)
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    }

    if (!floats || floats.length === 0) return

    floats.forEach((floatItem, fIdx) => {
      const traj = floatItem.trajectory
      if (!traj || traj.length < 2) return

      // Build 3D path with surface drift + cycle dives
      const curvePoints = []
      traj.forEach((pt) => {
        // Surface point
        const surfP = geoTo3D(pt.lon, pt.lat, 0)
        curvePoints.push(surfP)

        // Subsurface parking point (~1000m)
        const parkP = geoTo3D(pt.lon + 0.05, pt.lat + 0.05, 1000)
        curvePoints.push(parkP)

        // Profile base (2000m)
        const deepP = geoTo3D(pt.lon + 0.08, pt.lat + 0.08, 2000)
        curvePoints.push(deepP)
      })

      if (curvePoints.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(curvePoints)
        const tubeGeo = new THREE.TubeGeometry(curve, curvePoints.length * 6, 0.22, 6, false)
        const tubeMat = new THREE.MeshStandardMaterial({
          color: [0x38bdf8, 0x4ade80, 0xfbbf24, 0xa855f7, 0xf43f5e, 0x06b6d4][fIdx % 6],
          emissive: [0x0369a1, 0x15803d, 0xb45309, 0x6b21a8, 0xbe123c, 0x0e7490][fIdx % 6],
          emissiveIntensity: 0.65,
          transparent: true,
          opacity: 0.8,
          roughness: 0.3,
        })
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
        tubeMesh.userData = { floatId: floatItem.id, floatName: floatItem.name }
        trajGroup.add(tubeMesh)

        // Surface beacon marker
        const latestPt = traj[traj.length - 1]
        const beaconPos = geoTo3D(latestPt.lon, latestPt.lat, 0)
        const beaconGeo = new THREE.SphereGeometry(0.85, 16, 16)
        const beaconMat = new THREE.MeshStandardMaterial({
          color: 0x5ef2ff,
          emissive: 0x38bdf8,
          emissiveIntensity: 1.2,
        })
        const beacon = new THREE.Mesh(beaconGeo, beaconMat)
        beacon.position.copy(beaconPos)
        trajGroup.add(beacon)
      }
    })
  }, [floats])

  // 6. Camera Preset Views Transition
  useEffect(() => {
    const controls = controlsRef.current
    const camera = cameraRef.current
    if (!controls || !camera) return

    if (cameraPreset === 'top') {
      // 2D Geographic Map View
      camera.position.set(0, 110, 0)
      controls.target.set(0, 0, 0)
    } else if (cameraPreset === 'side') {
      // Depth Transect Profile View
      camera.position.set(0, -10, 105)
      controls.target.set(0, -10, 0)
    } else if (cameraPreset === 'indian') {
      // Zoom into Indian Ocean
      camera.position.set(30, 25, 45)
      controls.target.set(25, -6, 2)
    } else if (cameraPreset === 'pacific') {
      // Zoom into Pacific Ocean
      camera.position.set(-35, 25, 45)
      controls.target.set(-30, -4, 0)
    } else if (cameraPreset === 'atlantic') {
      // Zoom into Atlantic Ocean
      camera.position.set(-15, 28, 50)
      controls.target.set(-12, 10, -5)
    } else {
      // Default 3D Perspective
      camera.position.set(50, 42, 75)
      controls.target.set(0, -8, 0)
    }
  }, [cameraPreset])

  // 7. Mouse Interaction: Raycasting, Hover, and Click Picking
  const handlePointerMove = useCallback(
    (e) => {
      const container = containerRef.current
      const camera = cameraRef.current
      if (!container || !camera) return

      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      mouseRef.current.set(x, y)

      // Calculate approximate geographic coordinates from ground plane intersection
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -depthToY(activeDepth ?? 100))
      const ray = new THREE.Ray()
      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const target = new THREE.Vector3()
      if (raycasterRef.current.ray.intersectPlane(plane, target)) {
        const geo = pos3DToGeo(target.x, target.y, target.z)
        setCursorCoords(geo)
      }

      // Check point intersection
      if (pointsMeshRef.current) {
        raycasterRef.current.params.Points.threshold = 1.4
        const intersects = raycasterRef.current.intersectObject(pointsMeshRef.current)

        if (intersects.length > 0) {
          const idx = intersects[0].index
          const pt = pointsDataRef.current[idx]
          if (pt) {
            hoverPointRef.current = pt
            container.style.cursor = 'pointer'
            setTooltip({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              point: pt,
            })
            onHoverObservation(pt)
            return
          }
        }
      }

      hoverPointRef.current = null
      container.style.cursor = 'grab'
      setTooltip(null)
    },
    [activeDepth, onHoverObservation]
  )

  const handlePointerDown = useCallback(() => {
    if (hoverPointRef.current) {
      onSelectObservation(hoverPointRef.current)
    }
  }, [onSelectObservation])

  return (
    <div
      ref={containerRef}
      className="ocean4d-canvas-container"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '520px',
        overflow: 'hidden',
        borderRadius: '24px',
        background: 'radial-gradient(circle at 50% 30%, #031e3d, #020617 80%)',
        touchAction: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Coordinate & Navigation HUD (Docked at bottom of viewport to avoid overlapping top ocean basin buttons) */}
      <div className="ocean4d-hud-coords">
        <span className="hud-badge" title="Longitude coordinate">
          <b>Lon (X):</b> {cursorCoords ? `${cursorCoords.lon > 0 ? `${cursorCoords.lon}°E` : `${Math.abs(cursorCoords.lon)}°W`}` : '--'}
        </span>
        <span className="hud-badge" title="Latitude coordinate">
          <b>Lat (Y):</b> {cursorCoords ? `${cursorCoords.lat > 0 ? `${cursorCoords.lat}°N` : `${Math.abs(cursorCoords.lat)}°S`}` : '--'}
        </span>
        <span className="hud-badge" title="Depth / Altitude coordinate">
          <b>Depth / Alt (Z):</b> {activeDepth !== null ? `${activeDepth}m (Slice)` : cursorCoords ? `${cursorCoords.depth}m` : '--'}
        </span>
        <span className="hud-badge hud-badge-time" title="Time coordinate">
          <b>Time (T):</b> {currentYear}
        </span>
      </div>

      {/* 3D Navigation Controls Hint */}
      <div className="ocean4d-hud-nav-hint">
        <span>🖱 Drag: Orbit · Right-drag: Pan · Scroll: Zoom</span>
      </div>

      {/* Interactive Hover Tooltip */}
      {tooltip && tooltip.point && (
        <div
          className="ocean4d-tooltip"
          style={{
            left: `${tooltip.x + 14}px`,
            top: `${tooltip.y - 12}px`,
          }}
        >
          <div className="tooltip-header">
            <strong>WMO {tooltip.point.floatId}</strong>
            <span className="tooltip-depth">{tooltip.point.depth}m</span>
          </div>
          <div className="tooltip-sub">{tooltip.point.subRegion}</div>
          <div className="tooltip-metrics">
            <div>
              <small>Temp:</small> <b>{tooltip.point.temp}°C</b>
              {tooltip.point.tempAnomaly !== 0 && (
                <em className={tooltip.point.tempAnomaly > 0 ? 'pos' : 'neg'}>
                  ({tooltip.point.tempAnomaly > 0 ? '+' : ''}{tooltip.point.tempAnomaly}°C)
                </em>
              )}
            </div>
            <div>
              <small>Salinity:</small> <b>{tooltip.point.sal} PSU</b>
            </div>
          </div>
          {tooltip.point.isAnomaly && (
            <div className="tooltip-anomaly-tag">
              ⚠️ {tooltip.point.anomalyType || 'Anomaly Detected'}
            </div>
          )}
          <div className="tooltip-hint">Click to inspect CTD profile →</div>
        </div>
      )}
    </div>
  )
}
