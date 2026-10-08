const LOCAL_CLIENT_ORIGIN = "http://localhost:3000";

function getAllowedOrigins(env = process.env) {
	const configured = String(env.CLIENT_ORIGINS || env.CLIENT_ORIGIN || "").trim();
	if (!configured) return env.NODE_ENV === "production" ? [] : [LOCAL_CLIENT_ORIGIN];

	return [...new Set(configured.split(",").map((value) => {
		try {
			const url = new URL(value.trim());
			if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
			return url.origin;
		} catch {
			return null;
		}
	}).filter(Boolean))];
}

function validateProductionConfig(env = process.env) {
	if (env.NODE_ENV !== "production") return;
	if (!String(env.DATABASE_URL || "").trim()) throw new Error("DATABASE_URL must be configured in production.");
	if (!getAllowedOrigins(env).length) throw new Error("CLIENT_ORIGIN or CLIENT_ORIGINS must contain a valid client origin in production.");
}

module.exports = { getAllowedOrigins, validateProductionConfig };