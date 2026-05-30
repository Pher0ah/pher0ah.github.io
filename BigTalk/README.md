# BigTalk — Conversation Cards

A single-page, installable card game for parties and gatherings. Flip a card,
read the question aloud, and let everyone answer **for real** — then flip it
back and pass it on. No screens to stare at, no scores. Just better
conversations.

The idea grew out of the [Make Big Talk](https://www.makebigtalk.com) project
(skip shallow small talk for questions that matter), but the same card mechanic
hosts other decks too: **Bad People**, **Bad Choices** and **Couples**.

---

## Highlights

- **One clean HTML page** — no build step, no framework, no server.
- **Separation of concerns** — the question "backend" (`js/decks.js`) never
  touches the DOM; the UI (`js/app.js`) never parses data files.
- **Lazy data** — the chosen deck's JSON is fetched **once**, then questions are
  served **one at a time** (shuffled, no repeats until the pile is exhausted).
- **Responsive** — the card sizes itself with pure CSS (`min()` +
  `aspect-ratio` + container-query units) on phones, tablets and desktop, in
  portrait or landscape.
- **Modern glassmorphism UI** with a hamburger menu, **Settings** and **About**
  panes, and a **user-customisable accent colour** (with reset-to-default).
- **Remembers your choices** between sessions (deck, adult theme, accent) via
  `localStorage`.
- **Installable PWA** — works fully offline once loaded, on any device.
- **GitHub Pages ready** — every path is relative, so it works from a project
  sub-path with zero configuration.

---

## Project structure

```
index.html               App shell & markup
manifest.webmanifest     PWA manifest (installable app metadata)
sw.js                    Service worker (offline cache)
css/
  styles.css             All styling + responsive/glassmorphism theme
js/
  store.js               Settings persistence (localStorage) — no DOM
  decks.js               Data layer: registry + Deck class — no DOM
  app.js                 UI controller (the only file touching the DOM)
data/
  decks.json             Registry of available decks (add new decks here)
  decks/
    bigtalk.json         Questions for each deck
    badpeople.json
    badchoices.json
    couples.json
assets/img/
  decks/                 Deck logos (+ _fallback.svg)
  icons/                 App icons / favicon
```

### Data format

`data/decks.json` lists the decks shown in Settings:

```json
{
  "decks": [
    {
      "id": "bigtalk",
      "name": "BigTalk",
      "title": "Make Big Talk",
      "tagline": "Skip the small talk.",
      "logo": "assets/img/decks/bigtalk.svg",
      "accent": "#3ddc84",
      "card": "light",
      "file": "data/decks/bigtalk.json"
    }
  ]
}
```

`card` is optional and controls the card background: `"light"` (white card, the
default — for dark logos) or `"dark"` (black card — for light/white logos so
they stay legible). The menu tile and question text adapt automatically.

Each deck file is a flat list of questions. `adult: true` questions only appear
when the **Adult theme** switch is on:

```json
{
  "id": "bigtalk",
  "questions": [
    { "text": "What gives you hope?", "adult": false },
    { "text": "What does love mean to you?", "adult": true }
  ]
}
```

---

## Add your own deck (no code changes)

1. Create `data/decks/mydeck.json` with a `questions` array (see above).
2. Drop a logo in `assets/img/decks/` (SVG preferred; PNG/WEBP also work).
3. Add an entry to `data/decks.json` pointing at both — and set
   `"card": "dark"` if your logo is light-coloured.

It appears in the Settings list automatically.

---

## Run locally

Because the app uses ES modules and `fetch()`, it must be served over HTTP — you
can't just double-click `index.html`. Any static server works:

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

## Deploy to GitHub Pages

1. Push these files to a repo.
2. **Settings → Pages →** deploy from the `main` branch, root folder.
3. Visit `https://<user>.github.io/<repo>/`.

All paths are relative, so it works under the sub-path with no edits. On a
phone, use the browser's **Add to Home Screen** to install it as an app.

> **Updating:** when you change shell files (HTML/CSS/JS), bump the `CACHE`
> version string in `sw.js` so clients pick up the new version.
