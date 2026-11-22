# Game Panel container stack

This stack preserves the public contracts of Triviantis and Huertero while replacing host PM2/Nginx processes with Docker Compose and Traefik.

## Persistent host paths

All mutable data and secrets stay outside images and Git:

- `/opt/game-panel-data/huertero/data`
- `/opt/game-panel-data/huertero/content`
- `/opt/game-panel-data/huertero/huertero.env`
- `/opt/game-panel-data/huertero/serviceAccount.json`
- `/opt/game-panel-data/triviantis/firebase-admin-config.json`
- `/opt/game-panel-data/triviantis/tokens.json`
- `/opt/game-panel-data/mongo`
- `/opt/game-panel-data/traefik/acme.json`

## Preview

Copy `.env.example` to the private host file `/opt/game-panel-stack/.env`, set the real ACME email and immutable image tags, then validate and start the base Compose file. Preview binds Traefik only to loopback ports 18080/18443 and uses the existing read-only certificates.

## Production cutover

Production adds `compose.production.yaml`, which binds 80/443 and enables the Traefik ACME resolver. Nginx must release those ports immediately before the production stack is started. Keep the backed-up Nginx configuration and PM2 dump until the cutover has passed HTTPS, API, image, login, persistence and reboot tests.

Do not commit host data, credentials, Firebase service accounts, tokens, MongoDB files or `acme.json`.
