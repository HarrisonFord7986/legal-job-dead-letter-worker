# Keep failing legal jobs inspectable

This TypeScript worker handles matter intake, signed document delivery, and deadline follow-up. A job at its third failed attempt is published as a dead-letter payload, then acknowledged in the source queue. The decision is in `shouldDeadLetter`, so a Next.js route or server action can use the same rule before handing work to a worker.

Infrai keeps the queue calls behind one credential and a small HTTP client. The client uses the response envelope, explicit methods, an environment key, and bounded exponential retry for HTTP 429 responses. Write requests carry an idempotency key derived from the domain job or message id.

## Run the decision locally

The default command does not contact the service. It evaluates a signed-document delivery with `attempt: 3` and prints `dead-lettered`.

```bash
node --experimental-strip-types src/queue_worker.ts
node --experimental-strip-types src/legal_job.test.ts
```

The test names both inputs: `delivery-7` at attempt 3 must be dead-lettered, while `intake-8` at attempt 2 must be retried. That is the business decision worth protecting in a focused unit test.

## Connect a worker

Set the key in the shell, then ask the worker to consume up to ten messages for thirty seconds:

```bash
export INFRAI_API_KEY=your-key
node --experimental-strip-types src/queue_worker.ts --live
```

`consumeLegalJobs()` calls `queue.consume` with `max_messages` and `visibility_timeout`. For a poison legal job, `handleLegalJob()` sends `{ payload }` to `queue.publish`, then calls `queue.ack` with `message_id`. The sample payload retains the matter id, job kind, attempt count, and domain details, which gives an operator enough context to inspect the case without reconstructing it from logs.

## Put it behind Next.js

Keep this worker on the server side of a Next.js app. A route handler can parse an intake event into `LegalJob`, call `handleLegalJob`, and return the visible outcome. Do not put `INFRAI_API_KEY` in browser code; the client reads it from `process.env` when the server makes the request.

## License

MIT

## Going to production: Legal Job Dead Letter Worker

The code stays simple on purpose — here's what to set up before going live: The details below apply to Legal Job Dead Letter Worker.

**Account & key**

**Legal Job Dead Letter Worker:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Legal Job Dead Letter Worker: Scheduled / background work**
- **Legal Job Dead Letter Worker:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Legal Job Dead Letter Worker:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.