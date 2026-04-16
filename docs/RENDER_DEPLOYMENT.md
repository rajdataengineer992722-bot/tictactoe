# Deploy On Render

This is the easiest path if GCP billing is blocking you.

## What You Get

- Backend: Render Web Service on the free plan
- Database: Render Postgres on the free plan
- Frontend: Vercel free plan

This works well for a demo or portfolio project. It is not ideal for production because Render free services spin down after 15 minutes of inactivity and free Postgres can restart at any time.

Sources:

- [Render free services docs](https://render.com/docs/free)
- [Render web services docs](https://render.com/docs/web-services)
- [Render Docker docs](https://render.com/docs/docker)
- [Render Blueprints docs](https://render.com/docs/infrastructure-as-code)
- [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)

## 1. Push This Repo To GitHub

Render Blueprints deploy from a Git repository.

## 2. Create A Render Account

Go to:

```text
https://dashboard.render.com/
```

## 3. Deploy The Blueprint

In Render:

1. Click `New`.
2. Click `Blueprint`.
3. Connect your GitHub repo.
4. Select this repository.
5. Render will detect [render.yaml](../render.yaml).
6. Create the resources.

That blueprint creates:

- `tictac-nakama` web service
- `tictac-postgres` Postgres database

## 4. Wait For Render To Finish

Render will:

- build `nakama/Dockerfile`
- create a Postgres database
- inject the Postgres connection string into `DATABASE_URL`
- generate all Nakama secret keys automatically

The container startup script [nakama/start.sh](../nakama/start.sh) converts Render's Postgres URL to Nakama's expected `database.address` format, runs migrations, and starts the authoritative server.

## 5. Get The Nakama Hostname

After deploy, open the `tictac-nakama` service in Render.

You will get a public URL like:

```text
https://tictac-nakama.onrender.com
```

Use the hostname only:

```text
tictac-nakama.onrender.com
```

Also copy the value of the environment variable:

```text
NAKAMA_SERVER_KEY
```

from the Render service settings.

## 6. Deploy Frontend To Vercel

In Vercel:

1. Import the same GitHub repository.
2. Set `frontend` as the root directory.
3. Add these environment variables:

```env
NEXT_PUBLIC_NAKAMA_SERVER_KEY=<copy from Render>
NEXT_PUBLIC_NAKAMA_HOST=tictac-nakama.onrender.com
NEXT_PUBLIC_NAKAMA_PORT=443
NEXT_PUBLIC_NAKAMA_USE_SSL=true
```

4. Deploy.

## 7. Test

1. Open the Vercel URL in one browser.
2. Open it again in incognito.
3. Use two usernames.
4. Click `Find Match` in both windows.

## Notes

- Render free web services spin down after 15 minutes of inactivity.
- Render free Postgres is good for testing, not production durability.
- The first request after idle may be slow while the backend wakes up.
