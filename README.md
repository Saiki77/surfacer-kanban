# Surfacer Kanban

Markdown-native kanban boards for Obsidian. Your board is a plain `.md` file — readable by humans, parseable by LLMs, and version-controllable with git.

## Why

Most kanban tools store data in proprietary formats or opaque JSON. Surfacer Kanban uses **structured markdown** as the source of truth. This means:

- **LLM-friendly** — Claude, GPT, or any language model can read, create, and modify your boards directly. Ask an AI to "add a card to the backlog" or "move all done items to archive" and it can edit the file without any API or plugin integration.
- **Human-readable** — Open the file in any text editor and it makes sense. No lock-in.
- **Git-friendly** — Diffs are clean and meaningful. Review board changes in PRs.
- **Obsidian-native** — Links, tags, and backlinks work as expected.

## Install

1. Download the [latest release](../../releases) zip, or clone this repo
2. Copy `main.js`, `manifest.json`, and `styles.css` into your vault:
   ```
   <your-vault>/.obsidian/plugins/surfacer-kanban/
   ```
3. Restart Obsidian
4. Go to **Settings > Community plugins** and enable **Surfacer Kanban**

### From source

```bash
git clone https://github.com/Saiki77/surfacer-kanban.git
cd surfacer-kanban
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to your plugins folder.

## Usage

### Create a board

Use the command palette: **Surfacer Kanban: Create new kanban board**

Or create any `.md` file with this frontmatter:

```markdown
---
kanban: true
---

## Backlog

- Design landing page #design #color-blue @justus
- Write API docs #docs @due(2026-04-01)

## In Progress

- Build auth flow #backend #color-green @lukas

## Done

- Set up CI/CD #devops #color-gray
```

When you open the file, it automatically renders as a kanban board.

### Card syntax

Each card is a markdown list item under an `## H2` column heading:

```markdown
- Card title #tag1 #tag2 #color-blue @assignee @due(2026-04-15)
  Optional description on indented lines.
  Supports **markdown** formatting.
  - [ ] Subtask one
  - [x] Subtask two (completed)
```

| Feature | Syntax | Example |
|---------|--------|---------|
| **Tags** | `#tag` | `#backend #urgent` |
| **Color** | `#color-name` | `#color-red` `#color-blue` `#color-green` |
| **Assignee** | `@name` | `@justus @lukas` |
| **Due date** | `@due(YYYY-MM-DD)` | `@due(2026-04-01)` |
| **Description** | Indented lines | `  This is the description` |
| **Subtasks** | Indented checkboxes | `  - [ ] Do this` |

### Available colors

`red` `orange` `yellow` `green` `blue` `purple` `pink` `gray`

Cards get a subtle tinted background with an accent-colored left border and title.

### Interacting with the board

- **Drag and drop** cards between columns
- **Click a card** to open the detail modal (edit title, description, tags, assignees, due date, subtasks)
- **Click "+ Add card"** to quickly add a card to a column
- **Click "+ Column"** to add a new column
- **Right-click a column header** to rename or delete it
- **"View as Markdown"** to see/edit the raw file (and switch back seamlessly)

## LLM integration

Because the board is plain markdown, any LLM with file access can work with it directly. No tools, APIs, or plugins needed beyond file read/write.

**Ask Claude to create a board:**
> "Create a kanban board at `projects/launch.md` with columns Backlog, In Progress, Review, Done. Add cards for the launch checklist."

**Ask Claude to update cards:**
> "Move the 'Design landing page' card to In Progress and assign it to @lukas"

**Ask Claude to summarize status:**
> "Read `projects/launch.md` and give me a status update on what's in progress and what's blocked"

The LLM reads and writes the same markdown you see in the visual board. No translation layer, no sync issues.

## License

Creative Commons Attribution-NonCommercial 4.0 International
