const STORAGE_KEY = "sideMemoDeskState";
const MAX_MEMO_SLOTS = 30;
const BACKUP_VERSION = 1;
const defaultState = {
  memos: [{ id: createId(), content: "" }],
  selectedMemoId: null,
  snippets: [],
  tasks: [],
  webLinks: []
};

const state = {
  data: structuredClone(defaultState),
  taskFilter: "all",
  memoSaveTimer: null
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
  snippetBody: document.querySelector("#snippet-body"),
  snippetList: document.querySelector("#snippet-list"),
  snippetTemplate: document.querySelector("#snippet-item-template"),
  webModal: document.querySelector("#web-modal"),
  webOpenModal: document.querySelector("#web-open-modal"),
  webModalClose: document.querySelector("#web-modal-close"),
  webForm: document.querySelector("#web-form"),
  webEditId: document.querySelector("#web-edit-id"),
  webTitle: document.querySelector("#web-title"),
  webUrl: document.querySelector("#web-url"),
  webList: document.querySelector("#web-list"),
  webTemplate: document.querySelector("#web-item-template"),
  taskForm: document.querySelector("#task-form"),
  taskInput: document.querySelector("#task-input"),
  taskList: document.querySelector("#task-list"),
  taskSummary: document.querySelector("#task-summary"),
  taskFilters: [...document.querySelectorAll(".filter-button")],
  taskTemplate: document.querySelector("#task-item-template")
};

document.addEventListener("DOMContentLoaded", init);

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

  elements.snippetOpenModal.addEventListener("click", () => openSnippetModal());
  elements.snippetModalClose.addEventListener("click", closeSnippetModal);
  elements.snippetModal.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-modal") {
      closeSnippetModal();
    }
  });
  elements.snippetForm.addEventListener("submit", handleSnippetSubmit);

  elements.webOpenModal.addEventListener("click", () => openWebModal());
  elements.webModalClose.addEventListener("click", closeWebModal);
  elements.webModal.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-web-modal") {
      closeWebModal();
    }
  });
  elements.webForm.addEventListener("submit", handleWebSubmit);

  elements.taskForm.addEventListener("submit", handleTaskSubmit);
  elements.taskFilters.forEach((button) => {
    button.addEventListener("click", () => {
      state.taskFilter = button.dataset.filter;
      renderTaskFilter();
      renderTasks();
    });
  });
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

  if (!Array.isArray(normalized.tasks)) {
    normalized.tasks = [];
  }

  if (!Array.isArray(normalized.webLinks)) {
    normalized.webLinks = [];
  }

  return normalized;
}

async function persistState(statusText) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state.data });
}

function renderAll() {
  renderMemoSlots();
  renderSnippets();
  renderWebLinks();
  renderTaskFilter();
  renderTasks();
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

  if (!title || !body) {
    return;
  }

  const editId = elements.snippetEditId.value;
  if (editId) {
    state.data.snippets = state.data.snippets.map((snippet) =>
      snippet.id === editId ? { ...snippet, title, body } : snippet
    );
  } else {
    state.data.snippets.unshift({
      id: createId(),
      title,
      body,
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
  elements.snippetList.innerHTML = "";

  if (state.data.snippets.length === 0) {
    elements.snippetList.append(createEmptyState("まだ定型文がありません。"));
    return;
  }

  state.data.snippets.forEach((snippet) => {
    const fragment = elements.snippetTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".item-card");
    const titleButton = fragment.querySelector(".snippet-title-button");
    const body = fragment.querySelector("p");
    const copyButtons = [...fragment.querySelectorAll('[data-action="copy"]')];
    const editButton = fragment.querySelector('[data-action="edit"]');
    const deleteButton = fragment.querySelector('[data-action="delete"]');

    titleButton.textContent = snippet.title;
    body.textContent = snippet.body;

    copyButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        await navigator.clipboard.writeText(snippet.body);
      });
    });

    editButton.addEventListener("click", () => {
      elements.snippetEditId.value = snippet.id;
      elements.snippetTitle.value = snippet.title;
      elements.snippetBody.value = snippet.body;
      switchTab("snippets");
      openSnippetModal("定型文を編集");
    });

    deleteButton.addEventListener("click", async () => {
      state.data.snippets = state.data.snippets.filter((item) => item.id !== snippet.id);
      await persistState();
      renderSnippets();
    });

    elements.snippetList.append(card);
  });
}

async function handleWebSubmit(event) {
  event.preventDefault();
  const title = elements.webTitle.value.trim();
  const url = normalizeUrl(elements.webUrl.value.trim());

  if (!title || !url) {
    return;
  }

  const editId = elements.webEditId.value;
  if (editId) {
    state.data.webLinks = state.data.webLinks.map((item) =>
      item.id === editId ? { ...item, title, url } : item
    );
  } else {
    state.data.webLinks.unshift({
      id: createId(),
      title,
      url,
      createdAt: Date.now()
    });
  }

  await persistState();
  closeWebModal();
  renderWebLinks();
}

function renderWebLinks() {
  elements.webList.innerHTML = "";

  if (state.data.webLinks.length === 0) {
    elements.webList.append(createEmptyState("まだWebリンクがありません。"));
    return;
  }

  state.data.webLinks.forEach((item) => {
    const fragment = elements.webTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".item-card");
    const titleButton = fragment.querySelector(".snippet-title-button");
    const body = fragment.querySelector("p");
    const openButtons = [...fragment.querySelectorAll('[data-action="open"]')];
    const editButton = fragment.querySelector('[data-action="edit"]');
    const deleteButton = fragment.querySelector('[data-action="delete"]');

    titleButton.textContent = item.title;
    body.textContent = item.url;

    openButtons.forEach((button) => {
      button.addEventListener("click", () => {
        openWebLink(item.url);
      });
    });

    editButton.addEventListener("click", () => {
      elements.webEditId.value = item.id;
      elements.webTitle.value = item.title;
      elements.webUrl.value = item.url;
      switchTab("web");
      openWebModal("Webを編集");
    });

    deleteButton.addEventListener("click", async () => {
      state.data.webLinks = state.data.webLinks.filter((webLink) => webLink.id !== item.id);
      await persistState();
      renderWebLinks();
    });

    elements.webList.append(card);
  });
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
    done: false,
    createdAt: Date.now()
  });

  await persistState();
  elements.taskForm.reset();
  renderTasks();
}

function renderTaskFilter() {
  elements.taskFilters.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.taskFilter);
  });
}

function renderTasks() {
  elements.taskList.innerHTML = "";

  const completedCount = state.data.tasks.filter((task) => task.done).length;
  if (elements.taskSummary) {
    elements.taskSummary.textContent = `${completedCount} / ${state.data.tasks.length} 完了`;
  }

  const visibleTasks = state.data.tasks.filter((task) => {
    if (state.taskFilter === "open") {
      return !task.done;
    }
    if (state.taskFilter === "done") {
      return task.done;
    }
    return true;
  });

  if (visibleTasks.length === 0) {
    const message = state.data.tasks.length === 0
      ? "まだタスクがありません。"
      : "この条件に当てはまるタスクはありません。";
    elements.taskList.append(createEmptyState(message));
    return;
  }

  visibleTasks.forEach((task) => {
    const fragment = elements.taskTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".task-row");
    const checkbox = fragment.querySelector('input[type="checkbox"]');
    const label = fragment.querySelector("span");
    const deleteButton = fragment.querySelector('[data-action="delete"]');

    row.classList.toggle("is-done", task.done);
    checkbox.checked = task.done;
    label.textContent = task.title;

    checkbox.addEventListener("change", async () => {
      task.done = checkbox.checked;
      await persistState();
      renderTasks();
    });

    deleteButton.addEventListener("click", async () => {
      state.data.tasks = state.data.tasks.filter((item) => item.id !== task.id);
      await persistState();
      renderTasks();
    });

    elements.taskList.append(row);
  });
}

function createEmptyState(message) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = message;
  return div;
}

function openSnippetModal(title = "定型文を登録") {
  document.querySelector("#snippet-modal-title").textContent = title;
  elements.snippetModal.hidden = false;
  elements.snippetTitle.focus();
}

function closeSnippetModal() {
  elements.snippetModal.hidden = true;
  resetSnippetForm();
}

function openWebModal(title = "Webを登録") {
  document.querySelector("#web-modal-title").textContent = title;
  elements.webModal.hidden = false;
  elements.webTitle.focus();
}

function closeWebModal() {
  elements.webModal.hidden = true;
  resetWebForm();
}

function resetWebForm() {
  elements.webForm.reset();
  elements.webEditId.value = "";
}

function normalizeUrl(value) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function openWebLink(url) {
  window.open(url, "_blank", "noopener,noreferrer");
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
