const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPasswordResetUrl, getPasswordResetEmailConfig, sendPasswordResetEmail, sendStaffInvitationEmail } = require("./password-reset-email");

const emailEnv = {
	RESEND_API_KEY: "re_test_api_key",
	EMAIL_FROM: "CareQueue <no-reply@example.test>",
	PUBLIC_APP_URL: "https://carequeue.example.test",
};

const smtpEnv = {
	SMTP_HOST: "smtp.gmail.com",
	SMTP_PORT: "465",
	SMTP_SECURE: "true",
	SMTP_USER: "sender@gmail.com",
	SMTP_PASSWORD: "secret-password",
	SMTP_FROM: "CareQueue <sender@gmail.com>",
	PUBLIC_APP_URL: "https://carequeue.example.test",
};

test("Resend config requires an API key, sender, and public app URL", () => {
	assert.equal(getPasswordResetEmailConfig({}), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, RESEND_API_KEY: " " }), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, EMAIL_FROM: " " }), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, PUBLIC_APP_URL: "not-a-url" }), null);
	assert.deepEqual(getPasswordResetEmailConfig(emailEnv), {
		apiKey: emailEnv.RESEND_API_KEY,
		from: emailEnv.EMAIL_FROM,
		publicAppUrl: emailEnv.PUBLIC_APP_URL,
	});
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, PUBLIC_APP_URL: "", CLIENT_ORIGIN: "https://client.example.test" }).publicAppUrl, "https://client.example.test");
});

test("SMTP config is accepted when no Resend API key is configured", () => {
	assert.deepEqual(getPasswordResetEmailConfig(smtpEnv), {
		host: smtpEnv.SMTP_HOST,
		port: 465,
		secure: true,
		user: smtpEnv.SMTP_USER,
		pass: smtpEnv.SMTP_PASSWORD,
		from: smtpEnv.SMTP_FROM,
		publicAppUrl: smtpEnv.PUBLIC_APP_URL,
	});
});

test("password reset email can be delivered via SMTP transport", async () => {
	let sentMessage;
	const result = await sendPasswordResetEmail({
		email: "staff@example.test",
		token: "smtp-token",
		role: "staff",
		env: smtpEnv,
		createTransport(config) {
			assert.deepEqual(config, {
				host: smtpEnv.SMTP_HOST,
				port: 465,
				secure: true,
				auth: { user: smtpEnv.SMTP_USER, pass: smtpEnv.SMTP_PASSWORD },
			});
			return {
				async sendMail(message) {
					sentMessage = message;
					return { response: "250 OK" };
				},
			};
		},
	});
	assert.equal(sentMessage.from, smtpEnv.SMTP_FROM);
	assert.equal(sentMessage.to, "staff@example.test");
	assert.equal(sentMessage.subject, "Reset your CareQueue password");
	assert.match(sentMessage.text, /resetToken=smtp-token/);
	assert.deepEqual(result, { response: "250 OK" });
});

test("password reset URL keeps its token in the fragment", () => {
	const resetUrl = new URL(buildPasswordResetUrl(emailEnv.PUBLIC_APP_URL, "staff@example.test", "one-time-token", "staff"));
	assert.equal(resetUrl.origin, emailEnv.PUBLIC_APP_URL);
	assert.equal(resetUrl.search, "");
	assert.equal(resetUrl.hash.includes("resetToken=one-time-token"), true);
	assert.equal(resetUrl.hash.includes("resetEmail=staff%40example.test"), true);
});

test("password reset email uses the Resend client and preserves its payload", async () => {
	let sentMessage;
	let providedApiKey;
	const result = await sendPasswordResetEmail({
		email: "staff@example.test",
		token: "one-time-token",
		role: "staff",
		env: emailEnv,
		createClient(apiKey) {
			providedApiKey = apiKey;
			return { emails: { async send(message) { sentMessage = message; return { data: { id: "email_123" }, error: null }; } } };
		},
	});
	assert.equal(providedApiKey, emailEnv.RESEND_API_KEY);
	assert.equal(sentMessage.to, "staff@example.test");
	assert.equal(sentMessage.from, emailEnv.EMAIL_FROM);
	assert.equal(sentMessage.subject, "Reset your CareQueue password");
	assert.match(sentMessage.text, /resetToken=one-time-token/);
	assert.deepEqual(result, { id: "email_123" });
});

test("email delivery refuses missing Resend configuration", async () => {
	await assert.rejects(
		sendPasswordResetEmail({ email: "staff@example.test", token: "token", role: "staff", env: {} }),
		(error) => error.code === "EMAIL_NOT_CONFIGURED",
	);
});

test("staff invitation email preserves its recipient, sender, and content", async () => {
	let sentMessage;
	await sendStaffInvitationEmail({
		email: "new.staff@example.test",
		name: "New Staff",
		clinic: "Metro Family Care Centre",
		temporaryPassword: "temporary-password",
		token: "one-time-token",
		env: emailEnv,
		createClient() {
			return { emails: { async send(message) { sentMessage = message; return { data: { id: "email_456" }, error: null }; } } };
		},
	});
	assert.equal(sentMessage.to, "new.staff@example.test");
	assert.equal(sentMessage.from, emailEnv.EMAIL_FROM);
	assert.equal(sentMessage.subject, "Your CareQueue staff account");
	assert.match(sentMessage.text, /Temporary password: temporary-password/);
	assert.match(sentMessage.text, /resetToken=one-time-token/);
});

test("provider rejections expose safe status details without provider messages", async () => {
	await assert.rejects(
		sendStaffInvitationEmail({
			email: "new.staff@example.test",
			name: "New Staff",
			clinic: "Metro Family Care Centre",
			temporaryPassword: "temporary-password",
			token: "one-time-token",
			env: emailEnv,
			createClient() {
				return { emails: { async send() { return { data: null, error: { name: "validation_error", message: "private provider detail", statusCode: 422 } }; } } };
			},
		}),
		(error) => error.code === "validation_error" && error.responseCode === 422 && !error.message.includes("private provider detail"),
	);
});

test("network errors retain a safe diagnostic code", async () => {
	await assert.rejects(
		sendPasswordResetEmail({
			email: "staff@example.test",
			token: "one-time-token",
			role: "staff",
			env: emailEnv,
			createClient() {
				return { emails: { async send() { throw Object.assign(new Error("private network detail"), { code: "ETIMEDOUT" }); } } };
			},
		}),
		(error) => error.code === "ETIMEDOUT" && !error.message.includes("private network detail"),
	);
});

test("staff invitation email still sends a setup link when no temporary password is available", async () => {
	let sentMessage;
	await sendStaffInvitationEmail({
		email: "approved.staff@example.test",
		name: "Approved Staff",
		clinic: "Metro Family Care Centre",
		token: "approved-token",
		env: emailEnv,
		createClient() {
			return { emails: { async send(message) { sentMessage = message; return { data: { id: "email_789" }, error: null }; } } };
		},
	});
	assert.equal(sentMessage.to, "approved.staff@example.test");
	assert.match(sentMessage.text, /Use the secure setup link below/);
	assert.match(sentMessage.text, /resetToken=approved-token/);
});
