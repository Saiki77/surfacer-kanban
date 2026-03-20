import { App, PluginSettingTab, Setting } from "obsidian";
import type SurfacerKanbanPlugin from "./main";

export class KanbanSettingTab extends PluginSettingTab {
  plugin: SurfacerKanbanPlugin;

  constructor(app: App, plugin: SurfacerKanbanPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Surfacer Kanban" });

    new Setting(containerEl)
      .setName("Default columns")
      .setDesc("Comma-separated column names for new boards")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.defaultColumns.join(", "))
          .onChange(async (val) => {
            this.plugin.settings.defaultColumns = val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show subtask progress")
      .setDesc("Display completed/total count on cards with subtasks")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showSubtaskProgress)
          .onChange(async (val) => {
            this.plugin.settings.showSubtaskProgress = val;
            await this.plugin.saveSettings();
          })
      );
  }
}
