# Why Did I Love That?

An interactive experience inside Taste Lab (`/pro/taste-lab`) that works out the
reasons behind a member's ratings and lets them correct it.

Ratings and genres cannot tell two people apart when they love the same film
for different reasons. This asks.

## What a member does

1. **Confirms films.** Their highest-rated films are shown; questions only use
   the ones they say they remember.
2. **Answers up to three questions.** Each one names a film and two things it
   has, with *Both*, *Neither* and *Not sure*. The page says why that question
   was chosen.
3. **Reads three hypotheses** about their taste, each marked tentative where
   evidence is thin. They can agree, disagree, or reword any of them, or type a
   correction in their own words ("I liked the atmosphere, not the violence").
4. **Gets three picks**: a close match, an adjacent discovery and a deliberate
   stretch, each with reasons and a stated tradeoff. A "What changed" panel
   shows the before and after of every answer and correction.
5. **Changes one thing** ("same atmosphere, faster pacing"). This is temporary
   and marked as such. Nothing is written to the account until they press
   *Save to my Movie DNA*.

## How it works

### The taste representation

Nine facets: relationships, ideas, atmosphere, momentum, tension, dark
intensity, humor, real-world grounding, spectacle (`lib/taste/engine.ts`).

A profile is a list of **evidence items**. Each says which facet, how
attractive (-1 to 1), how much it counts, where it came from (an answer,
feedback on a hypothesis, a correction, a temporary change) and a plain note
such as *You chose relationships over ideas for Interstellar*. The belief for a
facet is the weighted mean of its evidence plus what the ratings suggest; its
uncertainty shrinks as weight accumulates. The Taste ledger on the page is this
structure drawn directly: one row per facet, a band for uncertainty, the
provenance on request, and a button to remove any single item.

Ratings contribute a prior (`ratingsPrior`). When two facets rise and fall
together across the rated films, the ratings cannot say which is responsible,
so both are trusted less. Those tangles are what the questions resolve.

### Film facets

`lib/taste/catalog.ts` turns catalog metadata (genres, keywords, runtime,
budget) into facet values with two plain rule tables. Keywords that hint at how
a story unfolds ("plot twist", "twist ending", "unreliable narrator" and
similar) are discarded before anything else sees them, so they cannot shape a
recommendation or appear in its reasons.

### Choosing the next question

For every question that could be asked, the engine applies the update each
possible answer would cause, reranks the candidates, and measures how much the
top ten moves. Those changes are weighted by a rough estimate of how likely
each answer is. The result is ordered with a preference for facet pairs that
appear together across more of the member's loved films, and away from films
already asked about.

This is an approximation of value of information, not the real thing. The
answer likelihoods are a three-point heuristic per facet, only the top ten
positions are compared, and the coverage weighting is a judgment call.

### Ranking and picks

`score = sum over facets of (belief) x (film's facet value above a typical film) + a small catalog-quality term`

Every term is returned, which is how a pick can say which reason put it there
and what counted against it. The three picks come from the top of that ranking,
split by how closely a film resembles what the member already rated highly.

Picks show reasons and "has 2 of your 3 strongest reasons". They do not show a
match percentage, because the score is not a calibrated probability.

### Where the language model is used

Only for wording questions and hypotheses and for reading free-text
corrections (`services/taste-llm.ts`), with the same provider, key and model as
Lumi. It never selects or scores films. Every response is validated
(`lib/taste/language.ts`):

- wording that contains spoiler language, a percentage, or an inference about
  the member as a person is discarded
- a reworded question must still name the film
- a reading of a correction must quote the member's own text and name a known facet

Anything rejected, slow or unavailable falls back to deterministic wording and
a rule-based reader. The page labels which one it is using.

### Spoiler controls

The picks use the same Blind / Safe / Standard control as movie pages. In Blind
no story text is requested from the server at all and catalog descriptors are
hidden; reasons are given in facet terms only. Safe adds the condensed premise
(`makeCondensedPremise`) and descriptors; Standard adds the full synopsis.

### Saving

Saving writes the evidence to `TasteReasonProfile`, translates the facets the
member spoke to directly into the existing 1-10 recommendation preferences
(pacing, tone, violence tolerance, emotional intensity, complexity, suspense,
escapism), and rebuilds their recommendations. A facet inferred only from
ratings never overwrites an onboarding answer. The values that were replaced
are stored, and *Forget saved reasons* restores them.

## Setup

- **Migration.** `prisma/migrations/20261001000000_taste_reason_profile` adds
  one table. Apply it with `npm run db:deploy`. Until then the experience runs
  normally and saving reports that storage is not set up.
- **Live wording.** Set `OPENAI_API_KEY` (already used by Lumi). Without it the
  page shows "Built-in wording" and uses the deterministic fallback.
- **Fixture mode.** `/pro/taste-lab?demo=1` runs on a bundled sample rating
  sheet and a 68-film catalog, reads nothing of the member's, and never saves.
  It is labeled on the page. Members with fewer than four usable ratings are
  offered it.

## Tests

- `npm run test:taste` — 24 unit tests: catalog safety, question selection,
  corrections and reranking, temporary versus saved, same ratings with
  different reasons, and the validators on model output.
- `npm run test:e2e -- e2e/taste-reasons.spec.ts` — three browser journeys in
  fixture mode on desktop and mobile.

## Evaluation

`npm run eval:taste` (seed 20261001, 400 simulated viewers, 68 films, 12 rated
and 56 candidates each). The genre baseline is the genre-affinity scoring the
existing recommender uses (`services/recommendation-ranking.ts`).

| Ranking | nDCG@10 | top-3 in true top-10 |
| --- | --- | --- |
| genre baseline | 0.803 | 0.554 |
| ratings only (no questions) | 0.883 | 0.763 |
| 3 random questions | 0.888 | 0.784 |
| 3 adaptive questions | 0.908 | 0.825 |
| adaptive + 1 correction | 0.942 | 0.900 |

Paired differences in nDCG@10, with 95% bootstrap intervals:

| Comparison | Difference | 95% interval |
| --- | --- | --- |
| ratings only − genre baseline | +0.079 | 0.070 to 0.088 |
| 3 adaptive − genre baseline | +0.104 | 0.094 to 0.115 |
| 3 adaptive − ratings only | +0.025 | 0.018 to 0.032 |
| 3 adaptive − 3 random | +0.020 | 0.012 to 0.027 |
| adaptive + 1 correction − 3 adaptive | +0.035 | 0.030 to 0.040 |

The three picks land, on average, at the 92nd (close), 84th (adjacent) and 71st
(stretch) percentile of a viewer's true ordering. A second seed (7) gave the
same ordering of systems with differences within 0.002 of these.

### Limitations

- **The viewers are simulated.** Their enjoyment is generated from the same
  nine facets the engine reasons with, so the engine is favoured by
  construction. Genre likes the facets cannot express, rating noise, one wrong
  answer in ten and one "not sure" in ten are added, but this is still a test
  of internal consistency. It says nothing about whether real members agree
  with the picks. No user study was run.
- **Film facets have no independent ground truth.** They come from rule tables
  written for this feature.
- **The "correction" row is close to an oracle**: the simulated viewer names
  their true strongest like and dislike. It shows the ceiling of a correct
  correction, not what typed corrections achieve.
- **Small catalog.** 68 films. The live path ranks about 36 candidates drawn
  from TMDb recommendations for the member's top films.
- **The live model path has not been exercised** in this environment because no
  key is configured. Its validators are unit tested; the request and response
  shape follow Lumi's.
- **TMDb terms.** TMDb's API terms restrict use of its content in connection
  with ML or AI applications. The model here is sent film titles and facet
  names, never TMDb synopses, but this should be reviewed before launch.

## 90-second demo

Two people, one rating sheet, different picks. Open `/pro/taste-lab?demo=1` as
a Pro member.

| Time | Do | Say |
| --- | --- | --- |
| 0:00 | Point at the fixture banner. | "Maya and Jonah rated these eight films identically. A ratings-based recommender gives them the same list." |
| 0:10 | Confirm all six films, press **Ask me about these**. | "It only asks about films you confirm." |
| 0:20 | As Maya: *The people and how they relate to each other*, then *The mood and the world it builds*, then *Neither*. | "It asks about Interstellar first because relationships and ideas appear together in four of her six top films. Ratings can't separate them." |
| 0:35 | Read the hypotheses and picks: Solaris, The Grand Budapest Hotel, Soul. Open a ledger row. | "Every statement shows where it came from." |
| 0:45 | **Start over**. As Jonah: *The concepts and how it thinks them through*, then *The suspense it holds*, then *Neither*. | "Same ratings." |
| 1:00 | Picks: 2001: A Space Odyssey, Tenet, Get Out. | "No film in common with Maya's, and each card says why." |
| 1:05 | Type *I liked the atmosphere, not the violence*, press **Apply**. | "The correction moves two facets and the picks rerank. The panel shows before and after." |
| 1:15 | Press **Faster pacing**, then **Clear it**. | "This is temporary. It never touches the saved profile unless I tick Keep." |
| 1:25 | Switch to **Blind**. | "Premise and descriptors disappear. The reasons stay, in terms that give nothing away." |
