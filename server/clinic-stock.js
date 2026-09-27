const getAvailability = (stockCount) => stockCount === 0 ? "Out of Stock" : stockCount >= 250 ? "In Stock" : "Low Stock";

function parseLegacyClinicStock(report, clinicName) {
	if (typeof report !== "string" || typeof clinicName !== "string" || !clinicName.trim()) return null;
	const escapedName = clinicName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = report.trim().match(new RegExp(`^${escapedName}:\\s*(\\d+)\\s+in\\s+stock$`, "i"));
	return match ? Number(match[1]) : null;
}

function attachClinicStock(medications, stockRows) {
	const stocksByMedication = new Map();
	for (const row of stockRows) {
		const stocks = stocksByMedication.get(row.name) ?? [];
		const stockCount = Number(row.stockCount);
		stocks.push({
			clinicName: row.clinicName,
			province: row.province,
			address: row.address,
			stockCount,
			availability: getAvailability(stockCount),
			updatedAt: row.updatedAt,
		});
		stocksByMedication.set(row.name, stocks);
	}

	return medications.map((medication) => {
		const clinicStocks = stocksByMedication.get(medication.name) ?? [];
		return {
			...medication,
			clinicStocks,
			availableAt: clinicStocks.filter((stock) => stock.stockCount > 0),
		};
	});
}

function addDemoClinicStockRows(clinics, medications, stockRows) {
	const reportedPairs = new Set(stockRows.map((row) => JSON.stringify([row.clinicName, row.name])));
	const demoRows = [...stockRows];
	const updatedAt = new Date().toISOString();

	for (let clinicIndex = 0; clinicIndex < clinics.length; clinicIndex += 1) {
		const clinic = clinics[clinicIndex];
		for (let medicationIndex = 0; medicationIndex < medications.length; medicationIndex += 1) {
			const medication = medications[medicationIndex];
			const pair = JSON.stringify([clinic.name, medication.name]);
			if (reportedPairs.has(pair)) continue;
			reportedPairs.add(pair);
			demoRows.push({
				name: medication.name,
				clinicName: clinic.name,
				province: clinic.province,
				address: clinic.address,
				stockCount: (clinicIndex + medicationIndex) % 2 === 0 ? 50 : 300,
				updatedAt,
			});
		}
	}

	return demoRows;
}

function isDemoStockDataEnabled(environment = process.env) {
	return environment.DEMO_STOCK_DATA === "true" && environment.NODE_ENV !== "production";
}

module.exports = { addDemoClinicStockRows, attachClinicStock, isDemoStockDataEnabled, parseLegacyClinicStock };