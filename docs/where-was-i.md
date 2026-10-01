# Where Was I?

Where Was I? is a progress-bounded viewing companion at `/where-was-i`. The
vertical slice ships with **The Signal at Kestrel**, an original six-episode
mystery written for this demo. It does not use a scraped transcript or fabricate
coverage for a real title.

## Run the demo

```bash
npm install
npm run db:deploy
npm run ingest:where-was-i
npm run dev
```

Sign in, open `/where-was-i`, choose **Finished episode 4**, and confirm it.
Opening the page or changing the draft selector does not write progress. A
write happens only when the viewer presses the confirmation button.

Ask **“Who is Grey Finch?”** at episode 4. The supported answer is:

> Grey Finch is an unidentified name in June’s notebook associated with
> altered rescue calls; the material through episode 4 does not identify a
> person behind it.

Then explicitly confirm episode 5 and ask the same question. The supported
answer changes to:

> The signed authorization and June’s cipher key establish that Sable Chen
> used the name Grey Finch.

The earlier answer contains no hint that an existing character will later be
connected to the name.

## Security boundary

Plot Passport remains the only progress system. `ResumeTitle.catalogId` maps a
supported title to the existing `(userId, tmdbId)` `WatchlistItem`; series
progress uses its `currentSeason` and `currentEpisode`, while films use only
ingested, supported checkpoint percentages. The page never infers progress from
visits or playback.

For every recap or question, the server:

1. authenticates the user and reads only that user's `WatchlistItem`;
2. resolves the exact supported checkpoint;
3. queries `ResumeEvidence` with `earliestCheckpoint.ordinal <= authorized`;
4. removes source rows that resemble embedded prompt instructions;
5. ranks only the remaining rows;
6. optionally asks the model for a strict JSON list of candidate evidence IDs;
7. rejects IDs outside the allowed candidate set; and
8. renders exact stored evidence claims, never model-authored factual prose.

If support is insufficient, the response is always: “The material available at
your selected progress doesn’t establish that.” The wording does not imply a
later episode contains the answer.

This is layered risk reduction, not a proof that leakage is impossible. Model
prior knowledge is contained by preventing the model from writing the answer,
but curation, metadata, and retrieval logic still require review and evaluation.

## Character state and indirect leaks

Characters use a stable server key plus one `ResumeCharacterSnapshot` per
checkpoint. Display names, relationships, viewer context, and character
knowledge live in the snapshot rather than in global metadata. The browser gets
an opaque character record ID, not the stable key. Headings and suggested
questions are derived only from the exact authorized snapshot. Every displayed
claim must reference evidence already valid at that checkpoint.

## Cache, rollback, ownership, and privacy

Answers are cached under the compound identity:

`user + title + checkpoint + sourceVersion + normalizedQuestionHash`

This prevents cross-user reuse and makes a source revision a new cache space.
When a user lowers progress, the same database transaction updates the existing
Plot Passport record and deletes that user's higher-checkpoint answer caches.
Questions are stateless; no prior conversation is sent on the next request.

Both mutation endpoints require the authenticated session, derive ownership
from `session.user.id`, validate inputs, send private no-store responses, and use
the existing database-backed rate limiter. API credentials stay server-side.

Shield is unchanged: its extension continues classifying pages on-device. An
explicit Passport sync sends only unfinished title strings. Where Was I?
evidence, character state, and questions are never sent to the extension.

## Adding licensed material

Create a JSON corpus shaped like
`data/where-was-i/the-signal-at-kestrel.json`, then run:

```bash
npm run ingest:where-was-i -- path/to/licensed-title.json
```

The ingester checks schema version, unique checkpoints and evidence IDs,
series/film boundary fields, evidence existence, earliest-valid checkpoints,
future references in recap and character claims, duplicate snapshots, and
instruction-like source material. It replaces the title corpus transactionally
and clears old cached answers. Rights provenance belongs in `rightsNote`; do not
ingest unlicensed transcripts.

## Checks

```bash
npm run test:where-was-i
npm run eval:where-was-i
npm run typecheck
npm run lint
npm run build
```

The evaluation cases live in `evals/where-was-i-cases.json`, and the observed
results are recorded in `docs/where-was-i-evaluation.md`.
