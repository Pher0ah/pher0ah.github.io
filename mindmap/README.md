# MindMap Viewer — Documentation

A single-file, zero-dependency radial mindmap renderer with collapsible nodes, a built-in JSON editor, dark/light themes, and SVG export. Runs from `file://` on a desktop or hosted on GitHub Pages.

---

## Quick Start

1. Place `index.html` and `data.json` in the same folder.
2. Open `index.html` in a browser.
   - **Hosted (GitHub Pages / local server):** loads `data.json` automatically.
   - **Desktop (`file://`):** uses the embedded fallback data and opens the JSON editor so you can paste or load your own.

---

## Controls

| Action | How |
|---|---|
| **Pan** | Click and drag the canvas |
| **Zoom** | Scroll wheel, pinch (touch), or `+` / `-` keys |
| **Fit to screen** | Click **Fit** button or press `0` |
| **Collapse / expand node** | Click any node with children |
| **Expand all** | Toolbar → **Expand** |
| **Collapse all** | Toolbar → **Collapse** |
| **Toggle theme** | Toolbar → theme toggle (auto-detects OS preference on first load) |
| **Export SVG** | Toolbar → **SVG** (downloads the current view) |
| **Open editor** | Toolbar → **Editor** |

---

## JSON Editor

The slide-out editor panel lets you modify the mindmap live.

| Button | Action |
|---|---|
| **Apply** (or `Ctrl+Enter`) | Validates the JSON and re-renders the map |
| **Format** | Pretty-prints the JSON with 2-space indentation |
| **Download** | Saves the editor contents as `data.json` |
| **Load File** | Opens a file picker to load a `.json` from disk |

The editor opens automatically when `data.json` cannot be loaded (CORS / `file://` / missing file).

---

## JSON Structure

```jsonc
{
  "meta": { ... },      // Global settings (title, defaults)
  "root": { ... }       // The root node (contains nested children)
}
```

### `meta` — Global Settings

```json
{
  "meta": {
    "title": "My MindMap",
    "description": "Optional subtitle shown in the toolbar",
    "author": "Your Name",
    "version": "1.0",
    "layout": "radial",
    "defaultNodeStyle": {
      "shape": "roundedRect",
      "bgColor": "#1a1a2e",
      "textColor": "#e0e0e0",
      "borderColor": "#3a3a5c",
      "borderWidth": 2,
      "fontSize": 13
    },
    "defaultEdgeStyle": {
      "color": "#4a4a6a",
      "width": 2,
      "style": "curved"
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `title` | string | Displayed in the toolbar and browser tab |
| `description` | string | Subtitle shown next to the title |
| `author` | string | Metadata only (not displayed) |
| `version` | string | Metadata only |
| `layout` | string | `"radial"` (currently the only layout) |
| `defaultNodeStyle` | object | Fallback style for all nodes (see **Node Style** below) |
| `defaultEdgeStyle` | object | Style for connecting lines |

### `defaultEdgeStyle`

| Field | Type | Default | Description |
|---|---|---|---|
| `color` | string | `"#4a4a6a"` | Line colour (hex) |
| `width` | number | `2` | Stroke width in pixels |
| `style` | string | `"curved"` | `"curved"` (only option currently) |

---

## Node Object

Every node (including the root) uses this structure:

```json
{
  "id": "unique-id",
  "content": "<b>Title</b><br><small>Subtitle</small>",
  "style": { ... },
  "collapsed": false,
  "children": [ ... ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Recommended | Unique identifier. Auto-generated if omitted |
| `content` | string | Yes | The node's label. **Supports full HTML** (see below) |
| `style` | object | No | Visual style overrides (see **Node Style**) |
| `collapsed` | boolean | No | `true` to start with children hidden |
| `children` | array | No | Array of child node objects |

---

## Style Inheritance

Styles cascade down the tree in this order:

```
defaultNodeStyle  →  parent's resolved style  →  node's own style
```

This means you only need to set a style once on a branch parent and all descendants inherit it. Any property a child explicitly sets overrides just that property.

**Example — set the green theme once on the branch root:**

```json
{
  "id": "iga",
  "content": "<b>Identity Governance</b>",
  "style": {
    "bgColor": "#1b4332",
    "textColor": "#d8f3dc",
    "borderColor": "#52b788"
  },
  "children": [
    {
      "id": "iga-saviynt",
      "content": "<b>Saviynt</b>",
      "children": [
        {
          "id": "iga-sod",
          "content": "SoD Controls",
          "style": { "shape": "pill" }
        }
      ]
    }
  ]
}
```

In this example, `iga-saviynt` and `iga-sod` both inherit `bgColor`, `textColor`, and `borderColor` from `iga`. The `iga-sod` node only overrides `shape` to `"pill"` — everything else comes from its parent chain.

---

## Node Style Reference

All properties are optional. Inherited from the parent if not specified.

| Property | Type | Default | Description |
|---|---|---|---|
| `shape` | string | `"roundedRect"` | Node shape (see full list below) |
| `bgColor` | string | `"#1a1a2e"` | Background fill colour (hex) |
| `textColor` | string | `"#e0e0e0"` | Text colour (hex) |
| `borderColor` | string | `"#3a3a5c"` | Border stroke colour (hex) |
| `borderWidth` | number | `2` | Border stroke width in pixels |
| `fontSize` | number | `13` | Font size in pixels |
| `customPath` | string | — | Raw SVG `d` path (only used when `shape` is `"custom"`) |
| `svgShape` | string (URL) | — | URL to an external SVG file used as the node background |

---

## Available Shapes

### Built-in Shapes (11)

| Shape | Value | Description | Best For |
|---|---|---|---|
| Rounded Rectangle | `"roundedRect"` | Default. Rectangular with rounded corners | General purpose |
| Circle | `"circle"` | Perfect circle sized to content | Root nodes, key concepts |
| Pill | `"pill"` | Fully rounded ends (stadium shape) | Tags, labels, leaf nodes |
| Diamond | `"diamond"` | Rotated square / rhombus | Decision points, conditions |
| Hexagon | `"hexagon"` | Six-sided polygon | Processes, frameworks |
| Octagon | `"octagon"` | Eight-sided polygon | Alerts, stop/warning items |
| Parallelogram | `"parallelogram"` | Slanted rectangle | Inputs/outputs, data flow |
| Trapezoid | `"trapezoid"` | Wider top, narrower bottom | Categories, funnels |
| Star | `"star"` | Five-pointed star | Highlights, favourites |
| Shield | `"shield"` | Shield / badge outline | Security, protection topics |
| Cloud | `"cloud"` | Cloud silhouette | Cloud services, abstract concepts |

**Examples:**

```json
{ "style": { "shape": "circle" } }
{ "style": { "shape": "hexagon" } }
{ "style": { "shape": "shield" } }
{ "style": { "shape": "diamond" } }
```

### Custom SVG Path

Provide a raw SVG `d` attribute string. The path should be **centered on `(0, 0)`** — the renderer translates it to the node's position automatically.

```json
{
  "style": {
    "shape": "custom",
    "customPath": "M-50,-25 L50,-25 L40,25 L-40,25 Z",
    "bgColor": "#264653",
    "borderColor": "#2a9d8f"
  }
}
```

**Tips for custom paths:**

- Centre your coordinates around `(0, 0)`.
- Use the `M`, `L`, `Q`, `C`, `A`, `Z` SVG commands.
- The node's content area is sized automatically from the path's bounding box.
- You can design paths in any SVG editor (Inkscape, Figma) and copy the `d` attribute.

**Example — a right-pointing arrow:**

```json
{
  "style": {
    "shape": "custom",
    "customPath": "M-50,-20 L20,-20 L20,-35 L50,0 L20,35 L20,20 L-50,20 Z"
  }
}
```

**Example — a rounded tab:**

```json
{
  "style": {
    "shape": "custom",
    "customPath": "M-60,-20 Q-60,-30,-50,-30 L50,-30 Q60,-30,60,-20 L60,20 Q60,30,50,30 L-50,30 Q-60,30,-60,20 Z"
  }
}
```

**Example — a database cylinder:**

```json
{
  "style": {
    "shape": "custom",
    "customPath": "M-50,-20 C-50,-35,50,-35,50,-20 L50,20 C50,35,-50,35,-50,20 Z"
  }
}
```

### External SVG Shape

Use any SVG file as the node's background shape. The SVG is scaled to fit the node's bounding box.

```json
{
  "style": {
    "svgShape": "https://cdn.example.com/shapes/database.svg",
    "borderColor": "#e76f51",
    "borderWidth": 2
  }
}
```

- The SVG is loaded via an `<image>` element inside the mindmap's SVG.
- A border rectangle is drawn on top if `borderColor` is set.
- Works with any publicly accessible SVG URL.
- For offline use, place SVG files in the same folder and use relative paths: `"svgShape": "shapes/database.svg"`.

---

## HTML Content

The `content` field supports any inline HTML. The content is rendered inside a `<foreignObject>` in the SVG, so standard HTML tags work.

### Text Formatting

```json
{ "content": "<b>Bold Title</b>" }
{ "content": "<i>Italic text</i>" }
{ "content": "<b>Title</b><br>Subtitle" }
{ "content": "<b>Main</b><br><small>Secondary info</small>" }
{ "content": "<span style='color:#e94560'>Red text</span>" }
{ "content": "<u>Underlined</u> and <s>strikethrough</s>" }
```

### Line Breaks & Layout

```json
{ "content": "Line 1<br>Line 2<br>Line 3" }
{ "content": "<div style='text-align:left'>Left-aligned<br>content here</div>" }
```

### Icons from URLs

Embed icons from CDNs (Lucide, Font Awesome, etc.) or your own hosted images:

```json
{
  "content": "<img src='https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/shield-check.svg' width='18' height='18' style='filter:invert(1);vertical-align:middle;margin-right:6px;'><b>Security</b>"
}
```

**Icon tips:**

- Use `filter:invert(1)` to make dark SVG icons white (for dark backgrounds).
- Use `vertical-align:middle` to align icons with text.
- Add `margin-right:6px` for spacing between icon and text.
- Set explicit `width` and `height` to control icon size.

**Example — multiple icons:**

```json
{
  "content": "<img src='https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/lock.svg' width='16' height='16' style='filter:invert(1);vertical-align:middle;margin-right:4px;'><img src='https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/key.svg' width='16' height='16' style='filter:invert(1);vertical-align:middle;margin-right:6px;'><b>PAM</b>"
}
```

**Example — emoji instead of image icons:**

```json
{ "content": "🔒 <b>Vault</b><br><small>Credential store</small>" }
```

### Links

```json
{ "content": "<a href='https://example.com' target='_blank' style='color:#38bdf8'>Documentation</a>" }
```

> **Note:** Clicking a link will navigate — it will not toggle the node's collapsed state.

### Inline Styles

Any CSS can be applied via the `style` attribute:

```json
{
  "content": "<div style='font-family:monospace;font-size:11px;background:rgba(0,0,0,0.3);padding:4px 8px;border-radius:4px;'>kubectl get pods</div>"
}
```

---

## Complete Example

A minimal but complete `data.json` demonstrating key features:

```json
{
  "meta": {
    "title": "Project Overview",
    "description": "Q3 2025 Roadmap",
    "defaultNodeStyle": {
      "shape": "roundedRect",
      "bgColor": "#1e293b",
      "textColor": "#e2e8f0",
      "borderColor": "#475569",
      "borderWidth": 2,
      "fontSize": 13
    },
    "defaultEdgeStyle": {
      "color": "#475569",
      "width": 2,
      "style": "curved"
    }
  },
  "root": {
    "id": "root",
    "content": "<b>Project Alpha</b><br><small>Q3 2025</small>",
    "style": {
      "shape": "circle",
      "bgColor": "#0f172a",
      "textColor": "#ffffff",
      "borderColor": "#3b82f6",
      "borderWidth": 3,
      "fontSize": 16
    },
    "children": [
      {
        "id": "frontend",
        "content": "🎨 <b>Frontend</b>",
        "style": {
          "bgColor": "#1e3a5f",
          "borderColor": "#38bdf8"
        },
        "children": [
          {
            "id": "fe-react",
            "content": "<b>React 19</b><br><small>Migration</small>"
          },
          {
            "id": "fe-design",
            "content": "<b>Design System</b>",
            "style": { "shape": "hexagon" }
          }
        ]
      },
      {
        "id": "backend",
        "content": "⚙️ <b>Backend</b>",
        "style": {
          "bgColor": "#1a2e1a",
          "borderColor": "#4ade80"
        },
        "children": [
          {
            "id": "be-api",
            "content": "<b>REST API</b><br>v3.0",
            "style": { "shape": "parallelogram" }
          },
          {
            "id": "be-db",
            "content": "<b>Database</b>",
            "style": {
              "shape": "custom",
              "customPath": "M-50,-20 C-50,-35,50,-35,50,-20 L50,20 C50,35,-50,35,-50,20 Z"
            }
          }
        ]
      },
      {
        "id": "security",
        "content": "🔒 <b>Security</b>",
        "style": {
          "bgColor": "#3b1a1a",
          "borderColor": "#f87171"
        },
        "children": [
          {
            "id": "sec-audit",
            "content": "<b>Pen Test</b>",
            "style": { "shape": "shield" }
          },
          {
            "id": "sec-compliance",
            "content": "<b>SOC 2</b>",
            "style": { "shape": "diamond" }
          }
        ]
      }
    ]
  }
}
```

---

## Hosting on GitHub Pages

1. Create a repository (or use an existing one).
2. Place `index.html` and `data.json` in the repository root.
3. Go to **Settings → Pages → Source** and select your branch.
4. Your mindmap is live at `https://<username>.github.io/<repo>/`.

To update the mindmap, edit `data.json` and push.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Fit to screen |
| `Ctrl+Enter` | Apply JSON in editor |

---

## Tips & Best Practices

- **Start simple.** Define the style on the root or first-level branches and let inheritance do the rest.
- **Use colour families.** Give each major branch its own colour and let children inherit — creates natural visual grouping.
- **Keep content short.** Use `<br>` for a second line and `<small>` for secondary text rather than long sentences.
- **Collapse by default.** Set `"collapsed": true` on large branches to keep the initial view clean.
- **Use shapes semantically.** Diamonds for decisions, shields for security, hexagons for processes — makes the map scannable at a glance.
- **Test with the editor.** Use the built-in JSON editor to experiment with styles live before committing to `data.json`.
