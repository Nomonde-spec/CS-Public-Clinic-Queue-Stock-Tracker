const { Resend } = require("resend");

function getPasswordResetEmailConfig(env = process.env) {
	const apiKey = String(env.RESEND_API_KEY || "").trim();
	const from = String(env.EMAIL_FROM || "").trim();
	const publicAppUrl = String(env.PUBLIC_APP_URL || env.CLIENT_ORIGIN || "").split(",")[0].trim();
	if (!apiKey || !from || !publicAppUrl) return null;
	try {
		const parsedUrl = new URL(publicAppUrl);
		if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
	} catch {
		return null;
	}
	return { apiKey, from, publicAppUrl };
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

async function sendEmail({ to, subject, text, env, createClient }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("Resend email delivery is not configured.", "EMAIL_NOT_CONFIGURED");
	const clientFactory = createClient || ((apiKey) => new Resend(apiKey));
	let result;
	try {
		const client = clientFactory(config.apiKey);
		result = await client.emails.send({ from: config.from, to, subject, text });
	} catch (cause) {
		throw createDeliveryError(
			"Resend could not be reached. Check the API service network and retry.",
			typeof cause?.code === "string" ? cause.code : "RESEND_NETWORK_ERROR",
			cause?.statusCode,
		);
	}
	if (result?.error) {
		throw createDeliveryError(
			"Resend rejected the email. Check the API key and verify the sender domain.",
			typeof result.error.name === "string" ? result.error.name : "RESEND_API_ERROR",
			result.error.statusCode,
		);
	}
	if (!result?.data) throw createDeliveryError("Resend did not confirm email acceptance.", "RESEND_EMPTY_RESPONSE");
	return result.data;
}

async function sendPasswordResetEmail({ email, token, role, env = process.env, createClient }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("Resend email delivery is not configured.", "EMAIL_NOT_CONFIGURED");
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
	return sendEmail({
		to: email,
		subject: "Reset your CareQueue password",
		text: `A password reset was requested for your CareQueue account. Open this one-time link within 30 minutes to set a new password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
		env,
		createClient,
	});
}

async function sendStaffInvitationEmail({ email, name, clinic, role = "staff", temporaryPassword, token, env = process.env, createClient }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("Resend email delivery is not configured.", "EMAIL_NOT_CONFIGURED");
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
	const passwordBlock = temporaryPassword
		? `\n\nTemporary password: ${temporaryPassword}\n\n`
		: "\n\nUse the secure setup link below to complete your password.\n\n";
	return sendEmail({
		to: email,
		subject: "Your CareQueue staff account",
		text: `Hello ${name},\n\nAn administrator created your CareQueue ${role} account for ${clinic}.${passwordBlock}Open this one-time link within 30 minutes to create your permanent password:\n\n${resetUrl}\n\nIf you did not expect this account, contact your clinic administrator.`,
		env,
		createClient,
	});
}

module.exports = { buildPasswordResetUrl, getPasswordResetEmailConfig, sendPasswordResetEmail, sendStaffInvitationEmail };
