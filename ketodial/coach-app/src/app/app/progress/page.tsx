'use client'

import { useState, useEffect } from 'react'
import '@/styles/coach.css'

export default function ProgressPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/member/progress')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
  }, [])

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-faint)' }}>Loading...</div>

  const { member, metrics, streak, total_checkins, averages } = data
  const weightData = metrics.filter((m: any) => m.weight)
  const weightChange = member.start_weight && member.current_weight
    ? (member.current_weight - member.start_weight).toFixed(1)
    : null
  const toGoal = member.current_weight && member.goal_weight
    ? (member.current_weight - member.goal_weight).toFixed(1)
    : null

  return (
    <div className="progress-page">
      <h1 className="prog-title">Your progress</h1>

      {/* Key stats */}
      <div className="prog-stats">
        <div className="pstat">
          <div className="ps-val">{streak}</div>
          <div className="ps-label">week streak</div>
        </div>
        <div className="pstat">
          <div className="ps-val">{total_checkins}</div>
          <div className="ps-label">check-ins</div>
        </div>
        {weightChange && (
          <div className="pstat">
            <div className={`ps-val ${Number(weightChange) < 0 ? 'good' : ''}`}>
              {Number(weightChange) > 0 ? '+' : ''}{weightChange}
            </div>
            <div className="ps-label">lbs total</div>
          </div>
        )}
        {toGoal && Number(toGoal) > 0 && (
          <div className="pstat">
            <div className="ps-val">{toGoal}</div>
            <div className="ps-label">lbs to goal</div>
          </div>
        )}
      </div>

      {/* Weight trend */}
      {weightData.length > 0 && (
        <div className="prog-card">
          <div className="pc-label">Weight trend</div>
          <div className="weight-trend">
            {weightData.map((m: any, i: number) => {
              const min = Math.min(...weightData.map((d: any) => d.weight))
              const max = Math.max(...weightData.map((d: any) => d.weight))
              const range = max - min || 1
              const pct = ((m.weight - min) / range) * 100

              return (
                <div key={i} className="wt-col">
                  <div className="wt-bar-wrap">
                    <div className="wt-bar" style={{ height: `${Math.max(pct, 8)}%` }} />
                  </div>
                  <div className="wt-val">{m.weight}</div>
                  <div className="wt-date">
                    {new Date(m.recorded_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
          {member.goal_weight && (
            <div className="goal-line">Goal: {member.goal_weight} lbs</div>
          )}
        </div>
      )}

      {/* Recent averages */}
      {(averages.adherence || averages.energy || averages.sleep) && (
        <div className="prog-card">
          <div className="pc-label">Recent averages (last 4 weeks)</div>
          <div className="avg-grid">
            {averages.adherence && (
              <div className="avg-item">
                <div className="avg-val">{averages.adherence.toFixed(1)}<span>/10</span></div>
                <div className="avg-label">Adherence</div>
              </div>
            )}
            {averages.energy && (
              <div className="avg-item">
                <div className="avg-val">{averages.energy.toFixed(1)}<span>/5</span></div>
                <div className="avg-label">Energy</div>
              </div>
            )}
            {averages.sleep && (
              <div className="avg-item">
                <div className="avg-val">{averages.sleep.toFixed(1)}<span>/5</span></div>
                <div className="avg-label">Sleep</div>
              </div>
            )}
            {averages.cravings && (
              <div className="avg-item">
                <div className="avg-val">{averages.cravings.toFixed(1)}<span>/5</span></div>
                <div className="avg-label">Cravings</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {weightData.length === 0 && total_checkins === 0 && (
        <div className="prog-card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No data yet</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 14 }}>
            Submit your first check-in to start tracking your progress.
          </div>
        </div>
      )}
    </div>
  )
}
