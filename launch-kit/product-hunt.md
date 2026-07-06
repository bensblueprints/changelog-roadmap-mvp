# Product Hunt Launch — Shipnotes

## Name
Shipnotes

## Tagline (≤60 chars)
Self-hosted changelog + roadmap. Pay once, ditch Canny. (54 chars)

## Description (≤260 chars)
Shipnotes is a self-hosted Canny alternative: public changelog, roadmap board, and feature-request voting with comments — plus an embeddable "What's new" widget and email notifications. One-time $49, SQLite file you own, runs on a $5 VPS or as a desktop app. (256 chars)

## Full description

Every SaaS needs three things users actually see: a changelog ("what did you ship?"), a roadmap ("what's coming?"), and a way to vote on feature requests ("build this next!"). Canny charges $79/month for that. Headway charges $29/month just for the changelog.

Shipnotes is all three, self-hosted, for $49 once:

- **Public changelog** — Markdown posts tagged New/Improved/Fixed, with RSS
- **Roadmap board** — Planned / In Progress / Shipped, sorted by votes
- **Feature requests** — visitors submit and upvote without creating an account (one vote per visitor), comment threads included
- **Moderation** — approve, merge duplicates (votes carry over), or decline with a public reason
- **Email subscribers** — bring your own SMTP; publishing emails everyone with unsubscribe links
- **"What's new" widget** — one script tag adds an unread-count bell + latest-posts dropdown to your app
- **Admin dashboard** — dark, fast, no clutter

Your data is one SQLite file. Run it on any $5 VPS with Docker, or run it as a Windows desktop app (same codebase, Electron wrapper). MIT-licensed source on GitHub.

## Maker first comment

Hey PH 👋

I run a handful of small products, and every one of them needed a changelog and a feature-request board. Canny wanted $79/month — per workspace. That's $948/year to host a list of posts and some upvote buttons. I paid it for a while and it stung every month.

So I built Shipnotes: the whole Canny core (changelog, roadmap, voting, comments, email notifications, embeddable widget) as a single Node app backed by one SQLite file. It deploys with docker compose in about two minutes, or runs as a plain desktop app if you don't even want a server.

Design decisions I care about:
- **No signup wall for voters.** Your users shouldn't need an account to tell you what they want. One vote per visitor is enforced with a token cookie.
- **BYO SMTP.** Your subscriber list is yours; emails go out through your own provider.
- **Boring tech.** Express + SQLite. It'll still run in ten years.

It's $49 once, MIT source on GitHub. Ask me anything — I'll be here all day.

## Gallery shots (5)

1. **Hero** — public changelog page (dark) with tagged posts and the subscribe box; headline overlay: "Your changelog. Your server. $49 once."
2. **Roadmap board** — three columns (Planned / In Progress / Shipped) with vote counts, plus the feature-request submission form below.
3. **Admin dashboard** — Requests tab with a pending item being approved and the merge modal open, showing votes carrying over.
4. **Widget in action** — a demo SaaS landing page with the bell + "3" unread badge and the dropdown of latest posts open.
5. **Savings math** — side-by-side card: Canny $948/yr vs Shipnotes $49 forever, with "pays for itself in 19 days" callout.
