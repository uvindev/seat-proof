/**
 * @project  SeatProof — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @built    2026
 * @license  Proprietary — all rights reserved
 */

import type {
  Assignment,
  EmploymentStatus,
  LicenseStatus,
  ParseResult,
} from "@/lib/types";

export const REQUIRED_HEADERS = [
  "app",
  "user_id",
  "license_status",
  "last_active_date",
  "monthly_seat_cost",
  "currency",
] as const;

export const TEMPLATE_CSV =
  "app,user_id,license_status,last_active_date,monthly_seat_cost,currency,department,manager,employment_status\n";

export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/[ -]+/g, "_");
}

function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function parseLicenseStatus(value: string): LicenseStatus | null {
  const status = normalized(value);
  return ["active", "suspended", "inactive", "revoked"].includes(status)
    ? (status as LicenseStatus)
    : null;
}

function parseEmploymentStatus(value: string): EmploymentStatus | null {
  const status = normalized(value || "unknown");
  return ["active", "terminated", "leave", "unknown"].includes(status)
    ? (status as EmploymentStatus)
    : null;
}

export function parseAssignments(input: string): ParseResult {
  const rows = parseCsvRows(input.replace(/^\uFEFF/, ""));
  if (rows.length === 0)
    return {
      assignments: [],
      issues: [{ row: 1, message: "The CSV is empty." }],
    };

  const headers = rows[0].map(normalized);
  const missing = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  if (missing.length > 0) {
    return {
      assignments: [],
      issues: [{ row: 1, message: `Missing columns: ${missing.join(", ")}.` }],
    };
  }

  const indexOf = (header: string) => headers.indexOf(header);
  const assignments: Assignment[] = [];
  const issues: ParseResult["issues"] = [];

  rows.slice(1).forEach((cells, dataIndex) => {
    const rowNumber = dataIndex + 2;
    const read = (header: string) => (cells[indexOf(header)] ?? "").trim();
    const app = read("app");
    const userId = read("user_id");
    const licenseStatus = parseLicenseStatus(read("license_status"));
    const lastActiveDate = read("last_active_date");
    const monthlySeatCost = Number(read("monthly_seat_cost"));
    const currency = read("currency").toUpperCase();
    const employmentStatus = parseEmploymentStatus(read("employment_status"));
    const rowIssues: string[] = [];

    if (!app) rowIssues.push("app is empty");
    if (!userId) rowIssues.push("user_id is empty");
    if (!licenseStatus)
      rowIssues.push(
        "license_status must be active, suspended, inactive, or revoked",
      );
    if (lastActiveDate && !validDate(lastActiveDate))
      rowIssues.push("last_active_date must use YYYY-MM-DD");
    if (!Number.isFinite(monthlySeatCost) || monthlySeatCost < 0)
      rowIssues.push("monthly_seat_cost must be zero or greater");
    if (!/^[A-Z]{3}$/.test(currency))
      rowIssues.push("currency must be a three-letter code");
    if (!employmentStatus)
      rowIssues.push(
        "employment_status must be active, terminated, leave, or unknown",
      );

    if (rowIssues.length > 0) {
      issues.push({ row: rowNumber, message: rowIssues.join("; ") });
      return;
    }

    assignments.push({
      row: rowNumber,
      app,
      userId,
      licenseStatus: licenseStatus!,
      lastActiveDate: lastActiveDate || null,
      monthlySeatCost,
      currency,
      department: read("department") || null,
      manager: read("manager") || null,
      employmentStatus: employmentStatus!,
    });
  });

  return { assignments, issues };
}

function escapeCell(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToCsv(rows: Array<Array<string | number | null>>): string {
  return `${rows.map((row) => row.map(escapeCell).join(",")).join("\n")}\n`;
}
