'use client'

import { useState, useEffect, useRef } from 'react'
import '@/styles/coach.css'
import '@/styles/member.css'
import '@/styles/dashboard.css'

interface Message {
  id: string
  direction: string
  content: string
  checkin_id: string | null
  sent_at: string
  created_at: string
}

interface CheckIn {
  weight: number | null
  adherence: number | null
  cravings_level: number | null
  sleep_quality: number | null
  energy_level: number | null
  steps_avg: number | null
  wins: string | null
  struggles: string | null
  period_start: string
}

export default function ThreadPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [checkins, setCheckins] = useState<Record<string, CheckIn>>({})
  const [noteText, setNoteText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadThread()
  }, [])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function loadThread() {
    const res = await fetch('/api/member/thread')
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages)
      setCheckins(data.checkins)
    }
  }

  async function sendNote() {
    if (!noteText.trim() || sending) return
    setSending(true)
    const res = await fetch('/api/member/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteText }),
    })
    if (res.ok) {
      setNoteText('')
      await loadThread()
    }
    setSending(false)
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  // Group messages by day
  let lastDate = ''

  return (
    <div className="dash-page">
      {/* App bar */}
      <div className="appbar">
        <a href="/app/dashboard" className="ic-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </a>
        <div style={{ fontWeight: 800, fontSize: '17px' }}>Coach Remy</div>
        <div style={{ width: 38 }}></div>
      </div>

      {/* Coach banner */}
      <div className="coach-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, color: 'var(--coach-deep)' }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Coach Remy responds within 1 business day
      </div>

      {/* Thread */}
      <div className="thread-scroll" ref={scrollRef}>
        <div className="thread">
          {messages.map((msg) => {
            const msgDate = new Date(msg.sent_at).toLocaleDateString()
            const showDate = msgDate !== lastDate
            lastDate = msgDate

            // Check-in card message
            if (msg.checkin_id && msg.direction === 'member' && checkins[msg.checkin_id]) {
              const ci = checkins[msg.checkin_id]
              return (
                <div key={msg.id}>
                  {showDate && <div className="daysep">{formatDate(msg.sent_at).split(' ')[0]}</div>}
                  <CheckInCard checkin={ci} />
                </div>
              )
            }

            return (
              <div key={msg.id}>
                {showDate && <div className="daysep">{formatDate(msg.sent_at).split(' ')[0]}</div>}
                <div className={`msg ${msg.direction === 'coach' ? 'coach' : 'me'}`}>
                  {msg.direction === 'coach' && <span className="coach-av sm">R</span>}
                  <div>
                    <div className="bub" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                    <span className="time">{formatDate(msg.sent_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Input */}
      <div className="thread-input">
        <input
          type="text"
          placeholder="Add a note for your next response..."
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendNote()}
        />
        <button className="send" onClick={sendNote} disabled={sending || !noteText.trim()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: '#062234' }}>
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function CheckInCard({ checkin }: { checkin: CheckIn }) {
  const stats = [
    { k: 'Weight', v: checkin.weight ? `${checkin.weight}` : '—' },
    { k: 'Adherence', v: checkin.adherence ? `${checkin.adherence}/10` : '—' },
    { k: 'Cravings', v: checkin.cravings_level ? `${checkin.cravings_level}/5` : '—' },
    { k: 'Sleep', v: checkin.sleep_quality ? `${checkin.sleep_quality}/5` : '—' },
    { k: 'Energy', v: checkin.energy_level ? `${checkin.energy_level}/5` : '—' },
    { k: 'Steps', v: checkin.steps_avg ? `${(checkin.steps_avg / 1000).toFixed(1)}k` : '—' },
  ]

  return (
    <div className="checkin-msg">
      <div className="cm-h">
        <span>Weekly check-in</span>
        <span>sent</span>
      </div>
      <div className="cm-grid">
        {stats.map(s => (
          <div className="cm-stat" key={s.k}>
            <div className="k">{s.k}</div>
            <div className="v">{s.v}</div>
          </div>
        ))}
      </div>
      {checkin.wins && (
        <div className="cm-free"><b>Wins:</b> {checkin.wins}</div>
      )}
      {checkin.struggles && (
        <div className="cm-free"><b>Hard:</b> {checkin.struggles}</div>
      )}
    </div>
  )
}
