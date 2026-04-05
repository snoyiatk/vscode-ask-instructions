import * as fs from 'node:fs';
import * as path from 'node:path';

interface SimulationReview {
	branchName: string;
	command: string | null;
	commandDetected: boolean;
	event: string;
	noteableType: string;
	provider: string;
	requestedScope: string | null;
	triggerSourceObjectId: string;
	triggerSourceReason: string;
	warnings: string[];
}

function parsePayload(raw: string): unknown {
	try {
		return JSON.parse(raw) as unknown;
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'unknown parse error';
		throw new Error(`Invalid JSON payload: ${reason}`);
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function extractDeliverySuffix(delivery: string | null): string | null {
	if (!delivery) {
		return null;
	}

	const pieces = delivery.split('-');
	const last = pieces.at(-1);
	if (!last) {
		return null;
	}

	return /^\d+$/.test(last) ? last : null;
}

function pickTriggerSourceId(root: Record<string, unknown>): { reason: string; value: string } {
	const issue = asRecord(root.issue);
	const objectAttributes = asRecord(root.object_attributes);
	const delivery = readString(root.delivery);
	const hookId = readString(root.hookId);

	const issueId = issue.id;
	if (typeof issueId === 'number' || typeof issueId === 'string') {
		return { reason: 'issue.id', value: String(issueId) };
	}

	const issueNumber = issue.number;
	if (typeof issueNumber === 'number' || typeof issueNumber === 'string') {
		return { reason: 'issue.number', value: String(issueNumber) };
	}

	const objectIssueId = objectAttributes.issue_id;
	if (typeof objectIssueId === 'number' || typeof objectIssueId === 'string') {
		return { reason: 'object_attributes.issue_id', value: String(objectIssueId) };
	}

	const deliverySuffix = extractDeliverySuffix(delivery);
	if (deliverySuffix) {
		return { reason: 'delivery suffix fallback', value: deliverySuffix };
	}

	if (hookId) {
		return { reason: 'hookId fallback', value: hookId };
	}

	return { reason: 'hardcoded fallback', value: 'unknown' };
}

function sanitizeBranchToken(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'unknown';
}

function analyzePayload(payload: unknown): SimulationReview {
	const root = asRecord(payload);
	const objectAttributes = asRecord(root.object_attributes);
	const note = readString(objectAttributes.note) ?? '';
	const commandPrefix = '/devagent:review';
	const commandDetected = note.toLowerCase().startsWith(commandPrefix);
	const requestedScope = commandDetected ? note.slice(commandPrefix.length).trim() || null : null;
	const trigger = pickTriggerSourceId(root);
	const triggerId = sanitizeBranchToken(trigger.value);

	const warnings: string[] = [];
	if (trigger.reason !== 'issue.id') {
		warnings.push(`Missing issue.id in payload; used ${trigger.reason}.`);
	}
	if (!commandDetected) {
		warnings.push(`Comment does not start with "${commandPrefix}".`);
	}

	return {
		branchName: `ai/fix-issue-${triggerId}`,
		command: note || null,
		commandDetected,
		event: readString(root.event) ?? 'unknown',
		noteableType: readString(objectAttributes.noteable_type) ?? 'unknown',
		provider: readString(root.provider) ?? 'unknown',
		requestedScope,
		triggerSourceObjectId: trigger.value,
		triggerSourceReason: trigger.reason,
		warnings
	};
}

function printUsage(scriptName: string): void {
	console.error(`Usage: node ${scriptName} <payload.json>`);
}

function main(): void {
	const payloadPathArg = process.argv[2];
	if (!payloadPathArg) {
		printUsage(path.basename(process.argv[1] ?? 'webhookSimulationReview.js'));
		process.exitCode = 2;
		return;
	}

	const resolvedPath = path.resolve(payloadPathArg);
	const raw = fs.readFileSync(resolvedPath, 'utf8');
	const parsed = parsePayload(raw);
	const report = analyzePayload(parsed);
	console.log(JSON.stringify(report, null, 2));
}

main();
