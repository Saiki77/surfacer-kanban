import { Plugin, TFile, MarkdownView, WorkspaceLeaf } from "obsidian";
import { KanbanView } from "./kanban-view";
import { KanbanSettings, DEFAULT_SETTINGS, VIEW_TYPE_KANBAN } from "./types";
import { KanbanSettingTab } from "./settings";

export default class SurfacerKanbanPlugin extends Plugin {
  settings!: KanbanSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_KANBAN,
      (leaf: WorkspaceLeaf) => new KanbanView(leaf, this)
    );

    // Intercept file opens — swap to kanban view if frontmatter has kanban: true
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file) this.tryActivateKanbanView(file);
      })
    );

    // Also check on layout-ready for files already open at startup
    this.app.workspace.onLayoutReady(() => {
      const file = this.app.workspace.getActiveFile();
      if (file) this.tryActivateKanbanView(file);
    });

    this.addCommand({
      id: "create-kanban-board",
      name: "Create new kanban board",
      callback: () => this.createNewBoard(),
    });

    this.addCommand({
      id: "toggle-kanban-view",
      name: "Toggle kanban / markdown view",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (checking) return true;
        this.toggleView();
        return true;
      },
    });

    this.addSettingTab(new KanbanSettingTab(this.app, this));
  }

  onunload(): void {
    // Views are automatically deregistered
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async tryActivateKanbanView(file: TFile): Promise<void> {
    if (file.extension !== "md") return;

    // Don't re-activate if already in kanban view
    const activeView = this.app.workspace.getActiveViewOfType(KanbanView);
    if (activeView && activeView.file?.path === file.path) return;

    const content = await this.app.vault.read(file);
    if (!this.hasKanbanFrontmatter(content)) return;

    const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!mdView || mdView.file?.path !== file.path) return;

    await mdView.leaf.setViewState({
      type: VIEW_TYPE_KANBAN,
      state: { file: file.path },
    });
  }

  private hasKanbanFrontmatter(content: string): boolean {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return false;
    return /^kanban:\s*true$/m.test(match[1]);
  }

  private async createNewBoard(): Promise<void> {
    const columns = this.settings.defaultColumns;
    let md = "---\nkanban: true\n---\n";
    for (const col of columns) {
      md += `\n## ${col}\n`;
    }

    const fileName = `Kanban Board ${Date.now()}.md`;
    const file = await this.app.vault.create(fileName, md);
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
  }

  private async toggleView(): Promise<void> {
    const kanbanView = this.app.workspace.getActiveViewOfType(KanbanView);
    if (kanbanView && kanbanView.file) {
      // Switch to markdown
      await kanbanView.leaf.setViewState({
        type: "markdown",
        state: { file: kanbanView.file.path, mode: "source" },
      });
      return;
    }

    const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (mdView && mdView.file) {
      const content = await this.app.vault.read(mdView.file);
      if (this.hasKanbanFrontmatter(content)) {
        await mdView.leaf.setViewState({
          type: VIEW_TYPE_KANBAN,
          state: { file: mdView.file.path },
        });
      }
    }
  }
}
