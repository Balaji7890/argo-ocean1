import { useState } from 'react'
import { parseOceanQuery } from '../../data/argoData'

export default function FloatChatAI({
  onApplyQuery = () => {},
  currentQuery = null,
}) {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [history, setHistory] = useState([
    {
      role: 'assistant',
      text: 'Greetings ocean explorer! I am FloatChat AI, your scientific copilot for Argo 4D oceanography. Ask me questions about global or regional temperature, salinity, trajectories, or marine heatwaves across 2020–2025.',
    },
  ])

  const suggestedQueries = [
    'Show temperature changes in the Indian Ocean from 2020 to 2025 at 100–500m depth.',
    'Detect high salinity anomalies in North Atlantic between 200m and 1000m.',
    'Track float trajectories in the Arabian Sea during 2023.',
    'Compare Pacific warm pool temperatures at surface vs 200m depth.',
    'Show Southern Ocean temperatures at 500m depth.',
  ]

  const handleRunQuery = (queryText) => {
    const textToRun = queryText || inputText
    if (!textToRun.trim()) return

    setIsProcessing(true)

    // Add user message to conversation history
    setHistory((prev) => [...prev, { role: 'user', text: textToRun }])

    // Simulate rapid scientific AI parsing and data retrieval
    setTimeout(() => {
      const parsed = parseOceanQuery(textToRun)
      setLastResult(parsed)

      // Add assistant response
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: parsed.scientificExplanation.summary,
          parsed,
        },
      ])

      // Apply to 4D visualization automatically
      onApplyQuery(parsed)
      setIsProcessing(false)
      setInputText('')
    }, 380)
  }

  return (
    <div className="floatchat-ai-panel">
      {/* Header */}
      <div className="floatchat-header">
        <div className="floatchat-title">
          <span className="ai-sparkle">✦</span>
          <div>
            <h4>FloatChat AI Copilot</h4>
            <small>Natural Language 4D Ocean Query Engine</small>
          </div>
        </div>
        <span className="ai-status-badge">● Active</span>
      </div>

      {/* Suggested Quick Queries */}
      <div className="floatchat-suggestions">
        <span className="suggestion-label">Suggested Queries:</span>
        <div className="suggestion-chips">
          {suggestedQueries.map((sq, i) => (
            <button
              key={i}
              className="suggestion-chip"
              onClick={() => {
                setInputText(sq)
                handleRunQuery(sq)
              }}
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <form
        className="floatchat-input-bar"
        onSubmit={(e) => {
          e.preventDefault()
          handleRunQuery()
        }}
      >
        <span className="input-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Ask: 'Show temperature changes in the Indian Ocean from 2020 to 2025 at 100–500m depth'..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          type="submit"
          className="floatchat-send-btn"
          disabled={isProcessing || !inputText.trim()}
        >
          {isProcessing ? 'Analyzing…' : 'Query 4D →'}
        </button>
      </form>

      {/* Structured Query Extraction Card */}
      {lastResult && (
        <div className="floatchat-result-card">
          <div className="extraction-header">
            <span className="extraction-tag">Structured Query Parameters Extracted</span>
            <span className="sync-badge">✓ 4D Scene Synchronized</span>
          </div>

          <div className="extraction-grid">
            <div className="ext-item">
              <small>Location (X, Y)</small>
              <b>{lastResult.structured.locationLabel}</b>
            </div>
            <div className="ext-item">
              <small>Time Range (T)</small>
              <b>{lastResult.structured.timeLabel}</b>
            </div>
            <div className="ext-item">
              <small>Depth Layer (Z)</small>
              <b>{lastResult.structured.depthLabel}</b>
            </div>
            <div className="ext-item">
              <small>Parameter</small>
              <b>{lastResult.structured.parameterLabel}</b>
            </div>
            <div className="ext-item ext-span-2">
              <small>Scientific Analysis Mode</small>
              <b>{lastResult.structured.analysis}</b>
            </div>
          </div>

          {/* Scientific Explanation & Stats */}
          <div className="scientific-narrative">
            <h5>Scientific Context & Interpretation</h5>
            <p className="narrative-body">
              {lastResult.scientificExplanation.scientificContext}
            </p>

            <ul className="narrative-findings">
              {lastResult.scientificExplanation.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <div className="narrative-action">
              <b>Recommended Exploration:</b> {lastResult.scientificExplanation.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
