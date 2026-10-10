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

// Disable every button while any request runs
function setBusy(isBusy) {
  loadBtn.disabled = isBusy;
  submitBtn.disabled = isBusy;
  document.querySelectorAll(".delete-btn").forEach(function (button) {
    button.disabled = isBusy;
  });
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

/*
  How deleting works with JSONPlaceholder:
  JSONPlaceholder only pretends to save changes. A note created with POST gets
  the id 101 but the server never stores it. A real DELETE for that note can
  answer 404. Deleted server notes also come back after a reload because the
  server never really removes them.
  My approach:
  - Every note sends a real DELETE request to /posts/{id}.
  - Notes created in this page carry the flag isLocal. If the server answers
    404 for one of those notes I still remove it from the list because it
    exists only in the page.
  - Any other failure keeps the note on screen and shows an error message.
  - I remove notes by object and never by id because every created note
    gets the same id 101.
*/
async function deleteFromServer(note) {
  try {
    return await request(`${API_URL}/${note.id}`, { method: "DELETE" });
  } catch (error) {
    if (note.isLocal && error.status === 404) {
      return { status: 404, local: true };
    }
    throw error;
  }
}

async function deleteNote(note) {
  setBusy(true);
  setStatus("Deleting note...", "loading");

  try {
    const result = await deleteFromServer(note);
    notes = notes.filter(function (item) {
      return item !== note;
    });
    render();

    if (result.local) {
      setStatus("Note removed. The practice server never stored it.", "success");
    } else {
      setStatus(`Note deleted (status ${result.status}).`, "success");
    }
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not delete that note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
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

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function () {
      deleteNote(note);
    });
    item.append(deleteBtn);

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

    result.data.isLocal = true;
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