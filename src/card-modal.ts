import { App, Modal, Setting, MarkdownRenderer, Component } from "obsidian";
import { KanbanCard, KanbanColumn } from "./types";
import { rebuildRawTitle } from "./parser";
import type { KanbanView } from "./kanban-view";

export class CardDetailModal extends Modal {
  private card: KanbanCard;
  private column: KanbanColumn;
  private view: KanbanView;
  private renderComponent: Component;

  constructor(
    app: App,
    card: KanbanCard,
    column: KanbanColumn,
    view: KanbanView
  ) {
    super(app);
    this.card = card;
    this.column = column;
    this.view = view;
    this.renderComponent = new Component();
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("kanban-card-modal");
    this.renderComponent.load();

    // Title
    const titleInput = contentEl.createEl("input", {
      type: "text",
      value: this.card.title,
      cls: "kanban-modal-title-input",
      attr: { placeholder: "Card title" },
    });

    // Column badge
    contentEl.createDiv({
      text: this.column.heading,
      cls: "kanban-modal-column-badge",
    });

    // Metadata section
    const metaEl = contentEl.createDiv({ cls: "kanban-modal-meta" });

    new Setting(metaEl)
      .setName("Tags")
      .addText((text) =>
        text
          .setValue(this.card.metadata.tags.map((t) => `#${t}`).join(" "))
          .setPlaceholder("#feature #bug")
          .onChange((val) => {
            this.card.metadata.tags =
              val.match(/#([\w-]+)/g)?.map((t) => t.slice(1)) ?? [];
          })
      );

    new Setting(metaEl)
      .setName("Assignees")
      .addText((text) =>
        text
          .setValue(this.card.metadata.assignees.map((a) => `@${a}`).join(" "))
          .setPlaceholder("@justus @lukas")
          .onChange((val) => {
            this.card.metadata.assignees =
              val.match(/@([\w-]+)/g)?.map((a) => a.slice(1)) ?? [];
          })
      );

    // Due date — native date picker
    const dueSetting = new Setting(metaEl).setName("Due date");
    const dateInput = dueSetting.controlEl.createEl("input", {
      type: "date",
      cls: "kanban-date-input",
      value: this.card.metadata.dueDate ?? "",
    });
    dateInput.addEventListener("change", () => {
      this.card.metadata.dueDate = dateInput.value || null;
    });
    // Clear button
    if (this.card.metadata.dueDate) {
      const clearBtn = dueSetting.controlEl.createEl("button", {
        text: "✕",
        cls: "kanban-date-clear-btn",
      });
      clearBtn.addEventListener("click", () => {
        dateInput.value = "";
        this.card.metadata.dueDate = null;
        clearBtn.remove();
      });
    }

    new Setting(metaEl)
      .setName("Color")
      .addDropdown((dd) => {
        dd.addOption("", "None");
        for (const color of Object.keys(
          this.view.plugin.settings.colorPresets
        )) {
          dd.addOption(color, color.charAt(0).toUpperCase() + color.slice(1));
        }
        dd.setValue(this.card.metadata.colorTags[0] ?? "");
        dd.onChange((val) => {
          this.card.metadata.colorTags = val ? [val] : [];
        });
      });

    // Description
    contentEl.createDiv({ text: "Description", cls: "kanban-modal-label" });
    const descArea = contentEl.createEl("textarea", {
      cls: "kanban-modal-description",
      text: this.card.description,
      attr: { placeholder: "Add a description...", rows: "6" },
    });

    const previewEl = contentEl.createDiv({ cls: "kanban-modal-preview" });
    if (this.card.description) {
      MarkdownRenderer.render(
        this.app,
        this.card.description,
        previewEl,
        "",
        this.renderComponent
      );
    }

    descArea.addEventListener("input", () => {
      this.card.description = descArea.value;
      previewEl.empty();
      if (descArea.value) {
        MarkdownRenderer.render(
          this.app,
          descArea.value,
          previewEl,
          "",
          this.renderComponent
        );
      }
    });

    // Subtasks
    if (this.card.subtasks.length > 0) {
      const subtasksEl = contentEl.createDiv({ cls: "kanban-modal-subtasks" });
      subtasksEl.createEl("h4", { text: "Subtasks" });

      for (const subtask of this.card.subtasks) {
        const row = subtasksEl.createDiv({ cls: "kanban-modal-subtask-row" });
        const cb = row.createEl("input", { type: "checkbox" });
        cb.checked = subtask.completed;
        cb.addEventListener("change", () => {
          subtask.completed = cb.checked;
        });
        const label = row.createEl("span", { text: subtask.text });
        if (subtask.completed) label.addClass("kanban-subtask-done");
        cb.addEventListener("change", () => {
          label.toggleClass("kanban-subtask-done", cb.checked);
        });
      }
    }

    // Actions
    const actions = contentEl.createDiv({ cls: "kanban-modal-actions" });

    const saveBtn = actions.createEl("button", { text: "Save", cls: "mod-cta" });
    saveBtn.addEventListener("click", () => {
      this.card.title = titleInput.value;
      this.card.rawTitle = rebuildRawTitle(this.card);
      this.view.save();
      this.close();
    });

    const deleteBtn = actions.createEl("button", {
      text: "Delete card",
      cls: "mod-warning",
    });
    deleteBtn.addEventListener("click", () => {
      const idx = this.column.cards.findIndex((c) => c.id === this.card.id);
      if (idx >= 0) this.column.cards.splice(idx, 1);
      this.view.save();
      this.close();
    });
  }

  onClose(): void {
    this.renderComponent.unload();
    this.contentEl.empty();
  }
}
