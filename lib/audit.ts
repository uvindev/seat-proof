/**
 * @project  SeatProof — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @built    2026
 * @license  MIT
 */

import { rowsToCsv } from "@/lib/csv";
import type {
  Assignment,
  AuditResult,
  Finding,
  FindingCode,
} from "@/lib/types";

const RULES: Record<FindingCode, Pick<Finding, "severity" | "action">> = {
  terminated_worker: {
    severity: "high",
    action: "Confirm offboarding, then remove the assignment.",
  },
  suspended_license: {
    severity: "high",
    action: "Confirm access intent and revoke the paid seat if unused.",
  },
  never_active: {
    severity: "medium",
    action: "Ask the owner whether this seat should be activated or removed.",
  },
  inactive_seat: {
    severity: "medium",
    action: "Confirm continued need with the owner before the next renewal.",
  },
  duplicate_assignment: {
    severity: "high",
    action: "Check the source system and keep one intended assignment.",
  },
  owner_missing: {
    severity: "low",
    action: "Assign a manager before deciding whether to reclaim the seat.",
  },
};

function makeFinding(
  assignment: Assignment,
  code: FindingCode,
  reason: string,
  inactiveDays: number | null,
): Finding {
  return { code, assignment, reason, inactiveDays, ...RULES[code] };
}

export function daysBetween(from: string, to: string): number {
  return Math.floor(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

export function auditAssignments(
  assignments: Assignment[],
  referenceDate: string,
  thresholdDays: number,
): AuditResult {
  const findings: Finding[] = [];
  const duplicateKeys = new Set<string>();
  const seen = new Set<string>();

  assignments.forEach((assignment) => {
    const key = `${assignment.app.toLocaleLowerCase()}\u0000${assignment.userId.toLocaleLowerCase()}`;
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  });

  assignments.forEach((assignment) => {
    const key = `${assignment.app.toLocaleLowerCase()}\u0000${assignment.userId.toLocaleLowerCase()}`;
    const inactiveDays = assignment.lastActiveDate
      ? daysBetween(assignment.lastActiveDate, referenceDate)
      : null;
    if (assignment.employmentStatus === "terminated") {
      findings.push(
        makeFinding(
          assignment,
          "terminated_worker",
          "The assignment belongs to a terminated worker.",
          inactiveDays,
        ),
      );
    }
    if (assignment.licenseStatus === "suspended") {
      findings.push(
        makeFinding(
          assignment,
          "suspended_license",
          "The paid assignment is suspended.",
          inactiveDays,
        ),
      );
    }
    if (
      !assignment.lastActiveDate &&
      !["revoked", "inactive"].includes(assignment.licenseStatus)
    ) {
      findings.push(
        makeFinding(
          assignment,
          "never_active",
          "No last-active date was supplied for this assigned seat.",
          null,
        ),
      );
    }
    if (
      inactiveDays !== null &&
      inactiveDays >= thresholdDays &&
      assignment.licenseStatus === "active"
    ) {
      findings.push(
        makeFinding(
          assignment,
          "inactive_seat",
          `No recorded activity for ${inactiveDays} days.`,
          inactiveDays,
        ),
      );
    }
    if (duplicateKeys.has(key)) {
      findings.push(
        makeFinding(
          assignment,
          "duplicate_assignment",
          "The app and user pair appears more than once.",
          inactiveDays,
        ),
      );
    }
    if (!assignment.manager) {
      findings.push(
        makeFinding(
          assignment,
          "owner_missing",
          "No manager was supplied for this assignment.",
          inactiveDays,
        ),
      );
    }
  });

  const affectedRows = new Set(
    findings.map((finding) => finding.assignment.row),
  );
  const exposureByCurrency: Record<string, number> = {};
  assignments.forEach((assignment) => {
    if (!affectedRows.has(assignment.row)) return;
    exposureByCurrency[assignment.currency] =
      (exposureByCurrency[assignment.currency] ?? 0) +
      assignment.monthlySeatCost;
  });

  return {
    findings,
    reviewedAssignments: assignments.length,
    affectedAssignments: affectedRows.size,
    exposureByCurrency,
    appCount: new Set(
      assignments.map((assignment) => assignment.app.toLocaleLowerCase()),
    ).size,
  };
}

export function maskUserId(userId: string): string {
  const at = userId.indexOf("@");
  if (at > 0) {
    const local = userId.slice(0, at);
    const domain = userId.slice(at + 1);
    return `${local.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`;
  }
  if (userId.length <= 4) return `${userId.slice(0, 1)}•••`;
  return `${userId.slice(0, 2)}${"•".repeat(Math.min(6, userId.length - 4))}${userId.slice(-2)}`;
}

export function findingsToCsv(findings: Finding[]): string {
  return rowsToCsv([
    [
      "severity",
      "code",
      "app",
      "user_id",
      "license_status",
      "employment_status",
      "last_active_date",
      "inactive_days",
      "monthly_seat_cost",
      "currency",
      "department",
      "manager",
      "reason",
      "recommended_action",
    ],
    ...findings.map((finding) => [
      finding.severity,
      finding.code,
      finding.assignment.app,
      finding.assignment.userId,
      finding.assignment.licenseStatus,
      finding.assignment.employmentStatus,
      finding.assignment.lastActiveDate,
      finding.inactiveDays,
      finding.assignment.monthlySeatCost.toFixed(2),
      finding.assignment.currency,
      finding.assignment.department,
      finding.assignment.manager,
      finding.reason,
      finding.action,
    ]),
  ]);
}

export function summaryToCsv(result: AuditResult): string {
  return rowsToCsv([
    ["metric", "value", "currency"],
    ["reviewed_assignments", result.reviewedAssignments, null],
    ["affected_assignments", result.affectedAssignments, null],
    ["applications", result.appCount, null],
    ...Object.entries(result.exposureByCurrency)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amount]) => [
        "reviewable_monthly_cost",
        amount.toFixed(2),
        currency,
      ]),
  ]);
}
