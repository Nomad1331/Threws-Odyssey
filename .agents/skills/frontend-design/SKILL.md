---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when building web components, pages, artifacts, or applications. Generates creative, polished code and UI design that avoids generic AI aesthetics.
---

# Frontend Design & Anti-AI-Slop Engineering Guide

This skill guides the creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. It enforces bold aesthetic direction, meticulous craft, authentic typography, and mobile-first ergonomic responsiveness.

---

## 1. Design Thinking: Escape Statistical Defaults

Before writing code, commit to a BOLD, CONTEXT-SPECIFIC aesthetic direction:

- **Purpose**: What real human problem does this interface solve? Who uses it? (e.g., A patient with motor tremors and dysarthria needs immediate clarity, large touch targets, and zero cognitive friction).
- **Tone**: Commit to an intentional tone: *Industrial / Utilitarian / Hardware Precision* (Teenage Engineering, Dieter Rams, Linear).
- **Differentiation**: What makes this interface memorable? (e.g., A real physical recording switch with an analog LED, an audio oscillograph, and zero gimmicks).

---

## 2. Hard Anti-Patterns: What AI-Slop Looks Like (BANNED)

1. **Jargon in Consumer Interfaces:**
   - ❌ Never put developer terminology in user-facing buttons (e.g., "Vocalize (TTS)", "ONNX INT8 Engine Ready", "API Gateway Active").
   - ✅ Use human, dignified language (e.g., "Listen", "Speak", "Quick Phrases").

2. **Button & Badge Clutter:**
   - ❌ Do not place random pill badges, status tags, or icon clusters on top of content.
   - ❌ Do not add clunky rows of redundant secondary buttons under primary content.
   - ✅ Keep primary actions singular and obvious. Auto-execute where expected (e.g., auto-vocalize after transcription).

3. **Predictable AI Palettes & Glows:**
   - ❌ Glowing neon cyan/purple dropshadows (`shadow-[0_0_50px]`, `blur-xl`).
   - ❌ Uninspired dark slate (`#0B1120`) with bright teal buttons.
   - ❌ Weird muddy yellow/brown button borders.
   - ✅ Commit to a restrained, disciplined palette: Deep Studio Obsidian (`#09090b`), Warm Charcoal Zinc (`#18181b`), Precision 1px borders (`#27272a`), and purposeful single-color LED accents (Studio Red `#ef4444` for record, Emerald `#22c55e` for verified).

4. **Cliché Icons:**
   - ❌ The `Sparkles` icon next to text.
   - ❌ Generic icons on every single card with no visual hierarchy.
   - ✅ Minimalist, high-legibility iconography with purposeful sizing.

---

## 3. Mobile-First Ergonomics & Touch Constraints

A mobile layout is not just `flex-col`:
- **Thumb Zone Rule:** Crucial interactive triggers (Record button, primary quick phrases) must sit comfortably in the lower two-thirds of the screen, reachable by a thumb.
- **Motor Impairment / Tremor Target Sizing:** Minimum touch target size is **48px $\times$ 48px** (ideally 56px+ for spastic tremors). Generous touch spacing prevents accidental mis-taps.
- **Fluid Typography:** Use responsive clamping (`text-2xl sm:text-3xl md:text-4xl`) so hero text never overflows horizontally or looks comically tiny.
- **Viewport Respect:** Prevent accidental bounce or horizontal scroll (`overflow-x-hidden`, `max-w-full`).

---

## 4. Hierarchy & Information Architecture

- **Primary User First:** The patient is the primary user. What they need (Hero Speech Assistant + Emergency Quick Phrases) must come first.
- **Secondary / Evaluator Second:** Forensic verification tools, clinical test archives, and jury debug drawers belong at the bottom or in a dedicated inspectable section.
