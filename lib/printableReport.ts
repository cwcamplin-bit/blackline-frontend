import type { AnalysisResult } from './types';

function fmtMoney(n: number) {
  return '£' + Number(n).toLocaleString('en-GB');
}

/**
 * Builds a standalone, print-formatted HTML document for a report — opened
 * in a new tab and immediately sent to the browser's print/save-as-PDF
 * dialog. This is the "Export report" flow; there is no server-side PDF
 * generation involved.
 */
export function buildPrintableReport(data: AnalysisResult): string {
  const renoRows =
    data.renovation && data.renovation.items && data.renovation.items.length
      ? data.renovation.items
          .map((i) => `<tr><td>${i.label}</td><td style="text-align:right;">${fmtMoney(i.low)}–${fmtMoney(i.high)}</td></tr>`)
          .join('')
      : '<tr><td colspan="2">Not available for this listing</td></tr>';
  const renoTotalRow =
    data.renovation && data.renovation.items && data.renovation.items.length
      ? `<tr><td><strong>Estimated total</strong></td><td style="text-align:right;"><strong>${fmtMoney(
          data.renovation.totalLow
        )}–${fmtMoney(data.renovation.totalHigh)}</strong></td></tr>`
      : '';
  const compRows = data.comparables.map((c) => `<tr><td>${c[0]}</td><td style="text-align:right;">${c[1]}</td></tr>`).join('');
  const strengths = data.strengths.map((s) => `<li>${s}</li>`).join('');
  const risks = data.risks.map((r) => `<li>${r}</li>`).join('');
  const f = data.financials;

  return `<!doctype html><html><head><meta charset="UTF-8"><title>Blackline report — ${data.address}</title>
  <style>
    body{ font-family:Georgia, 'Times New Roman', serif; color:#151515; max-width:760px; margin:36px auto; padding:0 24px; line-height:1.5; }
    h1{ font-size:22px; margin-bottom:2px; }
    .meta{ font-family:'Courier New', monospace; font-size:12px; color:#555; margin-bottom:22px; }
    h2{ font-size:15px; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid #ccc; padding-bottom:6px; margin:26px 0 10px; }
    table{ width:100%; border-collapse:collapse; font-size:13.5px; }
    td{ padding:6px 0; border-bottom:1px solid #eee; }
    ul{ margin:6px 0 0 18px; font-size:13.5px; }
    .pill{ display:inline-block; border:1px solid #151515; padding:3px 9px; font-family:'Courier New', monospace; font-size:11px; letter-spacing:.03em; }
    .summary{ font-size:13.5px; }
    @media print{ body{ margin:0; padding:16px; } }
  </style></head><body>
    <h1>${data.address}</h1>
    <div class="meta">${fmtMoney(data.price)} · ${data.beds} bed ${data.type} · ${data.sourceUrl}</div>
    <span class="pill">${data.verdictLabel}</span> &nbsp; Confidence: ${data.confidence}%
    <h2>Executive summary</h2>
    <p class="summary">${data.summary}</p>
    <h2>Four dimensions</h2>
    <table>
      <tr><td>Cashflow</td><td style="text-align:right;">${data.scores.cashflow}/100</td></tr>
      <tr><td>Growth</td><td style="text-align:right;">${data.scores.growth}/100</td></tr>
      <tr><td>Value add</td><td style="text-align:right;">${data.scores.valueAdd}/100</td></tr>
      <tr><td>Security</td><td style="text-align:right;">${data.scores.security}/100</td></tr>
    </table>
    <h2>Financial analysis</h2>
    <table>
      <tr><td>Purchase price</td><td style="text-align:right;">${fmtMoney(f.purchase)}</td></tr>
      <tr><td>Stamp Duty</td><td style="text-align:right;">${fmtMoney(f.stampDuty)}</td></tr>
      <tr><td>Deposit (25%)</td><td style="text-align:right;">${fmtMoney(f.deposit)}</td></tr>
      <tr><td>Mortgage (75% LTV, 5.9%)</td><td style="text-align:right;">${fmtMoney(f.mortgage)}/mo</td></tr>
      <tr><td>Estimated rent</td><td style="text-align:right;">${fmtMoney(f.rent)}/mo</td></tr>
      <tr><td><strong>Net monthly cashflow</strong></td><td style="text-align:right;"><strong>${fmtMoney(f.cashflow)}</strong></td></tr>
      <tr><td><strong>Net yield / ROI</strong></td><td style="text-align:right;"><strong>${f.yieldPct} / ${f.roiPct}</strong></td></tr>
    </table>
    <h2>Potential renovation</h2>
    <table>${renoRows}${renoTotalRow}</table>
    <h2>Comparable sales</h2>
    <table>${compRows}</table>
    <h2>Strategy scores</h2>
    <table>
      <tr><td>Buy-to-Let</td><td style="text-align:right;">${data.strategy.btl}/100</td></tr>
      <tr><td>BRRR</td><td style="text-align:right;">${data.strategy.brrr}/100</td></tr>
      <tr><td>Flip</td><td style="text-align:right;">${data.strategy.flip}/100</td></tr>
    </table>
    <h2>Strengths</h2>
    <ul>${strengths}</ul>
    <h2>Risks identified</h2>
    <ul>${risks}</ul>
    <script>window.onload = () => { window.print(); };<\/script>
  </body></html>`;
}
