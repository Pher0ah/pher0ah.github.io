# Health Record Dashboard

A single-page dashboard for a personal medical record — labs, vitals, medication,
conditions, imaging and a food-IgG panel. No server, no build step, no internet connection.
Open `index.html` in any browser, on a phone or a desktop.

> **Hosted copy.** This folder is published at
> <https://www.egynomics.com/Medical/>, which is a public web address. Only the dashboard is
> published there — `index.html` holds no personal data of any kind. The record itself
> (`health-data.json`) is deliberately **not** in that repository and never should be: use the
> **Load** button to open it from your own device. The original reports in `lab/` are likewise
> kept off GitHub entirely.

| File | What it is |
|---|---|
| `index.html` | The dashboard. Holds no data of its own — it reads the record at startup |
| `health-data.json` | The record itself — the file you edit, back up and version |
| `RECORD-NOTES.md` | Private notes on where the data came from; never published |
| `serve.py` | Serves the folder on localhost so the dashboard can load the record by itself |
| `publish.py` | Pushes the dashboard to the public site; refuses to publish the record |
| `tools/record-tool.js` | Checks the record from the command line and converts old files to the current layout; uses the dashboard's own format code |
| `lab/` | The source PDFs, spreadsheet and CSV exports the record was built from |

---

## Using it

The dashboard and the record are separate files. `index.html` carries no data; it loads
`health-data.json` at startup, and writes your changes back to a JSON file when you press Save.

### Opening it

**With `serve.py` (recommended).** Run:

```bash
python serve.py
```

It serves the folder on `http://127.0.0.1:8765` and opens the dashboard, which then reads
`health-data.json` from the folder every single time — no clicking, always current. The server
binds to localhost only, so nothing is exposed to your network. Ctrl+C stops it.

**By double-clicking `index.html`.** This works, with one wrinkle: browsers forbid a page opened
over `file://` from reading other files on disk, so the dashboard cannot fetch the record on its
own. It shows a short screen asking you to pick `health-data.json` once. After that the last copy
is kept in the browser's local storage and shown when the page is opened.

That stored copy is only a fallback and it can fall behind the file, so the dashboard says which one
you are looking at — under the patient name, and in a banner offering to re-open the file when it is
showing the browser copy. If you have edited `health-data.json` outside the dashboard, click that button.
Whenever the file itself can be loaded (with `serve.py`, or by picking it), it replaces the stored copy,
so editing the file by hand never triggers a "restore" prompt.

### Loading and saving

**Load** opens any record JSON — the current layout or the older one (see *Old (v1) files* below). On
Chrome and Edge this gives the dashboard a writable handle to that exact file, so **Save** afterwards
writes straight back to it with no dialog. Elsewhere Save opens a save dialog, or downloads
`health-data.json` if the browser has neither. Save writes the record in the canonical layout described
below and sets `updated` to today.

If a file has a syntax error — whether it was fetched at startup or opened with **Load** — the dashboard
stops and shows the line, column and reason instead of opening it (see *When the file has a mistake*).
It does not quietly fall back to the browser copy. Smaller problems only raise a *things to check* bar.

**Add** is a form for a lab result, a blood-pressure or vitals reading, a medication, a condition,
or an imaging/report entry. New tests not in the catalogue can be defined inline (name, unit,
category, reference range), and results entered in another unit are converted on the way in.

Every change is written to browser local storage immediately, so nothing is lost if the tab
closes. That is a safety net, not a save: until you press **Save**, `health-data.json` is
unchanged. The Save button turns amber while you have unsaved edits, and the browser warns you
if you try to leave with work outstanding.

The browser copy carries a separate flag saying whether it holds edits the file does not have. At
startup, once the file has loaded, the dashboard offers **Use my edits** only when that flag says
there are unsaved edits and the stored copy differs from the file; in every other case the stored copy
is simply overwritten with the file.

### Moving through time

Every chart shows a slice of the record, and the **scroll dial** underneath it shows the whole
history in miniature with the visible slice highlighted:

- **Drag the highlighted bar** to scroll back and forth through the years.
- **Drag either end** to stretch or shrink the period (once the window is wide enough to have
  grab handles — below that it becomes a single pan target, which is easier on a phone).
- **Tap anywhere else on the dial** to jump the window there, keeping its width.
- **Double-tap the dial**, or the ⇄ button, to snap back to the whole record.
- The **− and +** buttons beside the date label zoom out and in a step at a time, down to a
  two-week window.
- The **Last 3 / 1Y / 3Y / 5Y / 10Y / ALL** pills set the opening window.

**Last 3** is the default, and it follows the data rather than the calendar: the window opens on
whatever span covers that test’s three most recent readings. A test last run many years ago
opens on its own results instead of on an empty stretch of the last three years, and a test run
monthly opens tight. Because it is measured in readings, the span differs per graph — a test
sampled rarely spans a long stretch on its last three, a frequently measured one only a few weeks.

When a window contains no results the chart says so and names the nearest result on either
side, so an empty stretch reads as "not tested since 2021" rather than looking broken.

On the Vitals tab the window also drives the statistics and the reading log, so the tiles always
describe exactly the readings on screen — the Average tile states how many readings it covers.

### The Lab Tests list

Tests are listed folded, one per row, showing only the latest result with its trend and status.
Opening a row reveals that test’s graph, its scroll dial and the full table of results; its chart
is only built at that moment, so a large catalogue of tests still opens instantly. Rows are
grouped by category, and the search box and category chips filter the list.

### On a phone

The layout switches to a bottom tab bar under 720px. Charts respond to touch: drag across one
to scrub a crosshair through the readings, and vertical scrolling still works over the chart.
The scroll dial takes a finger drag, and timelines and wide tables scroll sideways.

---

## The JSON format

`health-data.json` is one plain-text JSON file that is meant to be read and edited by a person.
The dashboard writes it back in exactly the layout described here, so a hand edit and a dashboard
Save never fight over whitespace or ordering. The file opens with a `_guide` block that repeats the
essentials inside the file itself.

Sections come in this order — the ones you edit most first, reference data last — with one blank
line between sections:

```jsonc
{
  "_guide":          { ... },        // short instructions; kept exactly as written
  "schemaVersion": "2.0",
  "updated": "2026-01-31",           // set to today by every Save in the dashboard
  "referenceLab": "Example Hospital Laboratory",   // sets the units and ranges
  "unitPolicy": "...",
  "profile":         { ... },
  "allergies":       [ ... ],
  "familyHistory":   [ ... ],
  "socialHistory":   { ... },
  "surgicalHistory": [ ... ],
  "immunisations":   [ ... ],
  "keyTests":        [ ... ],        // which tests the Overview charts
  "followUps":       [ ... ],        // the "Worth raising with your doctor" cards
  "conditions":      [ ... ],
  "medications":     [ ... ],
  "events":          [ ... ],        // imaging, procedures, reports; newest first
  "labVisits":       [ ... ],        // one entry per laboratory visit; newest first
  "devices":         { ... },        // short names for the devices used in vitals
  "qualityCodes":    { ... },        // reading-quality flags used in vitals
  "vitals":          [ ... ],        // one reading per line; newest first
  "foodIgG":         { ... },
  "testCatalog":     { ... }         // definition of each test, grouped by panel
}
```

Layout rules, so you know what to expect when you open the file:

- Two-space indentation, `\n` line endings, one blank line between sections.
- **Rows** are written on a single line: every entry of `vitals`, every test in `testCatalog`,
  every result that is more than a bare number, and the `bands` and `positives` lists of
  `foodIgG`. Everything else is spread over several lines.
- A list that holds only plain values is written on one line: `["hgb", "hct"]`.
- `labVisits`, `vitals` and `events` are kept newest first. You can add an entry anywhere; the next
  Save puts it in its place.
- Keys the dashboard does not know are kept exactly as they are and written after `testCatalog`.
  Nothing you add is ever dropped.

### Dates

Dates are `YYYY-MM-DD`. When only the month or the year is known, write `YYYY-MM` or `YYYY`
(`"2019"`, `"2019-05"`). The dashboard shows them as `2019` and `May 2019` and marks them
approximate wherever it shows an approximate date. The older `startApprox` / `endApprox` /
`onsetApprox` / `dateApprox` flags are still honoured for full dates.

### Ranges

Reference ranges (`ref` in the catalogue, `labRange` on a result) are one short piece of text:

| Write | Meaning |
|---|---|
| `"4-10"` | between 4 and 10 |
| `"<=200"` | at most 200 (no lower bound) |
| `">=40"` | at least 40 (no upper bound) |

When reading, the dashboard also accepts `<`, `≤`, `>`, `≥`, an en dash or the word `to` between two
numbers (`"4 to 10"`), and spaces. Negative numbers are fine (`"-5--1"`). A range it cannot read is
reported as a warning and skipped; the rest of the entry still loads.

### `labVisits`

One block per visit to a laboratory: the date, the laboratory, and the results keyed by test.

```json
{ "date": "2024-03-12", "lab": "Example Laboratory",
  "results": {
    "wbc":         6.3,
    "hgb":         { "value": 15.6, "reported": "156 g/L", "labRange": "12.5-17.5" },
    "ferritin":    85,
    "urine_color": "Yellow"
  } },
{ "date": "2023-01-05", "lab": "Another Laboratory", "report": "lab/example.pdf",
  "results": {
    "ferritin": 60
  } }
```

**To add a visit:** copy a whole visit block, paste it at the top of `labVisits`, change the date and
the laboratory, then list the results as `"test_key": value`. Every key must exist in `testCatalog`
(add the test there first if it does not). Extra visit-level fields such as `report` or `note` are
kept.

A result is written as:

- a **bare number** — `"ferritin": 85` — when that is all there is;
- a **bare string** for something that is not a number — `"urine_color": "Yellow"`, `"hiv": "Negative"`;
- an **object** when there is more to keep, with any of `value`, `text` (a censored or qualitative
  result next to a number, such as `"<1.5"`), `reported`, `labRange` and `note`:
  - `reported` — the figure exactly as the report printed it, as a number, one space, then the unit:
    `"156 g/L"`. Keep it whenever the value had to be converted into the record's unit.
  - `labRange` — the range printed on *that* report (see Ranges). It is shown in the detail table and
    marked ≠ where it disagrees with the catalogue range, but never changes how the result is flagged.
  - `note` — anything else worth keeping (fasting, repeat sample, haemolysed).

### `testCatalog`

Defines each test once, grouped by panel; the order in the file is the order the tests are shown.

```json
"Vitamins & Minerals": {
  "ferritin": { "name": "Ferritin", "unit": "µg/L", "ref": "30-400", "decimals": 0 },
  "vit_d":    { "name": "Vitamin D", "unit": "nmol/L", "ref": ">=75", "decimals": 0, "higherBetter": true }
}
```

**To add a catalogue entry:** add a row to the right panel (or start a new panel — any name works and
it becomes a filter chip on the Lab Tests tab). Fields, in the order they are written: `name`, `unit`,
`ref`, `decimals`, then optionally `higherBetter` (only where a high value is the good outcome, such as
HDL or eGFR), `qualitative` (for tests whose results are words) and `rangeSource` (names the
laboratory a range was borrowed from, for tests the reference laboratory does not run; the detail view
credits it instead of the reference laboratory). Leave `ref` out when the test has no range. A test key
may appear in only one panel.

### Units and reference ranges

Two rules keep a long-term record readable:

**One unit per test.** A chart that mixes mmol/L and mg/dL is meaningless. Every value is
stored in the unit used by the laboratory named in `referenceLab`.

**One reference range per test.** Every result is flagged against the range in `testCatalog`,
which holds the reference laboratory's printed ranges. A result from a different laboratory can
print a range wide enough to call almost anything normal. Judged against those, a long trend can
appear to come and go; judged consistently, it is visible. The other laboratory's range is still
recorded in `labRange` and shown alongside each result.

The trade-off is that a result sitting right on another laboratory's boundary can flip. A value
can be comfortably normal on its own report and still read as one unit Low against the reference
range. The detail table shows both, marked ≠, so a borderline flag is always traceable to the
ranges rather than to the value.

**You do not have to convert anything by hand.** The Add form has a unit selector next to the
value: enter the number exactly as the report prints it, pick the unit, and the dashboard
converts it and stores the original in `reported`. The conversions it knows:

| Test | Alternate unit | To the record's unit |
|---|---|---|
| Cholesterol, LDL, HDL, non-HDL | mmol/L | × 38.67 → mg/dL |
| Triglycerides | mmol/L | × 88.57 → mg/dL |
| Glucose | mmol/L | × 18.016 → mg/dL |
| Creatinine | µmol/L | ÷ 88.4 → mg/dL |
| Uric acid | µmol/L | ÷ 59.48 → mg/dL |
| Urea | mmol/L, or mg/dL as BUN | × 6.006 / × 2.14 → mg/dL |
| Haemoglobin, albumin, total protein | g/L | ÷ 10 → g/dL |
| Haematocrit | L/L | × 100 → % |
| Bilirubin | µmol/L | ÷ 17.1 → mg/dL |
| CRP | mg/dL | × 10 → mg/L |
| Vitamin D | ng/mL | × 2.496 → nmol/L |
| Vitamin B12 | pg/mL | × 0.738 → pmol/L |
| Folate | ng/mL | × 2.266 → nmol/L |
| Iron | µg/dL | × 0.179 → µmol/L |
| Free T4 | ng/dL | × 12.87 → pmol/L |
| Cell counts | K/µL, M/µL, /µL | × 1 or × 0.001 → x10⁹/L, x10¹²/L |

If you edit `health-data.json` by hand instead, do the conversion yourself and record what you
started from in `reported`. To change which laboratory sets the standard, update `referenceLab`,
the `unit` and `ref` in `testCatalog`, and convert the stored values to match.

### `vitals`, `devices` and `qualityCodes`

One reading per line, newest first:

```json
{ "at": "2024-03-12 07:30", "bp": "124/78", "pulse": 64, "device": "cuff", "note": "before breakfast", "medTaken": true },
{ "at": "2024-03-11 21:10", "bp": "131/84", "pulse": 70, "device": "watch", "quality": "strap-loose" }
```

**To add a reading:** copy a row to the top of `vitals` and change it. `at` is `"YYYY-MM-DD HH:MM"`
(or just the date), `bp` is `"systolic/diastolic"`. `weight`, `bmi`, `spo2`, `temp`, `glucose`
and `waist` are also recognised, and each gets its own chart on the Vitals tab as soon as one
reading exists. Blood-pressure entries are classified by the ACC/AHA thresholds (Normal / Elevated /
Stage 1 / Stage 2 / Crisis).

- `device` is a key of `devices` — a short name for a full device name — or any text, which is then
  the source name itself:

  ```json
  "devices": {
    "watch": "Example Watch",
    "cuff":  "Example Cuff Monitor"
  }
  ```

- `quality` is a key of `qualityCodes` and marks a reading the device itself flagged as doubtful. The
  dashboard shows its text as an amber tag in the reading log:

  ```json
  "qualityCodes": {
    "strap-loose": "Strap loose. Results may be inaccurate."
  }
  ```

- `note` is free text. Readings added with the dashboard's Add form are recorded with the source
  `Manual entry` (written as `"device": "manual"`) and may carry a quality.

### `medications`

One block per medicine and dose:

```json
{
  "id": "med1",
  "name": "Glucophage",
  "generic": "Metformin",
  "cls": "Antidiabetic",
  "dose": "500 mg",
  "freq": "Twice daily with meals",
  "start": "2022-06",
  "end": null,
  "status": "active",
  "prescriber": "Dr Example",
  "note": ""
}
```

`status` is `active`, `past`, `stopped` or `unknown`. Leave `end` as `null` while the medicine is still
being taken. `cls` colours the timeline — Antihypertensive, Lipid-lowering, Antiplatelet, Supplement,
GLP-1 / GIP agonist are pre-coloured; anything else is grey. Dates may be partial (see Dates).

### `conditions`

```json
{
  "id": "cond1",
  "name": "Asthma",
  "category": "Respiratory",
  "onset": "2015-04",
  "resolved": null,
  "status": "controlled",
  "severity": "mild",
  "note": "...",
  "evidence": { "kind": "lab", "detail": "Spirometry, April 2015, Example Clinic." }
}
```

`status` is `active`, `monitoring`, `controlled` or `resolved`; `severity` is `mild`, `moderate` or
`severe` and sets the timeline colour. Leave `severity` out when the source does not grade it — the
dashboard simply omits the pill rather than inventing a grade.

`evidence` records what the entry actually rests on, so a finding from an imaging report and a
symptom written down from memory do not look alike. `kind` is `lab`, `imaging`, `pathology`, `report`
or `self-reported`. Anything `self-reported` is drawn in amber and labelled *not in any report*. Set
`"derivedDate": true` when the onset was worked back from a phrase rather than recorded — the card then
shows *(estimated, no date recorded)* instead of a date that looks measured.

### `events`

Imaging, procedures, screening and report transfers, newest first.

```json
{
  "date": "2023-09-18",
  "type": "Imaging",
  "title": "Chest X-ray",
  "provider": "Example Radiology",
  "findings": "...",
  "impression": "..."
}
```

`type` selects the icon: Ultrasound, Pathology, Screening, Cardiac, Record, Immunology.

### History sections

Five short sections hold the background a clinician asks for. They start empty and are not shown as
tabs yet; they are kept and written back exactly as you type them.

```json
"allergies":       [ { "substance": "Penicillin", "reaction": "rash", "severity": "moderate", "noted": "2010" } ],
"familyHistory":   [ { "relation": "Father", "condition": "Type 2 diabetes", "ageAtOnset": 55 } ],
"socialHistory":   { "smoking": null, "alcohol": null, "exercise": "walks daily", "occupation": null },
"surgicalHistory": [ { "date": "2015", "procedure": "Appendicectomy" } ],
"immunisations":   [ { "date": "2024-04", "vaccine": "Influenza" } ]
```

(In the file each block is spread over several lines; they are shown on one line here to save space.)

### `foodIgG`

One panel with `date`, `method`, `unit`, `lab`, `antigensTested`, `negativeCount`, a `disclaimer`
string, `bands` (the colour bands) and `positives`: `{ "group", "name", "antigen", "value" }`, one per
line. Bands are drawn at 5 / 10 / 20 µg/mL.

An optional `interpretation` string is shown under the chart as a note. Leave it out and no note is
drawn.

### `keyTests`

An array of test keys (for example `["hgb", "ldl", "crp"]`) that sets which cards appear under
**Key trends** on the Overview. When it is empty, a built-in default list is used.

### `followUps`

The "Worth raising with your doctor" cards on the Overview tab. These live in the record rather
than in the dashboard, so they can be rewritten as the picture changes without touching
`index.html`:

```json
{ "level": "warn", "title": "...", "text": "..." }
```

`level` only sets the colour of the stripe — `bad` red, `warn` amber, empty neutral. Leave the list
empty and the section disappears.

### When the file has a mistake

Opening a hand-edited file is checked before anything is shown:

- **A syntax error** (a missing comma, a stray comma before `}` or `]`, an unquoted key, single
  quotes, text with no closing quote, a missing colon, a file that stops too early) stops the load.
  The dashboard shows a screen with the line and column, a plain-English reason, and the offending
  line with the one before it. It never quietly shows the browser's older copy instead. Fix the file
  and press **Try again**; if a copy saved in this browser exists, a second button opens that copy.
- **Things to check** (a result whose test key is not in `testCatalog`, a date that is not
  `YYYY-MM-DD`, an unreadable `reported`, `labRange`, `ref`, `at` or `bp`, a `quality` code that is not
  in `qualityCodes`, an unknown `status`) do not stop the load. A bar at the top says *N things to
  check in health-data.json*; **Show** lists the first twenty with where each one is. The rest of the
  entry still loads.

### Checking the file from the command line

```bash
node tools/record-tool.js check            # checks health-data.json
node tools/record-tool.js check other.json # or any other file
```

It reads the file with the same code the dashboard uses (it extracts it from `index.html`, so there is
only one implementation of the format), prints any warnings with their locations, says whether the file
is already in the canonical layout, and prints the counts: visits, results, vitals, medications,
conditions, events and tests. On a syntax error it prints the line, column, reason and context and exits
with status 1. No dependencies beyond Node.

`node tools/record-tool.js convert [in] [out]` rewrites a record (an old v1 file or a v2 file) in the
canonical v2 layout; both paths default to `health-data.json`. Keep a copy of the original first.

### Old (v1) files

A file in the previous layout — one flat `labResults` list, a flat `testCatalog` with `category`,
`refLow` and `refHigh` on each test, vitals with separate `systolic` / `diastolic` — is still opened by
the dashboard and converted on the fly; the next Save writes it as v2. The conversion keeps every value;
it also turns doubtful-reading notes into `quality` codes, rounds approximate first-of-the-month dates to
`YYYY-MM`, and sorts medications once (active, unknown, stopped, past, newest first).

`index.html` contains no personal information at all: every name, value and clinical note comes
from the record file.

---

**This is a record-keeping tool, not medical advice.** Reference ranges differ between
laboratories; always read a result against the range printed on its own report, and take
clinical decisions with your physician.
