import { TextFileView, WorkspaceLeaf, Menu } from "obsidian";
import {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  VIEW_TYPE_KANBAN,
} from "./types";
import { parseKanban, serializeKanban } from "./parser";
import { CardDetailModal } from "./card-modal";
import { setupColumnDragDrop } from "./drag-drop";
import type SurfacerKanbanPlugin from "./main";

export class KanbanView extends TextFileView {
  plugin: SurfacerKanbanPlugin;
  board: KanbanBoard | null = null;
  private boardEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private didDrag = false;

  constructor(leaf: WorkspaceLeaf, plugin: SurfacerKanbanPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_KANBAN;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "Kanban";
  }

  getIcon(): string {
    return "columns-3";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("kanban-container");

    // Toolbar
    this.toolbarEl = this.contentEl.createDiv({ cls: "kanban-toolbar" });

    const addColBtn = this.toolbarEl.createEl("button", {
      text: "+ Column",
      cls: "kanban-toolbar-btn",
    });
    addColBtn.addEventListener("click", () => this.addColumn());

    const toggleBtn = this.toolbarEl.createEl("button", {
      text: "View as Markdown",
      cls: "kanban-toolbar-btn kanban-toolbar-btn-secondary",
    });
    toggleBtn.addEventListener("click", () => this.toggleToMarkdown());

    // Board
    this.boardEl = this.contentEl.createDiv({ cls: "kanban-board" });
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  getViewData(): string {
    if (!this.board) return this.data;
    return serializeKanban(this.board);
  }

  setViewData(data: string, clear: boolean): void {
    this.data = data;
    this.board = parseKanban(data);
    this.renderBoard();
  }

  clear(): void {
    this.board = null;
    this.boardEl?.empty();
  }

  // --- Rendering ---

  renderBoard(): void {
    if (!this.boardEl || !this.board) return;
    this.boardEl.empty();

    for (const column of this.board.columns) {
      this.renderColumn(column);
    }
  }

  private renderColumn(column: KanbanColumn): void {
    const colEl = this.boardEl.createDiv({ cls: "kanban-column" });
    colEl.dataset.columnId = column.id;

    // Header
    const headerEl = colEl.createDiv({ cls: "kanban-column-header" });
    const titleRow = headerEl.createDiv({ cls: "kanban-column-title-row" });
    const titleEl = titleRow.createEl("h3", {
      text: column.heading,
      cls: "kanban-column-title",
    });
    titleRow.createEl("span", {
      text: String(column.cards.length),
      cls: "kanban-column-count",
    });

    // Column menu
    const menuBtn = headerEl.createEl("button", {
      text: "\u22EE",
      cls: "kanban-column-menu-btn",
    });
    menuBtn.addEventListener("click", (e) => {
      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle("Add card").onClick(() => this.addCard(column))
      );
      menu.addItem((item) =>
        item.setTitle("Rename").onClick(() => this.editColumnTitle(titleEl, column))
      );
      menu.addItem((item) =>
        item
          .setTitle("Delete column")
          .setWarning(true)
          .onClick(() => this.deleteColumn(column))
      );
      menu.showAtMouseEvent(e as MouseEvent);
    });

    // Editable title on double-click
    titleEl.addEventListener("dblclick", () =>
      this.editColumnTitle(titleEl, column)
    );

    // Cards container
    const cardsEl = colEl.createDiv({ cls: "kanban-column-cards" });
    cardsEl.dataset.columnId = column.id;

    for (const card of column.cards) {
      this.renderCard(card, cardsEl, column);
    }

    // Setup drag-drop
    setupColumnDragDrop(cardsEl, this);

    // Add card button
    const addBtn = colEl.createEl("button", {
      text: "+ Add card",
      cls: "kanban-add-card-btn",
    });
    addBtn.addEventListener("click", () => this.addCard(column));
  }

  private renderCard(
    card: KanbanCard,
    container: HTMLElement,
    column: KanbanColumn
  ): void {
    const cardEl = container.createDiv({ cls: "kanban-card" });
    cardEl.dataset.cardId = card.id;
    cardEl.draggable = true;

    // Color left border
    if (card.metadata.colorTags.length > 0) {
      const colorName = card.metadata.colorTags[0];
      const color = this.plugin.settings.colorPresets[colorName];
      if (color) {
        cardEl.style.borderLeftColor = color;
        cardEl.addClass("kanban-card-colored");
      }
    }

    // Title
    cardEl.createDiv({ text: card.title, cls: "kanban-card-title" });

    // Tags
    if (card.metadata.tags.length > 0) {
      const tagsEl = cardEl.createDiv({ cls: "kanban-card-tags" });
      for (const tag of card.metadata.tags) {
        tagsEl.createEl("span", { text: `#${tag}`, cls: "kanban-tag" });
      }
    }

    // Bottom row
    const hasBottom =
      card.metadata.assignees.length > 0 ||
      card.metadata.dueDate ||
      (card.subtasks.length > 0 && this.plugin.settings.showSubtaskProgress);

    if (hasBottom) {
      const bottomEl = cardEl.createDiv({ cls: "kanban-card-bottom" });

      // Assignees
      if (card.metadata.assignees.length > 0) {
        const assigneesEl = bottomEl.createDiv({ cls: "kanban-card-assignees" });
        for (const person of card.metadata.assignees) {
          const hue = hashStringToHue(person);
          const badge = assigneesEl.createEl("span", {
            text: person.charAt(0).toUpperCase(),
            cls: "kanban-assignee-badge",
            attr: { title: person },
          });
          badge.style.backgroundColor = `hsl(${hue}, 60%, 75%)`;
          badge.style.color = `hsl(${hue}, 40%, 25%)`;
        }
      }

      // Due date
      if (card.metadata.dueDate) {
        const dueEl = bottomEl.createDiv({ cls: "kanban-card-due" });
        const isOverdue =
          new Date(card.metadata.dueDate) < new Date(new Date().toDateString());
        if (isOverdue) dueEl.addClass("kanban-due-overdue");
        dueEl.setText(`\uD83D\uDCC5 ${card.metadata.dueDate}`);
      }

      // Subtask progress
      if (card.subtasks.length > 0 && this.plugin.settings.showSubtaskProgress) {
        const done = card.subtasks.filter((s) => s.completed).length;
        const progressEl = bottomEl.createDiv({ cls: "kanban-card-progress" });
        progressEl.setText(`\u2611 ${done}/${card.subtasks.length}`);
      }
    }

    // Description indicator
    if (card.description) {
      cardEl.createDiv({ cls: "kanban-card-desc-indicator", text: "\uD83D\uDCDD" });
    }

    // Drag events
    cardEl.addEventListener("dragstart", (e) => {
      this.didDrag = false;
      e.dataTransfer?.setData("text/plain", card.id);
      e.dataTransfer!.effectAllowed = "move";
      setTimeout(() => cardEl.addClass("kanban-card-dragging"), 0);
    });

    cardEl.addEventListener("drag", () => {
      this.didDrag = true;
    });

    cardEl.addEventListener("dragend", () => {
      cardEl.removeClass("kanban-card-dragging");
    });

    // Click to open modal (not on drag)
    cardEl.addEventListener("click", () => {
      if (!this.didDrag) {
        new CardDetailModal(this.app, card, column, this).open();
      }
      this.didDrag = false;
    });
  }

  // --- Mutations ---

  save(): void {
    if (this.board) {
      this.data = serializeKanban(this.board);
    }
    this.requestSave();
    this.renderBoard();
  }

  moveCard(
    cardId: string,
    targetColumnId: string,
    targetIndex: number
  ): void {
    if (!this.board) return;

    let card: KanbanCard | undefined;
    let sourceColumn: KanbanColumn | undefined;

    for (const col of this.board.columns) {
      const idx = col.cards.findIndex((c) => c.id === cardId);
      if (idx >= 0) {
        card = col.cards[idx];
        sourceColumn = col;
        col.cards.splice(idx, 1);
        break;
      }
    }

    if (!card) return;

    const targetColumn = this.board.columns.find(
      (c) => c.id === targetColumnId
    );
    if (!targetColumn) return;

    if (targetIndex < 0 || targetIndex >= targetColumn.cards.length) {
      targetColumn.cards.push(card);
    } else {
      targetColumn.cards.splice(targetIndex, 0, card);
    }

    this.save();
  }

  private addColumn(): void {
    if (!this.board) return;
    const name = prompt("Column name:");
    if (!name) return;

    this.board.columns.push({
      id: `col-new-${Date.now()}`,
      heading: name,
      cards: [],
    });
    this.save();
  }

  private addCard(column: KanbanColumn): void {
    const title = prompt("Card title:");
    if (!title) return;

    column.cards.push({
      id: `card-new-${Date.now()}`,
      rawTitle: title,
      title,
      description: "",
      subtasks: [],
      metadata: { tags: [], colorTags: [], assignees: [], dueDate: null },
    });
    this.save();
  }

  private editColumnTitle(titleEl: HTMLElement, column: KanbanColumn): void {
    titleEl.contentEditable = "true";
    titleEl.focus();

    const finish = () => {
      titleEl.contentEditable = "false";
      const newText = titleEl.textContent?.trim();
      if (newText && newText !== column.heading) {
        column.heading = newText;
        this.save();
      } else {
        titleEl.setText(column.heading);
      }
    };

    titleEl.addEventListener("blur", finish, { once: true });
    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        titleEl.blur();
      }
      if (e.key === "Escape") {
        titleEl.textContent = column.heading;
        titleEl.blur();
      }
    });
  }

  private deleteColumn(column: KanbanColumn): void {
    if (!this.board) return;
    if (
      column.cards.length > 0 &&
      !confirm(
        `Delete "${column.heading}" and its ${column.cards.length} cards?`
      )
    ) {
      return;
    }
    this.board.columns = this.board.columns.filter((c) => c.id !== column.id);
    this.save();
  }

  private toggleToMarkdown(): void {
    if (!this.file) return;
    const leaf = this.leaf;
    leaf.setViewState({
      type: "markdown",
      state: { file: this.file.path, mode: "source" },
    });
  }
}

function hashStringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
