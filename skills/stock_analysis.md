# Stock Analysis SOP Framework

## Purpose and guardrails

This is a quantitative screening framework inspired by selected ideas associated with Warren Buffett and Peter Lynch. It is a repeatable way to organize questions, not a full business valuation or a recommendation. Thresholds are heuristics. A sector, accounting regime, capital structure, acquisition, recession, or one-off event can make a simple ratio misleading. Financial companies require different balance-sheet and leverage interpretation from industrial companies.

## Data hierarchy and validation

1. Prefer audited annual reports, regulatory filings, and exchange filings. Record fiscal year end, reporting currency, accounting standard, restatements, and whether values are consolidated.
2. Cross-check market price, diluted shares, market capitalization, cash, debt, and dividends against a second credible source. Quotes can be delayed and share counts can use different dates.
3. Keep reported facts distinct from derived estimates. This demo may use Yahoo Finance through a public CORS proxy; proxy failure triggers deterministic simulated data. The simulated badge means none of the generated fundamentals are company facts.
4. Never compare nominal amounts across currencies or fiscal periods without normalization. Keep per-share values aligned with the share count and split history.
5. At least five fiscal observations are useful for trend context, but a five-observation CAGR spans four year-to-year intervals. State sample coverage and do not imply that every company has five available filings.

## Core calculations

- Revenue CAGR = `(latest revenue / earliest revenue)^(1 / elapsed years) - 1`, only when both amounts are positive.
- EPS CAGR uses diluted EPS and is not meaningful across zero or negative endpoints. YoY growth is `(current / prior) - 1`; inspect base effects.
- Gross, operating, and net margins are the respective profit measure divided by revenue.
- ROE = net income / book equity; ROA = net income / assets. ROIC here is an approximation: NOPAT / (equity + interest-bearing debt − cash), with a 21% assumed tax rate. It is not a reported measure.
- Current ratio = current assets / current liabilities. Quick ratio deducts inventory from current assets. Debt/equity = interest-bearing debt / equity. Net debt/EBITDA uses an operating-income proxy for EBITDA in the demo and is therefore approximate.
- CFO/net income, FCF margin, FCF yield, and CapEx/CFO use operating cash flow, CFO less capital expenditure, market capitalization, and CFO respectively. Negative denominators make ratios non-comparable; treat as unavailable.
- P/E, P/B, P/S, EV/EBITDA, and P/FCF use a single reference price/market capitalization. Historical P/E plotted in the demo holds today's price constant; it is not historical market valuation.
- Dividend payout = dividends per share / diluted EPS; dividend yield = annual dividend per share / reference price. Negative EPS makes payout uninterpretable.
- Share-count trend compares available diluted weighted-average shares. Buybacks are not inferred from a falling share count without considering issuance, acquisitions, and split adjustments.

## Buffett-inspired quality questions

1. **Durable economics / pricing power:** inspect gross-margin level and stability. A 40% margin is a screening reference, not proof of a moat. Assess customer concentration, switching costs, network effects, brands, regulation, and competitive substitution.
2. **Capital efficiency:** recurring ROE and ROIC above 15% can be a positive signal, but inspect leverage, goodwill, buybacks, cyclicality, and the invested-capital denominator.
3. **Financial fortress:** compare debt with normalized owner earnings and operating cash flows across a cycle. Interest coverage below 3× deserves examination; highly stable businesses and regulated sectors differ.
4. **Owner earnings:** CFO less maintenance capital spending is a useful starting proxy. Reported CapEx does not distinguish maintenance from growth investment. Reconcile working capital, stock compensation, leases, and acquisitions.
5. **Margin of safety:** the demo's illustrative DCF projects median FCF for ten years, caps growth at 8%, discounts at 10%, and applies a 12× terminal multiple. These are explicit assumptions, not a forecast. Stress-test lower growth, higher discount rates, and terminal values. Compare per-share values using current diluted shares.

## Lynch-inspired growth profile

- **Slow growers:** mature, low-growth businesses where dividends may drive returns.
- **Stalwarts:** established firms with moderate growth and resilience.
- **Fast growers:** sustained high growth with room to reinvest at attractive incremental returns.
- **Cyclicals:** earnings and revenue that swing with economic or commodity cycles; use mid-cycle earnings rather than peak P/E.
- **Turnarounds:** companies recovering from losses or financial distress; verify liquidity and durable operating improvement.
- **Asset plays:** potentially valuable assets not reflected in price; verify liquidity, liabilities, taxes, control rights, and realizable values.

Classification rules in the demo are deterministic heuristics based on growth, earnings sign, and revenue variability; they cannot identify business context on their own. PEG = P/E divided by EPS growth in percentage points. A simple dividend-adjusted PEG subtracts dividend yield percentage points from P/E before dividing by EPS growth; this convention is only a rough comparison. Low PEG does not prove undervaluation.

## Inventory and operating flags

Compare inventory growth with sales growth using like-for-like fiscal periods. Inventory growing faster can indicate slower sell-through, deliberate stock build, supply-chain recovery, or product mix. Check receivables, write-downs, backlog, and management commentary before treating it as a warning.

## Review checklist before an investment decision

- Read annual reports and notes, then compare multiple years and peers.
- Normalize one-time gains/losses, tax effects, acquisitions, and economic-cycle peaks/troughs.
- Review dilution, stock compensation, debt maturities, leases, pensions, customer concentration, and governance.
- Test valuation under bear/base/bull assumptions and require a margin of safety suited to uncertainty.
- This framework is educational and is not financial advice. Confirm all data with primary filings and consult a qualified professional where appropriate.
