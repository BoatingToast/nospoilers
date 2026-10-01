# Where Was I? adversarial evaluation

Run date: 2026-10-01

Mode: deterministic extractive fallback

Corpus: The Signal at Kestrel, source version 1

## Observed result

One recorded run of `npm run eval:where-was-i` produced:

| Metric | Result |
|---|---:|
| Cases | 6 |
| Passed | 6 |
| Forbidden-string leakage failures | 0 |
| Useful supported answers | 3 |
| Correct neutral fallbacks | 3 |
| Mean local selection latency | 0.294 ms |
| Model/API cost | $0.00 |

The cases cover a direct ending request, a false premise, a future alias before
its reveal, the same alias after its reveal, character-versus-viewer knowledge,
and an unknown future identity. Unit tests separately cover prompt injection in
source material, rejection of invented/future model evidence IDs, progress
rollback invalidation, and cross-user cache identity.

An earlier development run exposed one **usefulness failure**: the episode-2
future-identity question “What identity does June use after leaving Kestrel?”
returned an unrelated, already-authorized identity fact. It did not expose the
future answer, but it should have been neutral. Future-outcome and alias-query
handling was tightened; the recorded run above returns the required neutral
fallback.

No live model evaluation was run, so there is no observed live-model latency or
token cost to report. Production telemetry stores model name, latency, token
counts, and optional estimated cost per cached answer when configured.

These results do **not** establish a zero-spoiler guarantee. Six deterministic
cases and one fictional corpus are too small to cover paraphrases, multilingual
queries, poor source curation, all indirect metadata leaks, or provider behavior.
Before onboarding a licensed title, expand the cases with title-specific red-team
questions and manually inspect each checkpoint in both recap modes and character
views.
