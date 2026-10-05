import { ARGO_DATASET } from '../data/argoData'

/**
 * Export Argo dataset as JSON file
 */
export function exportArgoJson() {
  const exportData = {
    metadata: {
      program: 'International Argo Program / FloatChat GDAC Export',
      generatedAt: new Date().toISOString(),
      temporalCoverage: '2020-01-01 to 2025-12-31',
      depthCoverageMeters: '0 to 2000m',
      qcLevel: 'WMO Argo QC Level 1 Verified',
      totalFloats: ARGO_DATASET.floats.length,
      totalObservations: ARGO_DATASET.observations.length,
    },
    floats: ARGO_DATASET.floats,
    observations: ARGO_DATASET.observations,
  }

  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  downloadBlob(blob, `argo_ocean_dataset_2020_2025.json`)
}

/**
 * Export Argo dataset as CSV file
 */
export function exportArgoCsv() {
  const headers = [
    'Float_ID',
    'Platform_Type',
    'Basin',
    'Sub_Region',
    'Date_UTC',
    'Year',
    'Cycle_Number',
    'Longitude_deg',
    'Latitude_deg',
    'Depth_m',
    'Temperature_C',
    'Salinity_PSU',
    'Temp_Anomaly_C',
    'Sal_Anomaly_PSU',
    'Is_Anomaly',
    'Anomaly_Type',
    'QC_Flag',
  ]

  const rows = [headers.join(',')]

  ARGO_DATASET.observations.forEach((obs) => {
    obs.measurements.forEach((m) => {
      const row = [
        `"${obs.floatId}"`,
        `"${obs.platform}"`,
        `"${obs.basin}"`,
        `"${obs.subRegion}"`,
        `"${obs.date}"`,
        obs.year,
        obs.cycleNum,
        obs.lon,
        obs.lat,
        m.depth,
        m.temp,
        m.sal,
        m.tempAnomaly,
        m.salAnomaly,
        m.isAnomaly ? 'TRUE' : 'FALSE',
        `"${m.anomalyType || 'NORMAL'}"`,
        m.qc,
      ]
      rows.push(row.join(','))
    })
  })

  const csvContent = rows.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `argo_ocean_ctd_profiles_2020_2025.csv`)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
