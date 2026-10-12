# DM Dashboard

A DM screen that runs from one file, `DM Dashboard.html`. Double-click it and it opens in your browser. It works offline and needs no install. Nothing leaves your computer.

## Importing a vault
1. Click **Import Obsidian vault** and choose the vault folder (for example `Documents\Serenthia Campaign`).
2. That's it. Notes, links, images, audio and PDFs are copied into the browser's storage, so the dashboard keeps working even if the vault moves.
3. After you edit in Obsidian, press **Re-import** (the circular arrows). In Edge or Chrome this is one click. Other browsers ask you to pick the folder again.

You can import several vaults; switch between them from the dropdown at the top of the sidebar.

## How to write your vault so it "just works"
| Put this in your vault | What the dashboard does with it |
| --- | --- |
| `[[Links]]`, `![[embeds]]`, tables, callouts, `==highlights==` | Renders them like Obsidian; links open in tabs |
| `> [!secret] DM only` callouts, or `dm_only: true` in a note's properties | Visible to you; hidden when **Player view** is on (Ctrl+.) so you can share your screen |
| One note per PC in `Party/` (or `type: pc`) | Party page: HP, AC, passive Perception, initiative, ability checks, sheet links. Stats come from properties (`hp`, `ac`, `init`) or lines like `**HP** 52 · **AC** 13` and a STR…CHA table |
| NPCs/monsters with `hp`, `ac`, `init` properties | **Add to combat** button on the note |
| Audio in folders named `Music`, `Ambience` (or `Ambient`, `Loops`) and `SFX` (or `Sound Effects`) | Soundboard. Music: one at a time with crossfade. Ambience: layered loops with their own levels. SFX: instant buttons. Unsorted audio: long files count as music, short ones as effects |
| `![[storm.mp3]]` inside a note | A play button right in the note |
| `music: "[[Tavern.mp3]]"`, `ambience:` or `sfx:` in a note's properties | Play buttons at the top of the note and in Present mode |
| Notes in `Scripts/` (or `type: script`), or `> [!read-aloud] Title` callouts anywhere | Scripts page, plus **Present**: full screen, large text for reading aloud |
| Session plans or adventures (`type: session`, `script` or `adventure`, or in `Sessions/`, `Scripts/`, `Adventures/`) with a `## heading` per scene | **Run as prompt book**: section list that follows your scroll, the party strip on top, and every `[[name]]` opens beside the text so you never lose your place. Images in a section show as thumbnails |
| `[[Thunder.mp3|Thunder rolls]]` in the text | An inline sound cue with your own label |
| A ```` ```statblock ```` code block (the Fantasy Statblocks plugin format) | A formatted stat block with clickable ability checks and dice; HP, AC and initiative feed **Add to combat** |
| Dice like `2d6+3` in any note | Click to roll |
| A table whose first column header is `d6`, `d20`, `d100`… | **Roll on this table** picks and highlights a row |
| A folder of notes that each have a `d20: 3` property (like Herbs) | The folder page gets a **Roll d20** button |
| Notes in `Templates/` | Ignored for party, threads and sessions |
| `type: thread` notes with `**Dramatic question:**` | Listed on Home as active threads |
| `type: session` notes ("Session 16") | Latest one is shown on Home |
| A root note named "Hub", "Home" or with `type: hub` | Shown on the Home page |

## At the table
- **Ctrl+K** (or `/`): search notes, text and sounds. Sounds play straight from search.
- **Ctrl+.**: Player view on/off.
- Right panel: **Note** (the side peek), **Combat** (initiative, HP, conditions, drag to reorder; press **N** for next turn), **Sound** (now playing: pause, loop and volume per track), **Dice** (advantage/disadvantage, `4d6kh3`, history) and **Notes** (a scratchpad that saves itself; copy it into your session note afterwards).
- **Stop all sound**: the speaker button in the top bar.

## Player screen (projector or second display)
The monitor button in the top bar opens a **player screen**: a separate black window that shows only what you send it, so nothing DM-only can end up on it.

1. Set the projector up as a separate display, not a mirror (on a Mac: System Settings → Displays, choose "Extended display" for the projector).
2. Click the monitor button. Drag the new window onto the projector and click it once (or press **F**) to make it full screen. In Chrome or Edge it can ask to manage windows; allow it and the window opens on the projector by itself.
3. Send pictures to it: hover any image in a note and click **Show players**, use the button in an image's enlarged view, pick from **Vault images** in the **Screen** tab, or choose **From file…** (or drop a file on that tab) for a battle map PNG saved anywhere.

The Screen tab shows what players see, with **Blank** (also the **B** key) to black it out without losing the picture, **Fit/Fill**, and an optional caption. The screen keeps its picture if you reload the dashboard. Other pages on the same site can drive it too: post `{ type: 'show', id, blob, title }` on a `BroadcastChannel('dm-dashboard-screen')`, where `blob` is any image (an SVG works).

## Example vault
`examples/Greenhorn Springs` is the original DM console's Weird West one-shot rebuilt as Obsidian notes, with placeholder tones for its sound cues. Import it to see every feature working.

## Developing
Source is in `src/` (`index.html`, `styles.css`, `app.js`, and `vault.js`, which reads notes, links, sounds and stat blocks); `vendor/marked.min.js` is the Markdown parser (MIT). Run `node build.mjs` to produce `dist/DM Dashboard.html`.

## Checking a script before a session
`node validate.mjs <script.md or folder> --vault <your vault folder>` reads scripts with the same parser the dashboard uses and reports anything that won't work at the table: a sound cue with no matching audio file, a script that won't show up in the Prompt book, missing notes, broken tables, unclosed callouts or code blocks, and stat blocks it can't read. It exits with an error when something is broken.

- `--into Scripts` checks a script saved outside the vault as if it were in the vault's `Scripts` folder.
- `--sounds --vault <folder>` lists every sound in the vault by channel, with the exact `[[name]]` to link it.
- `--strict` fails on warnings too.

The vault is found automatically when a folder above the script contains `.obsidian`.
