import { useState, useMemo } from 'react'
import { filterArgoData, OCEAN_BASINS } from '../../data/argoData'

const BASIN_OPTIONS = [
  { id: 'indian', name: 'Indian Ocean', icon: '🌊', drivers: 'Modulated by Indian Ocean Dipole (IOD) & Seasonal Monsoons' },
  { id: 'pacific', name: 'Pacific Ocean', icon: '🌀', drivers: 'Governed by Walker Circulation & El Niño / Southern Oscillation (ENSO)' },
  { id: 'atlantic', name: 'Atlantic Ocean', icon: '🧭', drivers: 'Driven by Atlantic Meridional Overturning Circulation (AMOC) & Gulf Stream' },
  { id: 'southern', name: 'Southern Ocean', icon: '❄️', drivers: 'Dominated by Antarctic Circumpolar Current (ACC) & Upwelling' },
]

export default function RegionComparatorModal({ onClose, onSelectRegionFor4D }) {
  const [basinA, setBasinA] = useState('indian')
  const [basinB, setBasinB] = useState('pacific')

  // Calculate statistics for each basin
  const statsA = useMemo(() => calculateBasinStats(basinA), [basinA])
  const statsB = useMemo(() => calculateBasinStats(basinB), [basinB])

  function calculateBasinStats(basinKey) {
    const data = filterArgoData({ basin: basinKey, yearRange: [2020, 2025], depthRange: [0, 2000] })
    const surfacePoints = data.points.filter((p) => p.depth <= 50)
    const thermoclinePoints = data.points.filter((p) => p.depth >= 100 && p.depth <= 300)

    const avgSST = surfacePoints.length > 0
      ? (surfacePoints.reduce((acc, p) => acc + p.temp, 0) / surfacePoints.length).toFixed(1)
      : 'N/A'

    const avgThermo = thermoclinePoints.length > 0
      ? (thermoclinePoints.reduce((acc, p) => acc + p.temp, 0) / thermoclinePoints.length).toFixed(1)
      : 'N/A'

    const avgSal = data.points.length > 0
      ? (data.points.reduce((acc, p) => acc + p.sal, 0) / data.points.length).toFixed(2)
      : 'N/A'

    const anomalies = data.points.filter((p) => p.isAnomaly).length

    return {
      totalPoints: data.points.length,
      floatCount: data.floats.length,
      avgSST,
      avgThermo,
      avgSal,
      anomalies,
    }
  }

  const tempDiff = (+statsA.avgSST - +statsB.avgSST).toFixed(1)
  const salDiff = (+statsA.avgSal - +statsB.avgSal).toFixed(2)

  const regionInfoA = BASIN_OPTIONS.find((b) => b.id === basinA)
  const regionInfoB = BASIN_OPTIONS.find((b) => b.id === basinB)

  return (
    <div className="ocean4d-modal-overlay" onClick={onClose}>
      <div className="ocean4d-comparator-modal glass" onClick={(e) => e.stopPropagation()}>
        <button className="inspector-close-btn" onClick={onClose} aria-label="Close">✕</button>

        <div className="comparator-head">
          <span className="comparator-icon">⚖️</span>
          <div>
            <h3>Regional Ocean Basin Comparator</h3>
            <p>Side-by-side Argo hydrographic comparison across 2020–2025</p>
          </div>
        </div>

        {/* Region Selectors Header */}
        <div className="comparator-select-row">
          <div className="select-col">
            <label>Region A:</label>
            <select value={basinA} onChange={(e) => setBasinA(e.target.value)}>
              {BASIN_OPTIONS.map((b) => (
                <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
              ))}
            </select>
          </div>

          <div className="vs-badge">VS</div>

          <div className="select-col">
            <label>Region B:</label>
            <select value={basinB} onChange={(e) => setBasinB(e.target.value)}>
              {BASIN_OPTIONS.map((b) => (
                <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparative Metrics Table */}
        <div className="comparator-grid">
          {/* Card A */}
          <div className="compare-card card-a">
            <div className="compare-card-title">
              <span className="card-badge">Region A</span>
              <h4>{regionInfoA.name}</h4>
              <small>{regionInfoA.drivers}</small>
            </div>
            <div className="compare-stat-row">
              <span>Mean Surface Temp (0–50m):</span>
              <b>{statsA.avgSST} °C</b>
            </div>
            <div className="compare-stat-row">
              <span>Thermocline Temp (100–300m):</span>
              <b>{statsA.avgThermo} °C</b>
            </div>
            <div className="compare-stat-row">
              <span>Average Salinity:</span>
              <b>{statsA.avgSal} PSU</b>
            </div>
            <div className="compare-stat-row">
              <span>Active Argo Floats:</span>
              <b>{statsA.floatCount} platforms</b>
            </div>
            <div className="compare-stat-row">
              <span>Detected Anomalies:</span>
              <b className={statsA.anomalies > 0 ? 'text-warn' : ''}>{statsA.anomalies}</b>
            </div>
            <button
              className="compare-jump-btn"
              onClick={() => {
                onSelectRegionFor4D(basinA)
                onClose()
              }}
            >
              Explore {regionInfoA.name} in 4D →
            </button>
          </div>

          {/* Delta Column */}
          <div className="compare-delta-col">
            <small>Variance (A - B)</small>
            <div className="delta-pill">
              <span>Δ SST:</span>
              <b className={tempDiff > 0 ? 'pos' : 'neg'}>{tempDiff > 0 ? `+${tempDiff}` : tempDiff} °C</b>
            </div>
            <div className="delta-pill">
              <span>Δ Salinity:</span>
              <b className={salDiff > 0 ? 'pos' : 'neg'}>{salDiff > 0 ? `+${salDiff}` : salDiff} PSU</b>
            </div>
          </div>

          {/* Card B */}
          <div className="compare-card card-b">
            <div className="compare-card-title">
              <span className="card-badge">Region B</span>
              <h4>{regionInfoB.name}</h4>
              <small>{regionInfoB.drivers}</small>
            </div>
            <div className="compare-stat-row">
              <span>Mean Surface Temp (0–50m):</span>
              <b>{statsB.avgSST} °C</b>
            </div>
            <div className="compare-stat-row">
              <span>Thermocline Temp (100–300m):</span>
              <b>{statsB.avgThermo} °C</b>
            </div>
            <div className="compare-stat-row">
              <span>Average Salinity:</span>
              <b>{statsB.avgSal} PSU</b>
            </div>
            <div className="compare-stat-row">
              <span>Active Argo Floats:</span>
              <b>{statsB.floatCount} platforms</b>
            </div>
            <div className="compare-stat-row">
              <span>Detected Anomalies:</span>
              <b className={statsB.anomalies > 0 ? 'text-warn' : ''}>{statsB.anomalies}</b>
            </div>
            <button
              className="compare-jump-btn"
              onClick={() => {
                onSelectRegionFor4D(basinB)
                onClose()
              }}
            >
              Explore {regionInfoB.name} in 4D →
            </button>
          </div>
        </div>

        <div className="comparator-footer">
          <small>Source: Climatologically calibrated Argo GDAC comparative baseline.</small>
          <button className="inspector-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
