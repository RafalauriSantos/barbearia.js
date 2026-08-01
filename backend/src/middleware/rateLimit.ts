const hits = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(request: any, reply: any, done?: () => void) {
	const ip = request.ip || request.headers?.["x-forwarded-for"] || "127.0.0.1";
	const now = Date.now();
	const windowMs = 15 * 60 * 1000;
	const max = 100;

	const record = hits.get(ip) || { count: 0, resetTime: now + windowMs };
	if (now > record.resetTime) {
		record.count = 0;
		record.resetTime = now + windowMs;
	}

	record.count += 1;
	hits.set(ip, record);

	if (record.count > max) {
		if (reply && typeof reply.status === "function") {
			reply.status(429).send({ error: "Muitas requisicoes. Tente novamente mais tarde.", code: "TOO_MANY_REQUESTS" });
			return;
		}
	}

	if (typeof done === "function") {
		done();
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = { rateLimit };
}
export default rateLimit;
