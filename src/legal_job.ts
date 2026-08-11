export type LegalJobKind = "matter-intake" | "signed-document-delivery" | "deadline-follow-up";
export type LegalJob = { id: string; kind: LegalJobKind; matterId: string; attempt: number; details: Record<string, string> };
export function shouldDeadLetter(job: LegalJob, maxAttempts = 3): boolean { return job.attempt >= maxAttempts; }
export function deadLetterPayload(job: LegalJob): Record<string, unknown> { return { event: "legal-job-dead-lettered", job, reason: "maximum-attempts-reached" }; }
