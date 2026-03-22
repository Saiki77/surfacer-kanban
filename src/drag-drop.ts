import type { KanbanView } from "./kanban-view";

export function setupColumnDragDrop(
  columnCardsEl: HTMLElement,
  view: KanbanView
): void {
  columnCardsEl.addEventListener("dragover", (e: DragEvent) => {
    // Ignore column drags inside card containers
    if (e.dataTransfer?.types.includes("application/kanban-column")) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";

    clearDropIndicators();
    const afterElement = getDragAfterElement(columnCardsEl, e.clientY);
    if (afterElement) {
      afterElement.classList.add("kanban-drop-before");
    } else {
      columnCardsEl.classList.add("kanban-drop-end");
    }
  });

  columnCardsEl.addEventListener("dragleave", () => {
    clearDropIndicators();
  });

  columnCardsEl.addEventListener("drop", (e: DragEvent) => {
    // Ignore column drags
    if (e.dataTransfer?.types.includes("application/kanban-column")) return;
    e.preventDefault();
    clearDropIndicators();

    const cardId = e.dataTransfer?.getData("text/plain");
    if (!cardId) return;

    const targetColumnId = columnCardsEl.dataset.columnId!;
    const afterElement = getDragAfterElement(columnCardsEl, e.clientY);

    let targetIndex: number;
    if (afterElement) {
      const afterCardId = afterElement.dataset.cardId!;
      const targetColumn = view.board!.columns.find(
        (c) => c.id === targetColumnId
      );
      targetIndex = targetColumn!.cards.findIndex((c) => c.id === afterCardId);
    } else {
      targetIndex = -1;
    }

    view.moveCard(cardId, targetColumnId, targetIndex);
  });
}

/** Setup drag-drop on the board element for reordering columns */
export function setupBoardColumnDragDrop(
  boardEl: HTMLElement,
  view: KanbanView
): void {
  boardEl.addEventListener("dragover", (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("application/kanban-column")) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";

    clearColumnDropIndicators();
    const afterElement = getDragAfterColumn(boardEl, e.clientX);
    if (afterElement) {
      afterElement.classList.add("kanban-column-drop-before");
    } else {
      // Drop at end — mark last column
      const cols = boardEl.querySelectorAll<HTMLElement>(
        ".kanban-column:not(.kanban-column-dragging)"
      );
      if (cols.length > 0) {
        cols[cols.length - 1].classList.add("kanban-column-drop-after");
      }
    }
  });

  boardEl.addEventListener("dragleave", (e: DragEvent) => {
    // Only clear if leaving the board itself
    if (e.currentTarget === e.target) {
      clearColumnDropIndicators();
    }
  });

  boardEl.addEventListener("drop", (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("application/kanban-column")) return;
    e.preventDefault();
    clearColumnDropIndicators();

    const columnId = e.dataTransfer?.getData("application/kanban-column");
    if (!columnId) return;

    const afterElement = getDragAfterColumn(boardEl, e.clientX);
    let targetIndex: number;
    if (afterElement) {
      const afterColId = afterElement.dataset.columnId!;
      targetIndex = view.board!.columns.findIndex((c) => c.id === afterColId);
    } else {
      targetIndex = -1; // append to end
    }

    view.moveColumn(columnId, targetIndex);
  });
}

function getDragAfterElement(
  container: HTMLElement,
  y: number
): HTMLElement | null {
  const cards = [
    ...container.querySelectorAll<HTMLElement>(
      ".kanban-card:not(.kanban-card-dragging)"
    ),
  ];

  return cards.reduce<{ offset: number; element: HTMLElement | null }>(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function getDragAfterColumn(
  board: HTMLElement,
  x: number
): HTMLElement | null {
  const columns = [
    ...board.querySelectorAll<HTMLElement>(
      ".kanban-column:not(.kanban-column-dragging)"
    ),
  ];

  return columns.reduce<{ offset: number; element: HTMLElement | null }>(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function clearDropIndicators(): void {
  document
    .querySelectorAll(".kanban-drop-before")
    .forEach((el) => el.classList.remove("kanban-drop-before"));
  document
    .querySelectorAll(".kanban-drop-end")
    .forEach((el) => el.classList.remove("kanban-drop-end"));
}

function clearColumnDropIndicators(): void {
  document
    .querySelectorAll(".kanban-column-drop-before")
    .forEach((el) => el.classList.remove("kanban-column-drop-before"));
  document
    .querySelectorAll(".kanban-column-drop-after")
    .forEach((el) => el.classList.remove("kanban-column-drop-after"));
}
