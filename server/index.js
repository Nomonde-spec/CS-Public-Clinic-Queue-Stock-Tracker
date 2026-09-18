const http = require("node:http");
const { Pool } = require("pg");
const { getAvailability, parseStockCount, isAllowedClinicStatus } = require("./validation");

const port = Number(process.env.PORT) || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "http://localhost:3000")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

const send = (response, status, body) => {
	response.writeHead(status, {
		"Access-Control-Allow-Origin": response.req.headers.origin && allowedOrigins.includes(response.req.headers.origin)
			? response.req.headers.origin
			: allowedOrigins[0],
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
		"Content-Type": "application/json",
	});
	response.end(JSON.stringify(body));
};

const readBody = async (request) => {
	let body = "";
	for await (const chunk of request) body += chunk;
	return body ? JSON.parse(body) : {};
};

const staffQuery = `
	SELECT s.id, s.name, s.email, s.role, s.status,
	       COALESCE(c.name, 'All clinics') AS clinic
	FROM staff s
	LEFT JOIN clinics c ON c.id = s.clinic_id
`;

async function ensureDatabase() {
	await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS clinics (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) UNIQUE NOT NULL,
			province VARCHAR(100) NOT NULL DEFAULT 'Gauteng',
			district VARCHAR(255),
			address VARCHAR(255),
			hours VARCHAR(255),
			phone VARCHAR(255),
			wait INTEGER,
			patients INTEGER NOT NULL DEFAULT 0,
			stock INTEGER NOT NULL DEFAULT 0,
			status VARCHAR(20) NOT NULL DEFAULT 'Open',
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			created_at TIMESTAMP DEFAULT NOW()
		)
	`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS medications (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) UNIQUE NOT NULL,
			category VARCHAR(255) NOT NULL,
			availability VARCHAR(20) NOT NULL,
			clinics VARCHAR(255) NOT NULL
		)
	`);
	await pool.query(`ALTER TABLE medications ADD COLUMN IF NOT EXISTS category VARCHAR(255) NOT NULL DEFAULT 'Uncategorized'`);
	await pool.query(`ALTER TABLE medications ADD COLUMN IF NOT EXISTS availability VARCHAR(20) NOT NULL DEFAULT 'In Stock'`);
	await pool.query(`ALTER TABLE medications ADD COLUMN IF NOT EXISTS clinics VARCHAR(255) NOT NULL DEFAULT ''`);
	await pool.query(`ALTER TABLE medications ADD COLUMN IF NOT EXISTS stock_count INTEGER NOT NULL DEFAULT 0`);
	await pool.query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS wait INTEGER`);
	await pool.query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS province VARCHAR(100) NOT NULL DEFAULT 'Gauteng'`);
	await pool.query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS patients INTEGER NOT NULL DEFAULT 0`);
	await pool.query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0`);
	await pool.query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Open'`);
	await pool.query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);
	await pool.query(`ALTER TABLE clinics DROP CONSTRAINT IF EXISTS clinics_status_check`);
	await pool.query(`DO $$ BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint WHERE conname = 'clinics_status_check'
		) THEN
			ALTER TABLE clinics ADD CONSTRAINT clinics_status_check CHECK (status IN ('Open', 'Closed', 'Open - Low Wait', 'Open - Moderate Wait', 'Open - Busy', 'Open - Very Busy', 'Busy', 'Very Busy'));
		END IF;
	END $$`);

	await pool.query(`
		CREATE TABLE IF NOT EXISTS staff (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			role VARCHAR(20) NOT NULL DEFAULT 'staff',
			clinic_id INTEGER REFERENCES clinics(id),
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)
	`);

	const defaultClinics = [
		{ name: "Metro Family Care Centre", province: "Gauteng", district: "Central District", address: "220 Plaza Avenue", hours: "08:00 - 17:00", phone: "011 555 0101" },
		{ name: "Northside Public Health Clinic", province: "KwaZulu-Natal", district: "Sector 12", address: "12 Northside Road", hours: "08:00 - 17:00", phone: "011 555 0102" },
		{ name: "Eastside Community Dispensary", province: "Eastern Cape", district: "East Area", address: "45 East Market Street", hours: "08:00 - 17:00", phone: "011 555 0103" },
		{ name: "Lakeside Community Clinic", province: "Western Cape", district: "Lakeside District", address: "8 Lakeside Drive", hours: "08:00 - 17:00", phone: "011 555 0104" },
		{ name: "Oakridge Triage & Care Node", province: "Free State", district: "Oakridge", address: "3 Oakridge Way", hours: "08:00 - 17:00", phone: "011 555 0105" },
		{ name: "Mopani Community Health Centre", province: "Limpopo", district: "Mopani District", address: "18 Baobab Road", hours: "08:00 - 17:00", phone: "015 555 0106" },
		{ name: "Highveld Public Clinic", province: "Mpumalanga", district: "Highveld", address: "64 Panorama Street", hours: "08:00 - 17:00", phone: "013 555 0107" },
		{ name: "Karoo Wellness Clinic", province: "Northern Cape", district: "Karoo District", address: "7 Kalahari Avenue", hours: "08:00 - 17:00", phone: "053 555 0108" },
		{ name: "Mthatha Public Health Node", province: "North West", district: "Mafikeng District", address: "31 Heritage Road", hours: "08:00 - 17:00", phone: "018 555 0109" },
	];

	for (const clinic of defaultClinics) {
		await pool.query(
			`INSERT INTO clinics (name, province, district, address, hours, phone)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (name) DO NOTHING`,
			[clinic.name, clinic.province, clinic.district, clinic.address, clinic.hours, clinic.phone],
		);
	}
	for (const clinic of defaultClinics) {
		await pool.query("UPDATE clinics SET province = $1 WHERE name = $2", [clinic.province, clinic.name]);
	}

	const adminEmail = process.env.ADMIN_EMAIL || "sys.admin@carequeue.gov";
	await pool.query(
		`INSERT INTO staff (name, email, password_hash, role, status)
		 VALUES ($1, $2, $3, 'admin', 'approved')
		 ON CONFLICT (email) DO NOTHING`,
		["System Administrator", adminEmail, "managed-by-portal"],
	);

	const clinicId = await pool.query("SELECT id FROM clinics WHERE name = 'Metro Family Care Centre'");
	if (clinicId.rows[0]) {
		await pool.query(
			`INSERT INTO staff (name, email, password_hash, role, clinic_id, status)
			 VALUES ($1, $2, $3, 'staff', $4, 'approved')
			 ON CONFLICT (email) DO NOTHING`,
			["Dr. Sarah Jenkins", "s.jenkins@metrocare.gov", "managed-by-portal", clinicId.rows[0].id],
		);
	}

	const defaultMedications = [
		["Amoxicillin 500mg Capsules", "Antibiotic", "Low Stock", "50 units in stock", 50],
		["Albuterol 90mcg Inhaler", "Respiratory", "In Stock", "250 units in stock", 250],
		["Metformin 850mg Tablets", "Antidiabetic", "In Stock", "250 units in stock", 250],
		["Paracetamol 500mg Tablets", "Pain & Fever", "In Stock", "250 units in stock", 250],
		["Atorvastatin 20mg Tablets", "Cardiovascular", "Out of Stock", "0 units in stock", 0],
		["Lisinopril 10mg Tablets", "Cardiovascular", "Low Stock", "50 units in stock", 50],
	];
	for (const medication of defaultMedications) {
		await pool.query(
			`INSERT INTO medications (name, category, availability, clinics, stock_count) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
			medication,
		);
	}
	await pool.query(`UPDATE medications SET stock_count = CASE WHEN name IN ('Amoxicillin 500mg Capsules', 'Lisinopril 10mg Tablets') THEN 50 WHEN name IN ('Albuterol 90mcg Inhaler', 'Metformin 850mg Tablets', 'Paracetamol 500mg Tablets') THEN 250 ELSE stock_count END WHERE stock_count = 0`);
	await pool.query(`UPDATE medications SET availability = CASE WHEN stock_count = 0 THEN 'Out of Stock' WHEN stock_count >= 250 THEN 'In Stock' ELSE 'Low Stock' END`);
	await pool.query(`UPDATE clinics SET wait = 12, patients = 4, stock = 98 WHERE name = 'Metro Family Care Centre' AND wait IS NULL`);
	await pool.query(`UPDATE clinics SET wait = 35, patients = 14, stock = 84 WHERE name = 'Northside Public Health Clinic' AND wait IS NULL`);
	await pool.query(`UPDATE clinics SET wait = 55, patients = 25, stock = 90 WHERE name = 'Eastside Community Dispensary' AND wait IS NULL`);
	await pool.query(`UPDATE clinics SET patients = 0, stock = 55, status = 'Closed' WHERE name = 'Lakeside Community Clinic' AND stock = 0`);
	await pool.query(`UPDATE clinics SET wait = 8, patients = 2, stock = 95 WHERE name = 'Oakridge Triage & Care Node' AND wait IS NULL`);
}

async function handleRequest(request, response) {
	if (request.method === "OPTIONS") return send(response, 204, {});
	if (request.url === "/") return send(response, 200, { status: "ok", message: "Clinic Queue and Stock Tracker API" });

	try {
		if (request.method === "GET" && request.url === "/api/staff") {
			const result = await pool.query(`${staffQuery} ORDER BY s.created_at ASC`);
			return send(response, 200, result.rows);
		}

		if (request.method === "GET" && request.url === "/api/summary") {
			const [clinicCount, staffCount, pendingCount] = await Promise.all([
				pool.query("SELECT COUNT(*)::int AS total FROM clinics"),
				pool.query("SELECT COUNT(*)::int AS total FROM staff WHERE role = 'staff' AND status = 'approved'"),
				pool.query("SELECT COUNT(*)::int AS total FROM staff WHERE role = 'staff' AND status = 'pending'"),
			]);
			return send(response, 200, {
				activeClinics: clinicCount.rows[0].total,
				totalStaff: staffCount.rows[0].total,
				pendingApprovals: pendingCount.rows[0].total,
			});
		}

		if (request.method === "GET" && request.url === "/api/public-data") {
			const [clinicResult, medicationResult] = await Promise.all([
				pool.query("SELECT name, province, district, address, hours, phone, wait, patients, stock, status, updated_at AS \"updatedAt\" FROM clinics ORDER BY id"),
				pool.query("SELECT name, category, availability, clinics, stock_count AS \"stockCount\" FROM medications ORDER BY id"),
			]);
			return send(response, 200, { clinics: clinicResult.rows, medications: medicationResult.rows });
		}

		if (request.method === "POST" && request.url === "/api/medications") {
			const body = await readBody(request);
			const name = String(body.name || "").trim();
			const category = String(body.category || "").trim();
			const parsedStock = parseStockCount(body.stockCount);
			if (!name || !category || !parsedStock.ok) {
				return send(response, 400, { error: parsedStock.ok ? "Name and category are required." : parsedStock.message });
			}
			const stockCount = parsedStock.value;
			const availability = getAvailability(stockCount);
			const clinics = String(body.clinics || "All clinics").trim() || "All clinics";
			try {
				const result = await pool.query(
					`INSERT INTO medications (name, category, availability, clinics, stock_count)
					 VALUES ($1, $2, $3, $4, $5)
					 RETURNING name, category, availability, clinics, stock_count AS "stockCount"`,
					[name, category, availability, clinics, stockCount],
				);
				return send(response, 201, result.rows[0]);
			} catch (error) {
				if (error.code === "23505") return send(response, 409, { error: "A medication with this name already exists." });
				throw error;
			}
		}

		const clinicUpdateMatch = request.url.match(/^\/api\/clinics\/([^/]+)$/);
		if (clinicUpdateMatch && request.method === "PATCH") {
			const body = await readBody(request);
			const nextStatus = body.status ?? "Open";
			if (!isAllowedClinicStatus(nextStatus)) {
				return send(response, 400, { error: "Invalid clinic status." });
			}
			const nextPatients = Number(body.patients);
			const nextWait = Number(body.wait);
			if (!Number.isInteger(nextPatients) || nextPatients < 0 || !Number.isInteger(nextWait) || nextWait < 0) {
				return send(response, 400, { error: "Queue values must be non-negative whole numbers." });
			}
			const result = await pool.query(
				"UPDATE clinics SET patients = $1, wait = $2, status = $3, updated_at = NOW() WHERE name = $4 RETURNING name, district, address, hours, phone, wait, patients, stock, status, updated_at AS \"updatedAt\"",
				[nextPatients, nextWait, nextStatus, decodeURIComponent(clinicUpdateMatch[1])],
			);
			return result.rows[0] ? send(response, 200, result.rows[0]) : send(response, 404, { error: "Clinic not found." });
		}

		const medicationUpdateMatch = request.url.match(/^\/api\/medications\/([^/]+)$/);
		if (medicationUpdateMatch && request.method === "PATCH") {
			const body = await readBody(request);
			const parsedStock = parseStockCount(body.stockCount);
			if (!parsedStock.ok) {
				return send(response, 400, { error: parsedStock.message });
			}
			const stockCount = parsedStock.value;
			const result = await pool.query(
				"UPDATE medications SET availability = $1, clinics = $2, stock_count = $3 WHERE name = $4 RETURNING name, category, availability, clinics, stock_count AS \"stockCount\"",
				[getAvailability(stockCount), String(body.clinics || "All clinics").trim() || "All clinics", stockCount, decodeURIComponent(medicationUpdateMatch[1])],
			);
			return result.rows[0] ? send(response, 200, result.rows[0]) : send(response, 404, { error: "Medication not found." });
		}

		if (request.method === "POST" && request.url === "/api/auth/login") {
			const body = await readBody(request);
			if (body.role === "admin") {
				const valid = body.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()
					&& body.password === process.env.ADMIN_PASSWORD
					&& body.token === process.env.ADMIN_TOKEN;
				if (!valid) {
					const staffAccount = await pool.query("SELECT 1 FROM staff WHERE email = $1 AND role = 'staff' AND status = 'approved'", [body.email?.toLowerCase()]);
					if (staffAccount.rows[0]) return send(response, 403, { error: "This email belongs to an approved staff account. Select Staff access to sign in." });
				}
				return valid ? send(response, 200, { role: "admin", email: process.env.ADMIN_EMAIL }) : send(response, 401, { error: "Invalid administrator credentials." });
			}
			const staff = await pool.query(`${staffQuery} WHERE s.email = $1 AND s.role = 'staff' AND s.status = 'approved'`, [body.email?.toLowerCase()]);
			return staff.rows[0] ? send(response, 200, { role: "staff", name: staff.rows[0].name, email: staff.rows[0].email, clinic: staff.rows[0].clinic }) : send(response, 401, { error: "This staff account is not approved." });
		}

		if (request.method === "POST" && request.url === "/api/staff") {
			const body = await readBody(request);
			const clinic = await pool.query("SELECT id FROM clinics WHERE name = $1", [body.clinic]);
			if (!body.name || !body.email || !clinic.rows[0]) return send(response, 400, { error: "Name, email, and a valid clinic are required." });
			const email = String(body.email).trim().toLowerCase();
			const duplicate = await pool.query("SELECT 1 FROM staff WHERE email = $1", [email]);
			if (duplicate.rows[0]) return send(response, 409, { error: "A staff account with this email already exists." });
			const result = await pool.query(
				`INSERT INTO staff (name, email, password_hash, role, clinic_id, status)
				 VALUES ($1, $2, $3, 'staff', $4, $5)
				 RETURNING id`,
				[body.name, email, "managed-by-portal", clinic.rows[0].id, body.status || "pending"],
			);
			const staff = await pool.query(`${staffQuery} WHERE s.id = $1`, [result.rows[0].id]);
			return send(response, 201, staff.rows[0]);
		}

		const staffMatch = request.url.match(/^\/api\/staff\/([^/]+)$/);
		if (staffMatch && request.method === "PATCH") {
			const body = await readBody(request);
			const fields = [];
			const values = [];
			if (body.name) { fields.push(`name = $${values.length + 1}`); values.push(body.name); }
			if (body.email) { fields.push(`email = $${values.length + 1}`); values.push(body.email.toLowerCase()); }
			if (body.status) { fields.push(`status = $${values.length + 1}`); values.push(body.status); }
			if (body.clinic) {
				const clinic = await pool.query("SELECT id FROM clinics WHERE name = $1", [body.clinic]);
				if (!clinic.rows[0]) return send(response, 400, { error: "Invalid clinic." });
				fields.push(`clinic_id = $${values.length + 1}`); values.push(clinic.rows[0].id);
			}
			if (!fields.length) return send(response, 400, { error: "No staff changes supplied." });
			values.push(staffMatch[1]);
			await pool.query(`UPDATE staff SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`, values);
			const staff = await pool.query(`${staffQuery} WHERE s.id = $1`, [staffMatch[1]]);
			return send(response, 200, staff.rows[0]);
		}

		if (staffMatch && request.method === "DELETE") {
			await pool.query("DELETE FROM staff WHERE id = $1", [staffMatch[1]]);
			return send(response, 204, {});
		}

		return send(response, 404, { error: "Not found" });
	} catch (error) {
		console.error(error);
		return send(response, 500, { error: "Database request failed." });
	}
}

const server = http.createServer(handleRequest);

ensureDatabase()
	.then(() => server.listen(port, "0.0.0.0", () => {
		console.log("Frontend: http://localhost:3000");
		console.log(`API: http://localhost:${port}`);
	}))
	.catch((error) => {
		console.error("Unable to connect to the database:", error.message);
		process.exitCode = 1;
	});
