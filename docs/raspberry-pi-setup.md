# Raspberry Pi Transfer and Setup Guide

This guide assumes:

- your Raspberry Pi already has Codex installed
- the Pi is reachable over SSH on your local network
- you want the Pi to run RIClaw as the orchestration host
- you will use Node.js 22 or newer, because this project uses the built-in `node:sqlite` module

## 1. Prepare this project locally

From this project folder:

```bash
cd /Users/prabhakaran/Documents/Codex/2026-04-21-understanding-codex-and-raspberry-pi-so
cp .env.example .env
```

Edit `.env` and set:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_WEBHOOK_URL` if you plan to use webhooks
- `VERCEL_TOKEN`
- `VERCEL_TEAM_ID` if needed
- `CODEX_COMMAND` if the Pi uses a custom Codex command name

## 2. Choose a transfer method

### Option A: `scp`

Use this when you just want to copy the folder directly to the Pi.

```bash
scp -r /Users/prabhakaran/Documents/Codex/2026-04-21-understanding-codex-and-raspberry-pi-so pi@raspberrypi.local:/home/pi/riclaw
```

If your Pi uses a custom hostname or IP:

```bash
scp -r /Users/prabhakaran/Documents/Codex/2026-04-21-understanding-codex-and-raspberry-pi-so pi@192.168.1.50:/home/pi/riclaw
```

### Option B: `rsync`

Use this when you want faster repeat syncs during development.

```bash
rsync -av --delete /Users/prabhakaran/Documents/Codex/2026-04-21-understanding-codex-and-raspberry-pi-so/ pi@raspberrypi.local:/home/pi/riclaw/
```

### Option C: Git

Use this when you want cleaner version tracking.

1. Initialize a Git repo locally if needed.
2. Push to GitHub or your preferred remote.
3. Clone on the Pi:

```bash
ssh pi@raspberrypi.local
git clone <your-repo-url> /home/pi/riclaw
```

## 3. SSH into the Raspberry Pi

```bash
ssh pi@raspberrypi.local
cd /home/pi/riclaw
```

## 4. Install Node.js on the Pi if needed

Check:

```bash
node -v
npm -v
```

If Node.js is missing, install a current LTS version. On Raspberry Pi OS, many people use `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

Verify that the Pi is on Node 22 or newer:

```bash
node -v
```

## 5. Install project dependencies on the Pi

```bash
cd /home/pi/riclaw
npm install
```

## 6. Confirm Codex is reachable on the Pi

Run:

```bash
codex --help
```

If the Codex command is different, update `CODEX_COMMAND` in `.env`.

## 7. Configure Telegram bot mode

You have two choices.

### Polling mode

Good for first bootstrapping because it does not require a public HTTPS endpoint.

Run:

```bash
npm run poll:telegram
```

### Webhook mode

Good for production-like behavior.

You need:

- a public HTTPS URL that reaches the Pi
- reverse proxy or tunnel if the Pi is behind NAT

Start the API server:

```bash
npm run dev
```

Then register the webhook with Telegram:

```bash
npm run telegram:set-webhook
```

## 8. Test the server locally on the Pi

```bash
npm run typecheck
npm run dev
```

In a second SSH session:

```bash
curl http://localhost:3000/health
```

You should see a JSON health response.

## 9. Run RIClaw as a background service

For a stable setup, use `systemd`.

Build the project first:

```bash
npm run build
```

If you want polling mode instead of webhooks, use a separate service command:

```ini
ExecStart=/usr/bin/npm run poll:telegram
```

Use that only when you intentionally want polling and no Telegram webhook.

Create `/etc/systemd/system/riclaw.service`:

```ini
[Unit]
Description=RIClaw Telegram to Vercel Orchestrator
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/riclaw
EnvironmentFile=/home/pi/riclaw/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable riclaw
sudo systemctl start riclaw
sudo systemctl status riclaw
```

## 10. Update the Pi after local changes

If you used `rsync`, repeat:

```bash
rsync -av --delete /Users/prabhakaran/Documents/Codex/2026-04-21-understanding-codex-and-raspberry-pi-so/ pi@raspberrypi.local:/home/pi/riclaw/
```

Then restart on the Pi:

```bash
ssh pi@raspberrypi.local
cd /home/pi/riclaw
npm run build
sudo systemctl restart riclaw
```

## 11. What still needs real implementation

This scaffold gives you the structure, but you still need to wire in:

- stronger spec extraction and planning
- real build/test/smoke validation commands
- queueing for controlled concurrency on the Pi

## 12. Recommended first Pi milestone

Aim for this narrow checkpoint first:

1. Receive a Telegram message.
2. Create a job.
3. Write a spec file into `jobs/<job-id>`.
4. Confirm a real Next.js workspace appears in `jobs/<job-id>/workspace`.
5. Check that `jobs/<job-id>/workspace/app/generated/pageContent.ts` reflects the extracted request.
6. If the spec looks weak, inspect the job logs and confirm the Pi can run `codex --help`, because planning now uses Codex before generation starts.
7. Reply to Telegram with a placeholder success message.

Once that works on the Pi, add Codex generation and then Vercel deployment.

## Validation troubleshooting on the Pi

If a build fails, inspect:

- `jobs/<job-id>/artifacts/validation-initial.json`
- `jobs/<job-id>/artifacts/validation-after-repair.json` if present
- `jobs/<job-id>/artifacts/validation-errors.txt` if present

These files tell you whether the failure happened during:

- dependency install
- lint
- typecheck
- build
- smoke checks
