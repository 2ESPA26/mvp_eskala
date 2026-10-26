<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- ESKALA app state (simulated equipment, alerts, interventions) lives in a single React context in src/lib/eskala/store.tsx seeded deterministically from src/lib/eskala/data.ts — keeps all pages consistent and SSR-safe without a backend.
- Intervention history reads the shared context and filters via src/lib/eskala/history.ts; equipment selection uses the /historico id search parameter — preserves cross-page consistency and direct equipment links without duplicating state.
