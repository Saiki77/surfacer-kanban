import { TextFileView, WorkspaceLeaf, Menu } from "obsidian";
import {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  VIEW_TYPE_KANBAN,
  COLOR_PALETTES,
} from "./types";
import { parseKanban, serializeKanban } from "./parser";
import { CardDetailModal } from "./card-modal";
import { setupColumnDragDrop, setupBoardColumnDragDrop } from "./drag-drop";
import type SurfacerKanbanPlugin from "./main";

export class KanbanView extends TextFileView {
  plugin: SurfacerKanbanPlugin;
  board: KanbanBoard | null = null;
  private boardEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private didDrag = false;
  private isEditing = false; // Prevents re-render while user is typing
  private collapsedColumns: Set<string> = new Set();
  private renderQueued = false;

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
    // Flush any pending board state to disk before destroying the view
    if (this.board && this.file) {
      this.isEditing = false; // Clear editing lock so serialization proceeds
      this.data = serializeKanban(this.board);
      await this.app.vault.modify(this.file, this.data);
    }
    this.contentEl.empty();
  }

  getViewData(): string {
    if (this.board) {
      this.data = serializeKanban(this.board);
    }
    return this.data;
  }

  /** Persist current board state to the file on disk */
  async saveToFile(): Promise<void> {
    if (!this.file || !this.board) return;
    this.data = serializeKanban(this.board);
    await this.app.vault.modify(this.file, this.data);
  }

  setViewData(data: string, clear: boolean): void {
    // Don't re-render if user is actively editing an input
    if (this.isEditing) return;
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
    // Don't re-render if user is actively editing an input
    if (this.isEditing) return;
    this.boardEl.empty();

    // Apply card border-radius setting
    this.boardEl.style.setProperty(
      "--card-border-radius",
      `${this.plugin.settings.cardBorderRadius}px`
    );

    for (const column of this.board.columns) {
      this.renderColumn(column);
    }

    // Setup column reordering drag-drop on the board
    setupBoardColumnDragDrop(this.boardEl, this);
  }

  private renderColumn(column: KanbanColumn): void {
    const isCollapsed = this.collapsedColumns.has(column.id);
    const colEl = this.boardEl.createDiv({
      cls: `kanban-column ${isCollapsed ? "kanban-column-collapsed" : ""}`,
    });
    colEl.dataset.columnId = column.id;

    // Collapsed view — vertical strip with title and count
    if (isCollapsed) {
      const collapsedBar = colEl.createDiv({ cls: "kanban-collapsed-bar" });
      const expandBtn = collapsedBar.createEl("button", {
        cls: "kanban-collapse-btn",
      });
      expandBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
      expandBtn.addEventListener("click", () => {
        this.collapsedColumns.delete(column.id);
        this.renderBoard();
      });
      collapsedBar.createEl("span", {
        text: String(column.cards.length),
        cls: "kanban-column-count",
      });
      collapsedBar.createEl("span", {
        text: column.heading,
        cls: "kanban-collapsed-title",
      });
      return;
    }

    // Header — draggable for column reordering
    const headerEl = colEl.createDiv({ cls: "kanban-column-header" });
    headerEl.draggable = true;
    headerEl.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("application/kanban-column", column.id);
      e.dataTransfer!.effectAllowed = "move";
      setTimeout(() => colEl.addClass("kanban-column-dragging"), 0);
    });
    headerEl.addEventListener("dragend", () => {
      colEl.removeClass("kanban-column-dragging");
    });

    const titleRow = headerEl.createDiv({ cls: "kanban-column-title-row" });

    // Collapse button
    const collapseBtn = titleRow.createEl("button", {
      cls: "kanban-collapse-btn",
    });
    collapseBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collapsedColumns.add(column.id);
      this.renderBoard();
    });

    const dragHandle = titleRow.createEl("span", {
      cls: "kanban-column-drag-handle",
    });
    dragHandle.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>`;
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

    // Resolve color palette
    const colorName = card.metadata.colorTags.length > 0 ? card.metadata.colorTags[0] : null;
    const pal = colorName ? COLOR_PALETTES[colorName] ?? null : null;

    if (pal) {
      // Set CSS custom props — CSS handles light/dark theming via these
      cardEl.style.setProperty("--card-r", String(pal.r));
      cardEl.style.setProperty("--card-g", String(pal.g));
      cardEl.style.setProperty("--card-b", String(pal.b));
      cardEl.style.setProperty("--card-border", pal.border);
      cardEl.style.setProperty("--card-title-light", pal.titleLight);
      cardEl.style.setProperty("--card-title-dark", pal.titleDark);
      cardEl.addClass("kanban-card-colored");
    }

    // Title
    const titleEl = cardEl.createDiv({ cls: "kanban-card-title" });
    titleEl.setText(card.title);

    // Due date as subtitle (below title, like "5:00 - 6:00 pm" in reference)
    if (card.metadata.dueDate) {
      const dueEl = cardEl.createDiv({ cls: "kanban-card-due" });
      const isOverdue =
        new Date(card.metadata.dueDate) < new Date(new Date().toDateString());
      if (isOverdue) dueEl.addClass("kanban-due-overdue");
      dueEl.setText(card.metadata.dueDate);
    }

    // Badge top-right (subtask progress, like "1h" in reference)
    if (card.subtasks.length > 0 && this.plugin.settings.showSubtaskProgress) {
      const done = card.subtasks.filter((s) => s.completed).length;
      const badge = cardEl.createDiv({ cls: "kanban-card-badge" });
      badge.setText(`${done}/${card.subtasks.length}`);
    }

    // Bottom row: tags, assignees, description indicator
    const hasBottom =
      card.metadata.tags.length > 0 ||
      card.metadata.assignees.length > 0 ||
      card.description;

    if (hasBottom) {
      const bottomEl = cardEl.createDiv({ cls: "kanban-card-bottom" });

      // Tags
      for (const tag of card.metadata.tags) {
        bottomEl.createEl("span", { text: `#${tag}`, cls: "kanban-tag" });
      }

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
          badge.style.backgroundColor = `hsl(${hue}, 50%, 88%)`;
          badge.style.color = `hsl(${hue}, 40%, 35%)`;
        }
      }

      // Description indicator
      if (card.description) {
        const indicator = bottomEl.createDiv({ cls: "kanban-card-desc-indicator" });
        indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1.5H2V3zm0 4h12v1.5H2V7zm0 4h8v1.5H2V11z"/></svg>`;
      }
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
    if (!this.board) return;
    this.data = serializeKanban(this.board);
    // Write to disk immediately — requestSave is debounced and may be lost on close
    if (this.file) {
      this.app.vault.modify(this.file, this.data);
    }
    this.queueRender();
  }

  /** Coalesce multiple rapid saves into a single rAF render pass */
  private queueRender(): void {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.renderBoard();
    });
  }

  moveColumn(columnId: string, targetIndex: number): void {
    if (!this.board) return;
    const idx = this.board.columns.findIndex((c) => c.id === columnId);
    if (idx < 0) return;
    const [col] = this.board.columns.splice(idx, 1);
    if (targetIndex < 0 || targetIndex >= this.board.columns.length) {
      this.board.columns.push(col);
    } else {
      this.board.columns.splice(targetIndex, 0, col);
    }
    this.save();
  }

  moveCard(
    cardId: string,
    targetColumnId: string,
    targetIndex: number
  ): void {
    if (!this.board) return;

    let card: KanbanCard | undefined;

    for (const col of this.board.columns) {
      const idx = col.cards.findIndex((c) => c.id === cardId);
      if (idx >= 0) {
        card = col.cards[idx];
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

    // If there's already an input visible, focus it
    const existing = this.boardEl.querySelector(".kanban-inline-input") as HTMLInputElement;
    if (existing) { existing.focus(); return; }

    this.isEditing = true;

    const wrapper = this.boardEl.createDiv({ cls: "kanban-column kanban-inline-column" });
    const input = wrapper.createEl("input", {
      type: "text",
      cls: "kanban-inline-input",
      attr: { placeholder: "Column name..." },
    });

    // Focus after a tick to ensure DOM is ready
    setTimeout(() => input.focus(), 10);

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      this.isEditing = false;
      const name = input.value.trim();
      wrapper.remove();
      if (!name || !this.board) return;
      this.board.columns.push({
        id: `col-new-${Date.now()}`,
        heading: name,
        cards: [],
      });
      this.save();
    };

    const cancel = () => {
      if (committed) return;
      committed = true;
      this.isEditing = false;
      wrapper.remove();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
    });
    input.addEventListener("blur", () => {
      // Small delay so click events can fire first
      setTimeout(() => { if (!committed) commit(); }, 100);
    });
  }

  private addCard(column: KanbanColumn): void {
    // Find the column element
    const allColEls = this.boardEl.querySelectorAll(".kanban-column");
    let colEl: Element | null = null;
    for (const el of Array.from(allColEls)) {
      if ((el as HTMLElement).dataset.columnId === column.id) {
        colEl = el;
        break;
      }
    }
    if (!colEl) return;

    // If there's already an input in this column, focus it
    const existing = colEl.querySelector(".kanban-inline-card-input") as HTMLInputElement;
    if (existing) { existing.focus(); return; }

    this.isEditing = true;

    // Create the input
    const input = document.createElement("input");
    input.type = "text";
    input.className = "kanban-inline-card-input";
    input.placeholder = "Card title...";

    // Insert before the add-card button
    const addBtn = colEl.querySelector(".kanban-add-card-btn");
    if (addBtn) {
      colEl.insertBefore(input, addBtn);
    } else {
      colEl.appendChild(input);
    }

    setTimeout(() => input.focus(), 10);

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      this.isEditing = false;
      const title = input.value.trim();
      input.remove();
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
    };

    const cancel = () => {
      if (committed) return;
      committed = true;
      this.isEditing = false;
      input.remove();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
    });
    input.addEventListener("blur", () => {
      setTimeout(() => { if (!committed) commit(); }, 100);
    });
  }

  private editColumnTitle(titleEl: HTMLElement, column: KanbanColumn): void {
    this.isEditing = true;
    titleEl.contentEditable = "true";
    titleEl.focus();

    const finish = () => {
      this.isEditing = false;
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

  private async toggleToMarkdown(): Promise<void> {
    if (!this.file) return;
    // Persist current board state to disk before switching views
    if (this.board) {
      this.data = serializeKanban(this.board);
      await this.app.vault.modify(this.file, this.data);
    }
    const leaf = this.leaf;
    await leaf.setViewState({
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

