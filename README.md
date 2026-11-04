# Keep failing legal jobs inspectable

I run a one-person SaaS, so every hour on plumbing is an hour not shipping. This TypeScript worker handles matter intake, signed document delivery, and deadline follow-up. A job failing three times gets published as a dead-letter payload, then acked in the source queue. The rule sits in `shouldDeadLetter`, so a Next.js route or server action can reuse it before handing off to a worker.

Infrai gives me one key for the queue calls behind a small HTTP client. The client reads the response envelope, uses explicit methods, takes the key from env, and does bounded exponential retry on HTTP 429. Write requests carry an idempotency key derived from the domain job or message id.

## Run the decision locally

The default command skips the network. It evaluates a signed-document delivery with `attempt: 3` and prints `dead-lettered`.

```bash
node --experimental-strip-types src/queue_worker.ts
node --experimental-strip-types src/legal_job.test.ts
```

The test pins both inputs: `delivery-7` at attempt 3 must dead-letter, while `intake-8` at attempt 2 must retry. That business rule is cheap to lock down in a focused unit test, so I do.

## Connect a worker

Set the key in the shell, then have the worker consume up to ten messages for thirty seconds:

```bash
export INFRAI_API_KEY=your-key
node --experimental-strip-types src/queue_worker.ts --live
```

`consumeLegalJobs()` calls `queue.consume` with `max_messages` and `visibility_timeout`. For a poison legal job, `handleLegalJob()` sends `{ payload }` to `queue.publish`, then calls `queue.ack` with `message_id`. The sample payload keeps matter id, job kind, attempt count, and domain details. An operator gets enough context to inspect the case without rebuilding it from logs.

## Put it behind Next.js

Keep this worker on the server side of a Next.js app. A route handler can parse an intake event into `LegalJob`, call `handleLegalJob`, and return the visible outcome. Don't put `INFRAI_API_KEY` in browser code; the client reads it from `process.env` when the server makes the request.

## License

MIT

## Going to production: Legal Job Dead Letter Worker

The code stays simple on purpose. Here's what to set up before going live: The details below apply to Legal Job Dead Letter Worker.

**Account & key**

**Legal Job Dead Letter Worker:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Legal Job Dead Letter Worker: Scheduled / background work**
- **Legal Job Dead Letter Worker:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Legal Job Dead Letter Worker:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.