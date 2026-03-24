# Design System: The Digital Sanctuary

## 1. Overview & Creative North Star
**Creative North Star: "The Rhythmic Breath"**
This design system rejects the clinical, rigid grids of traditional health tech. Instead, it embraces an editorial, "high-end sanctuary" aesthetic defined by organic flow and intentional asymmetry. We move away from the "app as a tool" and toward the "app as a space." By utilizing expansive whitespace, overlapping layers, and a complete absence of harsh structural lines, we create a digital environment that feels as though it is exhaling.

The system is built on the principle of **Tonal Enclosure**. Rather than boxing content in, we cradle it using shifts in value and soft, pill-like geometries. This approach ensures the user feels supported, not restricted.

---

## 2. Color & Atmosphere
The palette is divided into two emotional states: **Nurturing Earth** (Warm) and **Serene Tranquility** (Cool). Both rely on the Material Design token logic but apply them through an editorial lens.

### The "No-Line" Rule
**Strict Mandate:** 1px solid borders for sectioning are prohibited. 
Structural boundaries must be defined exclusively through background color shifts. To separate a chat bubble from the background, use `surface-container-low` (#fcf9f3) against a `surface` (#fffcf7) backdrop. If a distinction is too subtle, increase the tier shift (e.g., `surface` to `surface-container-high`) rather than adding a line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-translucent materials.
*   **Base Layer:** `surface` (#fffcf7).
*   **Content Areas:** `surface-container` (#f6f3ec) for primary sections.
*   **Interactive Floating Elements:** Use `surface-bright` with a 15% opacity blur (Glassmorphism) to create a sense of lightness and "air."

### Signature Textures
Avoid flat blocks of color for high-impact moments. For primary CTAs or "Mood Check-in" headers, utilize a subtle linear gradient:
*   **From:** `primary` (#8d5647) 
*   **To:** `primary_container` (#efab99) at a 135-degree angle.
This provides a "glow" that mimics natural light hitting a curved surface.

---

### 3. Typography: The Editorial Voice
We pair the structural clarity of **Inter** with the characterful geometry of **Manrope**.

*   **Display & Headlines (Manrope):** Use `display-lg` (3.5rem) for morning greetings or emotional reflections. The generous tracking and scale convey authority and calm.
*   **Body & Titles (Inter):** Use `body-lg` (1rem) with a custom line-height of 1.6 to ensure the eye never feels "trapped" in a block of text.
*   **Hierarchy as Empathy:** Use `title-lg` (#383833) for user messages and `body-lg` (#65655e) for secondary AI/Therapist responses to create a subtle visual "listening" effect.

---

## 4. Elevation & Depth
In a sanctuary, there are no shadows—only soft, ambient light.

*   **The Layering Principle:** Depth is achieved by "nesting" the surface tiers. A `surface-container-lowest` card sitting on a `surface-container-low` section creates a natural, soft lift.
*   **Ambient Shadows:** For floating elements (like the Voice Input Trigger), use a shadow tinted with `on-surface` (#383833) at 6% opacity, with a 40px blur and 10px Y-offset. Never use pure black or grey.
*   **The Ghost Border Fallback:** If accessibility requirements demand a border, use `outline-variant` (#bbb9b2) at 15% opacity. It should be felt, not seen.
*   **Glassmorphism:** Use `backdrop-filter: blur(20px)` on all floating overlays (modals or bottom sheets) to allow the "earthy" or "forest" tones of the background to bleed through, maintaining a sense of spatial awareness.

---

## 5. Components

### Input Fields (The Seamless Transition)
The chat input is a singular, organic pill (`rounded-full`). 
*   **Text State:** A wide container using `surface-container-highest`.
*   **Voice Transition:** Upon tapping the microphone, the container should morph via a spring animation into a circular `primary_container` glow.
*   **Interaction:** Avoid "Send" buttons. Use the `primary` color icon to indicate action, keeping the interface minimalist.

### Buttons & Chips
*   **Primary Button:** `rounded-xl` (3rem) to create a "pebble" feel. Use the signature gradient.
*   **Chips:** Use `secondary_container` (#c7e9e6) for selection. They must have a `md` (1.5rem) radius. No borders; use `on_secondary_container` text for contrast.

### Lists & Chat Bubbles
*   **Cards:** Forbid divider lines. Use `1.4rem` (Spacing 4) of vertical padding to separate list items.
*   **Bubbles:** User bubbles use `primary` with `on_primary` text. System bubbles use `surface-container-high` with `on_surface` text. Corner radii should be asymmetric: `xl` on three corners and `sm` on the tail corner to indicate directionality.

### Additional Component: The "Breathing" FAB
A floating action button that subtly pulses (scale 1.0 to 1.05) using a soft ease-in-out transition, colored in `tertiary_container`, serving as a quick-access "Calm Down" or "Crisis" tool.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Place headlines slightly off-center or allow images to bleed off the edge of the screen to break the "boxed-in" feel.
*   **Use High Spacing:** When in doubt, increase the margin. Use `spacing-12` (4rem) for section headers.
*   **Prioritize Softness:** Use the `xl` (3rem) rounding for any container that houses emotional content.

### Don’t:
*   **Don't use pure white (#FFFFFF) for backgrounds.** Always use the tinted `surface` (#fffcf7) to reduce eye strain.
*   **Don't use "Alert Red" for errors.** Use the `error_container` (#fa746f) which is softened to prevent triggering anxiety.
*   **Don't use standard icons.** Use custom-drawn line icons with a 2px stroke and rounded caps/joins to match the typography.

---

## 7. Interaction Philosophy
Every transition should feel like it has "weight" and "fluidity." Use 400ms-600ms durations with `cubic-bezier(0.34, 1.56, 0.64, 1)` (a gentle overshoot) for opening modals. This mimics the organic movement of physical objects, reinforcing the "Digital Sanctuary" promise.