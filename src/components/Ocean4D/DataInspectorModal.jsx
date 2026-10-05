import { ALL_DEPTH_POINTS, PARAMETERS } from '../../data/argoData'

export default function DataInspectorModal({
  observation,
  onClose,
}) {
  if (!observation) return null

  const isAnom = observation.isAnomaly
  const formattedDate = new Date(observation.date).toUTCString()

  // Generate synthetic mini CTD depth profile for this float
  const profileDepths = ALL_DEPTH_POINTS
  const maxTemp = 30
  const minTemp = 2
  const profilePoints = profileDepths.map((d) => {
    const t = minTemp + (observation.temp - minTemp) * Math.exp(-d / 220)
    return { depth: d, temp: +t.toFixed(1) }
  })

  return (
    <div className="ocean4d-modal-overlay" onClick={onClose}>
      <div className="ocean4d-inspector-modal" onClick={(e) => e.stopPropagation()}>
        <button className="inspector-close-btn" onClick={onClose} aria-label="Close Inspector">
          ✕
        </button>

        {/* Header */}
        <div className="inspector-head">
          <div className="inspector-title">
            <span className="float-icon-bubble">📡</span>
            <div>
              <h3>Argo Float observation #{observation.floatId}</h3>
              <p>{observation.floatName || `WMO Platform ${observation.floatId}`}</p>
            </div>
          </div>
          <span className="platform-tag">{observation.platform || 'APEX Profiler'}</span>
        </div>

        {/* Quality Flag Banner */}
        <div className={`qc-banner qc-${observation.qc}`}>
          <span className="qc-dot" />
          <span><b>Quality Flag:</b> {observation.qcDesc || `QC ${observation.qc}: Good`}</span>
          <span className="qc-status">WMO Calibrated</span>
        </div>

        {/* Anomaly Callout if present */}
        {isAnom && (
          <div className="inspector-anomaly-callout">
            <span className="anom-icon">⚠️</span>
            <div>
              <strong>Anomaly Alert: {observation.anomalyType || 'Extreme Marine Heatwave'}</strong>
              <p>
                Observed deviation: {observation.tempAnomaly > 0 ? '+' : ''}{observation.tempAnomaly}°C / {observation.salAnomaly} PSU from 2004–2020 climatology.
              </p>
            </div>
          </div>
        )}

        {/* 4D Observation Grid */}
        <div className="inspector-data-grid">
          <div className="inspector-cell">
            <small>Float ID</small>
            <b>WMO {observation.floatId}</b>
          </div>
          <div className="inspector-cell">
            <small>Cycle Number</small>
            <b>#{observation.cycleNum || '12'}</b>
          </div>
          <div className="inspector-cell">
            <small>Latitude (Y)</small>
            <b>{observation.lat > 0 ? `${observation.lat}°N` : `${Math.abs(observation.lat)}°S`}</b>
          </div>
          <div className="inspector-cell">
            <small>Longitude (X)</small>
            <b>{observation.lon > 0 ? `${observation.lon}°E` : `${Math.abs(observation.lon)}°W`}</b>
          </div>
          <div className="inspector-cell">
            <small>Observation Depth (Z)</small>
            <b className="val-depth">{observation.depth} m</b>
          </div>
          <div className="inspector-cell">
            <small>Date / Time (T)</small>
            <b className="val-date">{formattedDate}</b>
          </div>
          <div className="inspector-cell highlight-cell">
            <small>In-Situ Temperature</small>
            <b className="val-temp">{observation.temp} °C</b>
            <span className="cell-delta">
              Δ {observation.tempAnomaly > 0 ? '+' : ''}{observation.tempAnomaly}°C
            </span>
          </div>
          <div className="inspector-cell highlight-cell">
            <small>Practical Salinity</small>
            <b className="val-sal">{observation.sal} PSU</b>
            <span className="cell-delta">
              Δ {observation.salAnomaly > 0 ? '+' : ''}{observation.salAnomaly} PSU
            </span>
          </div>
        </div>

        {/* CTD Profile Mini Chart */}
        <div className="inspector-ctd-chart">
          <div className="ctd-chart-header">
            <h4>Vertical CTD Profile (0–2,000m)</h4>
            <span>Current Depth: <b>{observation.depth}m</b></span>
          </div>

          <div className="mini-chart-wrap">
            <svg viewBox="0 0 420 180" className="ctd-svg">
              {/* Depth lines */}
              {[0, 500, 1000, 1500, 2000].map((d) => {
                const y = 20 + (d / 2000) * 135
                return (
                  <g key={d}>
                    <line x1="50" x2="390" y1={y} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <text x="42" y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="10">{d}m</text>
                  </g>
                )
              })}

              {/* Temperature axis */}
              {[5, 15, 25].map((t) => {
                const x = 50 + ((t - minTemp) / (maxTemp - minTemp)) * 340
                return (
                  <g key={t}>
                    <line x1={x} x2={x} y1="20" y2="155" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <text x={x} y="172" textAnchor="middle" fill="#94a3b8" fontSize="10">{t}°C</text>
                  </g>
                )
              })}

              {/* Curve */}
              {(() => {
                const pts = profilePoints.map((pt) => {
                  const x = 50 + ((pt.temp - minTemp) / (maxTemp - minTemp)) * 340
                  const y = 20 + (pt.depth / 2000) * 135
                  return `${x.toFixed(1)},${y.toFixed(1)}`
                })
                const activeX = 50 + ((observation.temp - minTemp) / (maxTemp - minTemp)) * 340
                const activeY = 20 + (observation.depth / 2000) * 135
                return (
                  <>
                    <polyline points={pts.join(' ')} fill="none" stroke="#5ef2ff" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx={activeX} cy={activeY} r="6" fill="#ffb066" stroke="#fff" strokeWidth="2" />
                  </>
                )
              })()}
            </svg>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="inspector-footer">
          <small>
            Data Assembly: Global Data Assembly Centre (GDAC) · Argo QC Level 1 Verified
          </small>
          <button className="inspector-done-btn" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  )
}
