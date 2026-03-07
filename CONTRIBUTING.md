# Contributing

Thank you for your interest in contributing to BeaverTrails.

## Getting Started

1. Fork the repository and create your branch from `main`.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env.local` and fill in the required keys.
4. Run `npm run dev` to start the development server.

## Branch Naming

Use descriptive branch names in the format:

```
feature/short-description
fix/short-description
chore/short-description
```

## Pull Requests

- Keep PRs focused — one concern per PR.
- Write a clear description of what changed and why.
- Ensure `npm run lint` passes before opening a PR.
- Request a review from at least one other contributor.

## Code Style

- TypeScript is required for all new files.
- Use Tailwind utility classes for styling; avoid inline styles.
- Keep components small and single-purpose.
- Co-locate component-specific logic with the component file.

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add trip export feature
fix: correct map marker offset
chore: update dependencies
```

## Reporting Issues

Open a GitHub Issue with a clear title, steps to reproduce, and expected vs. actual behaviour.
