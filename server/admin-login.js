function getAdminLoginStage({ passwordValid, token, expectedToken }) {
	if (!passwordValid) return "invalid-credentials";
	if (!token) return "token-required";
	return token === expectedToken ? "authenticated" : "invalid-credentials";
}

module.exports = { getAdminLoginStage };