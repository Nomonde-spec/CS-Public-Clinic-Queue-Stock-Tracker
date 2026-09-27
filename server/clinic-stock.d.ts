export type ClinicStock = {
  clinicName: string;
  province: string;
  address: string;
  stockCount: number;
  availability: "In Stock" | "Low Stock" | "Out of Stock";
  updatedAt?: string;
};

export function addDemoClinicStockRows(
  clinics: Array<{ name: string; province: string; address: string }>,
  medications: Array<{ name: string }>,
  stockRows: Array<{ name: string; clinicName: string; province: string; address: string; stockCount: number | string; updatedAt?: string }>,
): Array<{ name: string; clinicName: string; province: string; address: string; stockCount: number | string; updatedAt?: string }>;
export function isDemoStockDataEnabled(environment?: Record<string, string | undefined>): boolean;
export function parseLegacyClinicStock(report: string, clinicName: string): number | null;
export function attachClinicStock<T extends { name: string }>(medications: T[], stockRows: Array<{ name: string; clinicName: string; province: string; address: string; stockCount: number | string; updatedAt?: string }>): Array<T & { clinicStocks: ClinicStock[]; availableAt: ClinicStock[] }>;