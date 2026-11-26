
# TONART — Google Drive Black Friday

The commercial site displays a separate **Salvar no Drive** action only after the canonical TONART administrator check. The existing download remains unchanged. The separate public/read-only build has no Google Drive or Auth integration.

The existing catalog Worker is the only writer. It accepts a public media path and, for the main catalog, the model slug; it derives the public media membership, name and category server-side. Telegram images use the authorized public display variant. Destination is the verified Blackfriday root configured by `BLACKFRIDAY_DRIVE_FOLDER_ID`. No caller can select another Drive path or supply an arbitrary URL. Existing flat category names are preserved, with counts recalculated from actual image files. Unknown/provisional identity goes to A identificar. SHA-256 prevents exact byte duplicates, not visual duplicates or format-converted copies.

## Production provisioning gate

1. Enable Google Drive API in a Google Cloud project controlled by TONART. Create an OAuth client and authorize offline access as a human user with edit rights to the existing Blackfriday folder and every category/file used for counting and deduplication. This folder is in My Drive, not a Workspace Shared Drive. Do not use a service account as the uploader: it has no storage quota. Prefer a dedicated Google identity with access only to the promotional folder, or explicit owner consent for the full Drive scope needed to enumerate and count existing files. A `drive.file` grant that only sees newly created files is insufficient for exact counts. A testing-mode consent screen may issue expiring refresh tokens; use the production consent configuration applicable to the account.
2. Store the JSON object with keys `client_id`, `client_secret`, `refresh_token` as the optional Worker secret `BLACKFRIDAY_DRIVE_OAUTH` using the existing authenticated Wrangler/Cloudflare secret flow. Never commit these credentials or put them in frontend variables, GitHub issues, logs, or chat. The Google consent/token must belong to TONART, not the ChatGPT Drive connector. Revoke via Google and remove the secret to disable it.
3. Apply the D1 migration using the existing controlled catalog Worker release flow. Do not deploy a second worker or use the local Drive sync application.
4. Validate an authenticated admin GET/POST on the official TONART domain. Verify guest and customer POST return 403, and invalid/private media paths do not upload. Save an approved test image, check Google Drive content and real count, retry the same image, and verify no duplicate. Verify both commercial catalog surfaces and that the standalone read-only catalog still builds without Auth. The admin button is disabled until a server secret is configured. Do not claim live readiness until Google upload, readback, retry and count pass.

The export supports public image payloads up to 5 MiB (Google multipart upload); larger payloads fail explicitly rather than silently downscale. Existing production display WebP is expected to fit. A lost response can be retried safely: a D1 reservation retains the Google-generated file ID, with a short root-scoped lease for serialization; Google returns conflict for a repeated successful creation. A successful result means the Drive content was verified and the category count reconciled.

Google docs: https://developers.google.com/workspace/drive/api/guides/manage-uploads
https://developers.google.com/workspace/drive/api/guides/api-specific-auth
https://developers.google.com/workspace/drive/api/guides/handle-errors
