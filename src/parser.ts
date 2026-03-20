import { KanbanBoard, KanbanColumn, KanbanCard, CardMetadata, Subtask } from "./types";

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${idCounter++}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

function extractMetadata(rawTitle: string): { title: string; metadata: CardMetadata } {
  let title = rawTitle;
  const tags: string[] = [];
  const colorTags: string[] = [];
  const assignees: string[] = [];
  let dueDate: string | null = null;

  // Extract due dates: 📅 YYYY-MM-DD or @due(YYYY-MM-DD)
  title = title.replace(/📅\s*(\d{4}-\d{2}-\d{2})/g, (_, d) => { dueDate = d; return ""; });
  title = title.replace(/@due\((\d{4}-\d{2}-\d{2})\)/g, (_, d) => { dueDate = d; return ""; });

  // Extract color tags: #color-red
  title = title.replace(/#color-([\w-]+)/g, (_, c) => { colorTags.push(c); return ""; });

  // Extract regular tags: #tag (but not #color-)
  title = title.replace(/(?<!\w)#([\w][\w-]*)/g, (_, t) => { tags.push(t); return ""; });

  // Extract assignees: @person
  title = title.replace(/@([\w][\w-]*)/g, (_, a) => { assignees.push(a); return ""; });

  // Clean up extra whitespace
  title = title.replace(/\s+/g, " ").trim();

  return { title, metadata: { tags, colorTags, assignees, dueDate } };
}

export function parseKanban(markdown: string): KanbanBoard {
  resetIdCounter();

  // Extract frontmatter
  let frontmatter = "";
  let body = markdown;
  const fmMatch = markdown.match(/^(---\n[\s\S]*?\n---\n?)/);
  if (fmMatch) {
    frontmatter = fmMatch[1];
    body = markdown.slice(frontmatter.length);
  }

  // Split by H2 headings
  const columns: KanbanColumn[] = [];
  const columnSections = body.split(/^## /m);

  for (const section of columnSections) {
    if (!section.trim()) continue;

    const newlineIdx = section.indexOf("\n");
    if (newlineIdx === -1) {
      // Column heading with no cards
      columns.push({ id: nextId("col"), heading: section.trim(), cards: [] });
      continue;
    }

    const heading = section.slice(0, newlineIdx).trim();
    const content = section.slice(newlineIdx + 1);
    const cards = parseCards(content);
    columns.push({ id: nextId("col"), heading, cards });
  }

  return { frontmatter, columns };
}

function parseCards(content: string): KanbanCard[] {
  const cards: KanbanCard[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Match top-level list item: "- " or "- [ ] " or "- [x] "
    const cardMatch = line.match(/^- (?:\[[ x]\] )?(.+)$/);
    if (!cardMatch) {
      i++;
      continue;
    }

    const rawTitle = cardMatch[1];
    const descriptionLines: string[] = [];
    const subtasks: Subtask[] = [];
    i++;

    // Collect indented content
    while (i < lines.length) {
      const subLine = lines[i];
      // Stop at next top-level list item or heading
      if (subLine.match(/^- /) || subLine.match(/^## /)) break;
      // Empty line within card body is ok
      if (subLine.trim() === "") {
        descriptionLines.push("");
        i++;
        continue;
      }
      // Must be indented (2+ spaces or tab)
      if (!subLine.match(/^[\t ]{2,}/)) break;

      // Check for subtask checkbox
      const subtaskMatch = subLine.match(/^\s*- \[([ x])\] (.+)$/);
      if (subtaskMatch) {
        subtasks.push({ completed: subtaskMatch[1] === "x", text: subtaskMatch[2] });
      } else {
        descriptionLines.push(subLine.replace(/^  /, ""));
      }
      i++;
    }

    // Trim trailing empty lines from description
    while (descriptionLines.length > 0 && descriptionLines[descriptionLines.length - 1] === "") {
      descriptionLines.pop();
    }

    const { title, metadata } = extractMetadata(rawTitle);
    cards.push({
      id: nextId("card"),
      rawTitle,
      title,
      description: descriptionLines.join("\n"),
      subtasks,
      metadata,
    });
  }

  return cards;
}

export function serializeKanban(board: KanbanBoard): string {
  let md = board.frontmatter;
  if (md && !md.endsWith("\n")) md += "\n";

  for (const column of board.columns) {
    md += `\n## ${column.heading}\n`;
    for (const card of column.cards) {
      md += `- ${card.rawTitle}\n`;
      if (card.description) {
        for (const line of card.description.split("\n")) {
          md += `  ${line}\n`;
        }
      }
      for (const subtask of card.subtasks) {
        md += `  - [${subtask.completed ? "x" : " "}] ${subtask.text}\n`;
      }
    }
  }

  return md;
}

export function rebuildRawTitle(card: KanbanCard): string {
  let raw = card.title;
  for (const tag of card.metadata.tags) {
    raw += ` #${tag}`;
  }
  for (const color of card.metadata.colorTags) {
    raw += ` #color-${color}`;
  }
  for (const assignee of card.metadata.assignees) {
    raw += ` @${assignee}`;
  }
  if (card.metadata.dueDate) {
    raw += ` 📅 ${card.metadata.dueDate}`;
  }
  return raw;
}
