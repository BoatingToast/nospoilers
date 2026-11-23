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
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide sm:-mx-6 sm:px-6">
      {prompts.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onPrompt(p)}
          className="min-h-11 flex-shrink-0 whitespace-nowrap rounded-full bg-ns-surface-2 px-4 text-sm text-ns-muted transition-colors duration-150 hover:bg-ns-surface-3 hover:text-ns-text sm:min-h-10"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
