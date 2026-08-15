# SeatProof opportunity brief

## Decision

Build a browser-local SaaS license assignment audit for IT, operations, and finance teams preparing for renewals.

## Recurring job

An operator exports assigned users, last-active dates, seat costs, and employment state. They need to identify seats that deserve a human decision, get owner confirmation, and make any change in the source system.

Microsoft documents separate license and product-usage views and supports exporting large reports to Excel, Power BI, or the Microsoft Graph reports API. Google Workspace supports CSV-based bulk license administration and CSV exports for application-usage reports. The raw material exists, but the operator still needs a cross-application review queue.

## Current evidence

- [Microsoft 365 usage reports](https://learn.microsoft.com/en-us/microsoft-365/admin/activity-reports/activity-reports?view=o365-worldwide) expose license and service-usage information and allow report export.
- [Google Workspace license administration](https://support.google.com/a/answer/1727173) supports bulk CSV workflows for license assignments.
- [Torii license cost-saving documentation](https://support.toriihq.com/hc/en-us/articles/4577306621595-Introduction-to-Licenses-Cost-Saving-in-Torii) treats past employees, no usage, suspended accounts, and unassigned seats as reviewable license states. Torii notes that SSO-derived usage can be less accurate because it observes logins.
- [Torii custom integration documentation](https://support.toriihq.com/hc/en-us/articles/5164699821979-How-to-Connect-Custom-Integrations) includes users, license status, last-used date, unassigned amount, and per-user price in its schema. This supports the selected normalized fields.

The evidence confirms the workflow and data shape. It does not establish SeatProof demand or willingness to pay.

## Candidate comparison

| Candidate                    | Recurring pain                                                                        | Existing coverage                                                                                                      | Bounded differentiator                                   | Decision                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| SaaS assignment audit        | Renewal teams need to review inactive, suspended, departed, and duplicate assignments | Torii and Zylo provide broader connected SaaS management                                                               | First result from one local CSV, no connector or account | Build                                                                              |
| Support SLA export triage    | Support leads reconstruct breached tickets and owners                                 | Zendesk has native SLA and export reporting, with plan-dependent export access                                         | Metadata-only breach reconstruction                      | Hold; source schemas vary and customer-ticket data raises privacy cost             |
| DMARC drift monitor          | MSPs inspect authentication posture across domains                                    | [DMARC.org lists many free and commercial providers](https://dmarc.org/resources/products-and-services/)               | Local snapshot comparison                                | Reject; crowded and live DNS dependency weakens a bounded offline product          |
| Stripe payout reconciliation | Controllers match payouts, fees, refunds, and deposits                                | [Stripe provides payout reconciliation reports](https://docs.stripe.com/reports/payout-reconciliation) and CSV exports | Cross-platform settlement matching                       | Reject; single-platform need is already covered and cross-platform scope is larger |

## Target user

Small and mid-sized organizations, agencies, and fractional IT or finance operators that can obtain SaaS assignment exports but do not want to connect a full SaaS-management platform for an initial review.

## Paid value

Team is a `[TARGET] $24/workspace/month` hypothesis. Proposed paid work:

- saved audit history without retaining raw identifiers by default;
- Google Workspace, Microsoft 365, Okta, and vendor source connectors;
- owner approval requests and exception records;
- renewal calendar and audit comparisons;
- reviewed organization policies and export formats.

No competitor price is used to justify the target. Willingness to pay is `[UNVERIFIED]`.

## Distribution

GitHub, search traffic around SaaS license audits, IT operations communities, Microsoft 365 and Google Workspace administrators, and fractional finance or IT operators.

## Assumptions

- `[UNVERIFIED]` Operators will use a local CSV audit before adopting or alongside a connected SaaS-management platform.
- `[UNVERIFIED]` A masked, evidence-linked queue is safer and faster than a renewal spreadsheet.
- `[UNVERIFIED]` Teams will pay for history, connectors, approvals, and exception policies.
- `[TARGET]` Recruit five design partners after an approved deployment and outreach plan.

## Boundaries

- A last-active date may lag or represent SSO login rather than in-product work.
- An inactive finding is a prompt for owner confirmation, not an instruction to remove access.
- Monthly cost is user-supplied and unverified.
- Currencies are never converted or combined.
- The v0.1 workbench does not discover unassigned inventory because its input contains assignments, not purchased-seat totals.
