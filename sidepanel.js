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
  linkTemplate: document.querySelector("#link-item-template"),
  taskForm: document.querySelector("#task-form"),
  taskInput: document.querySelector("#task-input"),
  taskList: document.querySelector("#task-list"),
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

  normalized.tasks = normalized.tasks
    .filter((task) => task && typeof task.title === "string")
    .map((task) => ({
      id: task.id || createId(),
      title: task.title,
      createdAt: task.createdAt || Date.now()
    }));

  normalized.webLinks = normalizeLinkList(normalized.webLinks);

  return normalized;
}

function normalizeLinkList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .filter((item) => item && typeof item.title === "string" && typeof item.url === "string")
    .map((item) => ({
      id: item.id || createId(),
      title: item.title,
      url: item.url,
      createdAt: item.createdAt || Date.now()
    }));
}

async function persistState() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state.data });
}

function renderAll() {
  renderMemoSlots();
  renderSnippets();
  renderTasks();
  renderWebLinks();
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

  const shouldDelete = window.confirm("選択中のメモを削除しますか？");
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

  state.data.snippets.forEach((snippet, index) => {
    const fragment = elements.snippetTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".item-card");
    const titleButton = fragment.querySelector(".snippet-title-button");
    const body = fragment.querySelector("p");
    const editButton = fragment.querySelector('[data-action="edit"]');
    const moveUpButton = fragment.querySelector('[data-action="move-up"]');
    const moveDownButton = fragment.querySelector('[data-action="move-down"]');
    const deleteButton = fragment.querySelector('[data-action="delete"]');

    titleButton.textContent = snippet.title;
    body.textContent = snippet.body;
    moveUpButton.disabled = index === 0;
    moveDownButton.disabled = index === state.data.snippets.length - 1;

    titleButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(snippet.body);
    });

    editButton.addEventListener("click", () => {
      elements.snippetEditId.value = snippet.id;
      elements.snippetTitle.value = snippet.title;
      elements.snippetBody.value = snippet.body;
      switchTab("snippets");
      openSnippetModal("定型文を編集");
    });

    moveUpButton.addEventListener("click", async () => {
      await moveListItem("snippets", index, index - 1);
      renderSnippets();
    });

    moveDownButton.addEventListener("click", async () => {
      await moveListItem("snippets", index, index + 1);
      renderSnippets();
    });

    deleteButton.addEventListener("click", async () => {
      state.data.snippets = state.data.snippets.filter((item) => item.id !== snippet.id);
      await persistState();
      renderSnippets();
    });

    elements.snippetList.append(card);
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

  state.data.webLinks.forEach((item, index) => {
    const fragment = elements.linkTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".item-card");
    const titleButton = fragment.querySelector(".snippet-title-button");
    const body = fragment.querySelector("p");
    const editButton = fragment.querySelector('[data-action="edit"]');
    const moveUpButton = fragment.querySelector('[data-action="move-up"]');
    const moveDownButton = fragment.querySelector('[data-action="move-down"]');
    const deleteButton = fragment.querySelector('[data-action="delete"]');

    titleButton.textContent = item.title;
    body.textContent = item.url;
    moveUpButton.disabled = index === 0;
    moveDownButton.disabled = index === state.data.webLinks.length - 1;

    titleButton.addEventListener("click", async () => {
      await openLinkTarget(item.url);
    });

    editButton.addEventListener("click", () => {
      elements.webEditId.value = item.id;
      elements.webTitle.value = item.title;
      elements.webUrl.value = item.url;
      switchTab("web");
      openWebModal("Webを編集");
    });

    moveUpButton.addEventListener("click", async () => {
      await moveListItem("webLinks", index, index - 1);
      renderWebLinks();
    });

    moveDownButton.addEventListener("click", async () => {
      await moveListItem("webLinks", index, index + 1);
      renderWebLinks();
    });

    deleteButton.addEventListener("click", async () => {
      state.data.webLinks = state.data.webLinks.filter((webLink) => webLink.id !== item.id);
      await persistState();
      renderWebLinks();
    });

    elements.webList.append(card);
  });
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

function openSnippetModal(title = "定型文を追加") {
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
        ? "起動に失敗しました。ローカル HTML を使う場合は、この拡張の『ファイルの URL へのアクセスを許可』も確認してください。"
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
