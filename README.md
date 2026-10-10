# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository holds two things. The first is an API client that loads and creates and deletes notes through the JSONPlaceholder practice API. The second is a set of design documents that the backend team uses to build the real service.

## How to run the API client

1. Clone the repository with `git clone https://github.com/fatmaram/quicknotes-system-design.git`
2. Open the quicknotes-system-design folder in VS Code
3. Right-click index.html and choose Open with Live Server
4. Click Load notes to fetch 10 notes. Use the form to add a note and the Delete button to remove one

The client needs an internet connection because it calls https://jsonplaceholder.typicode.com/posts.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- One reusable request function keeps fetch calls consistent and checks response.ok in a single place
- Loading and success and error and empty states make an app clear to users at every moment
- A join table turns a many-to-many relationship into two one-to-many relationships
- Caching and read replicas protect a database in a read-heavy system
- Load estimates turn guesses into numbers that guide the architecture