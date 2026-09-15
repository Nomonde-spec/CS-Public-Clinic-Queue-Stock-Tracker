const http = require("node:http");

const port = Number(process.env.PORT) || 3000;

const server = http.createServer((request, response) => {
	response.writeHead(200, { "Content-Type": "application/json" });
	response.end(
		JSON.stringify({
			status: "ok",
			message: "Clinic Queue and Stock Tracker API",
		}),
	);
});

server.listen(port, "0.0.0.0", () => {
	console.log(`Server listening on port ${port}`);
});
