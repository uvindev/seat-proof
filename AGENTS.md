# SeatProof repository instructions

- Use Next.js 15 App Router, strict TypeScript, Tailwind CSS v4, and pnpm.
- Process assignment data in the browser. Do not persist or transmit source rows.
- Never add or convert monetary amounts across currencies.
- Mask user identifiers by default. Exports may contain raw identifiers because they remain local.
- Treat cost exposure as an estimate from user-supplied data, not realized savings.
- Add or update tests for parsing, rules, currency grouping, masking, and exports.
- Run `pnpm verify` before shipping.
- Public claims must match `docs/OPPORTUNITY.md` and `docs/SPEC.md`.

## IAMUVIN SIGNATURE — MANDATORY

Every project carries the IAMUVIN signature. Full spec: `docs/IAMUVIN-SIGNATURE.md`.

Minimum on every build:

1. Console badge — `%c IAMUVIN` chip, `#F7931A` on `#0A0A0A`, then `Built by Uvin Vindula — iamuvin.com`. Fires once, in production.
2. Footer credit — `Built by Uvin Vindula` linking to https://iamuvin.com, `rel="noopener noreferrer"`.
3. Head metadata — `author`, `creator`, JSON-LD `creator`.
4. File headers on entry points.
5. `package.json` author, `X-Built-By` header, `humans.txt`, README footer.

Verify with `./scripts/verify-signature.sh` before marking any task done.
Em dash `—` always. No emoji. Never `console.clear()`.
Git identity: `Uvin Vindula <uvin95dev@gmail.com>`.
