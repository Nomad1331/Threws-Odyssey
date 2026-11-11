# VoiceBridge Deployment

## Live URLs

- Frontend: https://voicebridge-threws.vercel.app
- Backend: https://voicebridge-api-six.vercel.app/health

The backend is **not** a Vercel Function using the 500 MB Python bundle path. It is a
Vercel **Container Runtime** service:

- `backend/Dockerfile.vercel` — Python 3.12, CPU torch, PyAV/ffmpeg, FastAPI on port 80.
- `backend/models/voicebridge-torgo-three/` — the 7.1 MB speaker-adapted LoRA adapter.
- `Nomad1331/voicebridge` — public model card and the same adapter on Hugging Face.
- `Nomad1331/voicebridge-whisper-small-sharded` — four ~240 MB safetensors shards of
  `openai/whisper-small` (MIT). Sharding is what keeps each image layer below the
  Container Registry 2 GB compressed-layer limit.
- Project `voicebridge-api`, framework forced to `container`.
- `VOICEBRIDGE_ALLOWED_ORIGINS=https://voicebridge-threws.vercel.app`.

## What was measured

On 2026-11-11, Hobby plan, `iad1`:

- First `/health` after container start: **4.9 s**
- Three demo clips: **6.33 s / 4.99 s / 5.38 s** wall time
  (server-side processing 4.95 s / 4.09 s / 4.19 s)
- Same transcript accuracy as local: 0.0% / 16.7% / 0.0%.
- Hobby 2 GB memory did **not** OOM; the model is in the image, not downloaded to `/tmp`.

These are deployment observations, not the product benchmark in `facts.json`; the
hardware is different.

## Keep-alive / cold starts

Vercel container instances scale down after **5 minutes without traffic**. The container
is request-driven; you cannot make it "block" between requests.

- **Vercel Cron on Hobby is limited to daily jobs**, so a once-a-minute Vercel Cron is
  rejected. The keep-alive must be external (for example cron-job.org or a small worker)
  if you want it warm before a demo.
- A ping every **1 minute** is enough to beat the 5-minute scale-down; every 15 seconds
  just adds invocations.
- Pings reduce idle cold starts but cannot prevent cold starts after a deploy, eviction,
  or platform maintenance.

The first request after a cold start is slower; the UI's health poll will reconnect within
one or two polls. This is acceptable for a demo, not a guarantee of zero latency.

## Reproduce

```powershell
cd backend
vercel link --project voicebridge-api
vercel project update --framework container --non-interactive
vercel env add VOICEBRIDGE_ALLOWED_ORIGINS production \
  --value "https://voicebridge-threws.vercel.app" --yes --force
vercel --prod --yes
```

The frontend uses `NEXT_PUBLIC_BACKEND_URL=https://voicebridge-api-six.vercel.app`.

## Limits / caveats

- The backend is public and unauthenticated; it is a demo, not production.
- The adapter is speaker-adapted to three TORGO speakers; see `LIMITS.md`.
- Container image is large (multi-GB); deployment builds take minutes.
- Hobby memory is 2 GB and worked, but there is little headroom; a concurrent burst may
  scale additional instances, not increase per-instance memory.
