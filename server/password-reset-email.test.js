const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPasswordResetUrl, getPasswordResetEmailConfig, sendPasswordResetEmail, sendStaffInvitationEmail } = require("./password-reset-email");

const emailEnv = {
	SMTP_HOST: "smtp.example.test",
	SMTP_PORT: "587",
	SMTP_SECURE: "false",
	SMTP_USER: "user@example.test",
	SMTP_PASSWORD: "test-password",
	SMTP_FROM: "CareQueue <no-reply@example.test>",
	PUBLIC_APP_URL: "https://carequeue.example.test",
};

<<<<<<< HEAD
test("SMTP config validates sender, host, credentials, and TLS mode", () => {
=======
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
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
	assert.equal(getPasswordResetEmailConfig({}), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, SMTP_HOST: " " }), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, SMTP_FROM: " " }), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, PUBLIC_APP_URL: "not-a-url" }), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, SMTP_USER: "" }), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, SMTP_SECURE: "true" }), null);
	assert.equal(getPasswordResetEmailConfig({ ...emailEnv, SMTP_PORT: "465", SMTP_SECURE: "false" }), null);
	assert.deepEqual(getPasswordResetEmailConfig(emailEnv), {
		from: emailEnv.SMTP_FROM,
		publicAppUrl: emailEnv.PUBLIC_APP_URL,
		transport: {
			host: emailEnv.SMTP_HOST,
			port: 587,
			secure: false,
			auth: { user: emailEnv.SMTP_USER, pass: emailEnv.SMTP_PASSWORD },
		},
	});
	assert.equal(getPasswordResetEmailConfig({
		...emailEnv,
		SMTP_PORT: "465",
		SMTP_SECURE: undefined,
	}).transport.secure, true);
	assert.equal(getPasswordResetEmailConfig({
		...emailEnv,
		PUBLIC_APP_URL: "",
		CLIENT_ORIGIN: "https://client.example.test",
	}).publicAppUrl, "https://client.example.test");
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

test("password reset email uses the SMTP transport and preserves its payload", async () => {
	let sentMessage;
	let transportOptions;
	let sentResult;
	const result = await sendPasswordResetEmail({
		email: "staff@example.test",
		token: "one-time-token",
		role: "staff",
		env: emailEnv,
		createTransport(options) {
			transportOptions = options;
			return { async sendMail(message) { sentMessage = message; return (sentResult = { messageId: "email_123" }); } };
		},
	});
	assert.deepEqual(transportOptions, getPasswordResetEmailConfig(emailEnv).transport);
	assert.equal(sentMessage.to, "staff@example.test");
	assert.equal(sentMessage.from, emailEnv.SMTP_FROM);
	assert.equal(sentMessage.subject, "Reset your CareQueue password");
	assert.match(sentMessage.text, /resetToken=one-time-token/);
	assert.deepEqual(result, sentResult);
});

test("email delivery refuses missing SMTP configuration", async () => {
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
		createTransport() {
			return { async sendMail(message) { sentMessage = message; return { messageId: "email_456" }; } };
		},
	});
	assert.equal(sentMessage.to, "new.staff@example.test");
	assert.equal(sentMessage.from, emailEnv.SMTP_FROM);
	assert.equal(sentMessage.subject, "Your CareQueue staff account");
	assert.match(sentMessage.text, /Temporary password: temporary-password/);
	assert.match(sentMessage.text, /resetToken=one-time-token/);
});

<<<<<<< HEAD
<<<<<<< HEAD
test("SMTP authentication failures retain safe diagnostics", async () => {
=======
test("provider rejections expose safe status details without provider messages", async () => {
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
	await assert.rejects(
		sendStaffInvitationEmail({
			email: "new.staff@example.test",
			name: "New Staff",
			clinic: "Metro Family Care Centre",
			temporaryPassword: "temporary-password",
			token: "one-time-token",
			env: emailEnv,
			createTransport() {
				return { async sendMail() { throw Object.assign(new Error("private SMTP detail"), { code: "EAUTH", responseCode: 535 }); } };
			},
		}),
		(error) => error.code === "EAUTH" && error.responseCode === 535 && !error.message.includes("private SMTP detail"),
	);
});

test("SMTP network errors retain a safe diagnostic code", async () => {
	await assert.rejects(
		sendPasswordResetEmail({
			email: "staff@example.test",
			token: "one-time-token",
			role: "staff",
			env: emailEnv,
			createTransport() {
				return { async sendMail() { throw Object.assign(new Error("private network detail"), { code: "ETIMEDOUT" }); } };
			},
		}),
		(error) => error.code === "ETIMEDOUT" && !error.message.includes("private network detail"),
	);
<<<<<<< HEAD
=======
=======
});

>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
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
<<<<<<< HEAD
>>>>>>> a75f016abb8869163b3093629107b8ee8851d5b5
=======
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
});
