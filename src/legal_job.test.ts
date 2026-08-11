import { strict as assert } from "node:assert";
import { shouldDeadLetter, type LegalJob } from "./legal_job.ts";
const failingDelivery: LegalJob = { id: "delivery-7", kind: "signed-document-delivery", matterId: "matter-7", attempt: 3, details: { document: "order.pdf" } };
const pendingIntake: LegalJob = { id: "intake-8", kind: "matter-intake", matterId: "matter-8", attempt: 2, details: { source: "portal" } };
assert.equal(shouldDeadLetter(failingDelivery), true); assert.equal(shouldDeadLetter(pendingIntake), false); console.log("legal job decision test passed");
