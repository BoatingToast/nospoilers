# Audience Engine

Audience Engine is a first-party research workflow for creators and NoSpoilers
data operations. It supports creator-owned text concepts and private video
uploads, uniform preview experiments, explicit taste questionnaires, feedback,
quality review, and permissioned dataset versions. No model-provider key is
required.

## Routes

- `/creator/audience`: creator studies and collection totals.
- `/creator/audience/new`: draft a study with one to three previews and a stable creator-assigned work ID.
- `/creator/audience/[id]`: owner-only report, lifecycle controls, and aggregate CSV.
- `/audience`: signed-in member discovery of active, discoverable studies.
- `/audience/[code]`: invitation, study consent, assigned preview, feedback,
  corrections, and withdrawal. Public metadata excludes preview contents.
- `/admin`: restricted data workspace, quality review, event explorer, dataset
  registry, and audit trail. The Direction view summarizes product adoption,
  media evidence, preference coverage, data-contract failures, and operational
  collection priorities with explicit supporting counts.
- `/admin/studies/[id]`: administrator read-only study report.

Creators use their normal authenticated account; research does not require Pro.
The existing Theater/Audience Labs remain available independently.

## Installation and administrator

Run `npm run db:deploy` before deploying the new application. The migrations add
the research tables and `User.isAdmin`. It grants the existing account with the
normalized email `emoon0108@gmail.com` administration if it exists. Every admin
page and API requires both this exact email allowlist and the persisted grant,
re-read from the database on each admin request. Pro status and client-supplied
session fields never grant administration. Public registration reserves the
administrator address.

For an existing account, `npm run admin:provision` grants access without changing
its password. If the account is absent, run:

```sh
npm run admin:provision -- --credentials-file /private/tmp/nospoilers-admin-login.txt
```

The script creates the account with a strong random password. It writes the
initial credentials exclusively to a new file outside this repository, with
mode `0600`, and never prints the password. Store it in a password manager and
delete the temporary file. Provision against the deployment's actual database;
a local database grant does not affect another environment.

## Collection and provenance

Each enrollment stores a consent version/time, a separate optional reuse consent,
six explicit preference dimensions, the member's primary interest, a recruitment
source, model version, alignment score, and assignment probability. Accounts are
not exposed to creators. The project stores the creator's asset-rights statement
and confirmation time; dataset exports omit source media and raw preview text.

A stable work ID groups repeated studies of the same work within a creator
account and medium. Use it consistently. Work identity is creator-assigned;
cross-owner entity resolution and automatic adaptation matching are not yet
implemented. Historical records receive separate legacy identities rather than
being silently merged by title.

Assignment is uniformly random among a study's previews, then persisted under
the unique `(projectId, userId)` identity. Retrying or opening another tab does
not reroll it. Experiments do not preferentially assign a variant based on the
alignment score. Creators cannot enroll in their own studies.

Events have a unique `(participantId, eventKey)`, a server timestamp, a schema
version, and a whitelisted payload. Requests cannot supply user, study, or
variant ownership. Enrollment, exposure, start, progress, interest, and feedback
have distinct meanings. Serializable transactions with bounded retry handle
concurrent enrollment, duplicate events, feedback, review, and withdrawals.
Mutations enforce origin, size, ownership, and per-user rate limits.

Browser playback events are user-controlled observations. A reported 90% playhead
is not proof of attention or full sequential viewing. Text previews have no
playback-completion metric. The in-app interest action is not a purchase or
external conversion. A minimum feedback delay is a basic quality signal rather
than fraud detection. No external advertising or purchase attribution is claimed.

## Matching and analysis

`explicit-fit-v1` is a transparent normalized absolute-distance comparison of six
preference dimensions and creator-supplied work labels. Its 0–100 alignment score
is not a probability of enjoyment, a calibrated prediction, or an estimate of
market reach. Discovery uses existing Movie DNA as an exploratory proxy when
available; enrollment uses the member's explicit study answers.

Reports aggregate in PostgreSQL rather than loading the raw event stream into a
browser. Denominators count unique participants. Quality-excluded records are
omitted; pending records are provisional. Rating averages require five responses
per variant; cohort groups require five participants and average ratings require
five responses. Only reviewed comments appear, after five total study responses.
Creators receive no per-person rows or dataset downloads.

Interest-rate intervals use a 95% Wilson interval. Comparison messaging requires
at least 30 exposed participants in every variant and checks interval overlap.
This is a conservative descriptive comparison, not a preregistered significance
test, multiplicity correction, causal-lift estimate, or guaranteed winner.
Recruitment bias and optional feedback still affect the sample. A sufficiently
powered prospective experiment is needed to validate the matching policy.

## Data operations and datasets

The admin workspace separates operational platform counts (users, ratings,
uploads, screenings) from permissioned research. Platform/catalog records are
not automatically copied into training data. Event windows are 7/30/90 days;
other clearly labeled KPIs are lifetime. The explorer has cursor pagination and
sanitized JSON payload inspection. Current creator lists are capped at 100
studies; the admin overview shows the latest 25 studies and a pending-review summary.
The review workspace supports pending, accepted, excluded, and all-response
filters with cursor pagination, allowing decisions to be corrected later.

Review concerns quality and identifying information, independently of positive
or negative opinion. Admin accepts or excludes responses with a review note.
All review decisions, lifecycle changes, and exports have an audit record.

Dataset data-contract checks reject invalid consent versions, preference/work
labels, assignment probabilities, and incomplete outcome scales even if the
record was accepted in review.

Only exposed, submitted, human-accepted responses with explicit reuse consent
are eligible for dataset versions. A version freezes at most 5,000 rows and
records schema/model versions, row counts, and deterministic whole-work
train/evaluation assignments (dataset schema v2). Some small datasets can contain only one split;
the registry displays the actual counts. Exports omit user/account IDs, email,
names, source media, preview text, and free-text comments. Sample/work IDs are
pseudonyms and should be handled as research data, not claimed to be anonymous.

Corrections or quality changes invalidate and purge affected local dataset
payloads. Withdrawal deletes the participation and cascading events, recalculates
reports through live queries, and invalidates/purges affected dataset versions.
Downloads recheck permissions transactionally and return 410 for invalidated
versions. Files already downloaded cannot be remotely recalled. There is no
automatic training or external data transfer.

## Verification

`npm run test:audience` covers access policy, input/consent validation, payload
whitelisting, fit behavior, uncertainty, CSV injection, project-level splits,
and cross-origin rejection.

The integration runner explicitly refuses non-local databases or applications.
Initialize a disposable PostgreSQL database named `audience_engine_test`, apply
migrations, and start a dedicated dev server with:

```sh
DATABASE_URL=postgresql://localhost:55439/audience_engine_test \
NEXTAUTH_SECRET=audience-integration-test-secret \
NEXTAUTH_URL=http://127.0.0.1:3107 \
npm run dev -- --hostname 127.0.0.1 --port 3107
```

Then run `AUDIENCE_TEST_DATABASE_URL=postgresql://127.0.0.1:55439/audience_engine_test npm run test:audience:integration`. The runner creates and removes isolated
fixtures. It verifies actual authenticated HTTP routes, authorization boundaries,
stable concurrent assignments, event/feedback deduplication, small-cohort
suppression, permissioned exports, corrections, and withdrawal invalidation.
