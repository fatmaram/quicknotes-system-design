# QuickNotes Data Model

## Overview

The database stores users and their notes and tags. It holds four tables named users and notes and tags and note_tags. The SQL below targets PostgreSQL.

## Entities

### users

| Column | Type | Key | Description |
| --- | --- | --- | --- |
| id | BIGINT | Primary key | Unique id of the user |
| email | VARCHAR(255) | Unique | Login address |
| name | VARCHAR(100) | | Display name |
| password_hash | VARCHAR(255) | | Hashed password |
| created_at | TIMESTAMPTZ | | Time of registration |

### notes

| Column | Type | Key | Description |
| --- | --- | --- | --- |
| id | BIGINT | Primary key | Unique id of the note |
| user_id | BIGINT | Foreign key to users.id | Owner of the note |
| title | VARCHAR(100) | | Short title |
| body | TEXT | | Optional details |
| created_at | TIMESTAMPTZ | | Time of creation |
| updated_at | TIMESTAMPTZ | | Time of the last change |

### tags

| Column | Type | Key | Description |
| --- | --- | --- | --- |
| id | BIGINT | Primary key | Unique id of the tag |
| user_id | BIGINT | Foreign key to users.id | Owner of the tag |
| name | VARCHAR(50) | Unique with user_id | Tag label such as work |

### note_tags

| Column | Type | Key | Description |
| --- | --- | --- | --- |
| note_id | BIGINT | Primary key part and foreign key to notes.id | The tagged note |
| tag_id | BIGINT | Primary key part and foreign key to tags.id | The tag on the note |

## Relationships

- One user has many notes. That is a one-to-many relationship. Each note row stores the user_id of its owner.
- One user has many tags. That is a second one-to-many relationship.
- Notes and tags form a many-to-many relationship. One note carries many tags and one tag marks many notes.
- The note_tags table is the join table. A single column in notes or tags can hold only one value per row so a list of tag ids would break the table rules. Each row in note_tags stores one note and tag pair. The two columns together form the primary key so the same tag can never attach to the same note twice.

## CREATE TABLE statements

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

## Example queries

The latest 20 notes of one user:

```sql
SELECT id, title, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 20;
```

Every note of one user with its tags (uses a JOIN):

```sql
SELECT n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t ON t.id = nt.tag_id
WHERE n.user_id = 1
ORDER BY n.created_at DESC;
```

All notes that carry the tag work:

```sql
SELECT n.id, n.title
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t ON t.id = nt.tag_id
WHERE n.user_id = 1 AND t.name = 'work';
```

The number of notes under each tag:

```sql
SELECT t.name, COUNT(nt.note_id) AS note_count
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 1
GROUP BY t.id, t.name
ORDER BY note_count DESC;
```

## Indexes

- Index to add: `CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);`
- Reason: Almost every request lists the notes of one user from newest to oldest. The index lets the database jump to the rows of that user in the right order. Without it the database scans the full notes table which holds hundreds of millions of rows after a few years.
- Second index: `CREATE INDEX idx_note_tags_tag_id ON note_tags (tag_id);` speeds up the search for all notes under one tag. The primary key already covers searches that start from note_id.

## SQL or NoSQL

I choose SQL for QuickNotes. The data has clear links between users and notes and tags. Foreign keys keep every note attached to a real user. Unique rules stop duplicate emails and duplicate tags. Joins answer questions such as which notes carry a tag with short queries. Transactions make a change to a note and its tags finish fully or never happen. One PostgreSQL primary with read replicas handles the estimated load of 69 writes per second at peak with room to spare. A NoSQL store suits data with changing shapes or write volumes far beyond one server. QuickNotes has neither need so SQL gives stronger guarantees at lower complexity.