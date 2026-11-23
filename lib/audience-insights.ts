export interface DirectionInputs {
  enrollments: number
  exposed: number
  responses: number
  pending: number
  eligible: number
  eligibleWorks: number
  validationIssues: number
  sources: Array<{ label: string; count: number }>
}

export interface CollectionPriority {
  title: string
  evidence: string
  action: string
  destination: 'review' | 'datasets' | 'studies'
  urgency: 'quality' | 'coverage' | 'collection'
}

// These are explicit operational rules, not AI-generated strategic predictions.
// Every suggestion includes its observed denominator and a concrete next action.
export function collectionPriorities(input: DirectionInputs): CollectionPriority[] {
  const priorities: CollectionPriority[] = []
  if (input.validationIssues)
    priorities.push({
      title: 'Repair data-contract issues',
      evidence: `${input.validationIssues} records fail one or more consent, assignment, or outcome checks.`,
      action: 'Inspect the records before accepting them into a dataset.',
      destination: 'review',
      urgency: 'quality',
    })
  if (input.pending)
    priorities.push({
      title: 'Clear the quality-review backlog',
      evidence: `${input.pending} submitted responses still await a human decision.`,
      action: 'Review relevance, consistency, and identifying information.',
      destination: 'review',
      urgency: 'quality',
    })
  if (input.eligibleWorks < 5)
    priorities.push({
      title: 'Collect across more independent works',
      evidence: `${input.eligible} eligible responses cover ${input.eligibleWorks} ${input.eligibleWorks === 1 ? 'work' : 'works'}. The current planning target is five works.`,
      action: 'Recruit another release before relying on cross-title patterns.',
      destination: 'studies',
      urgency: 'coverage',
    })
  const total = input.sources.reduce((sum, row) => sum + row.count, 0)
  const largest = [...input.sources].sort((a, b) => b.count - a.count)[0]
  if (total >= 20 && largest && largest.count / total > 0.8)
    priorities.push({
      title: 'Diversify research recruitment',
      evidence: `${largest.count} of ${total} eligible responses came from ${largest.label.replaceAll('_', ' ')}.`,
      action: 'Recruit through another source and compare its results separately.',
      destination: 'studies',
      urgency: 'coverage',
    })
  if (input.enrollments >= 20 && input.exposed / input.enrollments < 0.6)
    priorities.push({
      title: 'Investigate preview drop-off',
      evidence: `${input.exposed} of ${input.enrollments} enrolled participants opened a preview.`,
      action: 'Check preview delivery and the steps between consent and exposure.',
      destination: 'studies',
      urgency: 'collection',
    })
  if (input.exposed >= 20 && input.responses / input.exposed < 0.5)
    priorities.push({
      title: 'Improve feedback completion',
      evidence: `${input.responses} of ${input.exposed} exposed participants submitted feedback.`,
      action: 'Review feedback effort and follow up with a new, clearly measured cohort.',
      destination: 'studies',
      urgency: 'collection',
    })
  if (input.eligible >= 100 && input.eligibleWorks >= 5 && !input.validationIssues)
    priorities.push({
      title: 'Prepare an unseen-title evaluation',
      evidence: `${input.eligible} reviewed, opted-in responses span ${input.eligibleWorks} works.`,
      action:
        'Freeze a dataset and compare the current heuristic with a simple baseline on held-out works.',
      destination: 'datasets',
      urgency: 'coverage',
    })
  if (!input.enrollments)
    priorities.unshift({
      title: 'Launch the first collection study',
      evidence: 'No audience research enrollments have been collected yet.',
      action: 'Start with one owned release and a specific preview decision.',
      destination: 'studies',
      urgency: 'collection',
    })
  return priorities.slice(0, 5)
}
