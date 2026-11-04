---
name: Truss
description: Internship and job posts from your 1st and 2nd-degree connections, pinned to a campus placement board.
colors:
  board: "#2747c9"
  board-deep: "#1c37a3"
  board-ink: "#ffffff"
  board-muted: "#d3dcff"
  paper: "#fffef9"
  paper-yellow: "#fff27a"
  paper-pink: "#ffc9dc"
  paper-mint: "#c6f1d6"
  paper-sky: "#d4e8ff"
  paper-grey: "#e4e4e0"
  ink: "#17181c"
  ink-soft: "#3f424b"
  ink-faint: "#5e626d"
  rule: "#c9ccd6"
  highlight: "#ffe94a"
  pin-red: "#e23b2e"
  pin-yellow: "#ffcf1f"
  pin-green: "#18a058"
  pin-orange: "#ff7a1a"
  alert: "#a3241a"
  alert-paper: "#ffe1dc"
typography:
  display:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "clamp(2.6rem, 6vw, 5.4rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "clamp(2.1rem, 4.4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.08em"
  hand:
    fontFamily: "Kalam, cursive"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.25
rounded:
  paper: "2px"
  button: "3px"
  stamp: "9999px"
spacing:
  section: "96px"
  flyer: "24px"
  flyer-lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  button-yellow:
    backgroundColor: "{colors.paper-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "44px"
  flyer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "{spacing.flyer}"
  chip-example:
    backgroundColor: "{colors.paper-sky}"
    textColor: "{colors.ink}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
  degree-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "12px 14px"
---

# Design System: Truss

## Overview

**Creative North Star: "The Placement Board"**

Truss looks like the notice board outside a college placement cell: a saturated blue soft-board, and on it paper flyers pinned up by people you know. Every piece of content is a sheet of paper. Sheets hang slightly crooked, carry a push pin or a strip of tape, and straighten up and lift when you reach for them. The board is loud and the paper is quiet, so the eye always lands on the posts.

The system is for college students hunting internships and first jobs, so it trades corporate polish for campus familiarity: sticky notes, highlighter marks, handwritten tags, tear-off contact strips. Density stays moderate. Flyers hold one idea each, and the board between them is real breathing room, not decoration.

Copy and visuals stay honest. Anything that looks like a post or a person but isn't real data is labeled "Example" with a handwritten tag.

**Key Characteristics:**
- A blue board as the page background, with paper sheets as the only content surfaces.
- Sheets are tilted by small, varied angles (about -2° to +2°) and straighten on hover or focus.
- Pins and tape show how a sheet is attached. Neither is used as decoration on its own.
- A chunky grotesque display face, a plain humanist sans for body text, and a handwritten face only for tags.
- Yellow highlighter and yellow paper carry emphasis and the main action.

## Colors

A cobalt board, warm off-white paper, a short set of stationery pastels, and near-black ink.

### Primary
- **Placement Board Blue** (board): the page background everywhere. Text placed directly on the board uses Board White and Board Mist.
- **Deep Board** (board-deep): bands that need to separate from the main board (the "How it works" band and the footer).

### Secondary
- **Sticky Yellow** (paper-yellow): the primary call to action (Start searching, the first tear-off tab, the active app tab) and the most important flyer on a screen.
- **Highlighter** (highlight): marker strokes behind key words, text selection, and the focus outline.

### Tertiary
- **Stationery pastels** (paper-pink, paper-mint, paper-sky, paper-grey): alternate flyer colors so a board of results reads as many hands posting. Sky also fills example-query chips. Grey is reserved for the "typical job board listing" counterexample.
- **Pin colors** (pin-red, pin-yellow, pin-green, pin-orange): push pin heads only.

### Neutral
- **Flyer Paper** (paper): the default sheet.
- **Ink** (ink): all text on paper, primary buttons, and degree-stamp outlines.
- **Soft Ink / Faint Ink** (ink-soft, ink-faint): secondary text and metadata on paper.
- **Rule** (rule): hairlines inside sheets.
- **Board White / Board Mist** (board-ink, board-muted): headings and body text placed directly on the board.
- **Alert Red on Alert Paper** (alert, alert-paper): error notes.

In dark mode the board drops to a night navy and the paper dims to an aged cream. The pastels desaturate slightly. Ink stays the same, because ink always sits on paper.

### Named Rules
**The Ink-on-Paper Rule.** Ink-colored text only ever sits on paper. Text on the board is Board White or Board Mist. Never put ink text straight onto the board.

**The One Yellow Thing Rule.** Each viewport has one primary yellow action. Yellow flyers can repeat in a results grid, but a second yellow button cannot.

## Typography

**Display Font:** Bricolage Grotesque (fallback: sans-serif)
**Body Font:** Figtree (fallback: system-ui)
**Hand Font:** Kalam, used only for pinned tags and annotations

**Character:** Bricolage brings the bold, slightly quirky voice of a hand-set flyer headline. Figtree keeps forms, results, and long text calm and readable. Kalam is the student's own handwriting on the board.

### Hierarchy
- **Display** (800, clamp(2.6rem, 6vw, 5.4rem), 0.95): page H1s only, often with a highlighter mark on the key phrase.
- **Headline** (800, clamp(2.1rem, 4.4vw, 3.4rem), 1): section H2s.
- **Title** (700, about 1.25rem, 1.2): flyer headings, such as post titles and people's names.
- **Body** (400, 1rem to 1.125rem, 1.6 to 1.75): paragraphs, capped at about 65ch.
- **Label** (700, 0.7rem, 0.08em, uppercase): degree stamps and small step labels.
- **Hand** (Kalam 400, about 0.95rem to 1.25rem): "Example post", "Posted by …", and board annotations.

### Named Rules
**The Handwriting Is Annotation Rule.** Kalam is never used for headings, buttons, form labels, or anything a student must read to complete a task.

## Layout

Content sits in a centered container (max-width 80rem, 20px gutters on mobile and 32px from `sm`). Pages use a 12-column grid from `lg`, with large flyers spanning 5 to 7 columns. Sections are separated by roughly 96 to 112px of vertical space, or by a band change (board, deep board, or plain paper).

The landing hero places a headline flyer next to a loosely arranged cluster of example flyers. The cluster becomes absolutely positioned only from `xl` (1280px). Below that it stacks into a one-column grid on phones and a two-column grid from `sm`. Results grids are one column on phones, two from `md`, and three from `xl`. Hero height is capped at 860px so tall screens don't stretch it.

## Elevation & Depth

Depth is physical: paper casting a short, cool shadow onto the board. There are only two levels. Sheets sit at rest with the paper shadow and rise to the lift shadow when they straighten under a pointer or keyboard focus.

### Shadow Vocabulary
- **Paper** (`0 1px 0 rgb(10 18 60 / 0.10), 0 10px 18px -10px rgb(8 16 58 / 0.55)`): every resting sheet, the theme toggle, and the logo slip.
- **Lift** (`0 2px 0 rgb(10 18 60 / 0.08), 0 26px 34px -18px rgb(8 16 58 / 0.65)`): an interactive sheet on hover or focus-within.

### Named Rules
**The Straighten-Up Rule.** Interactive sheets rotate back to 0° and lift on hover or focus (420ms, cubic-bezier(0.16, 1, 0.3, 1)). With reduced motion, tilt stays but movement is removed.

## Shapes

Paper has nearly square corners (2px) and buttons have 3px corners. Only stamps, chips, avatars, and pins are fully round. Tape strips are translucent, slightly rotated rectangles. Tear-off strips are vertical tabs separated by dashed rules, with the first tab pulled down a few pixels on hover.

## Components

### Buttons
- **Shape:** squared (3px), minimum height 44px, Bricolage 700.
- **Primary (ink):** ink fill with paper text, used for submit actions inside flyers.
- **Yellow:** Sticky Yellow fill with ink text, used for the primary action on the board.
- **Outline:** transparent with a 2px inset Board White ring, used for secondary actions on the board.
- **Hover / Focus:** lifts 2px over 300ms. Focus shows the 3px highlighter outline offset by 3px.

### Chips
- **Style:** Sky paper pill with ink text, used for example queries. A click fills the field and runs the search immediately.

### Cards / Containers (Flyers)
- **Corner Style:** 2px.
- **Background:** paper or one pastel. Pastels rotate through a results grid.
- **Shadow Strategy:** paper at rest, lift when interactive (see Elevation & Depth).
- **Attachment:** a push pin centered on the top edge, or a tape strip. Never both on one sheet.
- **Internal Padding:** 24px, or 32px for large sheets.

### Inputs / Fields
- **Style:** paper fill, 2px ink border, 2px corners, red caret. Labels sit above the field in Figtree 600.
- **Focus:** highlighter outline.
- **Error:** an Alert Paper note with Alert Red text and a tape strip, placed above the results.

### Navigation
- **Public:** a taped paper logo slip on the left, text links in Board White in the center (the active link is underlined), and Sign in plus a yellow "Start searching" button on the right. On mobile, links collapse into a menu on a paper sheet.
- **App:** a paper logo slip, two paper tabs (Internship posts, Find people) where the active tab is Sticky Yellow, and a profile menu that closes with Escape.

### Signature Component: Tear-off strip
The bottom of a hero or CTA flyer is a row of vertical tabs that all repeat the action label, like a flyer with phone-number tabs. The whole strip is one link and the duplicate tabs are hidden from assistive tech. The first tab is yellow and pulls down on hover.

### Signature Component: Degree stamp
An ink-outlined pill reading "1ST DEGREE" or "2ND DEGREE" in the top-left of every post flyer, so the connection is visible before the title.

## Do's and Don'ts

### Do:
- **Do** put every piece of content on a sheet of paper, and keep the board itself empty.
- **Do** vary tilts slightly between neighboring sheets (between -2° and +2°), and keep forms and long reading sheets at or below 1°.
- **Do** label all illustrative posts and people with a handwritten "Example" tag.
- **Do** use the highlighter on two to four words of a headline, not whole sentences.
- **Do** keep primary text contrast at WCAG AA or better on every paper color, in both themes.

### Don't:
- **Don't** add rounded "SaaS cards", glassmorphism, or gradient backgrounds. Surfaces are paper on a board.
- **Don't** fabricate stats, testimonials, or counts.
- **Don't** use Kalam for headings, buttons, or form labels.
- **Don't** use more than one yellow primary button per viewport.
- **Don't** reintroduce the removed Dashboard or Truss Connect surfaces.
