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
own. It shows a short screen asking you to pick `health-data.json` once. After that the record is
kept in the browser's local storage and reloads automatically.

Because that stored copy can fall behind the file, the dashboard says which one you are looking
at — under the patient name, and in a banner offering to re-open the file when it is showing
the browser copy. If you have edited `health-data.json` outside the dashboard, click that button.

### Loading and saving

**Load** opens any record JSON. On Chrome and Edge this gives the dashboard a writable handle to
that exact file, so **Save** afterwards writes straight back to it with no dialog. Elsewhere Save
opens a save dialog, or downloads `health-data.json` if the browser has neither.

**Add** is a form for a lab result, a blood-pressure or vitals reading, a medication, a condition,
or an imaging/report entry. New tests not in the catalogue can be defined inline (name, unit,
category, reference range), and results entered in another unit are converted on the way in.

Every change is written to browser local storage immediately, so nothing is lost if the tab
closes. That is a safety net, not a save: until you press **Save**, `health-data.json` is
unchanged. The Save button turns amber while you have unsaved edits, and the browser warns you
if you try to leave with work outstanding.

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

```jsonc
{
  "schemaVersion": "1.1",
  "generated": "2026-01-01",
  "referenceLab": "Example Hospital Laboratory",   // sets the units and ranges
  "unitPolicy":   "...",
  "profile":      { ... },
  "testCatalog":  { ... },   // definition of each test: name, unit, reference range
  "labResults":   [ ... ],   // one entry per test per date
  "vitals":       [ ... ],   // blood pressure, pulse, weight, SpO2 ...
  "medications":  [ ... ],
  "conditions":   [ ... ],
  "events":       [ ... ],   // imaging, procedures, screening, reports
  "foodIgG":      { ... },
  "keyTests":     [ ... ],   // optional, see below
  "followUps":    [ ... ]    // optional, see below
}
```

Dates are always `YYYY-MM-DD`. Every array is independent — add to one without touching the
others. Unknown or approximate values should be left out rather than guessed; the dashboard
renders missing dates as faded timeline edges rather than inventing a span.

### `testCatalog`

Defines a test once; every result then refers to it by key.

```json
"ferritin": {
  "name": "Ferritin",
  "unit": "µg/L",
  "category": "Vitamins & Minerals",
  "decimals": 0,
  "refLow": 30,
  "refHigh": 400,
  "higherBetter": false
}
```

`refLow` / `refHigh` hold the reference laboratory's range and are what every result is
flagged against. Both are optional — omit the one that doesn't apply (LDL has only a
`refHigh`, HDL only a `refLow`, MPV has neither).
`category` drives the filter chips on the Lab Tests tab, and any new category name works.
`higherBetter` is only needed where a high value is the good outcome (HDL, eGFR).

`rangeSource` is optional and names the laboratory a range was borrowed from, for tests the
reference lab does not run at all. The detail view credits it instead of the reference lab.

### `labResults`

```json
{ "date": "2024-03-12", "test": "ferritin", "value": 85,
  "source": "Example Laboratory" }
```

Optional per-result fields:

- `orig` — `{"value": 2.0, "unit": "mmol/L"}`, the number exactly as the report printed it,
  kept whenever the value had to be converted into the record's unit.
- `srcRefLow` / `srcRefHigh` — the range printed on *that* report. These are provenance
  only: they are shown in the detail table and marked ≠ where they disagree with the
  reference range, but they never change how a result is flagged.
- `text` — for qualitative or censored results (`"<1.5"`, `">90"`, `"-ve"`, `"Nil"`). A
  result may have `text` alone with no `value`; it then appears as a table entry rather than a
  chart point.
- `note` — anything else worth keeping (fasting, repeat sample, haemolysed).

### Units and reference ranges

Two rules keep a long-term record readable:

**One unit per test.** A chart that mixes mmol/L and mg/dL is meaningless. Every value is
stored in the unit used by the laboratory named in `referenceLab`.

**One reference range per test.** Every result is flagged against the range in `testCatalog`,
which holds the reference laboratory's printed ranges. A result from a different laboratory can
print a range wide enough to call almost anything normal. Judged against those, a long trend can
appear to come and go; judged consistently, it is visible. The other laboratory's range is still
recorded in `srcRefLow` / `srcRefHigh` and shown alongside each result.

The trade-off is that a result sitting right on another laboratory's boundary can flip. A value
can be comfortably normal on its own report and still read as one unit Low against the reference
range. The detail table shows both, marked ≠, so a borderline flag is always traceable to the
ranges rather than to the value.

**You do not have to convert anything by hand.** The Add form has a unit selector next to the
value: enter the number exactly as the report prints it, pick the unit, and the dashboard
converts it and stores the original in `orig`. The conversions it knows:

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
started from in `orig`. To change which laboratory sets the standard, update `referenceLab`,
the `unit` and `refLow`/`refHigh` in `testCatalog`, and convert the stored values to match.

### `vitals`

```json
{ "date": "2024-03-12", "time": "07:30", "systolic": 124, "diastolic": 78,
  "pulse": 64, "note": "before breakfast", "medTaken": true, "source": "Example monitor" }
```

`weight`, `spo2`, `temp`, `waist` and `glucose` are also recognised and each gets its own
chart on the Vitals tab as soon as one reading exists. Blood-pressure entries are classified
by the ACC/AHA thresholds (Normal / Elevated / Stage 1 / Stage 2 / Crisis).

### `medications`

```json
{ "name": "Glucophage", "generic": "Metformin",
  "cls": "Antidiabetic", "dose": "500 mg", "freq": "Twice daily with meals",
  "start": "2022-06-01", "startApprox": true, "end": null,
  "status": "active", "prescriber": "Dr Example", "note": "..." }
```

`status` is `active`, `past`, `stopped` or `unknown`. `cls` colours the timeline —
Antihypertensive, Lipid-lowering, Antiplatelet, Supplement, GLP-1 / GIP agonist are
pre-coloured; anything else is grey. `startApprox` / `endApprox` mark the date with an
asterisk in the table.

### `conditions`

```json
{ "name": "Asthma", "category": "Respiratory", "onset": "2015-04-01",
  "onsetApprox": false, "resolved": null, "status": "controlled",
  "severity": "mild", "note": "..." }
```

`status` is `active`, `monitoring`, `controlled` or `resolved`; `severity` is `mild`,
`moderate` or `severe` and sets the timeline colour. Leave `severity` out when the source does
not grade it — the dashboard simply omits the pill rather than inventing a grade.

`evidence` records what the entry actually rests on, so a finding from an ultrasound report and a
symptom written down from memory do not look alike:

```json
"evidence": {
  "kind": "lab" | "imaging" | "pathology" | "report" | "self-reported",
  "detail": "Spirometry, 3 Apr 2015, Example Clinic.",
  "derivedDate": true
}
```

Anything marked `self-reported` is drawn in amber and labelled *not in any report*. Set
`derivedDate` when the onset was worked back from a phrase rather than recorded — the card then
shows *(estimated, no date recorded)* instead of a date that looks measured.

### `events`

Imaging, procedures, screening and report transfers.

```json
{ "date": "2023-09-18", "type": "Imaging",
  "title": "Chest X-ray", "provider": "Example Radiology",
  "findings": "...", "impression": "..." }
```

`type` selects the icon: Ultrasound, Pathology, Screening, Cardiac, Record, Immunology.

### `foodIgG`

One panel with `date`, `method`, `unit`, `antigensTested`, `negativeCount`, a `disclaimer`
string, and `positives`: `[{ "group", "name", "antigen", "value" }]`. Bands are drawn at
5 / 10 / 20 µg/mL.

An optional `interpretation` string is shown under the chart as a note. Leave it out and no
note is drawn.

### `keyTests`

Optional array of test keys (for example `["hgb", "ldl", "crp"]`) that sets which cards appear
under **Key trends** on the Overview. When it is absent, a built-in default list is used.

### `followUps`

The "Worth raising with your doctor" cards on the Overview tab. These live in the record rather
than in the dashboard, so they can be rewritten as the picture changes without touching
`index.html`:

```json
[{ "level": "bad" | "warn" | "", "title": "...", "text": "..." }]
```

`level` only sets the colour of the stripe — `bad` red, `warn` amber, empty neutral. Omit the
whole key and the section disappears.

`index.html` contains no personal information at all: every name, value and clinical note comes
from the record file.

---

**This is a record-keeping tool, not medical advice.** Reference ranges differ between
laboratories; always read a result against the range printed on its own report, and take
clinical decisions with your physician.
