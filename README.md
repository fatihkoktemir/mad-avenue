# Mad Avenue: Advertising Tycoon

A Mad Men inspired ad-agency tycoon game (1970-2005), built on Game Dev Tycoon style mechanics.

## Run it

```sh
npm install
npm run dev        # play at http://localhost:5173 (add ?speed=10 to fast-forward)
npm test           # simulation tests, including a bot that plays 1970-1980
npm run build      # static build in dist/
```

## Layout

- `src/sim/` the simulation: pure TypeScript, no UI. One tick is one in-game day; the RNG is seeded and lives in the save, so runs are deterministic.
- `src/content/` game content as JSON (categories, approaches, channels, fit matrices, clients, slogans, research). Adding content should not need code.
- `src/ui/` React screens and the office scene.

## Status

Milestone 1 (core loop): briefs, small jobs, the three-stage campaign, extras, revision, executive scores, Sales Lift, review meeting, research, hiring and the first office move. Accounts, RFPs, events and character style come next.
