'use client'

interface Props {
  movieTitle: string
  onPrompt:   (text: string) => void
}

export default function DiscussionPrompts({ movieTitle, onPrompt }: Props) {
  const prompts = [
    `What shocked you most about ${movieTitle}?`,
    'Who was your favorite character?',
    'What was the best scene?',
    'What did you think of the ending?',
    'Any hidden details you noticed?',
    `Rate ${movieTitle} out of 10`,
    'What was the most emotional moment?',
    'Would you recommend this movie?',
    'Best quote from the film?',
    'What theory do you have?',
  ]

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
      {prompts.map(p => (
        <button
          key={p}
          onClick={() => onPrompt(p)}
          className="min-h-10 flex-shrink-0 whitespace-nowrap rounded-sm border border-ns-border px-3 font-body text-xs text-ns-muted
                     transition-colors hover:border-ns-text hover:text-ns-text"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
