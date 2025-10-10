const form = document.getElementById("uploadForm");
const input = document.getElementById("file");
const fileListEl = document.getElementById("fileList");
const dropzone = document.querySelector(".dropzone");
const btnSubmit = document.getElementById("btnSubmit");

const MAX_BYTES_PER_FILE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20;

const ALLOWED = [
  { ext: ".xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { ext: ".pdf", mime: "application/pdf" },
];

// ---------- Utils ----------
const formatBytes = (b) => {
  if (b === 0) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
};

const getFiles = () => Array.from(input.files || []);

const setFiles = (filesArr) => {
  const dt = new DataTransfer();
  filesArr.forEach(f => dt.items.add(f));
  input.files = dt.files;
};

const isAllowed = (file) => {
  const lower = file.name.toLowerCase();
  const byExt = ALLOWED.some(a => lower.endsWith(a.ext));
  const byMime = ALLOWED.some(a => file.type === a.mime);
  return byExt || byMime;
};

// ---------- A11y + errors ----------
function setError(msg) {
  dropzone.classList.add("is-invalid");
  dropzone.setAttribute("aria-invalid", "true");
  dropzone.setAttribute("aria-describedby", "dz-error");
  // mensagem “global” de erro
  let err = document.getElementById("dz-error");
  if (!err) {
    err = document.createElement("div");
    err.id = "dz-error";
    err.style.color = "#b91c1c";
    err.style.marginTop = "6px";
    err.setAttribute("role", "alert");
    dropzone.appendChild(err);
  }
  err.textContent = msg;
}

function clearError() {
  dropzone.classList.remove("is-invalid");
  dropzone.removeAttribute("aria-invalid");
  const err = document.getElementById("dz-error");
  if (err) err.remove();
}

// ---------- Render da lista ----------
function renderList(files, perFileErrors = {}) {
  fileListEl.innerHTML = "";
  if (!files.length) {
    const li = document.createElement("li");
    li.className = "file-item";
    li.innerHTML = `<span class="file-meta">Nenhum arquivo selecionado</span>`;
    fileListEl.appendChild(li);
    return;
  }

  files.forEach((f, idx) => {
    const li = document.createElement("li");
    const bad = perFileErrors[idx];
    li.className = "file-item" + (bad ? " bad" : "");
    li.innerHTML = `
      <span class="file-name">${f.name}</span>
      <span class="file-meta">• ${formatBytes(f.size)}</span>
      ${bad ? `<span class="file-err">${bad}</span>` : ""}
      <button type="button" class="btn-x" aria-label="Remover ${f.name}" data-index="${idx}">Remover</button>
    `;
    fileListEl.appendChild(li);
  });
}

// ---------- Validação ----------
function validateAll(showErrors = true) {
  const files = getFiles();
  const errors = {}; // por índice

  if (files.length === 0) {
    if (showErrors) setError("Selecione ao menos um arquivo .XLSX ou PDF");
    return { ok: false, errors };
  }

  if (files.length > MAX_FILES) {
    if (showErrors) setError(`Muitos arquivos (${files.length}). Máximo: ${MAX_FILES}.`);
    return { ok: false, errors };
  }

  let hasAnyError = false;

  files.forEach((f, i) => {
    if (!isAllowed(f)) {
      errors[i] = "Formato inválido";
      hasAnyError = true;
    } else if (f.size > MAX_BYTES_PER_FILE) {
      errors[i] = `Excede ${formatBytes(MAX_BYTES_PER_FILE)}`;
      hasAnyError = true;
    }
  });

  if (hasAnyError) {
    if (showErrors) setError("Alguns arquivos não passaram na validação.");
    return { ok: false, errors };
  }

  clearError();
  return { ok: true, errors };
}

// ---------- Eventos ----------
form.addEventListener("reset", () => {
  setTimeout(() => {
    input.value = "";
    clearError();
    renderList([]);
  }, 0);
});

// Mudança no input (seleção via diálogo)
input.addEventListener("change", () => {
  const { errors } = validateAll(false);
  renderList(getFiles(), errors);
});

// Clique no “Remover”
fileListEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-x");
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  const files = getFiles();
  files.splice(idx, 1);
  setFiles(files);
  const { errors } = validateAll(false);
  renderList(getFiles(), errors);
});

// Drag & drop visual
let dragCounter = 0;
["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dragCounter++;
    dropzone.classList.add("is-dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) dropzone.classList.remove("is-dragover");
  })
);

// Drop de arquivos (adiciona aos existentes)
dropzone.addEventListener("drop", (e) => {
  const dropped = Array.from(e.dataTransfer?.files || []);
  if (!dropped.length) return;

  const current = getFiles();
  const combined = current.concat(dropped).slice(0, MAX_FILES);
  setFiles(combined);

  const { errors } = validateAll(false);
  renderList(getFiles(), errors);
});

// Submit com proteção
form.addEventListener("submit", (e) => {
  const result = validateAll(true);
  renderList(getFiles(), result.errors);
  if (!result.ok) {
    e.preventDefault();
    input.focus();
    return;
  }

  // trava o botão enquanto envia
  btnSubmit.disabled = true;
  const original = btnSubmit.textContent;
  btnSubmit.textContent = "Enviando…";

  setTimeout(() => {
    if (document.visibilityState === "visible") {
      btnSubmit.disabled = false;
      btnSubmit.textContent = original;
    }
  }, 10000);
});

// Garantir accept correto (idempotente)
input.setAttribute(
  "accept",
  ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.pdf,application/pdf"
);

// Estado inicial
renderList([]);