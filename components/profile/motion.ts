/**
 * Meter fill that grows from zero when its `ns-reveal` ancestor scrolls into
 * view. Scoped to html[data-motion="on"], so reduced motion shows the final value.
 */
export const growOnReveal =
  'origin-left transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none [html[data-motion=on]_.ns-reveal:not([data-revealed])_&]:scale-x-0'
