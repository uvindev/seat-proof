/**
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

export type LicenseStatus = "active" | "suspended" | "inactive" | "revoked";
export type EmploymentStatus = "active" | "terminated" | "leave" | "unknown";

export type Assignment = {
  row: number;
  app: string;
  userId: string;
  licenseStatus: LicenseStatus;
  lastActiveDate: string | null;
  monthlySeatCost: number;
  currency: string;
  department: string | null;
  manager: string | null;
  employmentStatus: EmploymentStatus;
};

export type FindingCode =
  | "terminated_worker"
  | "suspended_license"
  | "never_active"
  | "inactive_seat"
  | "duplicate_assignment"
  | "owner_missing";

export type Finding = {
  code: FindingCode;
  severity: "high" | "medium" | "low";
  assignment: Assignment;
  reason: string;
  action: string;
  inactiveDays: number | null;
};

export type ParseIssue = { row: number; message: string };
export type ParseResult = { assignments: Assignment[]; issues: ParseIssue[] };

export type AuditResult = {
  findings: Finding[];
  reviewedAssignments: number;
  affectedAssignments: number;
  exposureByCurrency: Record<string, number>;
  appCount: number;
};
