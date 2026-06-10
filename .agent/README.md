# .agent

This folder is the working context hub for the `shire` repo.

## Read in this order
1. `context/README.md`
2. `context/architecture.md`
3. Relevant references in `references/`
4. Decisions in `decisions/`
5. Active work in `tasks/`

## Context rules
- Treat `context/architecture.md` as the primary high-level source of truth.
- Use `references/` only as supporting material.
- Do not invent details that are not written in the context.
- If there is a conflict, follow the most recent and most explicit document.
- If information is missing, mark it as unknown and verify it in code or by asking.

## Structure
- `context/` for product, architecture, and workflow context
- `references/` for external or supporting documentation
- `decisions/` for decision logs
- `tasks/` for active work, backlog items, and open questions
- `archive/` for inactive historical notes
