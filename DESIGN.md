---
name: MarsView
description: An orbital observatory and a quiet Mars mapping workspace.
colors:
  landing-void: "#050505"
  landing-paper: "#f2ede7"
  landing-copper: "#e99c72"
  landing-muted: "#a7a099"
  workspace-bg: "#202124"
  workspace-panel: "#26272a"
  workspace-surface: "#303134"
  workspace-hover: "#3b3c40"
  workspace-line: "#3b3d40"
  workspace-edge: "#494b50"
  workspace-text: "#f1f3f4"
  workspace-muted: "#b6b8bc"
  workspace-faint: "#a5a8ad"
  workspace-accent: "#e5b29a"
  workspace-accent-ink: "#271a14"
  workspace-selected: "#3b302c"
typography:
  landing-display:
    fontFamily: "Manrope Variable, sans-serif"
  landing-measurement:
    fontFamily: "IBM Plex Mono, monospace"
  workspace-title:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "0"
  workspace-heading:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  workspace-body:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  workspace-label:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  workspace-navigation:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 500
  workspace-measurement:
    fontFamily: "JetBrains Mono, Roboto Mono, ui-monospace, Consolas, monospace"
    fontSize: "20px"
rounded:
  workspace-control: "8px"
  workspace-navigation: "10px"
  workspace-overlay: "12px"
  workspace-sheet: "16px 16px 0 0"
  landing-card: "16px"
  pill: "9999px"
spacing:
  compact: "8px"
  control: "12px"
  mobile: "16px"
  inspector: "20px"
  section: "24px"
components:
  landing-button-primary:
    backgroundColor: "{colors.landing-copper}"
    textColor: "{colors.landing-void}"
    rounded: "{rounded.pill}"
    padding: "12px 28px"
  workspace-search:
    backgroundColor: "{colors.workspace-surface}"
    textColor: "{colors.workspace-text}"
    rounded: "{rounded.workspace-control}"
    height: "42px"
    padding: "0 14px 0 40px"
  workspace-navigation-selected:
    backgroundColor: "{colors.workspace-selected}"
    textColor: "{colors.workspace-accent}"
    rounded: "{rounded.workspace-navigation}"
    typography: "{typography.workspace-navigation}"
    padding: "8px 2px"
  workspace-map-control:
    backgroundColor: "transparent"
    textColor: "{colors.workspace-text}"
    rounded: "{rounded.workspace-control}"
    size: "44px"
  workspace-stat:
    backgroundColor: "{colors.workspace-surface}"
    textColor: "{colors.workspace-text}"
    padding: "10px"
---

# Design System: MarsView

## Overview

**Creative North Star: "A quiet orbital observatory"**

The landing retains the brief's luxury space aesthetic: a near-black observatory, warm white type, copper light and a prominent interactive Mars. Manrope supplies the display and UI voice; scientific measurements have a distinct monospaced face. This existing identity remains the authority for the landing surface.

The dashboard applies the user's minimalist Google Earth reference to an operating workspace. Neutral charcoal chrome frames the map; search is always visible, and a single selected inspector supplies detail on demand. Warm Mars color marks selection rather than decorating every control. Its restrained density and sentence-case labels belong to the dashboard, not a replacement landing identity.

**Key Characteristics:**

- A prominent Mars subject with quiet surrounding controls.
- Separate landing and workspace palettes with a shared warm accent character.
- A single inspector, persistent search and adaptive map space in the dashboard.
- Explicit source, stale, failure and demonstration states for scientific information.

## Colors

### Primary

Landing Copper remains the landing action and illumination accent. Workspace Mars marks selected navigation and keyboard focus; its dark ink supports high-contrast selected text. These are separate tokens for separate surfaces.

### Neutral

Landing Void, Paper and Muted preserve the existing observatory identity. Workspace Background anchors title, rail and controls; Panel holds the search toolbar and inspector; Surface supports inputs and statistics. Text, Muted and Faint provide three reading levels. Line separates fixed regions, while Edge outlines interactive or floating surfaces. Selected is the warm neutral backing behind the active workspace destination.

**The Map Dominance Rule.** Keep dashboard chrome neutral so Mars imagery remains the strongest area of color.

## Typography

The landing retains Manrope Variable for display and UI, with IBM Plex Mono for coordinates and measurements. Its local fonts and widely tracked uppercase MARSVIEW title remain established decisions.

The dashboard uses Manrope, with JetBrains Mono for numerical measurements. The title is 17px and reduces to 16px in compact layouts; inspector headings are 16px, section labels 13px, body text 14px, supporting descriptions 12px and rail labels 11px. Route values use 20px monospaced figures. Search grows from 14px to 16px in compact layouts. Use sentence case and normal tracking for dashboard headings.

**The Reading Roles Rule.** Preserve monospaced measurements without extending that treatment to dashboard prose or section headings.

## Layout

### Landing

Retain the centered title and lit interactive globe, fine reticles and orbit ellipses, the two first-screen actions, asymmetric 2:1 feature composition, measured telemetry and scientific footer. Equal content edges, mobile gutters, rounded cards and pill actions remain the incumbent spatial language. The earlier document recorded a 1200px maximum content width; the current `page-width` utility uses 1440px. This pre-existing discrepancy is recorded without changing the landing implementation or making it a dashboard constraint.

### Dashboard

The desktop has a 56px title row, a second 56px search/mode toolbar, a 76px left rail and a 28px status footer. The map fills the remainder. The rail selects Mission, Layers, Route or Tools; at every width, at most one inspector is open. The desktop inspector is `clamp(300px, 26vw, 368px)` wide and reserves real map space. Inspectors scroll internally; opening, closing or resizing preserves existing inputs.

At widths up to 700px **or** heights up to 500px, navigation moves to the bottom. Phone inspectors become bottom sheets with a maximum height that leaves map space above. The bottom bar includes the safe-area inset. In short windows wider than 700px, the search shares the 56px title row and the inspector is a 360px panel at the right. At widths up to 1100px or heights up to 500px, secondary header actions move into Menu. Search remains visible at all sizes; only the view-mode selector moves into Tools at widths up to 480px.

The initial globe shows the whole planet and fits the actual map viewport, including an open inspector. Resizing continues that fit until the visitor zooms, pans or navigates; subsequent resizing preserves their chosen camera. The overview action can restore fitting. Entry does not automatically fly to Jezero.

**The Single Inspector Rule.** Every workspace destination uses the same inspector slot; selecting another destination replaces the current panel.

## Elevation & Depth

The landing keeps its atmospheric light, small action lifts and card lifts. The dashboard is flat at rest: fixed chrome uses tonal changes and fine borders without shadow. Floating drawers use a soft `0 12px 32px #0004` shadow, and phone sheets use `0 -8px 32px #0004`. The compact action menu uses the same downward shape at `#0005`. Shadows communicate overlap, not decoration.

Dashboard buttons transition background, text and border color over 160ms with ease timing; reduced-motion removes those transitions. The landing retains its visible hero entrance, pausable continuous ticker and rotating globe, with automatic animation stopped by reduced-motion. No scroll-jacking.

**The Overlap Rule.** Reserve dashboard shadows for surfaces floating above the map or fixed chrome.

## Shapes

The landing retains 16px cards and pill actions. Dashboard controls and search use gently rounded 8px corners; rail selections use 10px; floating groups and drawers use 12px. Phone sheets round only their upper corners at 16px. Desktop inspectors meet the workspace edges squarely. Map control targets are 44px square; compact panel close targets also grow to 44px.

## Components

### Landing actions and imagery

Preserve copper primary actions, outlined secondary actions and restrained hover lifts. The actual interactive globe remains the landing's main evidence; regional imagery, panorama inspection and telemetry preserve their source labels.

### Dashboard search and modes

Search sits in the toolbar with a muted filled field, 8px corners, a visible border and accent focus. Results scroll inside a bounded overlay. Mode buttons form a compact neutral segmented control; the active mode uses the hover neutral and bright text. The globe is the entry view. At widths up to 480px, these same mode controls move into Tools without duplicating their state.

### Dashboard navigation and inspector

Four SVG-and-text destinations use muted labels at rest and a warm accent on a warm neutral backing when expanded. Hover lifts the background tone; keyboard focus uses an accent outline. Clicking the active destination closes its panel. Close and Escape dismiss the inspector, and closing can restore focus to the originating control. Hidden panels are inert. Mission settings, layers, route calculations and map tools retain their original controls and values.

### Dashboard map controls and data

Zoom, compass and view controls form a quiet lower-right group; controls irrelevant to telemetry or helmet views are hidden. Statistics use a two-column grid with wrapped descriptive text, monospaced values and readable provenance. Source attribution remains available in the map viewport. Secondary drawers and telemetry use bounded scrolling rather than expanding the page.

The visible workspace has no Simulation panel, play button, simulation speed, Follow live, link-status control or Return bar. Legacy simulation nodes remain hidden and inert only because calculation modules still bind to them; they are not a reusable component pattern.

## Do's and Don'ts

### Do:

- **Do** preserve the landing's established observatory identity when extending the dashboard.
- **Do** keep dashboard search visible and open only one inspector at a time.
- **Do** derive globe fitting from the available map rectangle and preserve a visitor's chosen camera.
- **Do** retain keyboard focus, touch targets and clear scientific provenance.

### Don't:

- **Don't** restore Simulation, play, speed, Follow live, link-status or Return controls to the visible dashboard.
- **Don't** apply landing display tracking or copper decoration to every dashboard heading.
- **Don't** auto-navigate to Jezero on dashboard entry.
- **Don't** present demonstration or cached information as live mission telemetry.
