const nodemailer = require("nodemailer");

function readBooleanEnv(value) {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
		if (["false", "0", "no", "n", "off", ""].includes(normalized)) return false;
	}
	return undefined;
}

function getPasswordResetEmailConfig(env = process.env) {
	const host = String(env.SMTP_HOST || "").trim();
	const from = String(env.SMTP_FROM || "").trim();
	const publicAppUrl = String(env.PUBLIC_APP_URL || env.CLIENT_ORIGIN || "").split(",")[0].trim();
	const port = Number(env.SMTP_PORT || 587);
	const username = String(env.SMTP_USER || "").trim();
	const password = String(env.SMTP_PASSWORD || "").trim();
	const secureSetting = readBooleanEnv(env.SMTP_SECURE);
	const secure = secureSetting === undefined ? port === 465 : secureSetting;
	if (!host || !from || !publicAppUrl || !Number.isInteger(port) || port < 1 || port > 65535) return null;
	if (Boolean(username) !== Boolean(password) || (port === 465 && !secure) || ((port === 587 || port === 2525) && secure)) return null;
	try {
		const parsedUrl = new URL(publicAppUrl);
		if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
	} catch {
		return null;
	}
	return {
		from,
		publicAppUrl,
		transport: {
			host,
			port,
			secure,
			...(username ? { auth: { user: username, pass: password } } : {}),
		},
	};
}

function buildPasswordResetUrl(publicAppUrl, email, token, role) {
	const resetUrl = new URL("/", publicAppUrl);
	resetUrl.hash = new URLSearchParams({ resetEmail: email, resetToken: token, resetRole: role }).toString();
	return resetUrl.toString();
}

function createDeliveryError(message, code, responseCode) {
	const error = new Error(message);
	error.code = code;
	if (Number.isInteger(responseCode)) error.responseCode = responseCode;
	return error;
}

async function sendEmail({ to, subject, text, env, createTransport = nodemailer.createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("SMTP email delivery is not configured correctly.", "EMAIL_NOT_CONFIGURED");
	try {
		const transporter = createTransport(config.transport);
		return await transporter.sendMail({ from: config.from, to, subject, text });
	} catch (cause) {
		throw createDeliveryError(
			"SMTP email delivery failed. Check the SMTP connection, credentials, and sender.",
			typeof cause?.code === "string" ? cause.code : "SMTP_SEND_FAILED",
			cause?.responseCode,
		);
	}
}

async function sendPasswordResetEmail({ email, token, role, env = process.env, createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("SMTP email delivery is not configured correctly.", "EMAIL_NOT_CONFIGURED");
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
	return sendEmail({
		to: email,
		subject: "Reset your CareQueue password",
		text: `A password reset was requested for your CareQueue account. Open this one-time link within 30 minutes to set a new password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
		env,
		createTransport,
	});
}

async function sendStaffInvitationEmail({ email, name, clinic, role = "staff", temporaryPassword, token, env = process.env, createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("SMTP email delivery is not configured correctly.", "EMAIL_NOT_CONFIGURED");
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
	const passwordBlock = temporaryPassword
		? `\n\nTemporary password: ${temporaryPassword}\n\n`
		: "\n\nUse the secure setup link below to complete your password.\n\n";
	return sendEmail({
		to: email,
		subject: "Your CareQueue staff account",
		text: `Hello ${name},\n\nAn administrator created your CareQueue ${role} account for ${clinic}.${passwordBlock}Open this one-time link within 30 minutes to create your permanent password:\n\n${resetUrl}\n\nIf you did not expect this account, contact your clinic administrator.`,
		env,
		createTransport,
	});
}

module.exports = { buildPasswordResetUrl, getPasswordResetEmailConfig, sendPasswordResetEmail, sendStaffInvitationEmail };
