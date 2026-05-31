**#sre — topshot-data-portal nightly ETL down since ~May 18**

`etl-incremental-sync` (GitHub Actions, `roham/topshot-data-portal`) fails at the BigQuery step:

> Access Denied: User does not have `bigquery.jobs.create` permission in project `dapperlabs-data`

The ETL service account (key in the repo secret `GCP_BQ_SA_JSON`) lacks query permission on `dapperlabs-data`, so the portal's data was frozen at 2026-05-16. I unblocked it today with a one-off manual sync on my own creds, but the nightly keeps failing until the SA is fixed.

**Ask:** grant `roles/bigquery.jobUser` on `dapperlabs-data` to that service account (+ `roles/bigquery.dataViewer` on the source dataset if it's missing that too). SRE can read the SA's `client_email` from the Actions secret — happy to confirm which identity it is.
