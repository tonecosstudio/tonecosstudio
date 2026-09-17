# Rollback — `upload-payment-proof`

## Pre-change state

Before the first production deployment on 2026-09-17, the canonical Supabase project `pdytjhtjlxvbbeuxgnms` had **no deployed Edge Function** with slug `upload-payment-proof`.

The application source already called this endpoint, so the pre-change runtime behavior was an unavailable/missing Edge endpoint.

## Rollback after first deployment

The exact rollback is to delete the remote Edge Function and return the project to the pre-change state:

```bash
supabase functions delete upload-payment-proof --project-ref pdytjhtjlxvbbeuxgnms
```

This command deletes only the remote Edge Function; it does not remove the versioned source from Git.

## Verification

After rollback:

1. list the project's Edge Functions;
2. confirm there is no function with slug `upload-payment-proof`;
3. do not treat payment-proof upload as operational until the function is deployed again and verified.

## Security invariant

When deployed, this function must keep JWT verification enabled. Do not roll back by redeploying it with JWT verification disabled.
