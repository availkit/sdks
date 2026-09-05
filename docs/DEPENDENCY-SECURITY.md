# Dependency security

Verified 2026-09-05 with Bun's npm advisory audit: no advisories remain.

The published `@availkit/client` package has no runtime dependencies. The
affected packages were SDK generation tooling: `fast-uri` through schema
parsing, `brace-expansion` through TypeDoc, and `js-yaml` through Orval.

Targeted lockfile refreshes select `fast-uri` 3.1.7 and `brace-expansion` 5.0.9
within the existing dependency ranges. Orval 8.22.0 pins vulnerable `js-yaml`
4.2.0 exactly, so the root manifest temporarily overrides it to 4.3.1. Keep
Orval pinned to preserve the recorded generator contract. Remove the override
when an intentionally reviewed generator upgrade includes a fixed js-yaml.

Validation: frozen install, typecheck, four client tests, package build,
Node ESM/CommonJS, Bun, browser bundle, package-content check, and regeneration
against the checksum-verified 2026.09.05.1 contract all pass. The dependency
patches preserve generation; client 0.1.1 separately adds the contract's typed
429 responses and updated provenance.

Generation now runs Orval's directory cleanup in a temporary directory and
copies only the generated artifact on success. This preserves handwritten
`client.ts` and `index.ts`; `generate:check` includes a sibling-file canary.

Recheck with `bun audit --json` after future dependency changes; an empty
object means the registry returned no advisories for the lockfile at that time.
