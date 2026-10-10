const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusEl = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

let notes = [];

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type;
}

// One reusable function for every request
async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return { status: response.status, data: data };
}

function render() {
  notesList.textContent = "";

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = "No notes to show yet. Click Load notes to fetch some.";
    notesList.append(empty);
    return;
  }

  notes.forEach(function (note) {
    const item = document.createElement("li");
    item.className = "note";

    const title = document.createElement("h3");
    title.textContent = note.title;
    item.append(title);

    if (note.body) {
      const body = document.createElement("p");
      body.textContent = note.body;
      item.append(body);
    }

    notesList.append(item);
  });
}

async function loadNotes() {
  loadBtn.disabled = true;
  setStatus("Loading notes...", "loading");

  try {
    const result = await request(`${API_URL}?_limit=10`);
    notes = result.data;
    render();
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not load your notes. Please try again.", "error");
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadNotes);

render();