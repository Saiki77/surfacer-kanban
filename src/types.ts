export interface Subtask {
  text: string;
  completed: boolean;
}

export interface CardMetadata {
  tags: string[];
  colorTags: string[];
  assignees: string[];
  dueDate: string | null;
}

export interface KanbanCard {
  id: string;
  rawTitle: string;
  title: string;
  description: string;
  subtasks: Subtask[];
  metadata: CardMetadata;
}

export interface KanbanColumn {
  id: string;
  heading: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  frontmatter: string;
  columns: KanbanColumn[];
}

export interface KanbanSettings {
  defaultColumns: string[];
  showSubtaskProgress: boolean;
  colorPresets: Record<string, string>;
}

export const DEFAULT_SETTINGS: KanbanSettings = {
  defaultColumns: ["Backlog", "In Progress", "Done"],
  showSubtaskProgress: true,
  colorPresets: {
    red: "#fecaca",
    orange: "#fed7aa",
    yellow: "#fef08a",
    green: "#bbf7d0",
    blue: "#bfdbfe",
    purple: "#ddd6fe",
    pink: "#fbcfe8",
    gray: "#e5e7eb",
  },
};

export const VIEW_TYPE_KANBAN = "surfacer-kanban-view";
