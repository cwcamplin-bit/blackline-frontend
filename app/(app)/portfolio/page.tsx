'use client';

import clsx from 'clsx';
import styles from './portfolio.module.css';

const HOLDINGS = [
  { addr: '14 Ashworth Rd', equity: '£61,200', cashflow: '+£412', pos: true, yieldPct: '6.4%', status: 'Performing' },
  { addr: '9 Corporation St', equity: '£38,900', cashflow: '+£190', pos: true, yieldPct: '5.1%', status: 'Performing' },
  { addr: '27 Milton Road', equity: '£29,500', cashflow: '-£45', pos: false, yieldPct: '4.8%', status: 'Underperforming' },
  { addr: '55 Kings Ave', equity: '£72,100', cashflow: '+£301', pos: true, yieldPct: '6.0%', status: 'Performing' },
  { addr: '2 Orchard Lane', equity: '£41,000', cashflow: '+£178', pos: true, yieldPct: '5.9%', status: 'Performing' },
];

export default function PortfolioPage() {
  return (
    <>
      <div className={styles.appHeader}>
        <div className="eyebrow">
          <span className="el" />
          PORTFOLIO
        </div>
        <h1>Your portfolio.</h1>
        <p className={styles.sub}>
          Blackline keeps learning after purchase — monitoring value, rent and refinance opportunities across
          everything you own.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.scNum}>5</div>
          <div className={styles.scLabel}>Properties owned</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>£242,700</div>
          <div className={styles.scLabel}>Total equity</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>£1,036</div>
          <div className={styles.scLabel}>Monthly cashflow</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scNum}>5.9%</div>
          <div className={styles.scLabel}>Average yield</div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Property</th>
                <th>Equity</th>
                <th>Cashflow</th>
                <th>Yield</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((h) => (
                <tr key={h.addr}>
                  <td className={styles.dtAddr}>{h.addr}</td>
                  <td className={styles.monoCell}>{h.equity}</td>
                  <td className={clsx(styles.monoCell, h.pos ? styles.pos : styles.neg)}>{h.cashflow}</td>
                  <td className={styles.monoCell}>{h.yieldPct}</td>
                  <td>
                    <span
                      className={clsx(
                        styles.statusTag,
                        h.status === 'Performing' ? styles.statusGood : styles.statusWarn
                      )}
                    >
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.panelBlock}>
          <h2>AI portfolio insights</h2>
          <div className={styles.insightRow}>
            <span className={clsx(styles.irMark, styles.opp)}>—</span>
            <div>
              <div className={styles.irTitle}>Refinance opportunity</div>
              <div className={styles.irBody}>55 Kings Ave has £26k releasable equity at current LTV.</div>
            </div>
          </div>
          <div className={styles.insightRow}>
            <span className={clsx(styles.irMark, styles.warn)}>—</span>
            <div>
              <div className={styles.irTitle}>Rent below market</div>
              <div className={styles.irBody}>27 Milton Road is 9% under local comparable rents.</div>
            </div>
          </div>
          <div className={styles.insightRow}>
            <span className={clsx(styles.irMark, styles.info)}>—</span>
            <div>
              <div className={styles.irTitle}>Capital growth</div>
              <div className={styles.irBody}>Ashworth Rd area up 6.2% YoY — consider holding.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
