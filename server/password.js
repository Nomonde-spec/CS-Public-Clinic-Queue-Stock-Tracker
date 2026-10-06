const { randomBytes, scryptSync, timingSafeEqual, createHash } = require("node:crypto");

const SCRYPT_KEY_LENGTH = 64;

function hashPassword(password) {
	const salt = randomBytes(16);
	const derivedKey = scryptSync(String(password), salt, SCRYPT_KEY_LENGTH);
	return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

function verifyPassword(password, encodedHash) {
	if (typeof encodedHash !== "string") return false;
	const [algorithm, saltValue, keyValue] = encodedHash.split("$");
	if (algorithm !== "scrypt" || !saltValue || !keyValue) return false;
	try {
		const salt = Buffer.from(saltValue, "base64url");
		const expectedKey = Buffer.from(keyValue, "base64url");
		if (expectedKey.length !== SCRYPT_KEY_LENGTH) return false;
		const actualKey = scryptSync(String(password), salt, SCRYPT_KEY_LENGTH);
		return timingSafeEqual(actualKey, expectedKey);
	} catch {
		return false;
	}
}

function createResetToken() {
	return randomBytes(32).toString("base64url");
}

function hashResetToken(token) {
	return createHash("sha256").update(String(token)).digest("hex");
}

function isValidPassword(password) {
	return typeof password === "string" && password.length >= 6 && password.length <= 256;
}

module.exports = { hashPassword, verifyPassword, createResetToken, hashResetToken, isValidPassword };
