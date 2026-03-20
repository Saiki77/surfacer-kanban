import type { KanbanView } from "./kanban-view";

export function setupColumnDragDrop(
  columnCardsEl: HTMLElement,
  view: KanbanView
): void {
  columnCardsEl.addEventListener("dragover", (e: DragEvent) => {
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

function clearDropIndicators(): void {
  document
    .querySelectorAll(".kanban-drop-before")
    .forEach((el) => el.classList.remove("kanban-drop-before"));
  document
    .querySelectorAll(".kanban-drop-end")
    .forEach((el) => el.classList.remove("kanban-drop-end"));
}
