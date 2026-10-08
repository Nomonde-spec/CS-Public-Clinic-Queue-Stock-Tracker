const test = require("node:test");
const assert = require("node:assert/strict");
const { getAllowedOrigins, validateProductionConfig } = require("./runtime-config");

test("uses localhost as the development origin by default", () => {
	assert.deepEqual(getAllowedOrigins({ NODE_ENV: "development" }), ["http://localhost:3000"]);
});

test("normalizes and deduplicates configured client origins", () => {
	assert.deepEqual(getAllowedOrigins({
		CLIENT_ORIGINS: "https://carequeue.example, https://carequeue.example/",
	}), ["https://carequeue.example"]);
});

test("does not use localhost as a production origin fallback", () => {
	assert.deepEqual(getAllowedOrigins({ NODE_ENV: "production" }), []);
});

test("production requires a database URL and valid client origin", () => {
	assert.throws(() => validateProductionConfig({ NODE_ENV: "production" }), /DATABASE_URL must be configured/);
	assert.throws(() => validateProductionConfig({
		NODE_ENV: "production",
		DATABASE_URL: "postgresql://db.example/database",
	}), /CLIENT_ORIGIN or CLIENT_ORIGINS/);
});

test("production accepts configured PostgreSQL and HTTPS client origin", () => {
	assert.doesNotThrow(() => validateProductionConfig({
		NODE_ENV: "production",
		DATABASE_URL: "postgresql://db.example/database",
		CLIENT_ORIGIN: "https://carequeue.example",
	}));
});