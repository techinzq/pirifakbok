Render backend update

Overwrite these files at the ROOT of the GitHub repository:
- server.js
- _shared.mjs
- submissions.mjs
- sticker-library.mjs
- public-config.mjs
- package.json

Important environment variables on fakbok-api:
- ADMIN_USER
- ADMIN_PASS
- DISCORD_WEBHOOK_URL
Optional:
- FRONTEND_ORIGIN=https://fakbok-pr.onrender.com
- PIRI_DATA_DIR=/var/data/piri-post-generator (use this only after attaching a Render Persistent Disk)

Without PIRI_DATA_DIR on persistent storage, data is stored in /tmp and can disappear on restart/deploy.
