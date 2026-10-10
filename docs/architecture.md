# QuickNotes Architecture

## Overview

QuickNotes moves from a browser-only app to an online service for 1 million users. People create and edit notes on any device and find them again later. The plan below states the requirements and sizes the load and shows how the parts fit together.

## Requirements

### Functional requirements

- Users register and sign in
- Users create, view, edit and delete notes
- Users list their notes from newest to oldest
- Users add tags to notes and filter by tag
- Notes appear on every device of the same user

### Non-functional requirements

- Availability: 99.9 percent uptime
- Latency: 95 percent of read requests answer within 300 ms
- Scalability: the system supports 1 million users and grows by adding servers
- Durability: saved notes survive a server failure
- Security: every request carries a token and all traffic uses HTTPS
- Consistency: a user sees an own change at once and other devices see it within seconds

## Load estimate for 1 million users

### Assumptions

- 1,000,000 registered users
- 20 percent of users are active each day which gives 200,000 daily active users
- Each active user makes 30 read requests per day (list loads and single note views)
- Each active user makes 6 write requests per day (3 new notes and 3 edits or deletes)
- A note takes about 2 KB including metadata and indexes
- One day has 86,400 seconds
- Peak traffic runs at 5 times the average

### Estimates

- Reads per day: 200,000 x 30 = 6,000,000
- Reads per second: 6,000,000 / 86,400 = about 69 on average and about 347 at peak
- Writes per day: 200,000 x 6 = 1,200,000
- Writes per second: 1,200,000 / 86,400 = about 14 on average and about 69 at peak
- New notes per year: 200,000 x 3 x 365 = 219,000,000
- Storage per year: 219,000,000 x 2 KB = about 438 GB
- Cache effect: an 80 percent hit rate leaves about 69 reads per second at peak for the database

QuickNotes is read-heavy with five reads for every write. Caching and read replicas protect the database from that load.

## Architecture diagram

```
Client (browser or mobile app)
   |
   v
DNS (quicknotes.example)
   |
   |--> CDN ------------------> static files (HTML, CSS, JavaScript, images)
   |
   v
Load balancer (health checks, two copies in two zones)
   |
   |--> App server 1 --+
   |--> App server 2 --+--> Cache (note lists and single notes)
   |--> App server 3 --+        |
                       |        v (cache miss)
                       |    Read replica <--- copies data --- Primary database
                       |                                           ^
                       |-- writes -------------------------------+
                       |
                       +--> Queue --> Worker (search index and email jobs)
                                         |
                                         +--> writes results to the Primary database
```

## Components

- **Client:** The client gives users a screen to read and write notes and sends API requests with the login token.
- **DNS:** DNS turns the readable address quicknotes.example into the addresses of the CDN and the load balancer.
- **CDN:** The CDN solves slow page loads for faraway users by serving static files from locations close to them.
- **Load balancer:** The load balancer solves server overload by spreading requests across the app servers and skipping any server that fails a health check.
- **App servers:** The app servers run the API code and solve growing traffic because identical copies share the work and more copies can join at any time.
- **Cache:** The cache solves repeated database reads by keeping hot note lists and single notes in fast memory.
- **Primary database:** The primary database solves safe storage by accepting every write in one place with transactions.
- **Read replica:** The read replica solves read pressure on the primary by answering queries from a live copy of the data.
- **Queue:** The queue solves slow responses by holding background jobs so the user gets an answer without waiting for them.
- **Worker:** The worker solves heavy background tasks by updating the search index and sending emails away from the app servers.

## Request flows

### GET /notes

1. The client sends GET /v1/notes with the bearer token.
2. DNS resolves the address and the request reaches the load balancer.
3. The load balancer picks a healthy app server.
4. The app server checks the token and finds the user id.
5. The app server builds a cache key from the user id and the page number.
6. On a cache hit the app server returns the stored list at once.
7. On a cache miss the app server queries the read replica.
8. The app server stores the result in the cache for 60 seconds.
9. The app server answers with 200 OK and the JSON list.

### POST /notes

1. The client sends POST /v1/notes with the token and the JSON body.
2. The load balancer sends the request to an app server.
3. The app server checks the token and validates the title length.
4. The app server inserts the note into the primary database inside a transaction.
5. The app server deletes the cached lists of that user so the next read shows the new note.
6. The app server adds a job to the queue to update the search index.
7. The app server answers with 201 Created and the new note.
8. A worker takes the job from the queue and updates the search index.
9. The primary database copies the new row to the read replica within a moment.

## Trade-offs

- **Speed against freshness:** The cache returns lists fast but can show data that is a few seconds old. A short expiry of 60 seconds and cache clearing after each write keep the delay small.
- **Replica lag:** The read replica trails the primary by a tiny delay. A user who saves a note and refreshes at once could miss it. Reading the own latest notes from the primary fixes that case.
- **Fast answers against instant side effects:** The queue makes writes quick but the search index updates a moment later. Users accept that delay because their note appears in the list at once.
- **Cost against resilience:** Extra servers and a second load balancer and a replica raise the monthly bill. They buy the 99.9 percent uptime goal.

## Single points of failure

- **App servers:** Three copies run behind the load balancer. The loss of one server leaves two to carry the load.
- **Load balancer:** Two load balancers run in two availability zones with automatic failover.
- **Database:** The read replica takes over as the new primary if the primary fails. Daily backups and a log of changes allow recovery after a larger incident.
- **Cache:** A cache cluster with a replica keeps running if one node fails. The database can serve all reads for a short time without it.
- **Queue and worker:** The queue stores jobs on several machines. Several workers run at once and a job returns to the queue if a worker fails midway.
- **DNS and CDN:** Both run on many machines across many locations. A second DNS provider covers a provider outage.
- **Zones:** The system runs in two availability zones so one data centre failure leaves the service up.