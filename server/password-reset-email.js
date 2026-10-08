const nodemailer = require("nodemailer");
<<<<<<< HEAD

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
	if (Boolean(username) !== Boolean(password) || (port === 465 && !secure) || (port === 587 && secure)) return null;
=======
const { Resend } = require("resend");

function getPasswordResetEmailConfig(env = process.env) {
	const resendApiKey = String(env.RESEND_API_KEY || "").trim();
	const smtpHost = String(env.SMTP_HOST || "").trim();
	const smtpPort = Number.parseInt(String(env.SMTP_PORT || "").trim(), 10);
	const smtpSecure = String(env.SMTP_SECURE || "").trim().toLowerCase() === "true";
	const smtpUser = String(env.SMTP_USER || "").trim();
	const smtpPassword = String(env.SMTP_PASSWORD || "").trim();
	const smtpFrom = String(env.SMTP_FROM || env.EMAIL_FROM || "").trim();
	const publicAppUrl = String(env.PUBLIC_APP_URL || env.CLIENT_ORIGIN || "").split(",")[0].trim();
	if (!publicAppUrl) return null;
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
	try {
		const parsedUrl = new URL(publicAppUrl);
		if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
	} catch {
		return null;
	}
<<<<<<< HEAD
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
=======

	if (resendApiKey && smtpFrom) {
		return { apiKey: resendApiKey, from: smtpFrom, publicAppUrl };
	}

	if (smtpHost && smtpUser && smtpPassword && smtpFrom) {
		return {
			host: smtpHost,
			port: Number.isInteger(smtpPort) && smtpPort > 0 ? smtpPort : 587,
			secure: smtpSecure,
			user: smtpUser,
			pass: smtpPassword,
			from: smtpFrom,
			publicAppUrl,
		};
	}

	return null;
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
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

<<<<<<< HEAD
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
=======
async function sendEmail({ to, subject, text, env, createClient, createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("Email delivery is not configured.", "EMAIL_NOT_CONFIGURED");

	if (config.apiKey) {
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

	const transporterFactory = createTransport || ((smtpConfig) => nodemailer.createTransport({
		host: smtpConfig.host,
		port: smtpConfig.port,
		secure: smtpConfig.secure,
		auth: { user: smtpConfig.user, pass: smtpConfig.pass },
	}));
	try {
		const transporter = transporterFactory({
			host: config.host,
			port: config.port,
			secure: config.secure,
			auth: { user: config.user, pass: config.pass },
		});
		return transporter.sendMail({ from: config.from, to, subject, text });
	} catch (cause) {
		throw createDeliveryError(
			"SMTP could not send the email. Verify your SMTP host, credentials, and sender configuration.",
			typeof cause?.code === "string" ? cause.code : "SMTP_SEND_ERROR",
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
			cause?.responseCode,
		);
	}
}

<<<<<<< HEAD
async function sendPasswordResetEmail({ email, token, role, env = process.env, createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("SMTP email delivery is not configured correctly.", "EMAIL_NOT_CONFIGURED");
=======
async function sendPasswordResetEmail({ email, token, role, env = process.env, createClient, createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("Email delivery is not configured.", "EMAIL_NOT_CONFIGURED");
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
	return sendEmail({
		to: email,
		subject: "Reset your CareQueue password",
		text: `A password reset was requested for your CareQueue account. Open this one-time link within 30 minutes to set a new password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
		env,
<<<<<<< HEAD
=======
		createClient,
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
		createTransport,
	});
}

<<<<<<< HEAD
async function sendStaffInvitationEmail({ email, name, clinic, role = "staff", temporaryPassword, token, env = process.env, createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("SMTP email delivery is not configured correctly.", "EMAIL_NOT_CONFIGURED");
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
<<<<<<< HEAD
	return sendEmail({
		to: email,
		subject: "Your CareQueue staff account",
		text: `Hello ${name},\n\nAn administrator created your CareQueue ${role} account for ${clinic}.\n\nTemporary password: ${temporaryPassword}\n\nOpen this one-time link within 30 minutes to create your permanent password:\n\n${resetUrl}\n\nIf you did not expect this account, contact your clinic administrator.`,
		env,
		createTransport,
=======
	const transporter = createTransport(config.transport);
=======
async function sendStaffInvitationEmail({ email, name, clinic, role = "staff", temporaryPassword, token, env = process.env, createClient, createTransport }) {
	const config = getPasswordResetEmailConfig(env);
	if (!config) throw createDeliveryError("Email delivery is not configured.", "EMAIL_NOT_CONFIGURED");
	const resetUrl = buildPasswordResetUrl(config.publicAppUrl, email, token, role);
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
	const passwordBlock = temporaryPassword
		? `\n\nTemporary password: ${temporaryPassword}\n\n`
		: "\n\nUse the secure setup link below to complete your password.\n\n";
	return sendEmail({
		to: email,
		subject: "Your CareQueue staff account",
		text: `Hello ${name},\n\nAn administrator created your CareQueue ${role} account for ${clinic}.${passwordBlock}Open this one-time link within 30 minutes to create your permanent password:\n\n${resetUrl}\n\nIf you did not expect this account, contact your clinic administrator.`,
<<<<<<< HEAD
>>>>>>> a75f016abb8869163b3093629107b8ee8851d5b5
=======
		env,
		createClient,
		createTransport,
>>>>>>> e47ae0791c5edd71934830d9a7e2389f8f35375d
	});
}

module.exports = { buildPasswordResetUrl, getPasswordResetEmailConfig, sendPasswordResetEmail, sendStaffInvitationEmail };
