import assert from 'node:assert/strict'
import test from 'node:test'
// Node's strip-types runner requires the extension at runtime.
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { FACET_IDS, computeBelief, computeView, durableEvidence, evidenceForAnswer, evidenceForCorrection, evidenceForHypothesis, evidenceForTweak, hasUnsavedLearning, otherPresentFacets, preferencePatch, rankCandidates, ratingsPrior, sanitizeState, scoreQuestions, selectNextQuestion, summarizeChange, withTweak, type AskedQuestion, type FacetId, type RatedFilm, type TasteEvidence, type TasteFilm } from '../lib/taste/engine.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { deriveFacets, isRevealingKeyword } from '../lib/taste/catalog.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { answerNotes, extractPreferences, hasSpoilerLanguage, isSafeTasteText, matchedSentence, reasonSentence, templateHypothesis, templateQuestion, tradeoffSentence, validateExtractions, validateWordedHypothesis, validateWordedQuestion } from '../lib/taste/language.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { FIXTURE_FILMS, FIXTURE_VIEWERS, answerAs, buildFixtureSet } from '../lib/taste/fixtures.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { calculateRatingAffinities } from '../services/dna-v2.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { buildGenreAffinities, scoreGenreAffinity } from '../services/recommendation-ranking.ts'

const NOW = '2026-10-01T12:00:00.000Z'

const { rated, candidates }: { rated: RatedFilm[]; candidates: TasteFilm[] } = buildFixtureSet({
  deriveFacets,
  affinities: (scores: number[]) => calculateRatingAffinities(scores).map((affinity: { combined: number }) => affinity.combined),
})
const prior = ratingsPrior(rated)
const confirmedIds = rated.filter(film => film.affinity > 0.2).map(film => film.tmdbId)
const title = (id: number) => rated.find(film => film.tmdbId === id)!.title

/** Run the adaptive questions the way a viewer with fixed priorities would answer them. */
function interview(order: FacetId[]) {
  let evidence: TasteEvidence[] = []
  const asked: AskedQuestion[] = []
  for (;;) {
    const question = selectNextQuestion({ rated, confirmedIds, candidates, prior, evidence, asked })
    if (!question) break
    const spec = { kind: question.kind, titles: question.filmIds.map(title), facetA: question.facetA, facetB: question.facetB }
    const choice = answerAs(order, question.facetA, question.facetB)
    const others = question.kind === 'contrast'
      ? otherPresentFacets(rated.find(film => film.tmdbId === question.filmIds[0]), question)
      : []
    evidence = [...evidence, ...evidenceForAnswer(question, choice, answerNotes(spec, choice), NOW, others)]
    asked.push({ id: question.id, kind: question.kind, filmIds: question.filmIds, facetA: question.facetA, facetB: question.facetB, choice })
  }
  return { evidence, asked, view: computeView(rated, candidates, prior, evidence) }
}

function correct(text: string): TasteEvidence[] {
  return evidenceForCorrection(extractPreferences(text), NOW)
}

// ─── Catalog evidence ─────────────────────────────────────────────────────────

test('catalog keywords that give away a story never shape or describe a film', () => {
  for (const keyword of ['plot twist', 'twist ending', 'surprise ending', 'unreliable narrator', 'death of protagonist', 'secret identity', 'betrayal']) {
    assert.equal(isRevealingKeyword(keyword), true, keyword)
  }

  const plain = deriveFacets({ genreIds: [18], keywords: [], runtime: 110, popularity: 20 })
  const revealing = deriveFacets({ genreIds: [18], keywords: ['plot twist', 'twist ending', 'death of protagonist'], runtime: 110, popularity: 20 })
  assert.deepEqual(revealing.facets, plain.facets)
  assert.deepEqual(revealing.tags, plain.tags)
})

test('no fixture film carries a descriptor that hints at how its story turns out', () => {
  for (const film of [...rated, ...candidates]) {
    for (const tags of Object.values(film.tags)) {
      for (const tag of tags as string[]) {
        assert.equal(hasSpoilerLanguage(tag), false, `${film.title}: ${tag}`)
      }
    }
  }
})

test('facets come from genre and descriptor evidence a reader can trace', () => {
  const film = deriveFacets({
    genreIds: [878, 18],
    keywords: ['father daughter relationship', 'physics', 'space'],
    runtime: 169,
    popularity: 70,
  })
  assert.ok(film.facets.relationships > 0.6)
  assert.ok(film.facets.ideas > 0.6)
  assert.equal(film.facets.humor, 0)
  assert.deepEqual(film.tags.relationships, ['Drama', 'family bonds'])
  assert.ok(film.tags.ideas?.includes('hard science'))
})

// ─── Uncertainty and questions ────────────────────────────────────────────────

test('ratings alone cannot separate facets that always appear together', () => {
  assert.equal(prior.relationships.tangledWith, 'ideas')
  assert.equal(prior.ideas.tangledWith, 'relationships')
  const belief = computeBelief(prior, [])
  // Ideas looks strongest, but only tentatively: the evidence is thin and tangled.
  assert.equal([...FACET_IDS].sort((a, b) => belief[b].mean - belief[a].mean)[0], 'ideas')
  assert.equal(belief.ideas.tentative, true)
  assert.deepEqual(belief.ideas.sources, ['ratings'])
})

test('the first question targets the pair of facets most likely to change the ranking', () => {
  const questions = scoreQuestions({ rated, confirmedIds, candidates, prior, evidence: [], asked: [] })
  const first = selectNextQuestion({ rated, confirmedIds, candidates, prior, evidence: [], asked: [] })!

  assert.equal(first.id, questions[0].id)
  assert.ok(questions.every(question => question.priority <= first.priority))
  assert.deepEqual([first.facetA, first.facetB].sort(), ['ideas', 'relationships'])
  assert.equal(first.kind, 'contrast')
  // Both facets are clearly present in four of the six films this viewer loved.
  assert.equal(first.coOccurCount, 4)
  assert.equal(first.likedCount, 6)
  assert.ok(first.expectedChange > 0 && first.expectedChange <= 1)
})

test('questions only use films the member confirmed, never repeat a facet pair, and stop at three', () => {
  const none = selectNextQuestion({ rated, confirmedIds: [], candidates, prior, evidence: [], asked: [] })
  assert.equal(none, null)

  const onlyParasite = scoreQuestions({ rated, confirmedIds: [496243], candidates, prior, evidence: [], asked: [] })
  assert.ok(onlyParasite.length > 0)
  assert.ok(onlyParasite.every(question => question.filmIds.length === 1 && question.filmIds[0] === 496243))

  const { asked } = interview(FIXTURE_VIEWERS[0].order)
  assert.ok(asked.length >= 1 && asked.length <= 3)
  const pairs = asked.map(item => [item.facetA, item.facetB].sort().join('|'))
  assert.equal(new Set(pairs).size, pairs.length)
  assert.equal(
    selectNextQuestion({ rated, confirmedIds, candidates, prior, evidence: [], asked: [...asked, ...asked, ...asked].slice(0, 3) }),
    null,
  )
})

test('"not sure" assumes nothing, and "neither" credits what else the film has', () => {
  const question = selectNextQuestion({ rated, confirmedIds, candidates, prior, evidence: [], asked: [] })!
  const spec = { kind: question.kind, titles: question.filmIds.map(title), facetA: question.facetA, facetB: question.facetB }
  const before = computeBelief(prior, [])

  const unsure = evidenceForAnswer(question, 'unsure', answerNotes(spec, 'unsure'), NOW)
  assert.deepEqual(unsure, [])
  assert.deepEqual(computeBelief(prior, unsure), before)

  const film = rated.find(item => item.tmdbId === question.filmIds[0])
  const others = otherPresentFacets(film, question)
  assert.ok(others.length > 0)
  const neither = computeBelief(prior, evidenceForAnswer(question, 'neither', answerNotes(spec, 'neither'), NOW, others))
  assert.ok(neither[question.facetB].mean < before[question.facetB].mean)
  for (const facet of others) assert.ok(neither[facet].mean > before[facet].mean, facet)
})

test('choosing one reason raises it and returns the other toward neutral, not negative', () => {
  const question = { kind: 'contrast' as const, filmIds: [157336], facetA: 'relationships' as const, facetB: 'ideas' as const }
  const spec = { ...question, titles: ['Interstellar'] }
  const before = computeBelief(prior, [])
  const evidence = evidenceForAnswer(question, 'a', answerNotes(spec, 'a'), NOW)
  const after = computeBelief(prior, evidence)

  assert.ok(after.relationships.mean > before.relationships.mean + 0.2)
  assert.ok(after.ideas.mean < before.ideas.mean)
  assert.ok(after.ideas.mean > -0.05)
  assert.ok(after.relationships.sd < before.relationships.sd)
  assert.equal(after.relationships.tentative, false)
  assert.deepEqual(after.relationships.sources, ['ratings', 'answer'])
  assert.equal(evidence[0].note, 'You chose relationships over ideas for Interstellar')
})

// ─── Same ratings, different reasons ──────────────────────────────────────────

test('two viewers with identical ratings receive different picks and hypotheses', () => {
  const [maya, jonah] = FIXTURE_VIEWERS.map(viewer => interview(viewer.order).view)

  assert.equal(maya.hypotheses[0].facet, 'relationships')
  assert.equal(jonah.hypotheses[0].facet, 'ideas')
  assert.equal(templateHypothesis(maya.hypotheses[0]), 'The relationships look like a main thing you come for.')

  const mayaPicks = maya.picks.map(pick => pick.film.tmdbId)
  const jonahPicks = jonah.picks.map(pick => pick.film.tmdbId)
  assert.equal(mayaPicks.length, 3)
  assert.equal(jonahPicks.length, 3)
  assert.equal(mayaPicks.filter(id => jonahPicks.includes(id)).length, 0)

  // Each viewer's picks are strong on the reason they actually gave.
  assert.ok(maya.picks.every(pick => pick.reasons.some(reason => reason.facet === 'relationships')))
  assert.ok(jonah.picks.every(pick => pick.reasons.some(reason => reason.facet === 'ideas')))
})

test('a genre baseline cannot tell those two viewers apart', () => {
  const affinities = buildGenreAffinities(rated.map(film => ({ score: film.score, genreIds: film.genreIds })))
  const rank = () => [...candidates]
    .map(film => ({ id: film.tmdbId, points: scoreGenreAffinity(film.genreIds, affinities).points + (film.voteAverage ?? 0) / 10 }))
    .sort((a, b) => b.points - a.points || a.id - b.id)
    .slice(0, 10)
    .map(item => item.id)
  // It only sees ratings, and both viewers have the same ones.
  assert.deepEqual(rank(), rank())
})

test('three picks have distinct roles, exclude rated films, and carry no score', () => {
  const { view } = interview(FIXTURE_VIEWERS[1].order)
  const ratedIds = new Set(rated.map(film => film.tmdbId))

  assert.deepEqual(view.picks.map(pick => pick.role), ['close', 'adjacent', 'stretch'])
  assert.equal(new Set(view.picks.map(pick => pick.film.tmdbId)).size, 3)
  assert.ok(view.picks.every(pick => !ratedIds.has(pick.film.tmdbId)))
  assert.ok(view.picks[0].familiarity > view.picks[2].familiarity)
  for (const pick of view.picks) {
    assert.ok(pick.reasons.length > 0)
    assert.ok(pick.matched <= pick.of)
    assert.equal('score' in pick, false)
    assert.equal('matchScore' in pick, false)
    const copy = [
      ...pick.reasons.map(reason => reasonSentence(reason.facet, reason.because, reason.tentative)),
      pick.tradeoff ? tradeoffSentence(pick.tradeoff.facet, pick.tradeoff.direction, pick.role) : '',
      matchedSentence(pick.matched, pick.of),
    ].join(' ')
    assert.equal(isSafeTasteText(copy), true, copy)
  }
})

// ─── Corrections ──────────────────────────────────────────────────────────────

test('"I liked the atmosphere, not the violence" raises one facet and lowers the other', () => {
  const extractions = extractPreferences('I liked the atmosphere, not the violence')
  assert.deepEqual(
    extractions.map(({ facet, direction, quote }: { facet: string; direction: number; quote: string }) => ({ facet, direction, quote })),
    [
      { facet: 'atmosphere', direction: 1, quote: 'I liked the atmosphere' },
      { facet: 'intensity', direction: -1, quote: 'not the violence' },
    ],
  )

  const { evidence, view: before } = interview(FIXTURE_VIEWERS[1].order)
  const after = computeView(rated, candidates, prior, [...evidence, ...correct('I liked the atmosphere, not the violence')])

  assert.ok(after.belief.atmosphere.mean > before.belief.atmosphere.mean + 0.2)
  assert.ok(after.belief.intensity.mean < before.belief.intensity.mean - 0.2)
  assert.deepEqual(after.belief.intensity.sources.slice(-1), ['correction'])

  const change = summarizeChange(before, after)
  assert.deepEqual(change.facets.map(item => item.facet).sort(), ['atmosphere', 'intensity'])
  assert.ok(change.overlap < 1)
})

test('a correction reranks: violent films fall and atmospheric ones rise', () => {
  const { evidence } = interview(FIXTURE_VIEWERS[1].order)
  const before = rankCandidates(candidates, computeBelief(prior, evidence))
  const after = rankCandidates(candidates, computeBelief(prior, [...evidence, ...correct('I liked the atmosphere, not the violence')]))
  const position = (ranked: typeof before, name: string) => ranked.findIndex(entry => entry.film.title === name)

  for (const name of ['Sicario', 'Se7en', 'John Wick']) {
    assert.ok(position(after, name) > position(before, name), `${name} should fall`)
  }
  for (const name of ['Spirited Away', 'Dune', 'Stalker']) {
    assert.ok(position(after, name) < position(before, name), `${name} should rise`)
  }
  // The ranking exposes the term responsible.
  const sicario = after.find(entry => entry.film.title === 'Sicario')!
  assert.ok(sicario.contributions.intensity < 0)
})

test('free-text corrections are read clause by clause', () => {
  const read = (text: string) => Object.fromEntries(
    extractPreferences(text).map((item: { facet: string; direction: number }) => [item.facet, item.direction]),
  )
  assert.deepEqual(read('same emotional depth, faster pacing'), { momentum: 1 })
  assert.deepEqual(read('It was too slow and way too dark, but I loved the characters'), { momentum: 1, intensity: -1, relationships: 1 })
  assert.deepEqual(read('less disturbing please'), { intensity: -1 })
  assert.deepEqual(read('I want something funnier'), { humor: 1 })
  assert.deepEqual(read('the science dragged, I was there for the family'), { ideas: -1, momentum: 1, relationships: 1 })
  assert.deepEqual(read('I had a sandwich'), {})
})

test('agreeing with a hypothesis firms it up and disagreeing withdraws it', () => {
  const base = computeView(rated, candidates, prior, [])
  const hypothesis = base.hypotheses[0]
  assert.equal(hypothesis.tentative, true)

  const agreed = computeView(rated, candidates, prior, evidenceForHypothesis(hypothesis, 'agree', 'You agreed', NOW))
  assert.ok(agreed.belief[hypothesis.facet].mean > base.belief[hypothesis.facet].mean)
  assert.equal(agreed.belief[hypothesis.facet].tentative, false)

  const disagreed = computeView(rated, candidates, prior, evidenceForHypothesis(hypothesis, 'disagree', 'You disagreed', NOW))
  assert.ok(disagreed.belief[hypothesis.facet].mean < base.belief[hypothesis.facet].mean)
  assert.notEqual(disagreed.hypotheses[0].facet, hypothesis.facet)
})

// ─── Temporary versus saved ───────────────────────────────────────────────────

test('"change one thing" moves the picks without touching what was learned', () => {
  const { evidence, view: learned } = interview(FIXTURE_VIEWERS[0].order)
  const tweak = evidenceForTweak({ facet: 'momentum', direction: 1 }, 'Change one thing: faster pacing', NOW)
  const withFaster = withTweak(evidence, tweak)

  assert.equal(tweak.scope, 'tweak')
  const tweaked = computeView(rated, candidates, prior, withFaster)
  assert.ok(tweaked.belief.momentum.mean > learned.belief.momentum.mean + 0.3)
  assert.notDeepEqual(tweaked.picks.map(pick => pick.film.tmdbId), learned.picks.map(pick => pick.film.tmdbId))

  // The durable reading ignores the tweak entirely.
  const durable = computeView(rated, candidates, prior, withFaster, ['saved', 'session'])
  assert.deepEqual(durable.belief, learned.belief)
  assert.deepEqual(durable.picks.map(pick => pick.film.tmdbId), learned.picks.map(pick => pick.film.tmdbId))

  // Only one tweak is active at a time, and clearing it restores the picks.
  const replaced = withTweak(withFaster, evidenceForTweak({ facet: 'intensity', direction: -1 }, 'Change one thing: less disturbing', NOW))
  assert.equal(replaced.filter(item => item.scope === 'tweak').length, 1)
  assert.equal(replaced.find(item => item.scope === 'tweak')!.facet, 'intensity')
  assert.deepEqual(withTweak(withFaster, null), evidence)
})

test('saving promotes what was learned and drops a tweak unless it is explicitly kept', () => {
  const { evidence } = interview(FIXTURE_VIEWERS[0].order)
  const tweak = evidenceForTweak({ facet: 'momentum', direction: 1 }, 'Change one thing: faster pacing', NOW)
  const session = withTweak(evidence, tweak)
  assert.equal(hasUnsavedLearning(session), true)

  const saved = durableEvidence(session, { keepTweak: false })
  assert.equal(saved.length, evidence.length)
  assert.ok(saved.every(item => item.scope === 'saved'))
  assert.equal(saved.some(item => item.source === 'tweak'), false)
  assert.equal(hasUnsavedLearning(saved), false)

  const kept = durableEvidence(session, { keepTweak: true })
  assert.equal(kept.length, evidence.length + 1)
  assert.equal(kept.find(item => item.source === 'tweak')!.scope, 'saved')

  // Saving does not change the session it was computed from.
  assert.equal(session.find(item => item.source === 'tweak')!.scope, 'tweak')
})

test('saved reasons only overwrite existing preferences the member spoke to', () => {
  const none = preferencePatch(computeBelief(prior, []), [])
  assert.deepEqual(none, {})

  const saved = durableEvidence(correct('too slow, and not the violence'), { keepTweak: false })
  const patch = preferencePatch(computeBelief(prior, saved), saved)
  assert.deepEqual(Object.keys(patch).sort(), ['pacingScale', 'toneScale', 'violenceTolerance'])
  assert.ok(patch.pacingScale! >= 7)
  assert.ok(patch.toneScale! <= 4)
  assert.ok(patch.violenceTolerance! <= 4)
})

test('state from the browser is bounded and stripped of anything unknown', () => {
  const state = sanitizeState({
    confirmedIds: [157336, -4, 'x', 157336, 3.5],
    evidence: [
      { id: 'ok', facet: 'ideas', value: 7, weight: 900, source: 'correction', scope: 'session', note: 'n'.repeat(500), filmIds: [1, 2, 3], at: NOW },
      { id: 'bad-facet', facet: 'income', value: 1, weight: 1, source: 'correction', scope: 'session' },
      { id: 'bad-source', facet: 'ideas', value: 1, weight: 1, source: 'admin', scope: 'session' },
      { id: 'bad-number', facet: 'ideas', value: 'NaN', weight: 1, source: 'answer', scope: 'saved' },
      null,
    ],
    asked: [{ id: 'q', kind: 'contrast', filmIds: [1], facetA: 'ideas', facetB: 'nope', choice: 'a' }],
    notes: { 'driver:ideas': { status: 'refined', text: 'x'.repeat(900) }, other: { status: 'hacked' } },
  })

  assert.deepEqual(state.confirmedIds, [157336])
  assert.equal(state.evidence.length, 1)
  assert.equal(state.evidence[0].value, 1)
  assert.equal(state.evidence[0].weight, 10)
  assert.equal(state.evidence[0].note.length, 200)
  assert.deepEqual(state.evidence[0].filmIds, [1, 2])
  assert.deepEqual(state.asked, [])
  assert.deepEqual(Object.keys(state.notes), ['driver:ideas'])
  assert.equal(state.notes['driver:ideas'].text!.length, 220)
  assert.deepEqual(sanitizeState(null), { version: 1, confirmedIds: [], asked: [], evidence: [], notes: {} })
})

// ─── Model output is checked before anyone sees it ────────────────────────────

test('model-worded questions are rejected when they spoil, drift, or drop the film', () => {
  const spec = { kind: 'contrast' as const, titles: ['Interstellar'], facetA: 'relationships' as const, facetB: 'ideas' as const }
  const good = { prompt: 'What stayed with you most about Interstellar?', optionA: 'The bond between the people in it', optionB: 'The science and the big questions' }

  assert.deepEqual(validateWordedQuestion(good, spec), { ...good, context: null })
  assert.equal(validateWordedQuestion({ ...good, optionA: 'The ending and what it reveals' }, spec), null)
  assert.equal(validateWordedQuestion({ ...good, prompt: 'What stayed with you most about that film?' }, spec), null)
  assert.equal(validateWordedQuestion({ ...good, optionB: good.optionA }, spec), null)
  assert.equal(validateWordedQuestion({ prompt: good.prompt }, spec), null)
  assert.equal(validateWordedQuestion('What made it work?', spec), null)

  // A title that contains a flagged word is not itself a spoiler.
  const killBill = { ...spec, titles: ['Kill Bill: The Whole Bloody Affair'] }
  assert.ok(validateWordedQuestion({ ...good, prompt: 'What made Kill Bill: The Whole Bloody Affair work for you?' }, killBill))

  // A model may reword a tiebreak, but the options stay the two films.
  const tiebreak = { kind: 'tiebreak' as const, titles: ['Arrival', 'Mad Max: Fury Road'], facetA: 'ideas' as const, facetB: 'momentum' as const }
  const worded = validateWordedQuestion({ prompt: 'Which one would you put on tonight?', optionA: 'The quiet one', optionB: 'The loud one' }, tiebreak)!
  assert.deepEqual([worded.optionA, worded.optionB], ['Arrival', 'Mad Max: Fury Road'])
})

test('hypotheses that read the person instead of the films are rejected', () => {
  assert.equal(validateWordedHypothesis('You seem to come for the relationships more than the spectacle.'), 'You seem to come for the relationships more than the spectacle.')
  for (const text of [
    'You seem drawn to sad films because you may be lonely.',
    'Your taste suggests anxiety about your childhood.',
    'You are an introvert who prefers quiet films.',
    'You probably lean conservative.',
    'There is an 87% chance you will love slow films.',
    'You enjoy films with a twist ending.',
  ]) {
    assert.equal(validateWordedHypothesis(text), null, text)
  }
})

test('a model reading of a correction must quote the member and name a known facet', () => {
  const text = 'I liked the atmosphere, not the violence'
  const accepted = validateExtractions([
    { facet: 'atmosphere', direction: 'more', strength: 'clear', quote: 'liked the atmosphere' },
    { facet: 'intensity', direction: 'less', strength: 'strong', quote: 'not the violence' },
    { facet: 'humor', direction: 'more', strength: 'clear', quote: 'loved the jokes' },
    { facet: 'politics', direction: 'less', strength: 'clear', quote: 'not the violence' },
    { facet: 'ideas', direction: 'sideways', strength: 'clear', quote: 'atmosphere' },
  ], text, FACET_IDS)

  assert.deepEqual(accepted, [
    { facet: 'atmosphere', direction: 1, strength: 'clear', quote: 'liked the atmosphere' },
    { facet: 'intensity', direction: -1, strength: 'strong', quote: 'not the violence' },
  ])
  assert.deepEqual(validateExtractions('nonsense', text, FACET_IDS), [])
})

test('built-in wording for every facet and hypothesis kind passes its own safety checks', () => {
  for (const facet of FACET_IDS) {
    for (const other of FACET_IDS) {
      if (facet === other) continue
      const question = templateQuestion({ kind: 'contrast', titles: ['Arrival'], facetA: facet, facetB: other })
      assert.equal(isSafeTasteText([question.prompt, question.optionA, question.optionB].join(' '), ['Arrival']), true)
      assert.equal(isSafeTasteText(templateHypothesis({ key: 'k', kind: 'condition', facet, other })), true)
    }
    for (const kind of ['driver', 'aversion', 'hunch'] as const) {
      assert.equal(isSafeTasteText(templateHypothesis({ key: 'k', kind, facet, other: null })), true)
    }
  }
})

test('the fixture catalog is internally consistent', () => {
  assert.equal(new Set(FIXTURE_FILMS.map((film: { tmdbId: number }) => film.tmdbId)).size, FIXTURE_FILMS.length)
  assert.equal(rated.length, 8)
  assert.ok(candidates.length >= 50)
  assert.equal(confirmedIds.length, 6)
})
