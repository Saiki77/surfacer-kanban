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

export interface ColorPalette {
  /** RGB values for the accent (used with rgba for theme-aware tinting) */
  r: number; g: number; b: number;
  /** Solid border color */
  border: string;
  /** Title/accent text — light theme */
  titleLight: string;
  /** Title/accent text — dark theme */
  titleDark: string;
}

export interface KanbanSettings {
  defaultColumns: string[];
  showSubtaskProgress: boolean;
  colorPresets: Record<string, string>;
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  red:    { r: 211, g: 47,  b: 47,  border: "#d32f2f", titleLight: "#c62828", titleDark: "#ef9a9a" },
  orange: { r: 230, g: 126, b: 34,  border: "#e67e22", titleLight: "#bf360c", titleDark: "#ffcc80" },
  yellow: { r: 241, g: 196, b: 15,  border: "#f1c40f", titleLight: "#9e8009", titleDark: "#fff59d" },
  green:  { r: 56,  g: 142, b: 60,  border: "#388e3c", titleLight: "#2e7d32", titleDark: "#a5d6a7" },
  blue:   { r: 66,  g: 133, b: 244, border: "#4285f4", titleLight: "#1565c0", titleDark: "#90caf9" },
  purple: { r: 126, g: 87,  b: 194, border: "#7e57c2", titleLight: "#5e35b1", titleDark: "#b39ddb" },
  pink:   { r: 216, g: 67,  b: 131, border: "#d84383", titleLight: "#c2185b", titleDark: "#f48fb1" },
  gray:   { r: 120, g: 120, b: 120, border: "#78909c", titleLight: "#546e7a", titleDark: "#b0bec5" },
};

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
