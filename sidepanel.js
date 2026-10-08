const STORAGE_KEY = "sideMemoDeskState";
const MAX_MEMO_SLOTS = 30;
const BACKUP_VERSION = 3;
const UNCATEGORIZED_ID = "uncategorized";

const defaultState = {
  memos: [{ id: createId(), content: "" }],
  selectedMemoId: null,
  snippets: [],
  snippetCategories: [],
  snippetCategoryVisibility: {},
  tasks: [],
  webLinks: [],
  webCategories: [],
  webCategoryVisibility: {}
};

const state = {
  data: structuredClone(defaultState),
  memoSaveTimer: null,
  webMode: "links",
  snippetMode: "snippets",
  categoryScope: "web"
};

const elements = {
  tabs: [...document.querySelectorAll(".tab-button")],
  panels: [...document.querySelectorAll(".panel")],
  memoSlotList: document.querySelector("#memo-slot-list"),
  memoAdd: document.querySelector("#memo-add"),
  memoRemove: document.querySelector("#memo-remove"),
  memoInput: document.querySelector("#memo-input"),
  backupExport: document.querySelector("#backup-export"),
  backupImport: document.querySelector("#backup-import"),
  backupFileInput: document.querySelector("#backup-file-input"),
  snippetModal: document.querySelector("#snippet-modal"),
  snippetOpenModal: document.querySelector("#snippet-open-modal"),
  snippetModalClose: document.querySelector("#snippet-modal-close"),
  snippetForm: document.querySelector("#snippet-form"),
  snippetEditId: document.querySelector("#snippet-edit-id"),
  snippetTitle: document.querySelector("#snippet-title"),
  snippetCategory: document.querySelector("#snippet-category"),
  snippetModeToggle: document.querySelector("#snippet-mode-toggle"),
  snippetBody: document.querySelector("#snippet-body"),
  snippetList: document.querySelector("#snippet-list"),
  snippetTemplate: document.querySelector("#snippet-item-template"),
  webModeToggle: document.querySelector("#web-mode-toggle"),
  webModal: document.querySelector("#web-modal"),
  webOpenModal: document.querySelector("#web-open-modal"),
  webModalClose: document.querySelector("#web-modal-close"),
  webForm: document.querySelector("#web-form"),
  webEditId: document.querySelector("#web-edit-id"),
  webTitle: document.querySelector("#web-title"),
  webCategory: document.querySelector("#web-category"),
  webUrl: document.querySelector("#web-url"),
  webList: document.querySelector("#web-list"),
  linkTemplate: document.querySelector("#link-item-template"),
  categoryModal: document.querySelector("#category-modal"),
  categoryModalClose: document.querySelector("#category-modal-close"),
  categoryForm: document.querySelector("#category-form"),
  categoryEditId: document.querySelector("#category-edit-id"),
  categoryName: document.querySelector("#category-name"),
  categoryDefaultExpandedRow: document.querySelector("#category-default-expanded-row"),
  categoryDefaultExpanded: document.querySelector("#category-default-expanded"),
  deleteConfirmModal: document.querySelector("#delete-confirm-modal"),
  deleteConfirmClose: document.querySelector("#delete-confirm-close"),
  deleteConfirmMessage: document.querySelector("#delete-confirm-message"),
  deleteConfirmCancel: document.querySelector("#delete-confirm-cancel"),
  deleteConfirmSubmit: document.querySelector("#delete-confirm-submit"),
  taskForm: document.querySelector("#task-form"),
  taskInput: document.querySelector("#task-input"),
  taskList: document.querySelector("#task-list"),
  taskTemplate: document.querySelector("#task-item-template")
};

document.addEventListener("DOMContentLoaded", init);

let deleteConfirmResolver = null;

async function init() {
  bindEvents();
  await loadState();
  renderAll();
}

function bindEvents() {
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  elements.memoInput.addEventListener("input", handleMemoInput);
  elements.memoAdd.addEventListener("click", handleMemoAdd);
  elements.memoRemove.addEventListener("click", handleMemoRemove);
  elements.backupExport.addEventListener("click", handleBackupExport);
  elements.backupImport.addEventListener("click", () => elements.backupFileInput.click());
  elements.backupFileInput.addEventListener("change", handleBackupImport);

  elements.snippetModeToggle.addEventListener("click", () => {
    state.snippetMode = state.snippetMode === "snippets" ? "categories" : "snippets";
    renderSnippets();
  });
  elements.snippetOpenModal.addEventListener("click", () => {
    if (state.snippetMode === "categories") {
      openCategoryModal("カテゴリを追加", "snippet");
      return;
    }
    openSnippetModal();
  });
  elements.snippetModalClose.addEventListener("click", closeSnippetModal);
  elements.snippetModal.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-modal") {
      closeSnippetModal();
    }
  });
  elements.snippetForm.addEventListener("submit", handleSnippetSubmit);

  elements.webModeToggle.addEventListener("click", () => {
    state.webMode = state.webMode === "links" ? "categories" : "links";
    renderWebPanel();
  });
  elements.webOpenModal.addEventListener("click", () => {
    if (state.webMode === "categories") {
      openCategoryModal();
      return;
    }
    openWebModal();
  });
  elements.webModalClose.addEventListener("click", closeWebModal);
  elements.webModal.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-web-modal") {
      closeWebModal();
    }
  });
  elements.webForm.addEventListener("submit", handleWebSubmit);

  elements.categoryModalClose.addEventListener("click", closeCategoryModal);
  elements.categoryModal.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-category-modal") {
      closeCategoryModal();
    }
  });
  elements.categoryForm.addEventListener("submit", handleCategorySubmit);

  elements.deleteConfirmClose.addEventListener("click", () => resolveDeleteConfirm(false));
  elements.deleteConfirmCancel.addEventListener("click", () => resolveDeleteConfirm(false));
  elements.deleteConfirmSubmit.addEventListener("click", () => resolveDeleteConfirm(true));
  elements.deleteConfirmModal.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-delete-modal") {
      resolveDeleteConfirm(false);
    }
  });

  elements.taskForm.addEventListener("submit", handleTaskSubmit);
}

async function loadState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  state.data = normalizeState(result[STORAGE_KEY] || {});
}

function normalizeState(savedState) {
  const normalized = {
    ...structuredClone(defaultState),
    ...savedState
  };

  if (!Array.isArray(normalized.memos) || normalized.memos.length === 0) {
    const migratedContent = typeof savedState.memo === "string" ? savedState.memo : "";
    normalized.memos = [{ id: createId(), content: migratedContent }];
  }

  normalized.memos = normalized.memos
    .filter((memo) => memo && typeof memo.content === "string")
    .map((memo) => ({
      id: memo.id || createId(),
      content: memo.content
    }));

  if (normalized.memos.length === 0) {
    normalized.memos = [{ id: createId(), content: "" }];
  }

  if (!normalized.selectedMemoId || !normalized.memos.some((memo) => memo.id === normalized.selectedMemoId)) {
    normalized.selectedMemoId = normalized.memos[0].id;
  }

  if (!Array.isArray(normalized.snippets)) {
    normalized.snippets = [];
  }
  normalized.snippetCategories = normalizeCategoryList(normalized.snippetCategories).map((category) => ({
    ...category,
    defaultExpanded: false
  }));
  const snippetCategoryIds = new Set(normalized.snippetCategories.map((category) => category.id));
  normalized.snippets = normalized.snippets
    .filter((item) => item && typeof item.title === "string" && typeof item.body === "string")
    .map((item) => ({
      ...item,
      id: item.id || createId(),
      categoryId: snippetCategoryIds.has(item.categoryId) ? item.categoryId : UNCATEGORIZED_ID
    }));
  normalized.snippetCategoryVisibility = normalizeCategoryVisibility(
    normalized.snippetCategoryVisibility,
    normalized.snippetCategories,
    false
  );

  if (!Array.isArray(normalized.tasks)) {
    normalized.tasks = [];
  }

  normalized.tasks = normalized.tasks
    .filter((task) => task && typeof task.title === "string")
    .map((task) => ({
      id: task.id || createId(),
      title: task.title,
      createdAt: task.createdAt || Date.now()
    }));

  normalized.webCategories = normalizeCategoryList(normalized.webCategories).map((category) => ({
    ...category,
    defaultExpanded: false
  }));
  normalized.webLinks = normalizeLinkList(normalized.webLinks, normalized.webCategories);
  normalized.webCategoryVisibility = normalizeCategoryVisibility(
    normalized.webCategoryVisibility,
    normalized.webCategories,
    false
  );

  return normalized;
}

function normalizeCategoryList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .filter((item) => item && typeof item.name === "string")
    .map((item) => ({
      id: item.id || createId(),
      name: item.name.trim(),
      defaultExpanded: item.defaultExpanded !== false,
      createdAt: item.createdAt || Date.now()
    }))
    .filter((item) => item.name && item.id !== UNCATEGORIZED_ID);
}

function normalizeLinkList(list, categories = state.data.webCategories) {
  if (!Array.isArray(list)) {
    return [];
  }

  const categoryIds = new Set(categories.map((category) => category.id));

  return list
    .filter((item) => item && typeof item.title === "string" && typeof item.url === "string")
    .map((item) => ({
      id: item.id || createId(),
      title: item.title,
      url: item.url,
      categoryId: item.categoryId && categoryIds.has(item.categoryId) ? item.categoryId : UNCATEGORIZED_ID,
      createdAt: item.createdAt || Date.now()
    }));
}

function normalizeCategoryVisibility(visibility, categories = [], uncategorizedExpanded = true) {
  const nextVisibility = {};

  [UNCATEGORIZED_ID, ...categories.map((category) => category.id)].forEach((categoryId) => {
    const category = categories.find((item) => item.id === categoryId);
    const defaultExpanded = category ? category.defaultExpanded !== false : uncategorizedExpanded;
    nextVisibility[categoryId] = defaultExpanded;
  });

  return nextVisibility;
}

function getAllCategories(scope = "web") {
  return [
    { id: UNCATEGORIZED_ID, name: "未分類", fixed: true },
    ...state.data[`${scope}Categories`]
  ];
}

function getCategoryName(categoryId) {
  return getAllCategories().find((category) => category.id === categoryId)?.name || "未分類";
}

function getLinksForCategory(categoryId, scope = "web") {
  const items = state.data[scope === "snippet" ? "snippets" : "webLinks"];
  return items.filter((item) => (item.categoryId || UNCATEGORIZED_ID) === categoryId);
}

function isCategoryExpanded(categoryId) {
  return state.data.webCategoryVisibility?.[categoryId] !== false;
}

async function persistState() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state.data });
}

function renderAll() {
  renderMemoSlots();
  renderWebCategoryOptions("snippet");
  renderSnippets();
  renderTasks();
  renderWebCategoryOptions();
  renderWebPanel();
}

function switchTab(tabName) {
  elements.tabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });

  elements.panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });
}

function getSelectedMemo() {
  return state.data.memos.find((memo) => memo.id === state.data.selectedMemoId) || state.data.memos[0];
}

function renderMemoSlots() {
  elements.memoSlotList.innerHTML = "";

  state.data.memos.forEach((memo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memo-slot-button";
    if (memo.id === state.data.selectedMemoId) {
      button.classList.add("is-active");
    }
    button.textContent = String(index + 1);
    button.addEventListener("click", () => {
      state.data.selectedMemoId = memo.id;
      renderMemoSlots();
    });
    elements.memoSlotList.append(button);
  });

  const selectedMemo = getSelectedMemo();
  elements.memoInput.value = selectedMemo ? selectedMemo.content : "";
  elements.memoRemove.disabled = state.data.memos.length === 1;
}

function handleMemoInput(event) {
  const selectedMemo = getSelectedMemo();
  if (!selectedMemo) {
    return;
  }

  selectedMemo.content = event.target.value;
  clearTimeout(state.memoSaveTimer);
  state.memoSaveTimer = setTimeout(async () => {
    state.memoSaveTimer = null;
    await persistState();
  }, 250);
}

async function handleMemoAdd() {
  if (state.data.memos.length >= MAX_MEMO_SLOTS) {
    return;
  }

  const newMemo = { id: createId(), content: "" };
  state.data.memos.push(newMemo);
  state.data.selectedMemoId = newMemo.id;
  await persistState();
  renderMemoSlots();
  elements.memoInput.focus();
}

async function handleMemoRemove() {
  if (state.data.memos.length === 1) {
    return;
  }

  const shouldDelete = await confirmDelete("選択中のメモを削除しますか？");
  if (!shouldDelete) {
    return;
  }

  const currentIndex = state.data.memos.findIndex((memo) => memo.id === state.data.selectedMemoId);
  state.data.memos = state.data.memos.filter((memo) => memo.id !== state.data.selectedMemoId);
  const nextIndex = Math.max(0, currentIndex - 1);
  state.data.selectedMemoId = state.data.memos[nextIndex].id;
  await persistState();
  renderMemoSlots();
}

async function handleSnippetSubmit(event) {
  event.preventDefault();
  const title = elements.snippetTitle.value.trim();
  const body = elements.snippetBody.value.trim();
  const categoryId = getValidCategoryId(elements.snippetCategory.value, "snippet");

  if (!title || !body) {
    return;
  }

  const editId = elements.snippetEditId.value;
  if (editId) {
    state.data.snippets = state.data.snippets.map((snippet) =>
      snippet.id === editId ? { ...snippet, title, body, categoryId } : snippet
    );
  } else {
    state.data.snippets.unshift({
      id: createId(),
      title,
      body,
      categoryId,
      createdAt: Date.now()
    });
  }

  await persistState();
  closeSnippetModal();
  renderSnippets();
}

function resetSnippetForm() {
  elements.snippetForm.reset();
  elements.snippetEditId.value = "";
}

function renderSnippets() {
  elements.snippetModeToggle.textContent = state.snippetMode === "snippets" ? "カテゴリ一覧" : "コピペ一覧へ戻る";
  elements.snippetOpenModal.setAttribute("aria-label", state.snippetMode === "snippets" ? "コピペを追加" : "カテゴリを追加");
  if (state.snippetMode === "categories") {
    renderWebCategories("snippet");
    return;
  }
  elements.snippetList.innerHTML = "";

  if (state.data.snippets.length === 0) {
    elements.snippetList.append(createEmptyState("まだコピペがありません。"));
    return;
  }

  const categories = getAllCategories("snippet")
    .filter((category) => getLinksForCategory(category.id, "snippet").length > 0)
    .sort((left, right) => (left.id === UNCATEGORIZED_ID ? 1 : right.id === UNCATEGORIZED_ID ? -1 : 0));
  categories.forEach((category) => {
    const items = getLinksForCategory(category.id, "snippet");
    const isExpanded = state.data.snippetCategoryVisibility[category.id] !== false;
    elements.snippetList.append(createGroupHeader(category, items.length, isExpanded, "snippet"));
    if (!isExpanded) return;
    items.forEach((snippet, index) => {
      const fragment = elements.snippetTemplate.content.cloneNode(true);
      const row = fragment.querySelector(".snippet-row");
      const titleButton = fragment.querySelector(".snippet-row__title");
      const body = fragment.querySelector(".snippet-row__body");
      const editButton = fragment.querySelector('[data-action="edit"]');
      const moveUpButton = fragment.querySelector('[data-action="move-up"]');
      const moveDownButton = fragment.querySelector('[data-action="move-down"]');
      const deleteButton = fragment.querySelector('[data-action="delete"]');

      titleButton.textContent = snippet.title;
      titleButton.title = snippet.title;
      body.textContent = snippet.body;
      body.title = snippet.body;
      moveUpButton.disabled = index === 0;
      moveDownButton.disabled = index === items.length - 1;

      titleButton.addEventListener("click", async () => {
        await navigator.clipboard.writeText(snippet.body);
      });

      editButton.addEventListener("click", () => {
        elements.snippetEditId.value = snippet.id;
        elements.snippetTitle.value = snippet.title;
        elements.snippetBody.value = snippet.body;
        renderWebCategoryOptions("snippet");
        elements.snippetCategory.value = getValidCategoryId(snippet.categoryId, "snippet");
        switchTab("snippets");
        openSnippetModal("コピペを編集");
      });

      moveUpButton.addEventListener("click", async () => {
        await moveSnippetWithinCategory(items, index, index - 1);
        renderSnippets();
      });

      moveDownButton.addEventListener("click", async () => {
        await moveSnippetWithinCategory(items, index, index + 1);
        renderSnippets();
      });

      deleteButton.addEventListener("click", async () => {
        const shouldDelete = await confirmDelete(`「${snippet.title}」を削除しますか？`);
        if (!shouldDelete) {
          return;
        }

        state.data.snippets = state.data.snippets.filter((item) => item.id !== snippet.id);
        await persistState();
        renderSnippets();
      });

      elements.snippetList.append(row);
    });
  });
}

async function moveSnippetWithinCategory(items, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= items.length) return;
  const from = state.data.snippets.findIndex((item) => item.id === items[fromIndex].id);
  const to = state.data.snippets.findIndex((item) => item.id === items[toIndex].id);
  [state.data.snippets[from], state.data.snippets[to]] = [state.data.snippets[to], state.data.snippets[from]];
  await persistState();
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  const title = elements.taskInput.value.trim();
  if (!title) {
    return;
  }

  state.data.tasks.unshift({
    id: createId(),
    title,
    createdAt: Date.now()
  });

  await persistState();
  elements.taskForm.reset();
  renderTasks();
}

function renderTasks() {
  elements.taskList.innerHTML = "";

  if (state.data.tasks.length === 0) {
    elements.taskList.append(createEmptyState("まだタスクがありません。"));
    return;
  }

  state.data.tasks.forEach((task, index) => {
    const fragment = elements.taskTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".task-row");
    const label = fragment.querySelector(".task-row__label");
    const moveUpButton = fragment.querySelector('[data-action="move-up"]');
    const moveDownButton = fragment.querySelector('[data-action="move-down"]');
    const deleteButton = fragment.querySelector('[data-action="delete"]');

    label.textContent = task.title;
    moveUpButton.disabled = index === 0;
    moveDownButton.disabled = index === state.data.tasks.length - 1;

    moveUpButton.addEventListener("click", async () => {
      await moveListItem("tasks", index, index - 1);
      renderTasks();
    });

    moveDownButton.addEventListener("click", async () => {
      await moveListItem("tasks", index, index + 1);
      renderTasks();
    });

    deleteButton.addEventListener("click", async () => {
      const shouldDelete = await confirmDelete(`「${task.title}」を削除しますか？`);
      if (!shouldDelete) {
        return;
      }

      state.data.tasks = state.data.tasks.filter((item) => item.id !== task.id);
      await persistState();
      renderTasks();
    });

    elements.taskList.append(card);
  });
}

async function handleWebSubmit(event) {
  event.preventDefault();
  const title = elements.webTitle.value.trim();
  const url = normalizeWebTarget(elements.webUrl.value.trim());
  const categoryId = getValidCategoryId(elements.webCategory.value);

  if (!title || !url) {
    return;
  }

  const editId = elements.webEditId.value;
  if (editId) {
    state.data.webLinks = state.data.webLinks.map((item) =>
      item.id === editId ? { ...item, title, url, categoryId } : item
    );
  } else {
    state.data.webLinks.unshift({
      id: createId(),
      title,
      url,
      categoryId,
      createdAt: Date.now()
    });
  }

  await persistState();
  closeWebModal();
  renderWebPanel();
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  const scope = state.categoryScope;
  const name = elements.categoryName.value.trim();
  const defaultExpanded = false;
  if (!name) {
    return;
  }

  const editId = elements.categoryEditId.value;
  if (editId) {
    state.data[`${scope}Categories`] = state.data[`${scope}Categories`].map((category) =>
      category.id === editId ? { ...category, name, defaultExpanded } : category
    );
    state.data[`${scope}CategoryVisibility`][editId] = defaultExpanded;
  } else {
    const id = createId();
    state.data[`${scope}Categories`].push({
      id,
      name,
      defaultExpanded,
      createdAt: Date.now()
    });
    state.data[`${scope}CategoryVisibility`][id] = defaultExpanded;
  }

  await persistState();
  closeCategoryModal();
  renderWebCategoryOptions(scope);
  renderCategoryPanel(scope);
}

function renderWebCategoryOptions(scope = "web") {
  const select = elements[`${scope}Category`];
  const selectedValue = getValidCategoryId(select.value, scope);
  select.innerHTML = "";

  getAllCategories(scope).forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.append(option);
  });

  select.value = selectedValue;
}

function renderCategoryPanel(scope) {
  if (scope === "snippet") renderSnippets();
  else renderWebPanel();
}

function renderWebPanel() {
  elements.webModeToggle.textContent = state.webMode === "links" ? "カテゴリ一覧" : "Web一覧へ戻る";
  elements.webOpenModal.setAttribute("aria-label", state.webMode === "links" ? "Webを追加" : "カテゴリを追加");

  if (state.webMode === "categories") {
    renderWebCategories();
    return;
  }

  renderWebLinks();
}

function renderWebLinks() {
  elements.webList.innerHTML = "";

  if (state.data.webLinks.length === 0) {
    elements.webList.append(createEmptyState("まだWebリンクがありません。"));
    return;
  }

  const categories = getAllCategories()
    .filter((category) => getLinksForCategory(category.id).length > 0)
    .sort((left, right) => {
      if (left.id === UNCATEGORIZED_ID) {
        return 1;
      }
      if (right.id === UNCATEGORIZED_ID) {
        return -1;
      }
      return 0;
    });

  categories.forEach((category) => {
    const items = getLinksForCategory(category.id);
    const isExpanded = isCategoryExpanded(category.id);
    elements.webList.append(createGroupHeader(category, items.length, isExpanded));

    if (!isExpanded) {
      return;
    }

    items.forEach((item) => {
      const absoluteIndex = state.data.webLinks.findIndex((entry) => entry.id === item.id);
      const fragment = elements.linkTemplate.content.cloneNode(true);
      const row = fragment.querySelector(".web-link-row");
      const titleButton = fragment.querySelector(".web-link-row__title");
      const urlText = fragment.querySelector(".web-link-row__url");
      const editButton = fragment.querySelector('[data-action="edit"]');
      const moveUpButton = fragment.querySelector('[data-action="move-up"]');
      const moveDownButton = fragment.querySelector('[data-action="move-down"]');
      const deleteButton = fragment.querySelector('[data-action="delete"]');

      titleButton.textContent = item.title;
      titleButton.title = item.title;
      urlText.textContent = item.url;
      urlText.title = item.url;
      moveUpButton.disabled = absoluteIndex === 0;
      moveDownButton.disabled = absoluteIndex === state.data.webLinks.length - 1;

      titleButton.addEventListener("click", async () => {
        await openLinkTarget(item.url);
      });

      editButton.addEventListener("click", () => {
        elements.webEditId.value = item.id;
        elements.webTitle.value = item.title;
        elements.webUrl.value = item.url;
        renderWebCategoryOptions();
        elements.webCategory.value = getValidCategoryId(item.categoryId);
        switchTab("web");
        openWebModal("Webを編集");
      });

      moveUpButton.addEventListener("click", async () => {
        await moveListItem("webLinks", absoluteIndex, absoluteIndex - 1);
        renderWebPanel();
      });

      moveDownButton.addEventListener("click", async () => {
        await moveListItem("webLinks", absoluteIndex, absoluteIndex + 1);
        renderWebPanel();
      });

      deleteButton.addEventListener("click", async () => {
        const shouldDelete = await confirmDelete(`「${item.title}」を削除しますか？`);
        if (!shouldDelete) {
          return;
        }

        state.data.webLinks = state.data.webLinks.filter((webLink) => webLink.id !== item.id);
        await persistState();
        renderWebPanel();
      });

      elements.webList.append(row);
    });
  });
}

function renderWebCategories(scope = "web") {
  const list = elements[`${scope}List`];
  list.innerHTML = "";

  if (state.data[`${scope}Categories`].length === 0) {
    list.append(createEmptyState("まだカテゴリがありません。"));
  } else {
    state.data[`${scope}Categories`].forEach((category, index) => {
      list.append(createCategoryRow(category, index, state.data[`${scope}Categories`].length, false, scope));
    });
  }

  const uncategorizedRow = createCategoryRow(
    { id: UNCATEGORIZED_ID, name: "未分類", fixed: true },
    0,
    1,
    true,
    scope
  );
  list.append(uncategorizedRow);
}

function createCategoryRow(category, index, total, isFixed, scope = "web") {
  const article = document.createElement("article");
  article.className = "task-row category-row";

  const labelWrap = document.createElement("div");
  labelWrap.className = "category-row__label-wrap";

  const label = document.createElement("span");
  label.className = "task-row__label";
  label.textContent = category.name;
  labelWrap.append(label);

  const sub = document.createElement("span");
  sub.className = "category-row__meta";
  sub.textContent = isFixed
    ? `${getLinksForCategory(category.id, scope).length}件 / 固定`
    : `${getLinksForCategory(category.id, scope).length}件 / 初期: ${category.defaultExpanded === false ? "閉" : "開"}`;
  labelWrap.append(sub);

  const actions = document.createElement("div");
  actions.className = "task-row__actions";

  if (!isFixed) {
    const editButton = createIconButton("編", "編集", async () => {
      elements.categoryEditId.value = category.id;
      elements.categoryName.value = category.name;
      elements.categoryDefaultExpanded.checked = category.defaultExpanded !== false;
      openCategoryModal("カテゴリを編集", scope);
    });

    const moveUpButton = createIconButton("↑", "上へ移動", async () => {
      await moveListItem(`${scope}Categories`, index, index - 1);
      renderWebCategoryOptions(scope);
      renderCategoryPanel(scope);
    });
    moveUpButton.disabled = index === 0;

    const moveDownButton = createIconButton("↓", "下へ移動", async () => {
      await moveListItem(`${scope}Categories`, index, index + 1);
      renderWebCategoryOptions(scope);
      renderCategoryPanel(scope);
    });
    moveDownButton.disabled = index === total - 1;

    const deleteButton = createIconButton("×", "削除", async () => {
      const shouldDelete = await confirmDelete(`「${category.name}」を削除しますか？\n紐づく${scope === "snippet" ? "コピペ" : "Web"}は未分類へ移動します。`);
      if (!shouldDelete) {
        return;
      }

      state.data[`${scope}Categories`] = state.data[`${scope}Categories`].filter((item) => item.id !== category.id);
      state.data[scope === "snippet" ? "snippets" : "webLinks"] = state.data[scope === "snippet" ? "snippets" : "webLinks"].map((item) =>
        item.categoryId === category.id ? { ...item, categoryId: UNCATEGORIZED_ID } : item
      );
      delete state.data[`${scope}CategoryVisibility`][category.id];
      await persistState();
      renderWebCategoryOptions(scope);
      renderCategoryPanel(scope);
    }, true);

    actions.append(editButton, moveUpButton, moveDownButton, deleteButton);
  }

  article.append(labelWrap, actions);
  return article;
}

function createIconButton(label, ariaLabel, onClick, isDanger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-letter-button${isDanger ? " icon-letter-button--danger" : ""}`;
  button.setAttribute("aria-label", ariaLabel);
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createGroupHeader(category, count, isExpanded, scope = "web") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "group-header";
  button.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  button.title = `${count}件`;

  const titleWrap = document.createElement("span");
  titleWrap.className = "group-header__main";

  const toggle = document.createElement("span");
  toggle.className = "group-header__toggle";
  toggle.textContent = isExpanded ? "−" : "+";

  const titleSpan = document.createElement("span");
  titleSpan.className = "group-header__title";
  titleSpan.textContent = category.name;

  titleWrap.append(toggle, titleSpan);
  button.append(titleWrap);
  button.addEventListener("click", async () => {
    state.data[`${scope}CategoryVisibility`][category.id] = !isExpanded;
    await persistState();
    renderCategoryPanel(scope);
  });

  return button;
}

function createEmptyState(message) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = message;
  return div;
}

async function moveListItem(key, fromIndex, toIndex) {
  const list = state.data[key];
  if (!Array.isArray(list) || fromIndex === toIndex || toIndex < 0 || toIndex >= list.length) {
    return;
  }

  const [item] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, item);
  await persistState();
}

function openSnippetModal(title = "コピペを追加") {
  renderWebCategoryOptions("snippet");
  if (!elements.snippetEditId.value) {
    elements.snippetCategory.value = UNCATEGORIZED_ID;
  }
  document.querySelector("#snippet-modal-title").textContent = title;
  elements.snippetModal.hidden = false;
  elements.snippetTitle.focus();
}

function closeSnippetModal() {
  elements.snippetModal.hidden = true;
  resetSnippetForm();
}

function openWebModal(title = "Webを追加") {
  document.querySelector("#web-modal-title").textContent = title;
  renderWebCategoryOptions();
  if (!elements.webEditId.value) {
    elements.webCategory.value = UNCATEGORIZED_ID;
  }
  elements.webModal.hidden = false;
  elements.webTitle.focus();
}

function closeWebModal() {
  elements.webModal.hidden = true;
  resetWebForm();
}

function openCategoryModal(title = "カテゴリを追加", scope = "web") {
  state.categoryScope = scope;
  elements.categoryDefaultExpandedRow.hidden = true;
  document.querySelector("#category-default-expanded-label").textContent =
    `${scope === "snippet" ? "コピペ" : "Web"}一覧では初期表示で開く`;
  document.querySelector("#category-modal-title").textContent = title;
  elements.categoryModal.hidden = false;
  elements.categoryName.focus();
}

function closeCategoryModal() {
  elements.categoryModal.hidden = true;
  resetCategoryForm();
}

function confirmDelete(message) {
  if (deleteConfirmResolver) {
    resolveDeleteConfirm(false);
  }

  elements.deleteConfirmMessage.textContent = message;
  elements.deleteConfirmModal.hidden = false;

  return new Promise((resolve) => {
    deleteConfirmResolver = resolve;
  });
}

function resolveDeleteConfirm(result) {
  if (!deleteConfirmResolver) {
    return;
  }

  const resolve = deleteConfirmResolver;
  deleteConfirmResolver = null;
  elements.deleteConfirmModal.hidden = true;
  resolve(result);
}

function resetWebForm() {
  elements.webForm.reset();
  elements.webEditId.value = "";
  renderWebCategoryOptions();
  elements.webCategory.value = UNCATEGORIZED_ID;
}

function resetCategoryForm() {
  elements.categoryForm.reset();
  elements.categoryEditId.value = "";
  elements.categoryDefaultExpanded.checked = true;
}

function getValidCategoryId(categoryId, scope = "web") {
  return getAllCategories(scope).some((category) => category.id === categoryId) ? categoryId : UNCATEGORIZED_ID;
}

function normalizeWebTarget(value) {
  if (!value) {
    return "";
  }

  if (/^file:\/\/\/.+\.html?$/i.test(value)) {
    return value;
  }

  if (/^[A-Za-z]:[\\/].+\.html?$/i.test(value)) {
    return `file:///${value.replace(/\\/g, "/")}`;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

async function openLinkTarget(url) {
  try {
    await chrome.tabs.create({ url });
  } catch (error) {
    console.error("Failed to open link target", error);
    const isFileUrl = /^file:\/\//i.test(url);
    window.alert(
      isFileUrl
        ? "起動に失敗しました。ローカル HTML を使う場合は、この拡張の設定画面で「ファイルの URL へのアクセス」を許可してください。"
        : "起動に失敗しました。URL の形式を確認してください。"
    );
  }
}

async function flushPendingMemoSave() {
  if (!state.memoSaveTimer) {
    return;
  }

  clearTimeout(state.memoSaveTimer);
  state.memoSaveTimer = null;
  await persistState();
}

async function handleBackupExport() {
  await flushPendingMemoSave();

  const backup = {
    app: "side-memo-task-extension",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state.data
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = createBackupFilename();
  link.click();
  URL.revokeObjectURL(url);
}

async function handleBackupImport(event) {
  const [file] = event.target.files || [];
  event.target.value = "";

  if (!file) {
    return;
  }

  const shouldRestore = window.confirm("現在のデータを上書きして復元します。よろしいですか？");
  if (!shouldRestore) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const backupData = extractBackupData(parsed);
    state.data = normalizeState(backupData);
    await persistState();
    renderAll();
  } catch (error) {
    console.error("Failed to import backup", error);
    window.alert("バックアップの読み込みに失敗しました。JSONファイルを確認してください。");
  }
}

function extractBackupData(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid backup payload");
  }

  if ("data" in parsed && parsed.data && typeof parsed.data === "object") {
    return parsed.data;
  }

  return parsed;
}

function createBackupFilename() {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `side-memo-backup-${iso}.json`;
}

function createId() {
  return crypto.randomUUID();
}
