const test = require("node:test");
const assert = require("node:assert/strict");
const { getAdminLoginStage } = require("./admin-login");

test("invalid admin passwords do not reveal the token challenge", () => {
	assert.equal(getAdminLoginStage({ passwordValid: false, token: "", expectedToken: "123456" }), "invalid-credentials");
});

test("valid admin passwords request a token when none was submitted", () => {
	assert.equal(getAdminLoginStage({ passwordValid: true, token: "", expectedToken: "123456" }), "token-required");
});

test("admin login succeeds only with the configured token", () => {
	assert.equal(getAdminLoginStage({ passwordValid: true, token: "000000", expectedToken: "123456" }), "invalid-credentials");
	assert.equal(getAdminLoginStage({ passwordValid: true, token: "123456", expectedToken: "123456" }), "authenticated");
});