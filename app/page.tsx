/**
 * @project  SeatProof — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @built    2026
 * @license  MIT
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { IntentLink } from "@/components/intent-link";
import {
  auditAssignments,
  findingsToCsv,
  maskUserId,
  summaryToCsv,
} from "@/lib/audit";
import { parseAssignments, TEMPLATE_CSV } from "@/lib/csv";
import { trackEvent } from "@/lib/analytics";

const SAMPLE = `app,user_id,license_status,last_active_date,monthly_seat_cost,currency,department,manager,employment_status
Figma,ava@northstar.test,active,2026-04-03,15,USD,Design,Noah,active
Figma,noah@northstar.test,active,2026-08-11,15,USD,Design,Imani,active
Notion,liam@northstar.test,suspended,2026-02-14,18,USD,Operations,Maya,active
GitHub,former@northstar.test,active,2026-05-01,21,USD,Engineering,Noah,terminated
Linear,newhire@northstar.test,active,,10,USD,Product,,active
Figma,ava@northstar.test,active,2026-04-03,15,USD,Design,Noah,active
Miro,eu-ops-104,active,2026-08-10,9,EUR,Operations,Amelia,active`;

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function Home() {
  const [source, setSource] = useState("");
  const [referenceDate, setReferenceDate] = useState(isoToday);
  const [threshold, setThreshold] = useState(45);
  const [showIdentities, setShowIdentities] = useState(false);
  const [message, setMessage] = useState("Load a CSV to begin.");
  const parsed = useMemo(() => parseAssignments(source), [source]);
  const result = useMemo(
    () => auditAssignments(parsed.assignments, referenceDate, threshold),
    [parsed.assignments, referenceDate, threshold],
  );

  useEffect(() => trackEvent("workbench_viewed"), []);

  function review(csv: string) {
    setSource(csv);
    const next = parseAssignments(csv);
    if (next.issues.length > 0) {
      setMessage(
        `${next.issues.length} row issue${next.issues.length === 1 ? "" : "s"} need attention.`,
      );
      return;
    }
    setMessage(
      `${next.assignments.length} assignments reviewed in this browser.`,
    );
    trackEvent("assignments_reviewed");
  }

  async function onFile(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setMessage("File is larger than the 1 MB local-workbench limit.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMessage("Choose a .csv file.");
      return;
    }
    review(await file.text());
  }

  const severityCounts = result.findings.reduce<Record<string, number>>(
    (counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
      return counts;
    },
    {},
  );

  const teamUrl =
    process.env.NEXT_PUBLIC_TEAM_URL ||
    "mailto:uvin95dev@gmail.com?subject=SeatProof%20Team%20pilot";
  const feedbackUrl =
    process.env.NEXT_PUBLIC_FEEDBACK_URL ||
    "mailto:uvin95dev@gmail.com?subject=SeatProof%20feedback";

  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="SeatProof home">
          SEAT<span>PROOF</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workbench">Workbench</a>
          <a href="#method">Method</a>
          <a href="#pricing">Pricing</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Renewal review / browser-local</p>
          <h1>Find the seats that need a decision.</h1>
          <p className="lede">
            Load an assignment export. SeatProof marks inactive, never-used,
            suspended, terminated, duplicate, and ownerless seats without
            sending the file anywhere.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#workbench">
              Run an audit
            </a>
            <button
              className="button text-button"
              type="button"
              onClick={() => review(SAMPLE)}
            >
              Use sample data
            </button>
          </div>
        </div>
        <div className="renewal-strip" aria-label="Audit workflow">
          <span>01 / Export assignments</span>
          <span>02 / Review evidence</span>
          <span>03 / Confirm with owners</span>
          <span>04 / Change at source</span>
        </div>
      </section>

      <section
        className="workbench"
        id="workbench"
        aria-labelledby="workbench-title"
      >
        <div className="section-rail">
          <p className="section-number">01</p>
          <div>
            <p className="eyebrow">Local workbench</p>
            <h2 id="workbench-title">Assignment audit</h2>
          </div>
          <span className="privacy-stamp">IN-MEMORY ONLY</span>
        </div>

        <div className="input-band">
          <label className="file-drop">
            <span>Assignment CSV</span>
            <strong>Choose a file</strong>
            <small>CSV · 1 MB maximum · never uploaded</small>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
          </label>
          <div className="controls">
            <label>
              Reference date
              <input
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
              />
            </label>
            <label>
              Inactive after
              <select
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
              >
                {[30, 45, 60, 90, 120, 180].map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </select>
            </label>
            <button
              className="link-button"
              type="button"
              onClick={() => download("seat-proof-template.csv", TEMPLATE_CSV)}
            >
              Download template
            </button>
          </div>
        </div>

        <p className="status-line" aria-live="polite">
          {message}
        </p>
        {parsed.issues.length > 0 && source ? (
          <div className="issue-log" role="alert">
            <strong>Import stopped</strong>
            <ul>
              {parsed.issues.slice(0, 8).map((issue) => (
                <li key={`${issue.row}-${issue.message}`}>
                  Row {issue.row}: {issue.message}
                </li>
              ))}
            </ul>
            {parsed.issues.length > 8 ? (
              <p>{parsed.issues.length - 8} more issues are not shown.</p>
            ) : null}
          </div>
        ) : null}

        {parsed.assignments.length > 0 && parsed.issues.length === 0 ? (
          <div className="results">
            <div className="scoreline">
              <div>
                <span>Reviewed</span>
                <strong>{result.reviewedAssignments}</strong>
              </div>
              <div>
                <span>Needs review</span>
                <strong>{result.affectedAssignments}</strong>
              </div>
              <div>
                <span>Applications</span>
                <strong>{result.appCount}</strong>
              </div>
              <div className="severity-tally">
                <span>Findings</span>
                <strong>{result.findings.length}</strong>
                <small>
                  {severityCounts.high ?? 0} high / {severityCounts.medium ?? 0}{" "}
                  medium / {severityCounts.low ?? 0} low
                </small>
              </div>
            </div>

            <div className="exposure-band">
              <div>
                <p className="eyebrow">Reviewable monthly cost</p>
                <p>
                  Estimate from supplied seat costs. This is not realized
                  savings.
                </p>
              </div>
              <div className="currency-list">
                {Object.entries(result.exposureByCurrency)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([currency, amount]) => (
                    <strong key={currency}>{money(amount, currency)}</strong>
                  ))}
                {Object.keys(result.exposureByCurrency).length === 0 ? (
                  <strong>None flagged</strong>
                ) : null}
              </div>
            </div>

            <div className="queue-header">
              <div>
                <p className="eyebrow">Decision queue</p>
                <h3>{result.findings.length} findings</h3>
              </div>
              <label className="identity-toggle">
                <input
                  type="checkbox"
                  checked={showIdentities}
                  onChange={(event) => setShowIdentities(event.target.checked)}
                />
                Show raw identifiers
              </label>
              <div className="export-actions">
                <button
                  type="button"
                  onClick={() => {
                    download(
                      "seat-proof-review-queue.csv",
                      findingsToCsv(result.findings),
                    );
                    trackEvent("review_queue_exported");
                  }}
                >
                  Export queue
                </button>
                <button
                  type="button"
                  onClick={() =>
                    download("seat-proof-summary.csv", summaryToCsv(result))
                  }
                >
                  Export summary
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Application / user</th>
                    <th>Evidence</th>
                    <th>Monthly cost</th>
                    <th>Next check</th>
                  </tr>
                </thead>
                <tbody>
                  {result.findings.map((finding, index) => (
                    <tr
                      key={`${finding.assignment.row}-${finding.code}-${index}`}
                    >
                      <td>
                        <span className={`severity ${finding.severity}`}>
                          {finding.severity}
                        </span>
                      </td>
                      <td>
                        <strong>{finding.assignment.app}</strong>
                        <small>
                          {showIdentities
                            ? finding.assignment.userId
                            : maskUserId(finding.assignment.userId)}
                        </small>
                      </td>
                      <td>
                        {finding.reason}
                        <small>Source row {finding.assignment.row}</small>
                      </td>
                      <td>
                        {money(
                          finding.assignment.monthlySeatCost,
                          finding.assignment.currency,
                        )}
                      </td>
                      <td>{finding.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="method" id="method">
        <div className="section-rail">
          <p className="section-number">02</p>
          <div>
            <p className="eyebrow">Review boundary</p>
            <h2>Evidence before removal</h2>
          </div>
        </div>
        <div className="method-grid">
          <article>
            <span>A</span>
            <h3>Deterministic checks</h3>
            <p>
              Every finding maps to a visible row, rule, threshold, and
              suggested confirmation step.
            </p>
          </article>
          <article>
            <span>B</span>
            <h3>No silent action</h3>
            <p>
              SeatProof does not revoke licenses. The queue tells an operator
              what to verify in the source system.
            </p>
          </article>
          <article>
            <span>C</span>
            <h3>Currency boundaries</h3>
            <p>
              USD, EUR, GBP, and other currencies stay separate. The summary
              does not invent a conversion rate.
            </p>
          </article>
          <article>
            <span>D</span>
            <h3>Data limits</h3>
            <p>
              Last-active dates can lag or represent SSO login rather than
              product use. Owners make the final decision.
            </p>
          </article>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div>
          <p className="eyebrow">Commercial hypothesis</p>
          <h2>Keep the local audit free.</h2>
          <p>
            Team would add saved audit history, source connectors, owner
            approvals, renewal calendars, and reviewed exception policies.
          </p>
        </div>
        <div className="price-block">
          <span>TEAM / PROPOSED</span>
          <strong>
            $24<small>/ workspace / month</small>
          </strong>
          <IntentLink
            className="button primary"
            event="pricing_intent"
            href={teamUrl}
          >
            Request pilot access
          </IntentLink>
        </div>
      </section>

      <section className="feedback">
        <p>
          <strong>What does your current export fail to show?</strong> One
          example is enough to shape the next importer.
        </p>
        <IntentLink event="feedback_intent" href={feedbackUrl}>
          Send product feedback
        </IntentLink>
      </section>

      <footer>
        <p>
          SeatProof keeps the working file in your browser. No result is a
          removal instruction.
        </p>
        <p>
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>{" "}
          ·{" "}
          <a
            href="https://asiresearch.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            ASI Research Labs
          </a>
        </p>
      </footer>
    </main>
  );
}
