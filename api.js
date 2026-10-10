const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");
const statusEl = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

let notes = [];

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type;
}

// Disable the buttons while any request runs
function setBusy(isBusy) {
  loadBtn.disabled = isBusy;
  submitBtn.disabled = isBusy;
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

function validateTitle(title) {
  if (title === "") {
    return "Please enter a title for your note.";
  }
  if (title.length > 100) {
    return "The title must be 100 characters or fewer.";
  }
  return "";
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
  setBusy(true);
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
    setBusy(false);
  }
}

async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  const problem = validateTitle(title);

  if (problem) {
    setStatus(problem, "error");
    return;
  }

  setBusy(true);
  setStatus("Creating note...", "loading");

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });

    notes.unshift(result.data);
    render();
    setStatus(`Note created (status ${result.status}, id ${result.data.id}).`, "success");
    form.reset();
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not create your note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

loadBtn.addEventListener("click", loadNotes);
form.addEventListener("submit", createNote);

render();