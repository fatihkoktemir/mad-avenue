# Mad Avenue

- The design spec lives outside the repo (Claude Doc "Mad Avenue: Oyun Tasarım Dokümanı"). Follow it; numbers in code are placeholders for balancing.
- Keep `src/sim` free of DOM and React so it can run headless in tests.
- Content belongs in `src/content/*.json`, not hard-coded in TypeScript.
- All in-game text is English.
- Run `npm test` and `npm run build` before pushing. The bot test in `src/sim/__tests__/game.test.ts` is the balance smoke test: if a change breaks it, rebalance rather than loosen it.
