'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import Reveal from '@/components/Reveal';
import InvestmentDiamond, { marketingRadiusFn } from '@/components/InvestmentDiamond';
import ThemeToggle from '@/components/ThemeToggle';
import styles from './page.module.css';

const CHIPS = [
  'Rightmove listing',
  'Sold price lookup',
  'Rental valuation site',
  'Mortgage calculator',
  'investment_model_v14.xlsx',
  '"average rent in M20" — Google',
  'AI chat window',
  'EPC register',
  'Notes app',
  'Crime stats PDF',
];

const PIPELINE_STEPS = [
  { num: '01', title: 'Paste the listing', body: "Drop in a Rightmove URL. Blackline validates it and flags anything it can't read." },
  { num: '02', title: 'Data is extracted', body: 'Price, bedrooms, floor area, EPC, description and images are pulled and checked for gaps.' },
  { num: '03', title: 'Financial engine runs', body: 'Yield, cashflow, ROI, ROCE and stamp duty are calculated deterministically — same inputs, same answer, every time.' },
  { num: '04', title: 'Market intelligence layers in', body: 'Comparable sales, rental evidence, schools, crime and flood risk are gathered around the property.' },
  { num: '05', title: 'AI explains the result', body: 'Executive summary, strengths, risks and negotiation angles — grounded in the numbers above, never invented.' },
];

const DIMS = [
  { tag: 'CASHFLOW', title: 'How well does it generate income?', body: 'Net yield, monthly cashflow and mortgage coverage, measured against rent-to-price ratio.' },
  { tag: 'GROWTH', title: 'How likely is it to appreciate?', body: 'Historical appreciation, regeneration activity, employment and infrastructure nearby.' },
  { tag: 'VALUE ADD', title: 'How much value can you create?', body: 'Renovation and extension potential, planning opportunities, below-market pricing.' },
  { tag: 'SECURITY', title: 'How resilient is the investment?', body: 'Rental demand, market liquidity, property condition and the quality of the evidence behind it all.' },
];

const LEDGER = [
  { dot: 'dot-strongbuy', name: 'Strong Buy', desc: 'Excellent fit for the selected strategy, with high confidence in the data behind it.' },
  { dot: 'dot-buy', name: 'Buy', desc: 'An attractive opportunity with risks that are manageable and well understood.' },
  { dot: 'dot-invest', name: 'Investigate Further', desc: 'Promising on the numbers, but worth additional due diligence before committing.' },
  { dot: 'dot-caution', name: 'Proceed with Caution', desc: "Significant concerns, or evidence that's too thin to be confident either way." },
  { dot: 'dot-pass', name: 'Pass', desc: 'Unlikely to meet your investment objectives as it stands.' },
];

const REPORT_ROWS = [
  { n: '01', t: 'Investment DNA', d: "Overall shape, best-fit strategy, confidence, and the property's core strengths and weaknesses at a glance." },
  { n: '02', t: 'Executive Summary', d: "A 250-word AI brief you can read before your coffee's ready." },
  { n: '03', t: 'Financial Analysis', d: 'Purchase price, stamp duty, mortgage, cashflow, gross and net yield, ROI, ROCE and payback — all shown, all explainable.' },
  { n: '04', t: 'Strategy Scores', d: 'Buy-to-let, BRRR and Flip scored out of 100 for this specific property.' },
  { n: '05', t: 'Risk Assessment', d: 'Traffic-light ratings across market, rental, financial, condition and liquidity risk.' },
  { n: '06', t: 'Comparable Sales', d: 'At least three comparables, so you can see the evidence, not just the conclusion.' },
  { n: '07', t: 'AI Insights', d: 'Natural-language recommendations, questions to ask, and where there might be room to negotiate.' },
];

const PRINCIPLES = [
  { mark: 'Trust is the Product', body: 'Every calculation must be explainable. You should always know where a number came from.' },
  { mark: 'AI Assists, Never Guesses', body: 'AI explains conclusions and surfaces context. The maths underneath stays deterministic.' },
  { mark: 'Fast Beats Clever', body: 'A useful report in thirty seconds creates more value than a perfect one in ten minutes.' },
  { mark: 'Everything is Comparable', body: 'Every property is measured the same way, so every comparison you make can be trusted.' },
];

export default function LandingPage() {
  const router = useRouter();
  const [heroUrl, setHeroUrl] = useState('rightmove.co.uk/properties/154829201');
  const [heroNote, setHeroNote] = useState('No spreadsheet required. Works with Rightmove listings today, Zoopla next.');
  const [heroError, setHeroError] = useState(false);

  function handleHeroAnalyse() {
    if (!heroUrl.trim()) {
      setHeroError(true);
      setHeroNote('Paste a property URL to continue.');
      return;
    }
    router.push('/signup');
  }

  return (
    <>
      <header className={styles.navHeader}>
        <div className={styles.navInner}>
          <div className={styles.wordmark}>
            BLACK<span className={styles.lined}>LINE</span>
          </div>
          <nav className={styles.navLinks}>
            <a href="#pipeline">Product</a>
            <a href="#engine">Intelligence Engine</a>
            <a href="#report">Report</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className={styles.navCta}>
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-gold">
              Start free →
            </Link>
          </div>
        </div>
      </header>

      <section className={clsx(styles.section, styles.sectionNoTop, styles.hero)}>
        <div className={clsx(styles.wrap, styles.heroGrid)}>
          <div>
            <div className="eyebrow">
              <span className="el" />
              THE AI OPERATING SYSTEM FOR PROPERTY INVESTORS
            </div>
            <h1 className={styles.heroH1}>
              <span>Complex analysis.</span>
              <span className={styles.muted}>Simple decisions.</span>
            </h1>
            <p className={clsx(styles.lead, styles.heroLead)}>
              Paste a listing. Blackline runs the financial modelling, gathers the market intelligence, and hands
              you an institutional-grade investment report — in under 30 seconds, not an afternoon of tabs.
            </p>
            <div className={styles.urlMock}>
              <input
                type="text"
                aria-label="Property listing URL"
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
              />
              <button type="button" onClick={handleHeroAnalyse}>
                Analyse →
              </button>
            </div>
            <div className={clsx(styles.heroNote, heroError && styles.error)}>{heroNote}</div>
          </div>

          <div className={styles.diamondCard}>
            <div className={styles.dcTop}>
              <span>LIVE INVESTMENT PROFILE</span>
              <span>14 ASHWORTH RD, M20</span>
            </div>
            <div className={styles.dcTitle}>The Blackline Investment Profile</div>
            <InvestmentDiamond
              scores={{ growth: 82, valueAdd: 74, security: 87, cashflow: 91 }}
              radiusFn={marketingRadiusFn}
              trigger="immediate"
              ariaLabel="Investment profile radar chart showing Growth 82, Value Add 74, Security 87 and Cashflow 91"
            />
            <div className={styles.dcFoot}>
              <div className={styles.pill}>STRONG BUY</div>
              <div className={styles.confBar}>
                <span className={styles.confLabel}>Confidence</span>
                <div className={styles.confTrack}>
                  <div className={styles.confFill} style={{ width: '94%' }} />
                </div>
                <span className={styles.confLabel}>94%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Reveal className={clsx(styles.section, styles.observe)} activeClassName={styles.inView}>
        <div className={clsx(styles.wrap, styles.twoCol, styles.observe)}>
          <div>
            <div className="eyebrow">
              <span className="el" />
              THE OLD WAY
            </div>
            <h2>
              Ten tabs.
              <br />
              One decision.
              <br />
              <span style={{ color: 'var(--text-muted)' }}>Never enough time.</span>
            </h2>
            <span className={styles.rule} />
            <p className={styles.lead} style={{ marginTop: 22 }}>
              Today, analysing one property means switching between portals, sold-price sites, rental valuation
              tools, mortgage calculators, spreadsheets, forums and a generic AI chat window — then hoping your
              notes still make sense tomorrow. The process is slow, repetitive, and every investor ends up with a
              slightly different answer.
            </p>
          </div>
          <div>
            <div className={clsx(styles.chipField, styles.fadeUp)}>
              {CHIPS.map((c) => (
                <div className={styles.chip} key={c}>
                  {c}
                </div>
              ))}
            </div>
            <div className={styles.resolveArrow}>↓ ONE WORKSPACE ↓</div>
            <div className={styles.consolidated}>blackline.app/analyse</div>
          </div>
        </div>
      </Reveal>

      <Reveal className={clsx(styles.section, styles.observe)} activeClassName={styles.inView}>
        <div className={clsx(styles.wrap, styles.observe)} id="pipeline">
          <div className="eyebrow">
            <span className="el" />
            THE PIPELINE
          </div>
          <h2>From URL to verdict.</h2>
          <span className={styles.rule} />
          <div className={styles.pipeline}>
            {PIPELINE_STEPS.map((step, i) => (
              <div className={clsx(styles.pstep, styles.fadeUp, styles[`d${Math.min(i + 1, 4)}`])} key={step.num}>
                <div className={styles.pnum}>{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className={clsx(styles.section, styles.observe)} activeClassName={styles.inView}>
        <div className={clsx(styles.wrap, styles.twoCol, styles.observe)} id="engine">
          <div>
            <div className="eyebrow">
              <span className="el" />
              THE BLACKLINE INVESTMENT PROFILE
            </div>
            <h2>Four dimensions. One shape you&apos;ll learn to recognise.</h2>
            <span className={styles.rule} />
            <p className={styles.lead} style={{ marginTop: 22 }}>
              Instead of collapsing a property into one arbitrary score, Blackline measures four independent
              dimensions and lets their shape speak for itself. Over time, you stop memorising numbers — you start
              recognising the outline of a good deal.
            </p>

            <div className={styles.dims}>
              {DIMS.map((d, i) => (
                <div className={clsx(styles.dimRow, styles.fadeUp, styles[`d${i + 1}`])} key={d.tag}>
                  <div className={styles.dimTag}>{d.tag}</div>
                  <div className={styles.dimBody}>
                    <h3>{d.title}</h3>
                    <p>{d.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={clsx(styles.diamondCard, styles.fadeUp)}>
            <div className={styles.dcTitle}>Example profile — a well-balanced buy-to-let</div>
            <InvestmentDiamond
              scores={{ growth: 60, valueAdd: 54, security: 50, cashflow: 65 }}
              radiusFn={marketingRadiusFn}
              trigger="onVisible"
              ariaLabel="Second example investment profile radar chart"
            />
          </div>
        </div>
      </Reveal>

      <Reveal className={clsx(styles.section, styles.observe)} activeClassName={styles.inView}>
        <div className={clsx(styles.wrap, styles.observe)} id="verdict">
          <div className="eyebrow">
            <span className="el" />
            THE VERDICT
          </div>
          <h2>Every report ends with a clear answer.</h2>
          <span className={styles.rule} />
          <p className={styles.lead} style={{ marginTop: 22, marginBottom: 8 }}>
            Dimensions, strategy fit, confidence and risk feed into one deterministic recommendation. AI writes the
            explanation — it never decides the outcome.
          </p>

          <div className={clsx(styles.ledger, styles.fadeUp)}>
            {LEDGER.map((l) => (
              <div className={styles.ledgerRow} key={l.name}>
                <div className={clsx(styles.ledgerDot, l.dot)} />
                <div className={styles.lname}>{l.name}</div>
                <div className={styles.ldesc}>{l.desc}</div>
              </div>
            ))}
          </div>

          <div className={clsx(styles.confExample, styles.fadeUp)}>
            <div>
              <div className={styles.ceNum}>94%</div>
              <div className={styles.ceLabel}>CONFIDENCE — EXCELLENT</div>
            </div>
            <div className={styles.ceChecks}>
              <div>
                <span>✓</span>Six strong comparable sales
              </div>
              <div>
                <span>✓</span>High-quality listing data
              </div>
              <div>
                <span>✓</span>Recent rental evidence
              </div>
              <div>
                <span>✓</span>Complete EPC information
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className={clsx(styles.section, styles.observe)} activeClassName={styles.inView}>
        <div className={clsx(styles.wrap, styles.observe)} id="report">
          <div className="eyebrow">
            <span className="el" />
            THE REPORT
          </div>
          <h2>Everything you need. Nothing you don&apos;t.</h2>
          <span className={styles.rule} />
          <div className={clsx(styles.reportList, styles.fadeUp)}>
            {REPORT_ROWS.map((r) => (
              <div className={styles.rrow} key={r.n}>
                <div className={styles.rn}>{r.n}</div>
                <div className={styles.rt}>{r.t}</div>
                <div className={styles.rd}>{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className={clsx(styles.section, styles.observe)} activeClassName={styles.inView}>
        <div className={clsx(styles.wrap, styles.observe)}>
          <div className="eyebrow">
            <span className="el" />
            HOW WE BUILD IT
          </div>
          <h2>Complex analysis. Simple decisions. On purpose.</h2>
          <span className={styles.rule} />
          <div className={clsx(styles.principles, styles.fadeUp)}>
            {PRINCIPLES.map((p) => (
              <div className={styles.pCard} key={p.mark}>
                <div className={styles.pMark}>{p.mark}</div>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className={clsx(styles.section, styles.observe)} activeClassName={styles.inView}>
        <div className={clsx(styles.wrap, styles.observe)} id="pricing">
          <div className="eyebrow">
            <span className="el" />
            PRICING
          </div>
          <h2>Start free. Upgrade when it&apos;s paying for itself.</h2>
          <span className={styles.rule} />
          <div className={clsx(styles.pricingGrid, styles.fadeUp)}>
            <div className={styles.priceCard}>
              <h3>Free</h3>
              <div className={styles.ptag}>FOR YOUR FIRST FEW DEALS</div>
              <div className={styles.pval}>£0</div>
              <ul>
                <li>
                  <span>—</span>Five property analyses
                </li>
                <li>
                  <span>—</span>Limited report view
                </li>
                <li>
                  <span>—</span>No exports
                </li>
              </ul>
              <Link href="/signup" className={clsx('btn', 'btn-ghost', styles.priceCardBtn)}>
                Start free
              </Link>
            </div>
            <div className={clsx(styles.priceCard, styles.pro)}>
              <h3>Pro</h3>
              <div className={styles.ptag}>FOR ACTIVE INVESTORS</div>
              <div className={styles.pval}>£29/mo</div>
              <ul>
                <li>
                  <span>—</span>Unlimited property analyses
                </li>
                <li>
                  <span>—</span>Saved properties &amp; full analysis history
                </li>
                <li>
                  <span>—</span>Watchlists for tracking deals over time
                </li>
                <li>
                  <span>—</span>Everything in Free
                </li>
              </ul>
              <Link href="/signup" className={clsx('btn', 'btn-gold', styles.priceCardBtn)}>
                Start Pro →
              </Link>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 24, textAlign: 'center' }}>
            Portfolio landlords and teams: Professional adds side-by-side comparison and priority support at £99/mo —
            see the full comparison from your account once you&apos;ve signed up.
          </p>
        </div>
      </Reveal>

      <section className={styles.ctaSection} id="cta">
        <div className={styles.wrap}>
          <div className={styles.kicker}>Definition of success</div>
          <blockquote>
            Not &quot;should I analyse this property?&quot;
            <br />
            Just — <span className={styles.g}>&quot;have I run it through Blackline yet?&quot;</span>
          </blockquote>
          <div className={styles.ctaButtons}>
            <Link href="/signup" className="btn btn-gold">
              Start free →
            </Link>
            <Link href="/analyse" className="btn btn-ghost">
              Try an analysis first
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.pageFooter}>
        <div className={styles.wrap}>
          <div className={styles.footGrid}>
            <div className={styles.footLeft}>
              <div className={styles.wordmark}>
                BLACK<span className={styles.lined}>LINE</span>
              </div>
              <p>The AI Operating System for Property Investors.</p>
            </div>
            <div className={styles.footLinks}>
              <div className={styles.footCol}>
                <h4>Product</h4>
                <a href="#pipeline">How it works</a>
                <a href="#engine">Intelligence Engine</a>
                <a href="#report">The Report</a>
              </div>
              <div className={styles.footCol}>
                <h4>Company</h4>
                <a href="#pricing">Pricing</a>
                <a href="#cta">Get access</a>
              </div>
            </div>
          </div>
          <div className={styles.footBottom}>
            <span>Empowering every property investor to make faster, smarter and more profitable decisions through trusted AI.</span>
            <span>© 2026 Blackline</span>
          </div>
        </div>
      </footer>
    </>
  );
}
