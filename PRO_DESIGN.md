# Pro homescreen design notes

The Pro lobby should feel like a cinema programme: a clear place to choose what to do next, with the typography and colors already used by NoSpoilers.

## Research

- [NN/g: AI Prototyping in Real Design Contexts](https://www.nngroup.com/articles/ai-prototyping/) found that generated interfaces often use interchangeable visual styles, misapply familiar layouts, and miss hierarchy, grouping, and spacing details. The practical lesson here is to organize around choosing films first, then personal tools.
- [Anthropic: Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills) describes recurring defaults such as purple gradients, predictable component arrangements, and generic typography. It also notes that simply changing defaults can create a different repetitive style.
- [NN/g: 5 Principles of Visual Design in UX](https://www.nngroup.com/articles/principles-visual-design/) explains how scale, contrast, balance, and proximity establish hierarchy. Use these to make the primary action clear without decorating every tool equally.

These are recurring tendencies, not a reliable way to identify whether a person or AI made an interface. A font, color, or card is not inherently wrong; the problem is using it without a reason tied to the product.

## Applied to this screen

- Give Tonight Mode the strongest contrast and a single primary action. Keep Lumi and Double Feature adjacent because they also help choose a film.
- Use the existing Bebas display face for the lobby title and Tonight Mode. Keep the existing body and heading fonts for readable tool names and descriptions.
- Keep the navy canvas and use the existing warm text color for one flat feature panel. Limit purple to small brand accents.
- Present Identity Forge, Taste Lab, and Spoiler Field as a directory with aligned descriptions and thin rules. Each whole row is a link.
- Write concrete descriptions of the tools. Avoid interchangeable slogans, invented metrics, fake activity, decorative badges, and repeated promotional calls to action.
- Avoid ambient glows, orbit graphics, glass panels, entrance animations, and rounded containers around every section.
- Preserve visible focus outlines, readable contrast, descriptive link names, and a single-column reading order on small screens.

Reuse these principles when updating the lobby. Do not treat this layout as a universal template for the rest of the app.
