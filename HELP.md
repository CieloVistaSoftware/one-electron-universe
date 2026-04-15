# CieloVista AI Website Generator — Help Guide

## What Is This?

The CieloVista Website Generator creates complete, production-quality single-file HTML websites from a plain-English subject description. You type a topic, configure a few options, and within 2–3 minutes you have a fully designed, self-contained `.html` file ready to open in any browser or publish anywhere.

Every generated website includes real, accurate content written by Claude — not placeholder text — styled with the wb-starter design system.

---

## Requirements

Before generating websites you need at least one API key set as a Windows environment variable:

| Variable | Purpose | Required? |
|---|---|---|
| `CLAUDE` | Anthropic Claude — writes all content | Yes |
| `OPENAI` | OpenAI — fallback content provider | Optional |
| `falai` | fal.ai FLUX — generates images | Optional |

**Setting an environment variable on Windows:**
1. Open Start → search *"environment variables"*
2. Click *Edit the system environment variables* → *Environment Variables*
3. Under *User variables* click *New*
4. Enter the variable name and your API key value
5. Click OK — then **restart the server** via `start.cmd`

---

## Generating Your First Website

### Step 1 — Enter a subject

Type any topic into the **Subject / Topic** field. Be as specific or as broad as you like:

- `The physics of black holes`
- `Minnesota Boundary Waters Canoe Area`
- `How to start a SaaS business in 2025`
- `The history of jazz guitar`

### Step 2 — Add context (optional)

The **Context or angle** field lets you focus the content:

- `Focus on the environmental impact, not the recreational aspects`
- `Written for a developer audience who understands APIs`
- `Emphasise the post-war bebop era`

### Step 3 — Choose your audience

| Option | Best for |
|---|---|
| General audience | Most topics — clear, accessible writing |
| Technical / expert | Programming, science, engineering topics |
| Students / beginners | Educational content, introductory guides |
| Business / professional | Industry reports, strategy, market analysis |

### Step 4 — Choose a visual style

| Style | Look |
|---|---|
| 🌌 Dark & Tech | Dark background, blue/purple accents — great for science and tech |
| ☀️ Light Clean | White background, professional — suits business and general topics |
| 📰 Editorial | Newspaper-inspired, warm tones — ideal for history and culture |
| ⚡ Interactive | Very dark, neon accents — futuristic and striking |
| 🎓 Academic | Cream background, formal — university and research content |
| ◻️ Minimal | Pure white, maximum whitespace — clean and modern |

### Step 5 — Choose sections

Tick the sections you want on your page:

- **Overview** — 4 paragraphs of substantive introduction
- **Key Concepts** — 5 named concepts with explanations
- **Timeline** — 6 chronological milestones with accurate dates
- **Detail Cards** — 4 deep-dive cards on related topics
- **Quote** — 1–2 attributed quotes relevant to the subject
- **FAQ** — 5 real questions phrased as Google searches

### Step 6 — Click ✦ Generate Website

The progress bar steps through four phases:

1. **① Content** — Claude researches and writes all text (~60–90 seconds)
2. **② Image prompts** — Claude art-directs FLUX image prompts (if images are on)
3. **③ FLUX generation** — fal.ai generates and embeds the images
4. **④ Save** — the file is written to `generated/{slug}/index.html`

When complete, a preview opens automatically. Click **↗ Open in browser** to see the full page.

---

## Image Generation

Images are **optional** and require a fal.ai API key (`falai` environment variable).

### Enabling images

Check the **Generate AI images with fal.ai FLUX** checkbox in the Image Generation card. Two quality options are available:

| Quality | Model | Cost per image | Speed |
|---|---|---|---|
| Standard | flux/schnell | ~$0.003 | Fast (~5–10s) |
| HD | flux-pro/v1.1 | ~$0.05 | Slower (~20–30s) |

### What gets generated

- **1 hero image** — wide landscape (1792×1024) shown full-width below the page header
- **3 card images** — square (1024×1024), one per detail card (if card images are checked)

All images are embedded as base64 inside the HTML — the output file is completely self-contained with no external dependencies.

### How it works

Claude writes the image prompts **after** generating the content, so each prompt is grounded in what the page actually says — not just the raw subject. The hero prompt describes a cinematic scene that matches the visual style you chose. Card image prompts describe the specific topic of each card.

---

## Generated Sites List

Every site you generate appears in the **Generated Sites** list at the bottom of the page. Each row shows the slug, file size, and three action buttons.

### Open ↗

Opens the site directly in a new browser tab via the local server at `localhost:3000`.

### ↺ Regenerate menu

Click the **↺** button to open a dropdown with four options:

| Option | What it does |
|---|---|
| **↺ Content only** | Regenerates all text with the same settings. No images. One click — runs immediately. |
| **🖼 Images only** | Skips content regeneration entirely. Uses the saved content to write new FLUX prompts and inject images. Fastest mode — only works for sites generated with the current version. |
| **↺🖼 Content + Images** | Full regeneration: new content and new images in one shot. |
| **✎ Edit in form** | Loads all original settings into the form — subject, style, audience, sections, image settings — so you can adjust anything before regenerating. The subject field highlights in teal to show it was loaded. |

### ✕ Delete

Permanently removes the site folder from `generated/`. A confirmation dialog appears first.

---

## AI Provider Settings

The **AI Provider** card lets you choose which AI generates the text content.

| Mode | Behaviour |
|---|---|
| Auto (Claude → OpenAI) | Tries Claude first. If credits are exhausted it switches to OpenAI automatically. |
| Claude only | Uses Claude exclusively — will fail if credits run out. |
| OpenAI only | Uses GPT-4o-mini (or GPT-4o). Requires `OPENAI` environment variable. |

> **Note:** Image generation always uses fal.ai regardless of the provider setting here.

---

## Tips for Best Results

**Be specific with your subject.** `"The acoustic physics of guitar string vibration"` produces better content than `"Guitar"`.

**Use the context field generously.** It helps Claude focus on the angle you care about and avoid obvious generic content.

**Match style to subject.** Dark & Tech works well for physics and programming. Editorial suits history and culture. Academic is ideal for research topics.

**Include Timeline for historical subjects.** The timeline section forces Claude to anchor content in real dates, which improves accuracy throughout the whole page.

**Images only works after a fresh generation.** If you generated a site before this feature was added, use Content + Images instead of Images only.

**Standard quality is usually sufficient.** The difference between Standard and HD is most noticeable on hero images. HD adds noticeable cost for marginal visual improvement in most cases.

---

## Troubleshooting

**Generation fails with a timeout or connection error**
The server logs everything to `/generated/_shared/artifacts/logs/ai-trace.log` (or `/generated/{site-slug}/artifacts/logs/ai-trace.log` when `CV_SITE_SLUG` is set). Click **Open Trace Viewer** on the error banner to see exactly what happened. Most timeouts are Claude API rate limits — wait a minute and try again.

**Images aren't appearing**
Check that:
1. The `falai` environment variable is set and the server was restarted after setting it
2. The server startup message shows `✓ fal.ai FLUX ready`
3. The Image Generation checkbox was checked before clicking Generate

**The "Images only" option shows an error**
This site was generated before meta.json support was added. Use **Content + Images** instead — it regenerates everything and saves the content JSON for future Images-only runs.

**The generated site has placeholder or generic content**
Add more detail to the Context/angle field. Try including specific names, dates, or angles you want covered. You can use **Edit in form** to reload the settings and adjust before regenerating.

**Duplicate slug names**
If you generate a site with the same subject twice, the second one gets a `-2` suffix automatically (e.g. `my-topic-2`). Both are kept — delete the ones you don't want.

---

## File Locations

| File | Purpose |
|---|---|
| `generated/{slug}/index.html` | The generated website — open this in any browser |
| `generated/{slug}/meta.json` | Saved settings — powers the Regenerate button |
| `generated/_shared/artifacts/logs/ai-trace.log` | Full log of every AI API call with timings |
| `src/generator.js` | Browser-side generation logic |
| `server.js` | Local Node.js server |
| `start.cmd` | Windows launcher — loads env vars and starts server |

---

*CieloVista AI Website Generator · wb-starter design system*
