# BikeOne Shop – Work Hours

Sources: Claude Code transcripts (`~/.claude/projects/-Users-timo-alts-dev-bike-one-shop`) and `git log --all`.
Times are local. Blocks = consecutive activity with gaps < 30 min. Duration rounded up to 30 min (minimum 30 min).

## A. Measured: local Claude sessions

| Date       | Start | End   | Active (min) | Billed (h) |
|------------|-------|-------|--------------|------------|
| 2026-08-23 | 14:09 | 14:21 | 12  | 0.5 |
| 2026-08-23 | 15:01 | 15:02 | 1   | 0.5 |
| 2026-09-08 | 15:31 | 15:34 | 3   | 0.5 |
| 2026-09-09 | 12:44 | 12:50 | 6   | 0.5 |
| 2026-09-11 | 08:32 | 11:15 | 163 | 3.0 |
| 2026-09-11 | 11:57 | 13:00 | 63  | 1.5 |
| 2026-09-17 | 08:33 | 08:33 | 0   | 0.5 |
| 2026-09-18 | 07:38 | 10:10 | 152 | 3.0 |
| 2026-09-18 | 13:41 | 13:45 | 4   | 0.5 |
| 2026-09-18 | 14:17 | 14:49 | 32  | 1.0 |
| 2026-09-21 | 07:52 | 07:54 | 2   | 0.5 |
| 2026-09-22 | 08:11 | 08:45 | 34  | 1.0 |
| 2026-09-22 | 09:19 | 10:36 | 77  | 1.5 |
| 2026-09-22 | 13:28 | 14:55 | 87  | 1.5 |
| 2026-09-23 | 09:34 | 09:36 | 1   | 0.5 |
| 2026-09-25 | 09:44 | 09:58 | 13  | 0.5 |
| 2026-09-25 | 11:59 | 12:00 | 0   | 0.5 |
| 2026-10-01 | 07:37 | 07:51 | 14  | 0.5 |
| 2026-10-12 | 15:30 | 17:11 | 101 | 2.0 |
| 2026-10-28 | 15:25 | 15:40 | 15  | 0.5 |

**Subtotal: 20.5 h** (many are tiny sessions inflated by the 30 min minimum; true active time is ~13.5 h).

October work: 10-01 work-hours documentation; 10-12 CLAUDE.md, SumUp sandbox guide, SumUp payment wiring (file mtimes 15:32–17:11 match the session), sandbox checkout test, admin metadata debugging, multi-language plan; 10-28 README restructure and this update. The 10-12 work was only committed on 10-28 (commits `0c7dc51`, `cd240be`), so those commit timestamps do not show when the work happened; the hours above are based on session timestamps and file mtimes. No other October commits exist, so there is no Section B entry. A stray 22:00 timestamp on 10-01 in an old wireframe-artifact session is a resume marker, not work, and is ignored.

## B. Estimated: sessions without local transcript (git commits authored "Claude")

No transcripts exist for these days (likely other worktree / cloud sessions). Estimated from commit clusters plus ~30–60 min lead time before the first commit.

| Date       | Est. start | Est. end | Basis (commits)                       | Est. (h) |
|------------|-----------|----------|----------------------------------------|----------|
| 2026-09-25 | 10:00     | 13:30    | 10:42–13:01, 9 commits                 | 3.5 |
| 2026-09-27 | 16:30     | 19:00    | 17:31–18:47, 6 commits                 | 2.5 |
| 2026-09-28 | 05:30     | 06:30    | 05:58–06:08, SEO/rebrand               | 1.0 |
| 2026-09-28 | 11:00     | 13:30    | 11:31–12:51, Task 12 + color swatch    | 2.5 |
| 2026-09-29 | 04:30     | 08:30    | 05:12–08:03, Task 13 configurator      | 4.0 |
| 2026-09-29 | 07:57     | 08:30    | manual image commits (overlaps above)  | 0.0 |

**Subtotal: 13.5 h**

## C. Estimated: Gemini work (wireframe images, moodboards, research)

No Gemini logs are available locally. Estimate from file creation times in the repo. 08-23 and 09-16 are your own estimates (3 h and 2–2.5 h, rounded up); 09-18 is still a guess.

| Date       | Evidence                                                         | Est. (h) |
|------------|------------------------------------------------------------------|----------|
| 2026-08-23 | `planning/1-Market_Competitor_Research/*` created 12:54–12:57    | 3.0 |
| 2026-09-16 | `market_analysis-deep.md` created 13:05                          | 2.5 |
| 2026-09-17/18 | 3 `Gemini_Generated_Image_*.jpg` in `wireframes/` at 09:47 on 09-18 (moods / wireframes, prompts in `4-UI_UX_Wireframes/prompts.md`) | 2.0 |

**Subtotal: 7.5 h**

## D. Reported by you: work outside Claude/git

| Date    | Work                                  | Est. (h) |
|---------|---------------------------------------|----------|
| 2026-10 | Hosting research for the app (exact date not recorded) | 2.0 |

**Subtotal: 2.0 h**

## Total

| Part | Hours |
|------|-------|
| A. Measured local sessions | 20.5 |
| B. Estimated from git | 13.5 |
| C. Gemini work (08-23 and 09-16 per your estimate, 09-18 estimated) | 7.5 |
| D. Hosting research (your report) | 2.0 |
| **Total (upper estimate)** | **43.5** |

### By month

| Month | Hours |
|-------|-------|
| 2026-08 | 4.0 |
| 2026-09 | 34.5 |
| 2026-10 | 5.0 |
| **Total** | **43.5** |

Realistic range: ~37–43.5 h. Caveats: Claude sessions may have run unattended while you did other work (not hands-on time); manual work outside Claude/git (design, testing in browser, reading) is not captured. 2026-09-11 08:08 "Initial commit" and the 09-22 DB schema commit fall inside measured blocks.
