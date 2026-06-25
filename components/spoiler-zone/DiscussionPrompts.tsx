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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
      {prompts.map(p => (
        <button
          key={p}
          onClick={() => onPrompt(p)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full border border-ns-border text-ns-muted text-xs font-body
                     hover:border-ns-gold/40 hover:text-ns-gold transition-all duration-150 whitespace-nowrap"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
