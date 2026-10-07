const nodemailer = require("nodemailer");

function getPasswordResetEmailConfig(env = process.env) {
	const host = env.SMTP_HOST?.trim();
	const from = env.SMTP_FROM?.trim();
	const publicAppUrl = (env.PUBLIC_APP_URL || env.CLIENT_ORIGIN || "").split(",")[0].trim();
	const port = Number(env.SMTP_PORT || 587);
	const username = env.SMTP_USER?.trim();
	const password = env.SMTP_PASSWORD;
	if (!host || !from || !publicAppUrl || !Number.isInteger(port) || port < 1 || port > 65535 || Boolean(username) !== Boolean(password)) return null;
	try {
		const parsedUrl = new URL(publicAppUrl);
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null;
	} catch {
		return null;
	}
	return {
		from,
		publicAppUrl,
		transport: {
			host,
			port,
			secure: env.SMTP_SECURE === undefined ? port === 465 : env.SMTP_SECURE.toLowerCase() === "true",
			...(username && password ? { auth: { user: username, pass: password } } : {}),
		},
	};
}

function buildPasswordResetUrl(publicAppUrl, email, token, role) {
	const resetUrl = new URL("/", publicAppUrl);
	resetUrl.hash = new URLSearchParams({ resetEmail: email, resetToken: token, resetRole: role }).toString();
	return resetUrl.toString();
}

async function sendPasswordResetEmail({ email, token, role, env = process.env, createTransport = nodemailer.createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw new Error("SMTP password reset delivery is not configured.");
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
	const transporter = createTransport(config.transport);
	await transporter.sendMail({
		from: config.from,
		to: email,
		subject: "Reset your CareQueue password",
		text: `A password reset was requested for your CareQueue account. Open this one-time link within 30 minutes to set a new password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
	});
}

async function sendStaffInvitationEmail({ email, name, clinic, role = "staff", temporaryPassword, token, env = process.env, createTransport = nodemailer.createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw new Error("SMTP staff invitation delivery is not configured.");
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
	const transporter = createTransport(config.transport);
	await transporter.sendMail({
		from: config.from,
		to: email,
		subject: "Your CareQueue staff account",
		text: `Hello ${name},\n\nAn administrator created your CareQueue ${role} account for ${clinic}.\n\nTemporary password: ${temporaryPassword}\n\nOpen this one-time link within 30 minutes to create your permanent password:\n\n${resetUrl}\n\nIf you did not expect this account, contact your clinic administrator.`,
	});
}

module.exports = { buildPasswordResetUrl, getPasswordResetEmailConfig, sendPasswordResetEmail, sendStaffInvitationEmail };
