# Booking API contract releases

SDK generation consumes immutable GitHub release assets. OpenAPI schemas are never committed to this repository.

Each contract release contains exactly three upstream-generated files:

- `availkit-booking-openapi-<version>.json`
- `source-manifest.json`
- `SHA256SUMS`

`source-manifest.json` binds the API version, source commit, tag, lockfile digest, and OpenAPI artifact digest. `SHA256SUMS` covers the schema and manifest.

## Automated intake

Run the `Contract release` workflow with the source repository, source Actions run ID, and artifact name. The source artifact must contain only the three files above. The workflow checks the manifest/tag/file relationship and all checksums, then creates `booking-api-v<version>` with those assets attached. The checked-out source tree is not modified.

## Coordinator fallback

If Actions intake is unavailable, verify and create the release from the exported directory:

```sh
(cd /path/to/export && shasum -a 256 --check SHA256SUMS)
gh release create booking-api-v2026.07.16.2 \
  /path/to/export/availkit-booking-openapi-2026.07.16.2.json \
  /path/to/export/source-manifest.json \
  /path/to/export/SHA256SUMS \
  --repo availkit/sdks \
  --title 'Booking API 2026.07.16.2' \
  --notes 'Immutable AvailKit Booking API contract artifacts.'
```

After release creation, update `packages/typescript/sdk-source.json` with the immutable asset URL, asset digest, source commit, generator version, and canonical generator-config digest. Regeneration either downloads that release asset or accepts `OPENAPI_PATH`; both paths verify the schema digest before invoking the pinned generator.
