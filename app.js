let config = null;
let editingId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const submitButton = document.getElementById("task-submit");
const list = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");

function showStatus(message) {
  statusMessage.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.supabasePublishableKey,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function loadTasks() {
  try {
    const tasks = await api(`${config.tableName}?select=*&order=id.asc`);
    renderTasks(tasks);
    showStatus("");
  } catch (error) {
    showStatus("Could not load tasks: " + error.message);
  }
}

function renderTasks(tasks) {
  list.innerHTML = "";
  tasks.forEach(task => {
    const item = document.createElement("div");
    item.className = "task-item" + (task.completed ? " done" : "");
    item.dataset.id = task.id;

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const status = document.createElement("span");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Not completed";

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "";

    const editButton = document.createElement("button");
    editButton.className = "edit-task";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => startEdit(task));

    const toggleButton = document.createElement("button");
    toggleButton.className = "toggle-task";
    toggleButton.textContent = task.completed ? "Mark incomplete" : "Mark completed";
    toggleButton.addEventListener("click", () => toggleTask(task));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-task";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    item.append(title, status, description, editButton, toggleButton, deleteButton);
    list.appendChild(item);
  });
}

function startEdit(task) {
  editingId = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description || "";
  submitButton.textContent = "Save changes";
  titleInput.focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  submitButton.textContent = "Add task";
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!title) {
    showStatus("Title is required.");
    return;
  }
  try {
    if (editingId === null) {
      await api(config.tableName, {
        method: "POST",
        body: JSON.stringify({ title, description })
      });
    } else {
      await api(`${config.tableName}?id=eq.${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, description })
      });
    }
    resetForm();
    await loadTasks();
  } catch (error) {
    showStatus("Could not save task: " + error.message);
  }
});

async function toggleTask(task) {
  try {
    await api(`${config.tableName}?id=eq.${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !task.completed })
    });
    await loadTasks();
  } catch (error) {
    showStatus("Could not update status: " + error.message);
  }
}

async function deleteTask(id) {
  try {
    await api(`${config.tableName}?id=eq.${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    await loadTasks();
  } catch (error) {
    showStatus("Could not delete task: " + error.message);
  }
}

async function init() {
  try {
    const response = await fetch("config.json");
    if (!response.ok) throw new Error("config.json not found");
    config = await response.json();
    await loadTasks();
  } catch (error) {
    showStatus("Could not start the app: " + error.message);
  }
}

init();