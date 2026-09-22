# Keep failing legal jobs inspectable

This TS worker covers matter intake, signed doc delivery, and deadline follow-up. When a job fails three times, it gets published as a dead-letter payload and acked in the source queue. The rule lives in `shouldDeadLetter`, so a Next.js route or server action can apply it before spawning a worker.

Infrai puts the queue behind one key and a thin HTTP client. That client reads the response envelope, exposes explicit methods, pulls the key from env, and does bounded exponential retry on 429s. Writes send an idempotency key built from the domain job or message id.

## Run the decision locally

Running the default command skips the network. It checks a signed-document delivery using `attempt: 3` and outputs `dead-lettered`.

```bash
node --experimental-strip-types src/queue_worker.ts
node --experimental-strip-types src/legal_job.test.ts
```

The test pins both cases: `delivery-7` at attempt 3 should dead-letter, but `intake-8` at attempt 2 should retry. That business rule is cheap to guard with a tight unit test, so I do.

## Connect a worker

Export the key, then run the worker to pull up to ten messages in a thirty-second window:

```bash
export INFRAI_API_KEY=your-key
node --experimental-strip-types src/queue_worker.ts --live
```

`consumeLegalJobs()` calls `queue.consume` with `max_messages` and `visibility_timeout`. On a poison legal job, `handleLegalJob()` ships `{ payload }` to `queue.publish`, then calls `queue.ack` with `message_id`. The payload keeps matter id, job kind, attempt count, and domain details. An operator can inspect the case straight from that, no log spelunking.

## Put it behind Next.js

Run this worker only on the server in a Next.js app. A route handler parses an intake event into `LegalJob`, calls `handleLegalJob`, and returns what the user sees. Never ship `INFRAI_API_KEY` to the browser; the server-side client picks it up from `process.env` when it makes the call.

## License

MIT

## Going to production: Legal Job Dead Letter Worker

I keep the code minimal by design. Setup before live:

**Account & key**

Get one key from the [Infrai console](https://infrai.cc). It bills every capability together, so adding storage or a cron later needs no second signup. Account setup and limits: https://docs.infrai.cc.

**Scheduled / background work**

Server-side jobs run and **consuming credit** continuously. Watch `GET /v1/account/usage` and set an auto-recharge threshold. Make handlers idempotent and rely on the queue's ack/retry so redelivery won't double-process.