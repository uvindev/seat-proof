/**
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import { describe, expect, it } from "vitest";
import {
  auditAssignments,
  daysBetween,
  findingsToCsv,
  maskUserId,
  summaryToCsv,
} from "@/lib/audit";
import { parseAssignments, parseCsvRows, rowsToCsv } from "@/lib/csv";
import type { Assignment } from "@/lib/types";

const HEADER =
  "app,user_id,license_status,last_active_date,monthly_seat_cost,currency,department,manager,employment_status";

function row(overrides: Partial<Assignment> = {}): Assignment {
  return {
    row: 2,
    app: "Figma",
    userId: "ava@example.test",
    licenseStatus: "active",
    lastActiveDate: "2026-07-01",
    monthlySeatCost: 15,
    currency: "USD",
    department: "Design",
    manager: "Noah",
    employmentStatus: "active",
    ...overrides,
  };
}

describe("CSV parsing", () => {
  it("parses a valid assignment", () => {
    const result = parseAssignments(
      `${HEADER}\nFigma,ava@example.test,active,2026-07-01,15,usd,Design,Noah,active`,
    );
    expect(result.issues).toEqual([]);
    expect(result.assignments[0]).toMatchObject({
      app: "Figma",
      currency: "USD",
      monthlySeatCost: 15,
    });
  });

  it("removes a UTF-8 byte order mark", () => {
    expect(
      parseAssignments(`\uFEFF${HEADER}\nFigma,a,active,,0,USD,,,unknown`)
        .assignments,
    ).toHaveLength(1);
  });

  it("parses quoted commas", () => {
    const rows = parseCsvRows('app,user_id\n"Design, Inc",a');
    expect(rows[1]).toEqual(["Design, Inc", "a"]);
  });

  it("parses escaped quotes", () => {
    expect(parseCsvRows('a\n"say ""hello"""')[1][0]).toBe('say "hello"');
  });

  it("parses CRLF input", () => {
    expect(parseCsvRows("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("rejects an unclosed quoted field", () => {
    expect(() => parseCsvRows('a\n"broken')).toThrow("unclosed");
  });

  it("reports an empty CSV", () => {
    expect(parseAssignments(" ").issues[0].message).toBe("The CSV is empty.");
  });

  it("reports all missing required columns", () => {
    const result = parseAssignments("app,user_id\nFigma,a");
    expect(result.issues[0].message).toContain("license_status");
    expect(result.issues[0].message).toContain("currency");
  });

  it("reports an empty app", () => {
    const result = parseAssignments(
      `${HEADER}\n,a,active,2026-01-01,1,USD,,,active`,
    );
    expect(result.issues[0].message).toContain("app is empty");
  });

  it("reports an empty user id", () => {
    const result = parseAssignments(
      `${HEADER}\nFigma,,active,2026-01-01,1,USD,,,active`,
    );
    expect(result.issues[0].message).toContain("user_id is empty");
  });

  it("rejects an unknown license status", () => {
    const result = parseAssignments(
      `${HEADER}\nFigma,a,pending,2026-01-01,1,USD,,,active`,
    );
    expect(result.issues[0].message).toContain("license_status");
  });

  it("rejects an unknown employment status", () => {
    const result = parseAssignments(
      `${HEADER}\nFigma,a,active,2026-01-01,1,USD,,,departed`,
    );
    expect(result.issues[0].message).toContain("employment_status");
  });

  it("defaults blank employment status to unknown", () => {
    const result = parseAssignments(
      `${HEADER}\nFigma,a,active,2026-01-01,1,USD,,,`,
    );
    expect(result.assignments[0].employmentStatus).toBe("unknown");
  });

  it("rejects invalid dates", () => {
    const result = parseAssignments(
      `${HEADER}\nFigma,a,active,01/02/2026,1,USD,,,active`,
    );
    expect(result.issues[0].message).toContain("YYYY-MM-DD");
  });

  it("accepts a blank last-active date", () => {
    expect(
      parseAssignments(`${HEADER}\nFigma,a,active,,1,USD,,,active`)
        .assignments[0].lastActiveDate,
    ).toBeNull();
  });

  it("rejects negative and nonnumeric costs", () => {
    const negative = parseAssignments(
      `${HEADER}\nFigma,a,active,,-1,USD,,,active`,
    );
    const text = parseAssignments(
      `${HEADER}\nFigma,a,active,,free,USD,,,active`,
    );
    expect(negative.issues[0].message).toContain("zero or greater");
    expect(text.issues[0].message).toContain("zero or greater");
  });

  it("rejects non-three-letter currencies", () => {
    expect(
      parseAssignments(`${HEADER}\nFigma,a,active,,1,dollars,,,active`)
        .issues[0].message,
    ).toContain("three-letter");
  });

  it("keeps valid rows while reporting bad rows", () => {
    const result = parseAssignments(
      `${HEADER}\nFigma,a,active,,1,USD,,,active\nNotion,b,pending,,2,USD,,,active`,
    );
    expect(result.assignments).toHaveLength(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].row).toBe(3);
  });
});

describe("audit rules", () => {
  it("calculates whole UTC days", () => {
    expect(daysBetween("2026-07-01", "2026-08-15")).toBe(45);
  });

  it("flags an inactive seat at the threshold", () => {
    const result = auditAssignments([row()], "2026-08-15", 45);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "inactive_seat",
    );
  });

  it("does not flag an active seat below the threshold", () => {
    const result = auditAssignments(
      [row({ lastActiveDate: "2026-07-02" })],
      "2026-08-15",
      45,
    );
    expect(result.findings).toEqual([]);
  });

  it("flags a terminated worker", () => {
    const result = auditAssignments(
      [row({ employmentStatus: "terminated" })],
      "2026-08-15",
      90,
    );
    expect(result.findings[0]).toMatchObject({
      code: "terminated_worker",
      severity: "high",
    });
  });

  it("flags a suspended license", () => {
    const result = auditAssignments(
      [row({ licenseStatus: "suspended" })],
      "2026-08-15",
      90,
    );
    expect(result.findings[0].code).toBe("suspended_license");
  });

  it("flags a never-active assigned seat", () => {
    const result = auditAssignments(
      [row({ lastActiveDate: null })],
      "2026-08-15",
      90,
    );
    expect(result.findings.map((finding) => finding.code)).toContain(
      "never_active",
    );
  });

  it("does not flag a revoked seat as never active", () => {
    const result = auditAssignments(
      [row({ licenseStatus: "revoked", lastActiveDate: null })],
      "2026-08-15",
      90,
    );
    expect(result.findings).toEqual([]);
  });

  it("flags every member of a duplicate pair case-insensitively", () => {
    const result = auditAssignments(
      [row(), row({ row: 3, app: "figma", userId: "AVA@example.test" })],
      "2026-08-15",
      90,
    );
    expect(
      result.findings.filter(
        (finding) => finding.code === "duplicate_assignment",
      ),
    ).toHaveLength(2);
  });

  it("flags a missing owner", () => {
    const result = auditAssignments([row({ manager: null })], "2026-08-15", 90);
    expect(result.findings[0]).toMatchObject({
      code: "owner_missing",
      severity: "low",
    });
  });

  it("counts one affected assignment despite multiple findings", () => {
    const result = auditAssignments(
      [row({ employmentStatus: "terminated", manager: null })],
      "2026-08-15",
      30,
    );
    expect(result.findings.length).toBeGreaterThan(1);
    expect(result.affectedAssignments).toBe(1);
    expect(result.exposureByCurrency.USD).toBe(15);
  });

  it("keeps exposure separated by currency", () => {
    const result = auditAssignments(
      [
        row({ manager: null }),
        row({
          row: 3,
          currency: "EUR",
          monthlySeatCost: 9,
          manager: null,
          userId: "b",
        }),
      ],
      "2026-08-15",
      90,
    );
    expect(result.exposureByCurrency).toEqual({ USD: 15, EUR: 9 });
  });

  it("counts applications case-insensitively", () => {
    const result = auditAssignments(
      [row(), row({ row: 3, app: "figma", userId: "b" })],
      "2026-08-15",
      90,
    );
    expect(result.appCount).toBe(1);
  });
});

describe("masking and exports", () => {
  it("masks email local parts but keeps the domain", () => {
    expect(maskUserId("ava@example.test")).toBe("a••@example.test");
  });

  it("masks opaque identifiers at both edges", () => {
    expect(maskUserId("employee-104")).toBe("em••••••04");
  });

  it("masks short identifiers", () => {
    expect(maskUserId("abc")).toBe("a•••");
  });

  it("quotes commas and doubles quotes in CSV", () => {
    expect(rowsToCsv([["a,b", 'say "hi"']])).toBe('"a,b","say ""hi"""\n');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(
      rowsToCsv([['=HYPERLINK("https://bad.test")', "+1", "-2", "@SUM(A:A)"]]),
    ).toBe('"\'=HYPERLINK(""https://bad.test"")",\'+1,\'-2,\'@SUM(A:A)\n');
  });

  it("exports a deterministic review queue", () => {
    const result = auditAssignments([row({ manager: null })], "2026-08-15", 90);
    const csv = findingsToCsv(result.findings);
    expect(csv).toContain("severity,code,app,user_id");
    expect(csv).toContain("owner_missing,Figma,ava@example.test");
    expect(csv).toContain("Assign a manager");
  });

  it("exports currencies in sorted order", () => {
    const result = auditAssignments(
      [
        row({ currency: "USD", manager: null }),
        row({ row: 3, userId: "b", currency: "EUR", manager: null }),
      ],
      "2026-08-15",
      90,
    );
    const csv = summaryToCsv(result);
    expect(csv.indexOf("15.00,EUR")).toBeLessThan(csv.indexOf("15.00,USD"));
  });
});
