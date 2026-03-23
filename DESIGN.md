# Design System Document



## 1. Overview & Creative North Star: "The Obsidian Nebula"



This design system is a departure from the sterile, grid-locked interfaces of standard SaaS platforms. Our Creative North Star is **"The Obsidian Nebula"**—a high-end editorial experience that blends the deep, authoritative weight of a premium dark-mode interface with the ethereal, translucent qualities of glassmorphism.



The goal is to move beyond "apps" and toward "digital environments." We break the "template" look by using intentional white space, high-contrast typography, and a layered depth model that makes the UI feel like it’s floating in a physical space. By prioritizing tonal shifts over harsh lines, we create a sophisticated atmosphere conducive to deep learning and focused AI interaction.



---



## 2. Colors: Depth Through Tone



Our palette is rooted in a deep navy-black core, punctuated by vibrant, neon-inflected accents. The logic of this color system is built on **Tonal Separation** rather than structural borders.



### The Palette Logic

- **Background (`#0a0e14`):** The foundation. It is the void upon which all elements sit.

- **Primary (`#ff89ac`) & Secondary (`#ea73fb`):** Used sparingly for high-value interactions (CTAs, active states, brand marks).

- **Surface Tiers:** Use `surface-container-low` to `surface-container-highest` to define nested content areas.



### The Rules of Engagement

* **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Do not use borders to separate the chat sidebar from the main stage. Instead, use a background shift—place the `surface-container-low` sidebar against the `background` main stage.

* **The "Glass & Gradient" Rule:** Floating elements (Modals, Tooltips, Popovers) must use a Glassmorphic treatment. Combine a semi-transparent `surface-container` background with a `backdrop-blur` (20px-40px) and a subtle 10% opacity `outline-variant` to catch the light.

* **Signature Textures:** For primary action buttons, move beyond flat fills. Apply a subtle linear gradient from `primary` to `primary-container` at a 135-degree angle to provide "soul" and a tactile, curved feel.



---



## 3. Typography: Editorial Authority



We use a dual-font strategy to balance character with readability.



* **Display & Headlines (Plus Jakarta Sans):** Used for large-scale expressions. This typeface provides a modern, geometric clarity that feels premium. Use `display-lg` and `headline-md` for hero messaging and section headers to establish a clear editorial hierarchy.

* **Body & Labels (Manrope):** Chosen for its exceptional legibility in dark mode. `body-md` is our workhorse for AI-generated text and chat history.

* **Hierarchy as Identity:** Create "tension" by pairing `display-sm` headers with `label-md` uppercase subheaders. The high contrast in scale conveys a sense of intentionality and "curated" design.



---



## 4. Elevation & Depth: Tonal Layering



In this system, depth is not an afterthought; it is the primary navigation tool.



* **The Layering Principle:** Treat the UI as stacked sheets of frosted glass.

* *Level 0:* `surface` (Main canvas)

* *Level 1:* `surface-container-low` (Sidebars, secondary panels)

* *Level 2:* `surface-container-high` (Chat input area, cards)

* *Level 3:* `surface-bright` (Active floating elements)

* **Ambient Shadows:** We avoid "black" shadows. Use the `on-surface` color at 4%–8% opacity with a large blur (30px+) for floating elements. This mimics a natural glow rather than a heavy drop shadow.

* **The "Ghost Border" Fallback:** If a container requires further definition (e.g., in the Settings Modal), use a `outline-variant` token at **15% opacity**. It should be felt, not seen.



---



## 5. Components: Refined Interaction



### Chat Input Area

- **Container:** `surface-container-highest` with a `xl` (1.5rem) roundedness.

- **Styling:** No border. Use a subtle inner shadow to create a "pressed" feel or a glassmorphic blur if positioned over the chat stream.

- **Interaction:** The "Send" button should utilize the `primary` gradient for high visual priority.



### Chat History Sidebar

- **Background:** `surface-container-low`.

- **List Items:** No dividers. Use `3` (0.75rem) spacing between items. Active states are indicated by a subtle `surface-variant` background with a `sm` (0.25rem) left-aligned `primary` accent bar.



### Settings Modal

- **Background:** Semi-transparent `surface-container-highest` (85% opacity) with a 32px backdrop blur.

- **Nesting:** Group settings into sections using `surface-container-lowest` as a "well" for the controls to sit in.



### Buttons

- **Primary:** Gradient (`primary` to `primary-container`), white text, `full` roundedness.

- **Secondary:** Ghost style. No fill, `outline-variant` (20% opacity) border.

- **States:** On hover, primary buttons should "glow" by increasing the shadow spread of the `surface-tint` color.



---



## 6. Do’s and Don’ts



### Do:

* **Do** use extreme vertical whitespace (Spacing Scale `16` or `20`) to separate major conceptual blocks.

* **Do** lean into asymmetry. For example, right-aligning navigation items while left-aligning the brand logo creates a more dynamic, editorial feel.

* **Do** use `tertiary` (teal/cyan) for "Success" or "AI thinking" states to provide a cooling contrast to the pink/purple heat of the brand.



### Don't:

* **Don't** use 100% opaque borders. They flatten the depth and break the glassmorphic illusion.

* **Don't** use pure black (`#000000`) for anything other than the `surface-container-lowest`. Total black kills the "Nebula" depth.

* **Don't** overcrowd the sidebar. If history is long, use a fading mask at the bottom rather than a visible scrollbar track.