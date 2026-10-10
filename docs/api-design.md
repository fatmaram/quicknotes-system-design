# QuickNotes API Design

## Overview

This document describes the real QuickNotes API that the backend team builds. The practice API from JSONPlaceholder only stands in for it during development.

- Base URL: `https://api.quicknotes.example/v1`
- Format: JSON in every request and response
- Authentication: a bearer token in the Authorization header. The token comes from POST /auth/login
- Dates: ISO 8601 in UTC
- Lists: paged with the page and limit query parameters

## Endpoints

| Method | Path | Description | Success status |
| --- | --- | --- | --- |
| POST | `/users` | Register a new account | 201 Created |
| POST | `/auth/login` | Exchange an email and password for a token | 200 OK |
| GET | `/notes` | List the notes of the signed-in user. Supports page, limit and tag | 200 OK |
| GET | `/notes/{id}` | Get one note | 200 OK |
| POST | `/notes` | Create a note | 201 Created |
| PUT | `/notes/{id}` | Replace the title, body and tags of a note | 200 OK |
| DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| GET | `/tags` | List the tags of the signed-in user | 200 OK |

## Example: create a note

Request:

```
POST /v1/notes
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "title": "Prepare Day 8 slides",
  "body": "Add the architecture diagram",
  "tags": ["study"]
}
```

Response: 201 Created

```json
{
  "id": 101,
  "userId": 1,
  "title": "Prepare Day 8 slides",
  "body": "Add the architecture diagram",
  "tags": ["study"],
  "createdAt": "2026-10-10T09:30:00Z",
  "updatedAt": "2026-10-10T09:30:00Z"
}
```

## Example: list notes

Request:

```
GET /v1/notes?page=1&limit=2&tag=study
Authorization: Bearer <token>
```

Response: 200 OK

```json
{
  "data": [
    {
      "id": 101,
      "title": "Prepare Day 8 slides",
      "body": "Add the architecture diagram",
      "tags": ["study"],
      "createdAt": "2026-10-10T09:30:00Z",
      "updatedAt": "2026-10-10T09:30:00Z"
    },
    {
      "id": 87,
      "title": "Revise SQL joins",
      "body": "Practise LEFT JOIN",
      "tags": ["study"],
      "createdAt": "2026-10-08T16:05:00Z",
      "updatedAt": "2026-10-08T16:05:00Z"
    }
  ],
  "page": 1,
  "limit": 2,
  "total": 14
}
```

## Error codes

Every error response uses the same body shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A short sentence for people",
    "details": []
  }
}
```

### 400 Bad Request

- When it happens: The client sends invalid data. One example is a POST /notes request without a title or with a title over 100 characters.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body has invalid fields.",
    "details": [{ "field": "title", "problem": "Title must be 1 to 100 characters." }]
  }
}
```

### 401 Unauthorized

- When it happens: The request carries no token or an expired token. One example is GET /notes with a missing Authorization header.

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Sign in to continue.",
    "details": []
  }
}
```

### 403 Forbidden

- When it happens: The token is valid but the user owns no rights to the note. One example is DELETE /notes/55 where note 55 belongs to another user.

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You have no permission to change this note.",
    "details": []
  }
}
```

### 404 Not Found

- When it happens: No note matches the id in the path. One example is GET /notes/9999 when no note carries the id 9999.

```json
{
  "error": {
    "code": "NOTE_NOT_FOUND",
    "message": "No note exists with id 9999.",
    "details": []
  }
}
```

### 500 Internal Server Error

- When it happens: The server fails in a way the client did nothing to cause. One example is a database outage during POST /notes.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong on our side. Try again soon.",
    "details": []
  }
}
```