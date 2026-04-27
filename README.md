# Backend Starter

This is the first backend starter for the dashboard project.

## What it does now

- starts a local backend server
- gives basic task APIs
- saves task data in `backend/data/tasks.json`
- helps you understand how frontend, backend, and database will connect later

## Important

Right now this backend is **not yet connected to Oracle**.

This is only the first learning step so you can understand the backend flow safely.

## Folder structure

- `server.js` -> starts the backend server
- `storage/tasks-store.js` -> handles reading and saving task data
- `data/tasks.json` -> temporary local backend storage
- `sql/create_tasks_table.sql` -> Oracle table script for later

## API list

- `GET /api/health`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

## How to run

Open terminal inside the project folder and run:

```bash
node backend/server.js
```

Backend will run at:

`http://localhost:4000`

## Example test URLs

- `http://localhost:4000/api/health`
- `http://localhost:4000/api/tasks`

## Next step after this

Next we will do one of these:

1. connect frontend to this backend
2. connect backend to Oracle database
3. replace JSON file storage with Oracle storage
