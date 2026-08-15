# SeatProof v0.1 specification

## Product contract

SeatProof accepts one UTF-8 CSV up to 1 MB and analyzes it in page memory. It renders a masked decision queue and exports a raw local queue or aggregate summary. It makes no account changes.

## Input

Required headers:

- `app`
- `user_id`
- `license_status`
- `last_active_date`
- `monthly_seat_cost`
- `currency`

Optional headers:

- `department`
- `manager`
- `employment_status`

`last_active_date` can be blank to represent no supplied activity. Monthly cost must be zero or greater. Currency is any three-letter code. Blank employment status becomes `unknown`.

## Rules

| Code                   | Condition                                                | Priority | Review step                                       |
| ---------------------- | -------------------------------------------------------- | -------- | ------------------------------------------------- |
| `terminated_worker`    | Employment status is terminated                          | High     | Confirm offboarding, then remove at source        |
| `suspended_license`    | License status is suspended                              | High     | Confirm intent and revoke at source if unused     |
| `never_active`         | Active or suspended assignment has no last-active date   | Medium   | Ask the owner whether to activate or remove       |
| `inactive_seat`        | Active assignment is at or beyond the selected threshold | Medium   | Confirm continued need before renewal             |
| `duplicate_assignment` | Normalized app and user pair appears more than once      | High     | Check the source and keep one intended assignment |
| `owner_missing`        | Manager is blank                                         | Low      | Assign an owner before the reclaim decision       |

One assignment can produce multiple findings. Reviewable monthly cost counts each affected source row once, even if it has multiple findings. Results are grouped by currency.

## Safety and privacy

- Source content stays in React state and is not written to local storage, cookies, a server, or analytics.
- User identifiers are masked on screen until the operator explicitly reveals them.
- Exported review queues include raw identifiers because the download is generated locally for operational use.
- Security headers deny framing, object sources, camera, microphone, and geolocation.
- Plausible events contain event names only and are disabled unless a deployment owner sets a domain.
- Export cells beginning with `=`, `+`, `-`, or `@` receive a leading apostrophe to prevent spreadsheet formula execution.

## Analytics

| Stage           | Event                   |
| --------------- | ----------------------- |
| Acquisition     | `workbench_viewed`      |
| Activation      | `assignments_reviewed`  |
| Retention proxy | `review_queue_exported` |
| Paid conversion | `pricing_intent`        |
| Feedback        | `feedback_intent`       |

No source values, counts, costs, or identifiers are attached to events.

## Non-goals

- Direct vendor connections
- Automatic deprovisioning
- Currency conversion
- Purchased versus unassigned inventory analysis
- Persistent accounts, workspaces, or history
- Claims of realized savings

## Success criteria

- Valid sample produces expected high, medium, and low findings.
- Malformed, empty, missing-column, invalid-enum, invalid-date, and invalid-cost inputs fail with row-specific messages.
- An affected row contributes its cost once per currency.
- Masking hides the local part of email-like identifiers by default.
- Queue and summary exports are deterministic.
- `pnpm verify` and the signature gate pass.
