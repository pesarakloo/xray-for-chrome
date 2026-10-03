> Historical UI design record for 0.7.4. For this update, see VALIDATION.md and docs/screenshots/v075-tabs-review.jpg.

> Compact delivery: the large source/reference PNGs and comparison JPG boards cited below are omitted from this download. Application code, runtime assets, browser screenshots, test logs and this review are retained unchanged.

# Design QA — Xray for Chrome 0.7.4

Date: 2026-09-27

final result: passed

## Source and browser evidence

- Source visual truth: `docs/qa/reference-1.png` (Neon Persian UI Triptych) and `docs/qa/reference-2.png` (Neon UI Dashboard), the supplied 1586 × 992 generated reference boards.
- Implementation screenshots: `docs/screenshots/ui-overview.jpg` and `docs/screenshots/ui-secondary.jpg`, actual popup HTML rendered in Chrome through the local preview at a 1363 × 936 browser viewport.
- Gallery iframe size: 520 × 992 CSS pixels, displayed at scale 0.8. Captured panel bounds: 416 × 794 physical pixels. Crops were normalized to 520 × 992; the three source panels were normalized from 1586 × 992 to 1560 × 992. Comparison is proportional, not a pixel-difference measurement.
- Combined full-view evidence: `docs/qa/comparison-1.jpg` and `docs/qa/comparison-2.jpg`, each containing the source and rendered implementation in the same image.
- Focused evidence: `docs/qa/comparison-detail.jpg`, comparing navigation, flags, profile names, metadata, ping badges and row actions side by side.
- States: empty connection in English; add form and populated management in Persian; empty management in Persian; About in English; setup guide in Persian. Sample names mirror the reference. Latency colors and selected state follow application logic.
- Additional evidence: `docs/screenshots/narrow-fa.jpg` at 360 × 600 CSS px. The ordinary 520 × 600 action-popup layout was also inspected.

## Findings and comparison history

No actionable P0/P1/P2 findings remain in the reviewed states.

1. **[P2, fixed] Small profile text and latency.** An earlier source/render comparison showed weak hierarchy. Names now use 15px at the main popup width, protocol metadata 11px, and latency badges 11px, with larger flags and controls. Post-fix evidence: `comparison-detail.jpg` and `ui-overview.jpg`.
2. **[P2, fixed] About imagery crossed copy and showed a hard edge.** The horizon was moved below the description; page-edge artwork uses a fade, and link surfaces remain opaque. Post-fix evidence: the middle panel of `comparison-2.jpg`.
3. **[P2, fixed] Setup illustration on the wrong side.** The laptop is now on the right, retaining RTL text direction. Post-fix evidence: the right panel of `comparison-2.jpg`.
4. **[P2, fixed] Empty-state action below the comparison viewport.** Redundant empty-section subtitles were removed and illustration height/spacing adjusted. Both calls to action are visible at 992px. Post-fix evidence: the left panel of `comparison-2.jpg`.
5. **[P2, fixed] Tall mockup proportions needed a real-popup adaptation.** The 600px layout uses compact decoration, an accessible sticky header and one page scrollbar. At 360px, ping values sit below names. DOM checks found equal client and scroll widths: 348px narrow, 508px long-name fixture. Post-fix evidence: `narrow-fa.jpg` and browser checks.

## Required fidelity surfaces

| Surface | Review and accepted differences |
| --- | --- |
| Fonts and typography | Bundled Vazirmatn supplies Persian and Latin text with consistent heading/UI weights. Header, title, row names, metadata and field labels were inspected at full view and in the detailed crop. The generated source has no authoritative font metadata; glyph outlines are not claimed identical. Long names clamp safely to two lines. |
| Spacing and layout | Five tabs, navy panels, rounded fields, card grouping, six server rows and empty-state actions preserve the composition. Header and artwork compact at 600px. The required subscription URL field and functioning management controls add content absent from the illustrative mock. |
| Colors and tokens | Navy backgrounds, blue borders, cyan-to-blue gradients and luminous active tabs follow the source. Selected, connected, pending and error states remain distinct. Existing latency thresholds are preserved, rather than copying arbitrary colors in the generated reference. |
| Image quality and assets | Shield/orbit, earth, X tile, laptop and empty-state artwork are bundled WebP illustrations made for this design. Subject, crop, sharpness, transparency and masking were inspected. Local Tabler icons and licensed flag assets supply interface symbols. Illustration lighting and silhouette differ naturally from the reference; no CSS/custom SVG illustration replacement is used. |
| Copy and content | Coherent functional Persian/English copy and existing links remain, updated to version 0.7.4. Generated spelling artifacts and inconsistent tab labels/order in the mock are not reproduced. Installation commands and troubleshooting remain accessible in expandable sections. No design brief appears in the production UI. |

## Browser behavior and accessibility

Tested: tab and RTL arrow-key navigation, language switching, empty/manual-import validation, sample import, profile selection, simulated connect/disconnect, single/group ping and cancellation, subscription add/refresh, row menus and deletion confirmation, Windows/macOS switches, installation instructions and command copying. Missing-companion guidance opens setup. Semantic tabs and labels remain; focus indicators and reduced-motion styles are supplied. Decorative images have empty alt text and icon-only controls have accessible labels.

No recent console errors were attributed to the local application. Unrelated metadata errors originated in the cloud browser's content script. Actual Windows/macOS installer and connection testing remains outside this fixture; see `VALIDATION.md`.

## Open questions and follow-up polish

No blocking design questions. Exact pixel identity is not claimed: illustration glow, glyph metrics and fixture values differ. Real Chrome action-popup behavior and native integration still need a target-platform smoke check before public distribution.

## Implementation checklist

- [x] Compare both references and browser output in combined images.
- [x] Inspect all five fidelity surfaces and detailed controls.
- [x] Fix P2 findings and recapture the revised UI.
- [x] Exercise key interactions, narrow layout and long names.
- [x] Preserve extension identity, permissions, core logic and native-host source.
- [x] Include source, preview, screenshots, licenses and validation notes in the GitHub ZIP.
