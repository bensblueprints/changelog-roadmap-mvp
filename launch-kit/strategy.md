# Launch Strategy — Shipnotes

## Positioning

"Pay once. Own it forever. No subscription." Direct replacement for **Canny ($79/mo = $948/yr)** and **Headway ($29/mo, changelog only)**. At $49 one-time, Shipnotes pays for itself vs Canny in **19 days** — the best savings math in the suite after Cardsmith. Primary audience: SaaS founders and indie hackers who already resent per-seat/per-workspace SaaS tooling and are comfortable with `docker compose up`.

## Target communities

| Community | Angle (rules-aware) |
|---|---|
| r/SaaS | "How do you collect feature requests without paying Canny $79/mo?" — discussion first, link when asked. No naked self-promo; use their Self-Promotion Saturday thread for the direct pitch. |
| r/selfhosted | Perfect fit — post as "I built a self-hosted Canny alternative (MIT)". This sub *requires* the project be self-hostable and loves SQLite-only stacks. Lead with the GitHub repo, not the paid installer. |
| r/indiehackers + indiehackers.com | Build-in-public story: "I replaced my $79/mo Canny bill with a weekend project, then productized it." Include real revenue/savings numbers — that's the currency there. |
| r/webdev | Show the embeddable widget technique (script tag → derives origin from its own src, CORS JSON endpoint, localStorage unread count). Teach first, product second. |
| r/opensource | MIT-licensed announcement; be transparent that the paid version is just a packaged installer — that model is well received when stated up front. |
| Hacker News | Show HN (draft below). Answer every comment for the first 4 hours. |

## Show HN draft

**Title:** Show HN: Shipnotes – self-hosted changelog, roadmap, and feature voting (SQLite)

**Text:**
Canny charges $79/month for a changelog, a roadmap board, and upvotes. I kept paying it across multiple small products and finally built the self-hosted version.

Shipnotes is a single Node process: Express + better-sqlite3 serving server-rendered public pages (changelog with RSS, roadmap board, request threads) and a React admin. Visitors vote without accounts — one vote per visitor token, duplicates 409. Publishing a post emails subscribers through your own SMTP with unsubscribe links. There's an embeddable widget: one script tag shows a bell with an unread count and the latest posts (it derives the host from its own `src`, so no config).

Everything is one SQLite file. It also runs as an Electron desktop app using the exact same server code on a random local port — handy for trying it before deploying.

Source is MIT. The $49 product is just a convenience installer; the code is all on GitHub. Happy to answer questions about the one-vote-per-visitor design or the merge-with-vote-dedup logic.

## SEO keywords (10)

1. canny alternative self hosted
2. self hosted changelog tool
3. open source feature request board
4. headway changelog alternative
5. public roadmap software self hosted
6. feature voting board open source
7. changelog widget for website
8. product changelog software one time purchase
9. canny io pricing alternative
10. self hosted product feedback tool

## AppSumo / PitchGround pitch

Shipnotes gives every SaaS the three pages users actually check — a changelog, a public roadmap, and a feature-request board with voting — without the $948/year Canny bill. It's fully self-hosted (one Docker command, data in a single SQLite file), includes BYO-SMTP email notifications with unsubscribe handling, RSS, comment threads with moderation and duplicate-merging, and an embeddable "What's new" widget that drops into any site with one script tag. Sumo-lings who hate subscriptions get the ultimate anti-subscription deal: lifetime access to the tool that *announces* their own lifetime deals.

## Pricing

**$49 one-time.**
- Canny: $79/mo → $948/yr → Shipnotes pays for itself in **19 days** (0.62 months).
- Headway: $29/mo → $348/yr → pays for itself in **1.7 months**, and Headway doesn't even include the roadmap/voting board.
- Frame in copy: "One month of Canny costs more than Shipnotes costs forever — and month 2 is where they make their money."
