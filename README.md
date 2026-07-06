# Content Editor

> Build beautiful course pages with a pixel-perfect drag-and-drop canvas — no code required.

A visual content editor for designing structured course layouts. Drop elements onto the canvas, style them, preview instantly, and export clean HTML.

---

## What You Can Build

Drag any combination of elements onto a resizable canvas:

| Element       | Description                                     |
| ------------- | ----------------------------------------------- |
| **Text**      | Rich inline text with full typography control   |
| **Image**     | Responsive images with border & shadow options  |
| **Video**     | Embed video content directly on the canvas      |
| **Button**    | Styled call-to-action buttons                   |
| **Code**      | Syntax-highlighted code blocks via highlight.js |
| **Divider**   | Horizontal rules for visual separation          |
| **Shape**     | Decorative geometric shapes                     |
| **Container** | Group and nest multiple elements                |
| **Frame**     | Bordered section wrappers                       |

---

## Features

- **Drag & drop canvas** — freely position and resize every element
- **Properties panel** — live controls for font, color, border, spacing, and more
- **Snap guides** — alignment guides for precision layout
- **Undo / Redo** — 49-step history, nothing is lost
- **Preview mode** — fullscreen preview before export
- **CKEditor import** — paste existing CKEditor HTML and watch it map to canvas elements
- **CKEditor export** — export back to clean, compatible HTML

---

## Tech Stack

| Layer               | Tech                                      |
| ------------------- | ----------------------------------------- |
| Framework           | Vue 3 — Composition API, `<script setup>` |
| Language            | TypeScript                                |
| Build               | Vite                                      |
| Syntax highlighting | highlight.js                              |

---

## Getting Started

```bash
cd app
npm install
npm run dev
```

### All Commands

```bash
npm run dev         # start dev server with hot reload
npm run build       # type-check + production build
npm run preview     # serve the production build locally
npm run typecheck   # type check only, no emit
```

---

## Project Structure

```
app/
├── src/
│   ├── components/     # Canvas, Toolbar, Sidebar, Properties, Preview, Guides...
│   ├── elements/       # Per-element renderers: TextEl, ImageEl, VideoEl, etc.
│   ├── composables/    # Core logic: useCms (state), factories, bounds, render, import
│   ├── types.ts        # Shared TypeScript interfaces
│   ├── App.vue         # Root layout + global keyboard handler
│   └── main.ts         # App entry point
└── vite.config.ts
```

---

## Keyboard Shortcuts

| Shortcut                  | Action                                     |
| ------------------------- | ------------------------------------------ |
| `Ctrl+Z`                  | Undo                                       |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo                                       |
| `Ctrl+D`                  | Duplicate selected element                 |
| `Delete` / `Backspace`    | Delete selected element                    |
| `Escape`                  | Deselect / close preview / exit fullscreen |

---

## JSON Data Model

The canvas state is an array of `CmsElement` objects. Here's the full shape:

```jsonc
{
  "id": "el-1719000000001", // auto-generated unique ID
  "type": "text", // element type (see below)
  "x": 60, // left position on canvas (px)
  "y": 60, // top position on canvas (px)
  "width": 320, // element width (px)
  "height": 56, // element height (px)
  "content": "Heading", // inner content (text, URL, code, etc.)
  "visible": true, // shown/hidden on canvas
  "locked": false, // locked elements can't be moved/edited
  "parentId": null, // ID of parent container/frame, or null

  // type-specific optional fields
  "name": "Frame", // display label (frame, container)
  "shapeType": "rect", // shape only: "rect" | "circle" | "line"
  "language": "javascript", // code only: highlight.js language key
  "copyEnabled": true, // code only: show copy button
  "href": "https://example.com", // button only: link URL
  "target": "_blank", // button only: "_self" | "_blank"

  "styles": {
    "fontSize": 36, // px
    "fontWeight": "700", // "300" | "400" | "500" | "600" | "700"
    "fontStyle": "normal", // "normal" | "italic"
    "textDecoration": "none", // "none" | "underline"
    "color": "#222222", // text color (hex)
    "backgroundColor": "#FFFFFF",
    "textAlign": "left", // "left" | "center" | "right" | "justify"
    "lineHeight": 1.5,
    "letterSpacing": 0, // px
    "borderRadius": 8, // px
    "padding": 10, // px
    "borderWidth": 1, // px
    "borderColor": "#DDDDDD",
    "opacity": 1, // 0–1
    "objectFit": "cover", // image only: "cover" | "contain" | "fill"
    "listType": "none", // text only: "none" | "bullet" | "number"
    "textStrokeWidth": 0, // px
    "textStrokeColor": "#000000",
  },
}
```

### Element Types

| `type`      | `content` field    | Notes                                                   |
| ----------- | ------------------ | ------------------------------------------------------- |
| `text`      | Inline HTML text   | Supports `listType`, text stroke, all typography styles |
| `image`     | Image URL          | `objectFit` controls scaling                            |
| `video`     | Video URL or embed |                                                         |
| `button`    | Button label text  | Has `href` + `target` fields                            |
| `code`      | Raw source code    | Has `language` + `copyEnabled` fields                   |
| `divider`   | _(empty)_          | Thin horizontal rule                                    |
| `shape`     | _(empty)_          | Has `shapeType`: `rect`, `circle`, or `line`            |
| `container` | _(empty)_          | Groups child elements via `parentId`                    |
| `frame`     | _(empty)_          | Named section wrapper, children use `parentId`          |

### Nesting

Children reference their parent via `parentId`. The canvas renders children clipped inside their parent's bounds. Deleting a parent also deletes all descendants.

---

## License

MIT
