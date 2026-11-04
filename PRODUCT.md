# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

College and university students looking for internships and first jobs. They are early in their careers, usually with a thin professional network, limited time between classes, and little experience reading hiring signals. They arrive wanting one thing: a real internship lead they have a credible way into.

## Product Purpose

Truss helps students find internship and job posts shared by people in their own LinkedIn network (1st and 2nd-degree connections), so every lead comes with a person they can actually reach. Success is a student finding a fresh, relevant post and knowing who to message about it.

## Positioning

Truss searches hiring posts written by people the student is connected to, not a generic job board. Results are strictly filtered to 1st and 2nd-degree connections and can be filtered by freshness ("posted in the last 24 hours"), so leads are both reachable and current.

## Operating Context

- Students sign in with email/password or Google (Supabase auth).
- The signed-in app has two sections: **Job Post Search** (natural-language search for internship and job posts, primary job) and **Truss Intelligence** (discover people, such as alumni and seniors, worth reaching out to, secondary).
- Searches are typed in plain language, e.g. "frontend internships in Bangalore posted this week".
- Public site: landing page, Why us, About, Sign in.

## Capabilities and Constraints

- Job Post Search: EXA-backed search of LinkedIn hiring posts, strict 1st/2nd-degree filter, strict time-window filter when the query names one, with counters showing how many posts were filtered out.
- Truss Intelligence: EXA-backed people search with result lists and profile links.
- Stack: Next.js 16 App Router, React 19, Tailwind CSS 4, Supabase, Lucide icons, Motion.
- The former Dashboard (LinkedIn CSV analysis) and Truss Connect (automated outreach) surfaces were removed from the app and must not be reintroduced in the UI.
- Posts with no publish timestamp can be excluded when a time filter is active.

## Brand Commitments

- Product name: Truss.
- Public URL used in the QR code: https://truss-ten.vercel.app/

## Evidence on Hand

- No testimonials, user counts, university partnerships, placement statistics, or company logos exist. Do not invent any.
- Existing images: `public/images/campfire-hero.jpg` (old campfire theme; not required to keep).

## Product Principles

1. Every lead comes with a person. Surface who posted it and how the student is connected.
2. Fresh beats exhaustive. Make recency visible and easy to filter.
3. Plain language in, plain language out. No recruiter jargon; write like a helpful senior.
4. Respect a student's time. Get from landing to a first search in as few steps as possible.

## Accessibility & Inclusion

Students use this on laptops and phones, often on campus Wi-Fi. Target WCAG 2.2 AA contrast and full keyboard use. Light and dark themes both need to meet contrast.
