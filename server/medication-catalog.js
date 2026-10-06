const { getAvailability } = require("./validation");

const medicationDefinitions = [
	["Amoxicillin 500mg Capsules", "Antibiotic", 50],
	["Albuterol 90mcg Inhaler", "Respiratory", 250],
	["Metformin 850mg Tablets", "Antidiabetic", 250],
	["Paracetamol 500mg Tablets", "Pain & Fever", 250],
	["Atorvastatin 20mg Tablets", "Cardiovascular", 0],
	["Lisinopril 10mg Tablets", "Cardiovascular", 50],
	["Amlodipine 5mg Tablets", "Cardiovascular", 0],
	["Losartan 50mg Tablets", "Cardiovascular", 0],
	["Hydrochlorothiazide 25mg Tablets", "Cardiovascular", 0],
	["Aspirin 75mg Tablets", "Cardiovascular", 0],
	["Clopidogrel 75mg Tablets", "Cardiovascular", 0],
	["Simvastatin 20mg Tablets", "Cardiovascular", 0],
	["Salbutamol 2.5mg Nebuliser Solution", "Respiratory", 0],
	["Beclometasone 100mcg Inhaler", "Respiratory", 0],
	["Budesonide 200mcg Inhaler", "Respiratory", 0],
	["Prednisone 5mg Tablets", "Corticosteroid", 0],
	["Cetirizine 10mg Tablets", "Antihistamine", 0],
	["Loratadine 10mg Tablets", "Antihistamine", 0],
	["Omeprazole 20mg Capsules", "Gastrointestinal", 0],
	["Famotidine 20mg Tablets", "Gastrointestinal", 0],
	["Oral Rehydration Salts Sachets", "Gastrointestinal", 0],
	["Zinc Sulfate 20mg Tablets", "Supplement", 0],
	["Ferrous Sulfate 200mg Tablets", "Haematology", 0],
	["Folic Acid 5mg Tablets", "Supplement", 0],
	["Vitamin A 100000 IU Capsules", "Supplement", 0],
	["Human Insulin 100 IU/mL Vials", "Antidiabetic", 0],
	["Gliclazide 80mg Tablets", "Antidiabetic", 0],
	["Glibenclamide 5mg Tablets", "Antidiabetic", 0],
	["Levothyroxine 50mcg Tablets", "Endocrine", 0],
	["Carbamazepine 200mg Tablets", "Neurology", 0],
	["Sodium Valproate 200mg Tablets", "Neurology", 0],
	["Amitriptyline 25mg Tablets", "Mental Health", 0],
	["Fluoxetine 20mg Capsules", "Mental Health", 0],
	["Haloperidol 5mg Tablets", "Mental Health", 0],
	["Diazepam 5mg Tablets", "Mental Health", 0],
	["Cefalexin 500mg Capsules", "Antibiotic", 0],
	["Doxycycline 100mg Capsules", "Antibiotic", 0],
	["Cotrimoxazole 800/160mg Tablets", "Antibiotic", 0],
	["Azithromycin 500mg Tablets", "Antibiotic", 0],
	["Ciprofloxacin 500mg Tablets", "Antibiotic", 0],
	["Metronidazole 400mg Tablets", "Antibiotic", 0],
	["Fluconazole 150mg Capsules", "Antifungal", 0],
	["Clotrimazole 1% Cream", "Antifungal", 0],
	["Acyclovir 400mg Tablets", "Antiviral", 0],
	["Tenofovir/Lamivudine/Dolutegravir 300/300/50mg Tablets", "Antiretroviral", 0],
	["Efavirenz 600mg Tablets", "Antiretroviral", 0],
	["Zidovudine 300mg Tablets", "Antiretroviral", 0],
	["Nevirapine 200mg Tablets", "Antiretroviral", 0],
	["Rifampicin/Isoniazid/Pyrazinamide/Ethambutol Tablets", "Tuberculosis", 0],
	["Isoniazid 300mg Tablets", "Tuberculosis", 0],
	["Rifampicin 300mg Capsules", "Tuberculosis", 0],
	["Ethambutol 400mg Tablets", "Tuberculosis", 0],
	["Pyrazinamide 500mg Tablets", "Tuberculosis", 0],
	["Artesunate/Amodiaquine Tablets", "Antimalarial", 0],
	["Artemether/Lumefantrine 20/120mg Tablets", "Antimalarial", 0],
	["Permethrin 5% Cream", "Topical", 0],
	["Hydrocortisone 1% Cream", "Topical", 0],
	["Ibuprofen 400mg Tablets", "Pain & Fever", 0],
	["Diclofenac 50mg Tablets", "Pain & Fever", 0],
	["Oral Morphine 10mg/5mL Solution", "Pain Management", 0],
];

const defaultMedications = medicationDefinitions.map(([name, category, stockCount], index) => ({
	id: index + 1,
	name,
	category,
	availability: getAvailability(stockCount),
	clinics: `${stockCount} units in stock`,
	stockCount,
}));

function createClinicInventory(clinicList, medicationList = defaultMedications) {
	return clinicList.flatMap((clinic) => medicationList.map((medication) => ({
		clinicName: clinic.name,
		name: medication.name,
		category: medication.category,
		availability: medication.availability,
		clinics: `${clinic.name}: ${medication.stockCount} in stock`,
		stockCount: medication.stockCount,
	})));
}

function setClinicMedicationStock(inventory, clinicName, medicationName, stockCount) {
	const item = inventory.find((medication) => medication.clinicName === clinicName && medication.name === medicationName);
	if (!item) return null;
	item.stockCount = stockCount;
	item.availability = getAvailability(stockCount);
	item.clinics = `${clinicName}: ${stockCount} in stock`;
	item.updatedAt = new Date().toISOString();
	return item;
}

module.exports = { defaultMedications, createClinicInventory, setClinicMedicationStock };
