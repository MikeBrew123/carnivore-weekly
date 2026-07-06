import Script from 'next/script'
import { KdLogo, CheckIcon } from '@/components/landing/KdBrand'
import WaitlistForm from '@/components/landing/WaitlistForm'
import '@/styles/coach.css'
import '@/styles/landing.css'

export default function LandingPage() {
  return (
    <>
      {/* Mobile hamburger nav — self-injecting, reuses the .nav/.nav-links markup */}
      <Script src="/js/mobile-nav.js" />
      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="kd-brand" href="/">
            <KdLogo />
            <span className="word">Keto<b>Dial</b></span>
            <span className="sub">Coach</span>
          </a>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <WaitlistForm variant="inline" />
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="cohort-pill">
              <span className="cp-dot"></span>
              Founding cohort &middot; <b>spots limited</b>
            </div>
            <span className="eyebrow">Weekly accountability coaching &middot; human-reviewed</span>
            <h1>Low-carb accountability that <span className="accent">actually checks in.</span></h1>
            <p className="hero-sub">
              Weekly text-based coaching to stay consistent, spot patterns, and focus on the
              next right move — <b>without tracking every bite.</b>
            </p>
            <div className="hero-cta">
              <WaitlistForm variant="inline" />
              <a className="btn btn-ghost btn-lg" href="#how">See how it works</a>
            </div>
            <div className="hero-meta">
              <div className="hm"><CheckIcon />Weekly coached responses</div>
              <div className="hm"><CheckIcon />Human-reviewed, AI-assisted</div>
              <div className="hm"><CheckIcon />No food logging required</div>
              <div className="hm"><CheckIcon />Cancel anytime</div>
            </div>
          </div>
          <div className="hero-mock">
            <div className="mock-card">
              <div className="mock-badge"><span className="fl"></span>Coach replied</div>
              <div className="mock-top">
                <span className="coach-av">R</span>
                <div>
                  <div className="who">Coach Remy</div>
                  <div className="st">Responded in 6 hours</div>
                </div>
              </div>
              <div className="mock-msg">
                Hey Alex — <b>8/10 adherence</b> and you hit your steps target 5 of 7 days.
                That&apos;s real momentum.<br /><br />
                Your cravings ticked up midweek. Let&apos;s get ahead of it.
              </div>
              <div className="mock-focus">
                <span className="fi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a9 9 0 1 0 9 9"/><path d="M12 12l5-5"/>
                  </svg>
                </span>
                <div>
                  <div className="ft">This week&apos;s focus</div>
                  <div className="fv">Move your biggest meal to dinner, 30g+ fat.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">How it works</span>
            <h2>A simple accountability rhythm for your low-carb plan.</h2>
            <p>You already know low-carb can work. The hard part is staying consistent. KetoDial helps you notice the pattern, adjust one thing, and keep going.</p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="n">01</span>
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>
                </svg>
              </div>
              <h3>Tell us where you are</h3>
              <p>A short intake covers your goal, approach, history, and biggest sticking point. Your coach starts knowing who you are.</p>
            </div>
            <div className="step">
              <span className="n">02</span>
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <h3>Check in every Sunday</h3>
              <p>A quick check-in: consistency, energy, cravings, weight trend, and what got in the way. Takes two minutes.</p>
            </div>
            <div className="step">
              <span className="n">03</span>
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3>Get one clear focus</h3>
              <p>Your coach reviews the pattern and gives you one practical focus for the coming week.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section style={{ paddingTop: '20px' }}>
        <div className="wrap">
          <div className="gn-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="gn get">
              <h3><span className="dot"></span>What you get</h3>
              <ul style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
                <li><CheckIcon /><span>A <b>simple check-in rhythm</b> that keeps you consistent.</span></li>
                <li><CheckIcon /><span><b>Weekly coached responses</b> reviewed by a real person.</span></li>
                <li><CheckIcon /><span><b>One practical focus at a time</b> — never a list of 20 fixes.</span></li>
                <li><CheckIcon /><span><b>Pattern spotting from your history</b> — every check-in builds on the last.</span></li>
                <li><CheckIcon /><span>Support when <b>cravings, stalls, or restarts</b> show up.</span></li>
                <li><CheckIcon /><span><b>Human-reviewed, AI-assisted</b> guidance — never auto-pilot.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Membership</span>
            <h2>Weekly accountability, one coached response.</h2>
            <p>Check in every Sunday. Get one clear, personalized response from Coach Remy. Add notes anytime. No setup fees, no contracts, cancel anytime.</p>
          </div>
          <div className="price-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '440px', margin: '0 auto' }}>
            <div className="price feat">
              <span className="pop">Founding member pricing</span>
              <div className="tier">Weekly Check-In</div>
              <div className="amt">$49<small>/month</small></div>
              <p className="desc">For steady accountability. Founding price locked while active.</p>
              <ul>
                <li><CheckIcon />1 coached response per week</li>
                <li><CheckIcon />Sunday check-in reviewed by a progress reviewer</li>
                <li><CheckIcon />Add notes anytime between check-ins</li>
                <li><CheckIcon />Pattern spotting from your history</li>
                <li><CheckIcon />One clear focus for the week</li>
                <li><CheckIcon />1 bonus mid-week check-in credit included</li>
              </ul>
              <WaitlistForm variant="inline" />
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ paddingTop: '20px' }}>
        <div className="wrap">
          <div className="proof">
            <p className="proof-quote">
              &ldquo;The check-in is the thing. Knowing Remy&apos;s going to ask how my week went is exactly the nudge I needed — I stopped quietly falling off.&rdquo;
            </p>
            <div className="proof-stats">
              <div className="proof-stat"><div className="v">By text</div><div className="l">No calls, no food logging</div></div>
              <div className="proof-stat"><div className="v">Sunday</div><div className="l">One check-in, one response</div></div>
              <div className="proof-stat"><div className="v">100%</div><div className="l">Human-reviewed at launch</div></div>
            </div>
            <p className="proof-note">Founding cohort capped at 50 &middot; member stories coming as the first cohort hits their milestones</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Questions</span>
            <h2>The honest answers.</h2>
          </div>
          <div className="faq">
            <details className="qa" open>
              <summary>Is this live chat?<span className="pm"></span></summary>
              <div className="ans">No. Coaching happens inside the KetoDial Coach platform, not by SMS or live chat. You complete your weekly check-in, and you receive a written coaching response in your account. It&apos;s async, so you don&apos;t need to schedule a call or be available at a specific time.</div>
            </details>
            <details className="qa">
              <summary>Are there video calls?<span className="pm"></span></summary>
              <div className="ans">No. Coaching happens through written responses inside the platform. Quick check-ins, clear feedback you can come back to anytime.</div>
            </details>
            <details className="qa">
              <summary>Who reviews my progress?<span className="pm"></span></summary>
              <div className="ans">A real person reviews every check-in and guides the coaching feedback. We also use behind-the-scenes tools to help organize your history, notice patterns, and keep your weekly responses consistent. But the coaching is guided by your reviewer&apos;s judgment, not a generic chatbot.</div>
            </details>
            <details className="qa">
              <summary>Do I need to log food?<span className="pm"></span></summary>
              <div className="ans">No. Your check-ins focus on consistency, energy, cravings, weight trend, and what got in the way — not tracking every bite. You already know what to eat; this is about doing it consistently.</div>
            </details>
            <details className="qa">
              <summary>Is this medical advice?<span className="pm"></span></summary>
              <div className="ans">No. KetoDial Coach provides low-carb accountability coaching, not medical care. For medications, symptoms, diagnoses, pregnancy, eating disorders, or medical conditions, talk to a healthcare provider.</div>
            </details>
            <details className="qa">
              <summary>Can I cancel?<span className="pm"></span></summary>
              <div className="ans">Yes, anytime — in two clicks from your settings. No phone calls, no retention maze.</div>
            </details>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <div className="wrap">
        <div className="cta-band">
          <h2>Finally, someone to help you stay consistent.</h2>
          <p>You know what to do. KetoDial Coach gives you the rhythm to actually keep doing it.</p>
          <WaitlistForm />
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <span className="kd-brand">
                <KdLogo />
                <span className="word" style={{ color: '#fff' }}>Keto<b>Dial</b></span>
                <span className="sub">Coach</span>
              </span>
              <p>Weekly accountability coaching for people serious about low-carb. The coach that checks on you.</p>
            </div>
            <div className="foot-links">
              <div className="foot-col">
                <h4>Product</h4>
                <a href="#how">How it works</a>
                <a href="#pricing">Pricing</a>
                <a href="#faq">FAQ</a>
              </div>
              <div className="foot-col">
                <h4>KetoDial</h4>
                <a href="https://ketodial.com">Calculator</a>
                <a href="https://ketodial.com/blog">Guides</a>
                <a href="https://ketodial.com/recipes">Recipes</a>
              </div>
              <div className="foot-col">
                <h4>Company</h4>
                <a href="https://ketodial.com/privacy.html">Privacy</a>
                <a href="https://ketodial.com/terms.html">Terms</a>
              </div>
            </div>
          </div>
          <div className="foot-disc">
            <p className="d">KetoDial Coach provides low-carb accountability coaching, not medical care. For medications, symptoms, diagnoses, pregnancy, eating disorders, or medical conditions, talk to a healthcare provider.</p>
            <span className="c">&copy; 2026 KetoDial</span>
          </div>
        </div>
      </footer>
    </>
  )
}
