# dBrain manuals

These manuals describe the current 0.1.0 internal-test code and workflows. They address three readers: the developer, the deployment operator, and the user.

Chinese versions of these manuals are in [`zh/`](zh/README.md).

| Manual | Content |
| --- | --- |
| [Development](development.md) | Environment, project layout, web and desktop development, quality gates, and maintenance |
| [Operations](operations.md) | Source deployment, image deployment, access configuration, backup, restore, and troubleshooting |
| [Usage](usage.md) | Installation, accounts and data, workspace, graph, dashboard, and upgrade |
| [CI/CD pipeline](ci-cd.md) | The push gate, the trailer, the verifier, the merge gate, the tag, the declared platforms, the release candidate, the acceptance gate, the publication gate, the repository policy, and caches |

## Manual maintenance

Run every command from the repository root. A section can state another directory, for example a release deployment directory.

Replace `RUN_ID`, `ATTEMPT`, `SOURCE_COMMIT`, and `VERSION` with real values. Read the variable definitions from the root `.env.example`, from `deploy/.env.example`, and from the named script.

The docs tree does not hold old release reports or verification logs. Read them from the Git history.

Write a release acceptance record to `docs/release-acceptance/vVERSION.json`. Create that directory with the first real record.

Do not commit credentials, personal data, or a full production log to the docs tree.
