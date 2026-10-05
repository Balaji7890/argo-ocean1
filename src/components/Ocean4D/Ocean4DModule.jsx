import { useState, useMemo, useCallback } from 'react'
import Ocean4DCanvas from './Ocean4DCanvas'
import Ocean4DControls from './Ocean4DControls'
import FloatChatAI from './FloatChatAI'
import DataInspectorModal from './DataInspectorModal'
import { filterArgoData, PARAMETERS } from '../../data/argoData'
import './Ocean4D.css'

export default function Ocean4DModule() {
  // 4D State
  const [activeBasin, setActiveBasin] = useState('all')
  const [currentYear, setCurrentYear] = useState(2023)
  const [activeDepth, setActiveDepth] = useState(100) // Default 100m layer
  const [depthRange, setDepthRange] = useState([0, 2000])
  const [parameter, setParameter] = useState('temp')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1)
  const [highlightAnomalies, setHighlightAnomalies] = useState(true)
  const [cameraPreset, setCameraPreset] = useState('perspective')

  // Selected observation for detailed inspection modal
  const [selectedObservation, setSelectedObservation] = useState(null)

  // AI Drawer state (open / collapsed)
  const [showAiDrawer, setShowAiDrawer] = useState(true)

  // Filter 4D points and trajectories based on current state
  const filteredData = useMemo(() => {
    return filterArgoData({
      basin: activeBasin,
      year: currentYear,
      depth: activeDepth,
      depthRange,
      parameter,
      onlyAnomalies: false,
    })
  }, [activeBasin, currentYear, activeDepth, depthRange, parameter])

  const anomaliesCount = useMemo(() => {
    return filteredData.points.filter((p) => p.isAnomaly).length
  }, [filteredData.points])

  // AI Query Handler: Apply structured parameters from natural language
  const handleApplyAiQuery = useCallback((parsed) => {
    const { structured } = parsed
    if (structured.location) setActiveBasin(structured.location)
    if (structured.yearRange) {
      // Pick latest year of range for playback start
      setCurrentYear(structured.yearRange[1])
    }
    if (structured.targetDepth !== null && structured.targetDepth !== undefined) {
      setActiveDepth(structured.targetDepth)
    } else if (structured.depthRange) {
      setDepthRange(structured.depthRange)
      // If it's a specific slice, set activeDepth to midpoint
      if (structured.depthRange[1] - structured.depthRange[0] <= 300) {
        setActiveDepth(structured.depthRange[0])
      } else {
        setActiveDepth(null) // volume mode
      }
    }
    if (structured.parameter) {
      setParameter(structured.parameter)
    }
    // Camera zoom to basin
    if (structured.location === 'indian') setCameraPreset('indian')
    else if (structured.location === 'pacific') setCameraPreset('pacific')
    else if (structured.location === 'atlantic') setCameraPreset('atlantic')
    else setCameraPreset('perspective')
  }, [])

  return (
    <div className="ocean4d-module-root">
      {/* 1. Scientific Trust & Metadata Header */}
      <div className="ocean4d-scientific-header glass">
        <div className="trust-head-left">
          <div className="ocean4d-badge-live">
            <span className="live-pulsar" />
            <b>4D OCEAN VISUALIZATION</b>
          </div>
          <div className="ocean4d-demo-badge" title="Synthetically calibrated to WMO Argo GDAC standards">
            🧪 Demo Data (Argo GDAC Calibrated)
          </div>
        </div>

        <div className="trust-metadata-strip">
          <div className="trust-meta-item">
            <small>Data Source</small>
            <b>Argo GDAC / WMO</b>
          </div>
          <div className="trust-meta-item">
            <small>Parameter</small>
            <b className="meta-cyan">{PARAMETERS[parameter].label}</b>
          </div>
          <div className="trust-meta-item">
            <small>Temporal Window (T)</small>
            <b>{currentYear} Epoch</b>
          </div>
          <div className="trust-meta-item">
            <small>Depth Layer (Z)</small>
            <b>{activeDepth !== null ? `${activeDepth}m Slice` : '0–2000m Volume'}</b>
          </div>
          <div className="trust-meta-item">
            <small>Observations</small>
            <b>{filteredData.points.length} CTD points</b>
          </div>
          <div className="trust-meta-item">
            <small>Quality Assurance</small>
            <b className="meta-good">WMO QC Level 1</b>
          </div>
        </div>

        <div className="trust-head-right">
          <button
            className={`ai-toggle-btn ${showAiDrawer ? 'active' : ''}`}
            onClick={() => setShowAiDrawer(!showAiDrawer)}
          >
            ✦ FloatChat AI Copilot {showAiDrawer ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {/* 2. Main 4D Layout (Canvas + Floating Controls + AI Drawer) */}
      <div className="ocean4d-main-stage">
        {/* 3D WebGL Canvas */}
        <div className="ocean4d-canvas-wrapper">
          <Ocean4DCanvas
            points={filteredData.points}
            floats={filteredData.floats}
            parameter={parameter}
            activeDepth={activeDepth}
            depthRange={depthRange}
            currentYear={currentYear}
            highlightAnomalies={highlightAnomalies}
            cameraPreset={cameraPreset}
            selectedObservation={selectedObservation}
            onSelectObservation={(pt) => setSelectedObservation(pt)}
          />

          {/* Quick Region Selector overlay on top of 3D Canvas */}
          <div className="ocean4d-region-pills">
            <span className="region-pills-label">🌊 Ocean Basin:</span>
            {[
              ['all', 'Global'],
              ['indian', 'Indian Ocean'],
              ['pacific', 'Pacific'],
              ['atlantic', 'Atlantic'],
              ['southern', 'Southern Ocean'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={`region-pill-btn ${activeBasin === id ? 'active' : ''}`}
                onClick={() => {
                  setActiveBasin(id)
                  if (id === 'indian') setCameraPreset('indian')
                  else if (id === 'pacific') setCameraPreset('pacific')
                  else if (id === 'atlantic') setCameraPreset('atlantic')
                  else setCameraPreset('perspective')
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* FloatChat AI Sidebar / Drawer */}
        {showAiDrawer && (
          <aside className="ocean4d-ai-drawer glass">
            <FloatChatAI onApplyQuery={handleApplyAiQuery} />
          </aside>
        )}
      </div>

      {/* 3. Integrated Controls (Depth slider, Timeline player, Metric tabs, Legend) */}
      <div className="ocean4d-controls-wrapper glass">
        <Ocean4DControls
          parameter={parameter}
          onChangeParameter={setParameter}
          activeDepth={activeDepth}
          onChangeDepth={setActiveDepth}
          currentYear={currentYear}
          onChangeYear={setCurrentYear}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playSpeed={playSpeed}
          onChangeSpeed={setPlaySpeed}
          highlightAnomalies={highlightAnomalies}
          onToggleAnomalies={() => setHighlightAnomalies(!highlightAnomalies)}
          cameraPreset={cameraPreset}
          onChangeCamera={setCameraPreset}
          anomaliesCount={anomaliesCount}
        />
      </div>

      {/* 4. Click Observation Inspector Modal */}
      {selectedObservation && (
        <DataInspectorModal
          observation={selectedObservation}
          onClose={() => setSelectedObservation(null)}
        />
      )}
    </div>
  )
}
