'use client'

import { useState, useEffect } from 'react'
import '@/styles/coach.css'

export default function SettingsPage() {
  const [member, setMember] = useState<any>(null)
  const [name, setName] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [activity, setActivity] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetch('/api/member/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.member) {
          setMember(d.member)
          setName(d.member.display_name || '')
          setGoalWeight(d.member.goal_weight?.toString() || '')
          setActivity(d.member.activity_level || '')
        }
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    const updates: any = {}
    if (name !== member.display_name) updates.display_name = name
    if (goalWeight && Number(goalWeight) !== member.goal_weight) updates.goal_weight = Number(goalWeight)
    if (activity && activity !== member.activity_level) updates.activity_level = activity

    if (Object.keys(updates).length === 0) {
      setSaving(false)
      return showToast('No changes to save')
    }

    const res = await fetch('/api/member/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    setSaving(false)
    showToast(res.ok ? 'Saved' : 'Failed to save')
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      showToast('Could not open billing portal')
      setPortalLoading(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  if (!member) return <div className="settings-loading">Loading...</div>

  const statusLabels: Record<string, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past due',
    cancelled: 'Cancelled',
    paused: 'Paused',
  }

  return (
    <div className="settings-page">
      <h1 className="settings-title">Settings</h1>

      {/* Subscription */}
      <div className="settings-section">
        <h2 className="ss-label">Subscription</h2>
        <div className="sub-card">
          <div className="sub-row">
            <span className="sub-k">Plan</span>
            <span className="sub-v">{member.tier === 'weekly' ? 'Weekly' : 'Daily'} Check-In{member.founding_member ? ' (Founding)' : ''}</span>
          </div>
          <div className="sub-row">
            <span className="sub-k">Status</span>
            <span className={`sub-v status-${member.subscription_status}`}>
              {statusLabels[member.subscription_status] || member.subscription_status}
            </span>
          </div>
          <div className="sub-row">
            <span className="sub-k">Bonus credits</span>
            <span className="sub-v">{member.bonus_credit_balance ?? 0}</span>
          </div>
          <button className="btn btn-ghost" onClick={openBillingPortal} disabled={portalLoading}>
            {portalLoading ? 'Opening...' : 'Manage billing'}
          </button>
        </div>
      </div>

      {/* Profile */}
      <div className="settings-section">
        <h2 className="ss-label">Profile</h2>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Goal weight (lbs)</label>
            <input className="form-input" type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Activity level</label>
            <select className="form-input" value={activity} onChange={e => setActivity(e.target.value)}>
              <option value="sedentary">Sedentary</option>
              <option value="lightly_active">Lightly active</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </div>
        </div>
        <button className="btn btn-coach" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Account info (read-only) */}
      <div className="settings-section">
        <h2 className="ss-label">Account</h2>
        <div className="sub-card">
          <div className="sub-row">
            <span className="sub-k">Email</span>
            <span className="sub-v">{member.email}</span>
          </div>
          <div className="sub-row">
            <span className="sub-k">Diet</span>
            <span className="sub-v">{member.diet_type}</span>
          </div>
          <div className="sub-row">
            <span className="sub-k">Member since</span>
            <span className="sub-v">{new Date(member.onboarded_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {toast && <div className="toast show">{toast}</div>}
    </div>
  )
}
