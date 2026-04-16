# Server-Authoritative Multiplayer Tic-Tac-Toe

A production-ready multiplayer Tic-Tac-Toe starter with a Next.js frontend and a Nakama backend. The client only authenticates, joins matchmaking, and submits intended moves. All game rules, turn validation, timers, win detection, forfeits, leaderboard updates, and match state broadcasts happen on the server.

## Folder Structure

```text
.
|-- docker-compose.yml
|-- docs/
|   |-- GCP_DEPLOYMENT.md
|   `-- RENDER_DEPLOYMENT.md
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- lib/
|   |-- public/
|   `-- types/
|-- nakama/
|   |-- src/
|   |-- Dockerfile
|   |-- local.yml
|   `-- start.sh
|-- render.yaml
`-- scripts/
    `-- deploy-gcp.ps1
```

## Prerequisites

- Docker and Docker Compose for local Nakama/Postgres
- Node.js 20+
- npm

## Run Locally

Start Nakama and Postgres:

```bash
docker compose up --build
```

The Nakama image compiles `nakama/src/main.ts` during `docker compose up --build`. For local backend type checks while editing:

```bash
cd nakama
npm install
npm run build
```

Start the frontend:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Nakama console is available at `http://localhost:7351` with the credentials in `nakama/local.yml`.

## Architecture

- `frontend/lib/nakama.ts` creates the Nakama client.
- `frontend/lib/game-provider.tsx` handles auth, socket connection, matchmaking, state sync, reconnect, and leaderboard fetches.
- `nakama/src/main.ts` registers the authoritative match handler and the leaderboard RPC.
- Each Nakama match owns its own in-memory game room, so multiple matches can run concurrently.
- The authoritative loop enforces a 30 second move timer and awards forfeits on timeout or disconnect.

## Server Message Opcodes

Client to server:

- `1`: submit move `{ "cell": 0 }`
- `3`: request state snapshot

Server to client:

- `2`: full state snapshot
- `4`: error message

## Sample Test Flow

1. Start Docker and the frontend.
2. Open `http://localhost:3000` in two browser windows.
3. Enter different usernames, for example `ada` and `grace`.
4. Both users click `Find Match`.
5. Nakama pairs them into one authoritative match. One user becomes X, the other O.
6. Player X clicks a cell. The client sends `{ cell }`; Nakama validates turn order and broadcasts the new board.
7. Continue until a win or draw. The server records the result and updates the leaderboard.
8. Try clicking out of turn or an occupied cell. The server rejects the move and broadcasts an error only to that caller.

## Deployment

- Google Cloud walkthrough: [docs/GCP_DEPLOYMENT.md](docs/GCP_DEPLOYMENT.md)
- Render walkthrough: [docs/RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md)

### Frontend on Vercel

Set these environment variables:

```text
NEXT_PUBLIC_NAKAMA_SERVER_KEY=your_server_key
NEXT_PUBLIC_NAKAMA_HOST=your-nakama-host.example.com
NEXT_PUBLIC_NAKAMA_PORT=443
NEXT_PUBLIC_NAKAMA_USE_SSL=true
```

Deploy the `frontend` directory as a Next.js project.

### Backend on Docker/GCP/Render

- Use a managed Postgres instance or the bundled local Docker Compose setup.
- Set strong values for `socket.server_key`, `session.encryption_key`, `session.refresh_encryption_key`, and `runtime.http_key`.
- Expose the Nakama HTTP API/WebSocket port and keep the console restricted.

## Notes

- All game rules live in `nakama/src/main.ts`.
- The browser never calculates winners or applies moves locally.
- Reconnect support is handled by storing the active match ID client-side and rejoining while the authoritative match is still alive.
- The Render deployment path is meant for demos; free services can spin down or restart.
