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

- Data is synced to Lovable Cloud per browser via a random device UUID in localStorage (no login); server functions in src/lib/organizador.functions.ts use the admin client filtered by that ID, and tables have RLS with no public policies. Why: user asked for no login.
