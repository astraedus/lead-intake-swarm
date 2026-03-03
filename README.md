# Lead Intake Swarm

Lead Intake Swarm is a static field-operations microsite that turns live weather data into a dispatch brief for service businesses.

Instead of showing generic dashboard filler, it answers practical questions:

- which territory is most likely to slip tomorrow
- where same-day work can be booked safely
- how many crews should be rebalanced
- how much revenue is exposed if the board is left unchanged

## What It Does

- pulls forecast data from Open-Meteo in the browser
- scores four service territories across a rolling three-day window
- ranks dispatch priority and shows human-readable next actions
- surfaces at-risk accounts and automation triggers
- models revenue exposure with an interactive scenario planner

## Product Shape

The page is designed to feel like the front end of a real workflow:

- dispatch review at the start of day
- automated customer notification triggers
- CRM / SLA logging after route changes
- capacity rebalancing across markets

It also includes a built-in fallback model so the page still renders usable output if a live forecast call fails.

## Live Data

- API: Open-Meteo
- Auth: none required
- Deployment fit: GitHub Pages friendly

## Repo Assets

- `assets/social-preview.svg`: lightweight social/thumbnail art
- `assets/site-shot.png`: screenshot asset for GitHub/social previews

## Open

```bash
open index.html
```
