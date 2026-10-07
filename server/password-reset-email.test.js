const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPasswordResetUrl, getPasswordResetEmailConfig, sendPasswordResetEmail, sendStaffInvitationEmail } = require("./password-reset-email");

const smtpEnv = {
	SMTP_HOST: "smtp.example.test",
	SMTP_PORT: "587",
	SMTP_USER: "user@example.test",
	SMTP_PASSWORD: "test-password",
	SMTP_FROM: "CareQueue <no-reply@example.test>",
	PUBLIC_APP_URL: "https://carequeue.example.test",
};

test("SMTP config requires delivery settings and a public app URL", () => {
	assert.equal(getPasswordResetEmailConfig({}), null);
	assert.equal(getPasswordResetEmailConfig(smtpEnv).transport.secure, false);
	assert.equal(getPasswordResetEmailConfig({ ...smtpEnv, SMTP_PORT: "465" }).transport.secure, true);
});

test("password reset URL keeps its token in the fragment", () => {
	const resetUrl = new URL(buildPasswordResetUrl(smtpEnv.PUBLIC_APP_URL, "staff@example.test", "one-time-token", "staff"));
	assert.equal(resetUrl.origin, smtpEnv.PUBLIC_APP_URL);
	assert.equal(resetUrl.search, "");
	assert.equal(resetUrl.hash.includes("resetToken=one-time-token"), true);
	assert.equal(resetUrl.hash.includes("resetEmail=staff%40example.test"), true);
});

test("password reset mail sends the one-time link through the configured transport", async () => {
	let sentMessage;
	let transportOptions;
	await sendPasswordResetEmail({
		email: "staff@example.test",
		token: "one-time-token",
		role: "staff",
		env: smtpEnv,
		createTransport(options) {
			transportOptions = options;
			return { async sendMail(message) { sentMessage = message; } };
		},
	});
	assert.equal(transportOptions.host, smtpEnv.SMTP_HOST);
	assert.equal(sentMessage.to, "staff@example.test");
	assert.equal(sentMessage.from, smtpEnv.SMTP_FROM);
	assert.match(sentMessage.text, /resetToken=one-time-token/);
});

test("password reset mail refuses missing SMTP configuration", async () => {
	await assert.rejects(sendPasswordResetEmail({ email: "staff@example.test", token: "token", role: "staff", env: {} }), /not configured/);
});

test("staff invitation mail includes temporary credentials and setup link", async () => {
	let sentMessage;
	await sendStaffInvitationEmail({
		email: "new.staff@example.test",
		name: "New Staff",
		clinic: "Metro Family Care Centre",
		temporaryPassword: "temporary-password",
		token: "one-time-token",
		env: smtpEnv,
		createTransport() {
			return { async sendMail(message) { sentMessage = message; } };
		},
	});
	assert.equal(sentMessage.to, "new.staff@example.test");
	assert.match(sentMessage.text, /Temporary password: temporary-password/);
	assert.match(sentMessage.text, /resetToken=one-time-token/);
});
