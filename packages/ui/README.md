# @packages/ui

shadcn/ui components shared by the apps (source only, no build: apps
transpile it). Style `radix-nova`, Tailwind 4, CSS variables.
- Add a component: `pnpm dlx shadcn@latest add <name> -c packages/ui`
  (or from `apps/web`, which forwards to this package).
- Use it: `import { Button } from "@packages/ui/components/button"`.
- The app imports `@packages/ui/globals.css` once (theme + Tailwind).
