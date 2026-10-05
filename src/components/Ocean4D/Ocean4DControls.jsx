import { useEffect, useRef } from 'react'
import { DEPTH_LEVELS, YEARS, PARAMETERS } from '../../data/argoData'

export default function Ocean4DControls({
  parameter = 'temp',
  onChangeParameter = () => {},
  activeDepth = null,
  onChangeDepth = () => {},
  currentYear = 2023,
  onChangeYear = () => {},
  isPlaying = false,
  onTogglePlay = () => {},
  playSpeed = 1,
  onChangeSpeed = () => {},
  highlightAnomalies = true,
  onToggleAnomalies = () => {},
  cameraPreset = 'perspective',
  onChangeCamera = () => {},
  anomaliesCount = 0,
}) {
  const currentParam = PARAMETERS[parameter] || PARAMETERS.temp

  // Handle play loop
  const timerRef = useRef(null)
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(1800 / playSpeed)
      timerRef.current = setInterval(() => {
        onChangeYear((prevYear) => {
          const nextYear = prevYear >= 2025 ? 2020 : prevYear + 1
          return nextYear
        })
      }, intervalMs)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isPlaying, playSpeed, onChangeYear])

  const handlePrevYear = () => {
    onChangeYear(Math.max(2020, currentYear - 1))
  }

  const handleNextYear = () => {
    onChangeYear(Math.min(2025, currentYear + 1))
  }

  return (
    <div className="ocean4d-controls-container">
      {/* Top Bar: Parameter Selectors + Anomaly Toggle + Camera Presets */}
      <div className="controls-row-top">
        {/* Parameter Tabs */}
        <div className="param-tabs-group">
          <span className="control-label">Variable:</span>
          {Object.entries(PARAMETERS).map(([k, v]) => (
            <button
              key={k}
              className={`param-tab-btn ${parameter === k ? 'active' : ''}`}
              onClick={() => onChangeParameter(k)}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Anomaly Highlight Toggle */}
        <div className="anomaly-toggle-wrap">
          <button
            className={`anomaly-btn ${highlightAnomalies ? 'active' : ''}`}
            onClick={onToggleAnomalies}
          >
            <span className="anomaly-dot" />
            Highlight Anomalies
            {anomaliesCount > 0 && <span className="anomaly-counter-badge">{anomaliesCount}</span>}
          </button>
        </div>

        {/* Camera Views */}
        <div className="camera-presets-group">
          <span className="control-label">View:</span>
          <button
            className={`cam-btn ${cameraPreset === 'perspective' ? 'active' : ''}`}
            onClick={() => onChangeCamera('perspective')}
            title="3D Angled Perspective"
          >
            3D Orbit
          </button>
          <button
            className={`cam-btn ${cameraPreset === 'top' ? 'active' : ''}`}
            onClick={() => onChangeCamera('top')}
            title="Top-down Geographic Map"
          >
            Top Map
          </button>
          <button
            className={`cam-btn ${cameraPreset === 'side' ? 'active' : ''}`}
            onClick={() => onChangeCamera('side')}
            title="Side Depth Profile Transect"
          >
            Depth Slice
          </button>
          <button
            className="cam-btn"
            onClick={() => onChangeCamera('perspective')}
            title="Reset to Default 3D View"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Middle Bar: Depth Slicing (0m → 100m → 200m → 500m → 1000m → 2000m) */}
      <div className="controls-row-depth">
        <div className="depth-header">
          <span className="control-label">
            Depth Slicing (Z): <b>{activeDepth !== null ? `${activeDepth}m Layer` : 'All Depths (0–2000m)'}</b>
          </span>
          <button
            className={`depth-all-btn ${activeDepth === null ? 'active' : ''}`}
            onClick={() => onChangeDepth(null)}
          >
            All Depths (Volume)
          </button>
        </div>

        <div className="depth-buttons-track">
          {DEPTH_LEVELS.map((d) => (
            <button
              key={d}
              className={`depth-step-btn ${activeDepth === d ? 'active' : ''}`}
              onClick={() => onChangeDepth(d)}
            >
              <span className="depth-val">{d}m</span>
              <span className="depth-tick" />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Bar: Time Control (2020 → 2021 → 2022 → 2023 → 2024 → 2025) */}
      <div className="controls-row-time">
        <div className="time-playback-controls">
          <button
            className="time-nav-btn"
            onClick={handlePrevYear}
            disabled={currentYear <= 2020}
            aria-label="Previous Year"
          >
            ⏮
          </button>

          <button
            className={`time-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play Timeline'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play Time (4D)'}
          </button>

          <button
            className="time-nav-btn"
            onClick={handleNextYear}
            disabled={currentYear >= 2025}
            aria-label="Next Year"
          >
            ⏭
          </button>

          {/* Speed selector */}
          <div className="speed-pills">
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                className={`speed-pill ${playSpeed === spd ? 'active' : ''}`}
                onClick={() => onChangeSpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Slider Track */}
        <div className="timeline-track-wrap">
          <div className="timeline-years">
            {YEARS.map((yr) => (
              <button
                key={yr}
                className={`timeline-year-btn ${currentYear === yr ? 'active' : ''}`}
                onClick={() => onChangeYear(yr)}
              >
                <span className="year-dot" />
                <span className="year-label">{yr}</span>
              </button>
            ))}
          </div>

          <input
            type="range"
            min="2020"
            max="2025"
            step="1"
            value={currentYear}
            onChange={(e) => onChangeYear(parseInt(e.target.value, 10))}
            className="timeline-range-slider"
          />
        </div>

        {/* Current Year Badge */}
        <div className="time-year-callout">
          <small>Current Epoch</small>
          <b>{currentYear}</b>
        </div>
      </div>

      {/* Scientific Color Legend Bar */}
      <div className="controls-row-legend">
        <div className="legend-info">
          <span className="legend-param-name">{currentParam.label}</span>
          <span className="legend-unit">({currentParam.unit})</span>
        </div>

        <div className="legend-gradient-bar-wrap">
          <div
            className="legend-gradient-bar"
            style={{
              background: `linear-gradient(90deg, ${currentParam.palette.map((p) => p.color).join(', ')})`,
            }}
          />
          <div className="legend-stops">
            <span>{currentParam.min} {currentParam.unit}</span>
            <span>{((currentParam.min + currentParam.max) / 2).toFixed(1)} {currentParam.unit}</span>
            <span>{currentParam.max} {currentParam.unit}</span>
          </div>
        </div>

        <div className="legend-quality-info">
          <span className="trust-indicator">● GDAC Argo QC Passed</span>
        </div>
      </div>
    </div>
  )
}
