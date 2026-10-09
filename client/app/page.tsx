"use client";

import { FormEvent, startTransition, useCallback, useEffect, useState } from "react";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import { dedupeStaffList } from "../lib/staff";

type View =
  | "home"
  | "clinics"
  | "medications"
  | "clinic"
  | "login"
  | "portal"
  | "staffQueue"
  | "staffOverview"
  | "staffStock"
  | "adminDashboard"
  | "adminClinics"
  | "adminStaff"
  | "adminMedications";
type Role = "public" | "staff" | "admin";
type StoredAuthSession = {
  role: "staff" | "admin";
  name: string;
  email: string;
  clinic: string;
};

const authSessionStorageKey = "carequeue-auth-session";

function readStoredAuthSession(): StoredAuthSession | null {
  try {
    const stored = window.sessionStorage.getItem(authSessionStorageKey);
    if (!stored) return null;
    const session = JSON.parse(stored) as Partial<StoredAuthSession>;
    if (
      (session.role !== "staff" && session.role !== "admin") ||
      typeof session.name !== "string" ||
      typeof session.email !== "string" ||
      typeof session.clinic !== "string" ||
      (session.role === "staff" && (!session.name.trim() || !session.clinic.trim()))
    ) {
      window.sessionStorage.removeItem(authSessionStorageKey);
      return null;
    }
    return {
      role: session.role,
      name: session.name,
      email: session.email,
      clinic: session.clinic,
    };
  } catch {
    try {
      window.sessionStorage.removeItem(authSessionStorageKey);
    } catch {}
    return null;
  }
}

function writeStoredAuthSession(session: StoredAuthSession) {
  try {
    window.sessionStorage.setItem(authSessionStorageKey, JSON.stringify(session));
  } catch {}
}

function clearStoredAuthSession() {
  try {
    window.sessionStorage.removeItem(authSessionStorageKey);
  } catch {}
}

type Clinic = {
  name: string;
  province: string;
  district: string;
  address: string;
  hours: string;
  phone: string;
  wait: number | null;
  patients: number;
  stock: number;
  status:
    | "Open"
    | "Closed"
    | "Open - Low Wait"
    | "Open - Moderate Wait"
    | "Open - Long Wait"
    | "Open - Longer Wait"
    | "Open - Busy"
    | "Open - Very Busy"
    | "Busy"
    | "Very Busy";
  distance: number;
  updatedAt?: string;
};
type QueueTicket = {
  id: string;
  clinicName: string;
  queueNumber: number;
  status: "waiting" | "ready" | "called" | "served" | "missed" | "left";
  scheduledAt: string;
  calledAt: string | null;
  callExpiresAt: string | null;
  position: number | null;
  peopleAhead?: number;
  estimatedWait: number;
  patients: number;
  wait: number;
  servedAt?: string | null;
};

type Medication = {
  name: string;
  category: string;
  availability: "In Stock" | "Low Stock" | "Out of Stock";
  clinics: string;
  stockCount: number;
  clinicName?: string;
  updatedAt?: string;
};

type StaffRegistration = {
  id: string;
  name: string;
  email: string;
  clinic: string;
  role?: "admin" | "staff";
};

type StaffUpdate = Pick<StaffRegistration, "name" | "email" | "clinic">;
type SystemSummary = {
  activeClinics: number;
  totalStaff: number;
  pendingApprovals: number;
};
type ClinicControlUpdate = Pick<Clinic, "status">;
type ClinicAdminUpdate = Partial<Pick<Clinic, "province" | "district" | "address" | "hours" | "phone" | "status">>;
type MedicationControlUpdate = Pick<Medication, "stockCount">;

const initialApprovedStaff: StaffRegistration[] = [
  {
    id: "admin-seed",
    name: "System Administrator",
    email: "sys.admin@carequeue.gov",
    clinic: "All clinics",
    role: "admin",
  },
  {
    id: "staff-seed",
    name: "Dr. Sarah Jenkins",
    email: "s.jenkins@metrocare.gov",
    clinic: "Metro Family Care Centre",
    role: "staff",
  },
];

let clinics: Clinic[] = [
  {
    name: "Metro Family Care Centre",
    province: "Gauteng",
    district: "Central District",
    address: "220 Plaza Avenue, Central District",
    hours: "Mon - Fri: 8:00 AM - 6:00 PM",
    phone: "+1 (555) 019-2834",
    wait: 12,
    patients: 4,
    stock: 98,
    status: "Open",
    distance: 0.8,
  },
  {
    name: "Northside Public Health Clinic",
    province: "KwaZulu-Natal",
    district: "Sector 12",
    address: "504 Medical Boulevard, Sector 12",
    hours: "Mon - Fri: 8:00 AM - 8:00 PM",
    phone: "+1 (555) 019-7621",
    wait: 35,
    patients: 14,
    stock: 84,
    status: "Open",
    distance: 1.5,
  },
  {
    name: "Eastside Community Dispensary",
    province: "Eastern Cape",
    district: "East Area",
    address: "102 Industrial Link, East Area",
    hours: "Mon - Fri: 9:00 AM - 5:00 PM",
    phone: "+1 (555) 019-4432",
    wait: 55,
    patients: 25,
    stock: 90,
    status: "Open",
    distance: 2.8,
  },
  {
    name: "Lakeside Community Clinic",
    province: "Western Cape",
    district: "Lakeside District",
    address: "11 Shoreline Road, Lakeside District",
    hours: "Mon - Fri: 8:00 AM - 4:00 PM",
    phone: "+1 (555) 019-1198",
    wait: null,
    patients: 0,
    stock: 55,
    status: "Closed",
    distance: 2.1,
  },
  {
    name: "Oakridge Triage & Care Node",
    province: "Free State",
    district: "Oakridge",
    address: "Hillside Drive, Oakridge",
    hours: "Open 24 Hours",
    phone: "+1 (555) 019-6674",
    wait: 8,
    patients: 2,
    stock: 95,
    status: "Open",
    distance: 4.5,
  },
  {
    name: "Mopani Community Health Centre",
    province: "Limpopo",
    district: "Mopani District",
    address: "18 Baobab Road, Mopani",
    hours: "Mon - Fri: 8:00 AM - 5:00 PM",
    phone: "+1 (555) 019-0106",
    wait: 18,
    patients: 7,
    stock: 89,
    status: "Open",
    distance: 6.2,
  },
  {
    name: "Highveld Public Clinic",
    province: "Mpumalanga",
    district: "Highveld",
    address: "64 Panorama Street, Highveld",
    hours: "Mon - Fri: 8:00 AM - 5:00 PM",
    phone: "+1 (555) 019-0107",
    wait: 42,
    patients: 18,
    stock: 76,
    status: "Open",
    distance: 8.7,
  },
  {
    name: "Karoo Wellness Clinic",
    province: "Northern Cape",
    district: "Karoo District",
    address: "7 Kalahari Avenue, Karoo",
    hours: "Mon - Fri: 8:00 AM - 4:00 PM",
    phone: "+1 (555) 019-0108",
    wait: 27,
    patients: 11,
    stock: 81,
    status: "Open",
    distance: 14.4,
  },
  {
    name: "Mthatha Public Health Node",
    province: "North West",
    district: "Mafikeng District",
    address: "31 Heritage Road, Mafikeng",
    hours: "Mon - Fri: 8:00 AM - 5:00 PM",
    phone: "+1 (555) 019-0109",
    wait: 65,
    patients: 31,
    stock: 68,
    status: "Open",
    distance: 22.1,
  },
];

let medications: Medication[] = [
  {
    name: "Amoxicillin 500mg Capsules",
    category: "Antibiotic",
    availability: "Low Stock",
    clinics: "50 units in stock",
    stockCount: 50,
  },
  {
    name: "Albuterol 90mcg Inhaler",
    category: "Respiratory",
    availability: "In Stock",
    clinics: "250 units in stock",
    stockCount: 250,
  },
  {
    name: "Metformin 850mg Tablets",
    category: "Antidiabetic",
    availability: "In Stock",
    clinics: "250 units in stock",
    stockCount: 250,
  },
  {
    name: "Paracetamol 500mg Tablets",
    category: "Pain & Fever",
    availability: "In Stock",
    clinics: "250 units in stock",
    stockCount: 250,
  },
  {
    name: "Atorvastatin 20mg Tablets",
    category: "Cardiovascular",
    availability: "Out of Stock",
    clinics: "0 / 5 in stock",
    stockCount: 0,
  },
  {
    name: "Lisinopril 10mg Tablets",
    category: "Cardiovascular",
    availability: "Low Stock",
    clinics: "50 units in stock",
    stockCount: 50,
  },
];

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/+$/, "");
type ApiStaff = StaffRegistration & {
  status: "pending" | "approved" | "rejected";
};
const toStaffRegistration = (staff: ApiStaff): StaffRegistration => ({
  id: staff.id,
  name: staff.name,
  email: staff.email,
  clinic: staff.clinic,
  role: staff.role,
});
const getMedicationAvailability = (
  stockCount: number,
): Medication["availability"] =>
  stockCount === 0
    ? "Out of Stock"
    : stockCount >= 250
      ? "In Stock"
      : "Low Stock";

function Logo({ staff = false, clinic }: { staff?: boolean; clinic?: string }) {
  return (
    <div className="brand">
      <span className="brand-mark">+</span>
      <span>
        <strong>CareQueue {staff ? "Staff" : "Public Portal"}</strong>
        <small>
          {staff ? (clinic ?? "All clinics") : "Public health tracker"}
        </small>
      </span>
    </div>
  );
}

function PublicHeader({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  return (
    <header className="site-header">
      <Logo />
      <nav>
        <button
          className={view === "home" ? "active" : ""}
          onClick={() => onNavigate("home")}
        >
          Dashboard
        </button>
        <button
          className={view === "clinics" || view === "clinic" ? "active" : ""}
          onClick={() => onNavigate("clinics")}
        >
          Find a Clinic
        </button>
        <button
          className={view === "medications" ? "active" : ""}
          onClick={() => onNavigate("medications")}
        >
          Medication Search
        </button>
      </nav>
      <div className="header-status">
        <span className="dot" /> LIVE STATUS <small>No login required for patients</small>
      </div>
      <button className="header-access" onClick={() => onNavigate("login")}>
        Login
      </button>
    </header>
  );
}

function AdminHeader({
  view,
  onNavigate,
  onLogout,
}: {
  view: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}) {
  return (
    <header className="admin-header">
      <Logo staff />
      <nav>
        <button
          className={view === "adminDashboard" ? "active" : ""}
          onClick={() => onNavigate("adminDashboard")}
        >
          Dashboard
        </button>
        <button
          className={view === "adminClinics" ? "active" : ""}
          onClick={() => onNavigate("adminClinics")}
        >
          Clinics
        </button>
        <button
          className={view === "adminStaff" ? "active" : ""}
          onClick={() => onNavigate("adminStaff")}
        >
          Staff Directory
        </button>
        <button
          className={view === "adminMedications" ? "active" : ""}
          onClick={() => onNavigate("adminMedications")}
        >
          Medication Inventory
        </button>
      </nav>
      <div className="admin-account">
        <strong>sys.admin@carequeue.gov</strong>
        <small>Administrator</small>
      </div>
      <button className="sign-out" onClick={onLogout}>
        Sign out
      </button>
    </header>
  );
}

function StaffHeader({
  view,
  onNavigate,
  onLogout,
  staffName,
  enrolledClinic,
}: {
  view: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  staffName: string;
  enrolledClinic: string;
}) {
  return (
    <header className="admin-header staff-header">
      <Logo staff clinic={enrolledClinic} />
      <nav>
        <button
          className={view === "staffOverview" ? "active" : ""}
          onClick={() => onNavigate("staffOverview")}
        >
          Clinic Overview
        </button>
        <button
          className={view === "staffQueue" ? "active" : ""}
          onClick={() => onNavigate("staffQueue")}
        >
          Queue Management
        </button>
        <button
          className={view === "staffStock" ? "active" : ""}
          onClick={() => onNavigate("staffStock")}
        >
          Stockpile Controller
        </button>
      </nav>
      <div className="admin-account">
        <strong>{staffName}</strong>
        <small>{enrolledClinic}</small>
      </div>
      <button className="sign-out" onClick={onLogout}>
        Sign out
      </button>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <div>
        <strong>CareQueue Public Portal</strong>
        <p>
          An open public health initiative. Real-time patient counts, wait
          estimation models, and essential medication inventory status.
        </p>
      </div>
      <div>
        <strong>SERVICES</strong>
        <p>
          Wait Time Maps
          <br />
          Medication Stock Audits
          <br />
          Clinic Directories
        </p>
      </div>
      <div>
        <strong>INFORMATION</strong>
        <p>
          How Estimation Works
          <br />
          Data Accuracy Policy
          <br />
          Clinic Administration Portal
        </p>
      </div>
      <div className="footer-bottom">
        Copyright 2025 CareQueue Public Health System. All status data is
        indicative. <span>Last system sync: Just now</span>
      </div>
    </footer>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={`pill ${value.toLowerCase().replaceAll(" ", "-")}`}>
      {value}
    </span>
  );
}

function getQueueLabel(
  clinic: Clinic,
):
  | "Closed"
  | "Open - Low Wait"
  | "Open - Moderate Wait"
  | "Open - Long Wait"
  | "Open - Longer Wait" {
  if (clinic.status === "Closed") return "Closed";
  if (
    clinic.status === "Open - Long Wait" ||
    clinic.status === "Open - Busy" ||
    clinic.status === "Busy"
  )
    return "Open - Long Wait";
  if (
    clinic.status === "Open - Longer Wait" ||
    clinic.status === "Open - Very Busy" ||
    clinic.status === "Very Busy"
  )
    return "Open - Longer Wait";
  return clinic.wait !== null && clinic.wait < 20
    ? "Open - Low Wait"
    : "Open - Moderate Wait";
}

function formatUpdatedAt(updatedAt?: string) {
  if (!updatedAt) return "Updated just now";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000),
  );
  return minutes === 0
    ? "Updated just now"
    : `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

function latestMedicationUpdate() {
  const timestamps = medications
    .map((medication) => medication.updatedAt)
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime());
  return timestamps.length > 0
    ? new Date(Math.max(...timestamps)).toISOString()
    : undefined;
}

function PublicHome({
  onNavigate,
  onClinic,
}: {
  onNavigate: (view: View) => void;
  onClinic: (clinic: Clinic) => void;
}) {
  const [selectedClinic, setSelectedClinic] = useState("");
  const [selectedMedication, setSelectedMedication] = useState("");
  const medicationOptions = Array.from(
    new Map(
      medications.map((medication) => [medication.name, medication]),
    ).values(),
  );
  const clinicSelection = selectedClinic
    ? clinics.filter(
        (clinic) =>
          clinic.name === selectedClinic || clinic.district === selectedClinic,
      )
    : selectedMedication
      ? clinics
      : clinics.slice(0, 3);
  const clinicsWithMedicationStock = new Set(
    medications
      .filter(
        (medication) =>
          medication.name === selectedMedication &&
          Boolean(medication.clinicName) &&
          medication.stockCount > 0,
      )
      .map((medication) => medication.clinicName as string),
  );
  const visibleClinics = selectedMedication
    ? clinicSelection.filter((clinic) => clinicsWithMedicationStock.has(clinic.name))
    : clinicSelection;
  return (
    <main className="public-main">
      <section className="hero">
        <p className="eyebrow">PUBLIC HEALTH INFORMATION NETWORK</p>
        <h1>
          Stay Informed. Plan Ahead.
        </h1>
        <p>
          Check clinic queues, estimated waiting times, and medication
          availability before visiting a public health clinic.
        </p>
        <div className="search-bar">
          <label>
            Clinic or district
            <select
              value={selectedClinic}
              onChange={(event) => setSelectedClinic(event.target.value)}
            >
              <option value="">Select a clinic or district</option>
              {clinics.map((clinic) => (
                <option value={clinic.name} key={clinic.name}>
                  {clinic.name}
                </option>
              ))}
              {Array.from(
                new Set(clinics.map((clinic) => clinic.district)),
              ).map((district) => (
                <option value={district} key={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <span className="search-divider" />
          <label>
            Medication
            <select
              value={selectedMedication}
              onChange={(event) => setSelectedMedication(event.target.value)}
            >
              <option value="">Select a medication</option>
              {medicationOptions.map((medication) => (
                <option value={medication.name} key={medication.name}>
                  {medication.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() =>
              onNavigate(selectedMedication ? "medications" : "clinics")
            }
          >
            Search now
          </button>
        </div>
      </section>
      <section className="section-heading">
        <div>
          <p className="eyebrow">LIVE LOCATIONS</p>
          <h2>{selectedClinic || "Nearest active clinics"}</h2>
          <p>
            {selectedClinic
              ? "Current queue, wait time, and stock"
              : "Sorted by closest distance to your location"}
          </p>
        </div>
        <button className="text-button" onClick={() => onNavigate("clinics")}>
          View all clinics
        </button>
      </section>
      <div className="clinic-cards">
        {visibleClinics.map((clinic) => (
          <button
            className="clinic-card"
            key={clinic.name}
            onClick={() => onClinic(clinic)}
          >
            <div className="card-top">
              <StatusPill value={getQueueLabel(clinic)} />
              <span>{clinic.distance} miles away</span>
            </div>
            <h3>{clinic.name}</h3>
            <p>{clinic.address}</p>
            <div className="card-meta">
              <span>{clinic.patients} patients in queue</span>
              <span>Hours: {clinic.hours.replace("Mon - Fri: ", "")}</span>
              <span className="stock">Stock: {clinic.stock}%</span>
            </div>
            <div className="wait">
              {clinic.wait ? `${clinic.wait} mins` : "-- mins"}
              <small>ESTIMATED WAIT</small>
            </div>
          </button>
        ))}
      </div>
      {selectedMedication && visibleClinics.length === 0 && (
        <p className="empty">
          No clinics currently report this medication in stock.
        </p>
      )}
      <section className="stock-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ESSENTIAL MEDICATIONS</p>
            <h2>Medication stock status</h2>
            <p>Aggregated status across regional dispensaries</p>
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("medications")}
          >
            Find a medication
          </button>
        </div>
        <MedicationTable compact />
      </section>
    </main>
  );
}

function MedicationTable({
  compact = false,
  query = "",
  clinicName = "",
}: {
  compact?: boolean;
  query?: string;
  clinicName?: string;
}) {
  const matching = medications.filter(
    (medicine) =>
      (!clinicName || medicine.clinicName === clinicName) &&
      (medicine.name.toLowerCase().includes(query.toLowerCase()) ||
        medicine.category.toLowerCase().includes(query.toLowerCase())),
  );
  const grouped = new Map<string, Medication[]>();
  for (const medicine of matching)
    grouped.set(medicine.name, [
      ...(grouped.get(medicine.name) ?? []),
      medicine,
    ]);
  const filtered = compact
    ? Array.from(grouped.values()).map((inventory) => {
        const totalStock = inventory.reduce(
          (total, item) => total + item.stockCount,
          0,
        );
        return {
          ...inventory[0],
          availability: getMedicationAvailability(totalStock),
          clinicName: `${inventory.filter((item) => item.stockCount > 0).length} of ${inventory.length} clinics with stock`,
        };
      })
    : matching;
  const displayed = compact ? filtered.slice(0, 5) : filtered;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Medication name & strength</th>
            <th>Category</th>
            <th>{compact ? "Regional availability" : "Availability"}</th>
            {!compact && <th>Clinic</th>}
          </tr>
        </thead>
        <tbody>
          {displayed.map((medicine) => (
            <tr key={`${medicine.name}-${medicine.clinicName ?? "summary"}`}>
              <td>
                <strong>{medicine.name}</strong>
              </td>
              <td>{medicine.category}</td>
              <td>
                <StatusPill value={medicine.availability} />
                {compact && <small> {medicine.clinicName}</small>}
              </td>
              {!compact && <td>{medicine.clinicName ?? "All clinics"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {displayed.length === 0 && (
        <div className="empty">No medicines match that search.</div>
      )}
    </div>
  );
}

function Clinics({ onClinic }: { onClinic: (clinic: Clinic) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [distance, setDistance] = useState("5");
  const [maxWait, setMaxWait] = useState("Any");
  const distanceLimit = distance === "All" ? Infinity : Number(distance);
  const filtered = clinics.filter(
    (clinic) =>
      `${clinic.name} ${clinic.province} ${clinic.district} ${clinic.address}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "All statuses" || clinic.status === status) &&
      clinic.distance <= distanceLimit &&
      (maxWait === "Any" ||
        (clinic.wait !== null && clinic.wait <= Number(maxWait))),
  );
  return (
    <main className="public-main page-main">
      <div className="page-title">
        <div>
          <p className="eyebrow">CLINIC DIRECTORY</p>
          <h1>Find a clinic</h1>
          <p>
            Compare nearby public clinics by wait time, distance, and current
            stock levels.
          </p>
        </div>
        <span className="result-count">
          {filtered.length} clinics found nearby
        </span>
      </div>
      <div className="filter-row">
        <label>
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or district..."
          />
        </label>
        <select
          value={distance}
          onChange={(event) => setDistance(event.target.value)}
        >
          <option value="5">Distance: Within 5 miles</option>
          <option value="10">Distance: Within 10 miles</option>
          <option value="25">Distance: Within 25 miles</option>
          <option value="50">Distance: Within 50 miles</option>
          <option value="All">Distance: All clinics</option>
        </select>
        <select
          value={maxWait}
          onChange={(event) => setMaxWait(event.target.value)}
        >
          <option value="Any">Max Wait Time: Any</option>
          <option value="15">Max Wait Time: 15 min</option>
          <option value="30">Max Wait Time: 30 min</option>
          <option value="60">Max Wait Time: 60 min</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option>All statuses</option>
          <option>Open</option>
          <option>Closed</option>
        </select>
        <button
          className="text-button"
          onClick={() => {
            setQuery("");
            setStatus("All statuses");
            setDistance("5");
            setMaxWait("Any");
          }}
        >
          Clear filters
        </button>
      </div>
      <div className="directory-layout">
        <div className="directory-list">
          {filtered.map((clinic) => (
            <button
              className="directory-card"
              onClick={() => onClinic(clinic)}
              key={clinic.name}
            >
              <div>
                <h3>{clinic.name}</h3>
                <p>
                  {clinic.province} - {clinic.address} ({clinic.distance} mi)
                </p>
                <div className="card-meta">
                  <span>{clinic.patients} patients in queue</span>
                  <span>
                    Wait:{" "}
                    {clinic.wait === null ? "Closed" : `${clinic.wait} min`}
                  </span>
                  <span className="stock">Stock: {clinic.stock}%</span>
                </div>
              </div>
              <div>
                <StatusPill
                  value={
                    clinic.wait !== null ? `${clinic.wait}m wait` : "Closed"
                  }
                />
              </div>
            </button>
          ))}
        </div>
        <div className="map-placeholder">
          <div className="map-grid" />
          <span className="map-pin pin-one">
            +<small>12 min</small>
          </span>
          <span className="map-pin pin-two">
            +<small>35 min</small>
          </span>
          <span className="map-pin pin-three">
            +<small>55 min</small>
          </span>
          <span className="map-label label-one">Metro Clinic (12 min)</span>
          <span className="map-label label-two">Northside Clinic (35 min)</span>
        </div>
      </div>
    </main>
  );
}

function Medications() {
  const [query, setQuery] = useState("");
  const [clinicName, setClinicName] = useState("");
  const medicationOptions = Array.from(
    new Map(
      medications.map((medication) => [medication.name, medication]),
    ).values(),
  );
  return (
    <main className="public-main page-main">
      <div className="page-title">
        <div>
          <p className="eyebrow">MEDICATION AVAILABILITY</p>
          <h1>Find clinics with medication stock</h1>
          <p>Select a medication and clinic to view current availability.</p>
        </div>
      </div>
      <div className="med-search">
        <select
          className="medication-search-select"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        >
          <option value="">Select a medication</option>
          {medicationOptions.map((medication) => (
            <option key={medication.name} value={medication.name}>
              {medication.name}
            </option>
          ))}
        </select>
        <select
          value={clinicName}
          onChange={(event) => setClinicName(event.target.value)}
        >
          <option value="">All clinics</option>
          {clinics.map((clinic) => (
            <option key={clinic.name} value={clinic.name}>
              {clinic.name}
            </option>
          ))}
        </select>
      </div>
      <section className="results-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LIVE STOCK AUDIT</p>
            <h2>
              {query
                ? `Results for &quot;${query}&quot;`
                : "Select a medication"}
            </h2>
          </div>
          <span>{formatUpdatedAt(latestMedicationUpdate())}</span>
        </div>
        {query ? (
          <MedicationTable query={query} clinicName={clinicName} />
        ) : (
          <div className="empty">
            Select a medication to view stock availability.
          </div>
        )}
      </section>
    </main>
  );
}

function PatientQueue({ clinic }: { clinic: Clinic }) {
  const storageKey = `carequeue-ticket:${clinic.name}`;
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const loadTicket = async (ticketId: string, accessToken: string) => {
    const response = await fetch(
      `${apiUrl}/api/queue-tickets/${ticketId}?token=${encodeURIComponent(accessToken)}`,
    );
    if (!response.ok)
      throw new Error("This queue ticket is no longer available.");
    setTicket((await response.json()) as QueueTicket);
  };
  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return;
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(saved) as { id: string; token: string };
        loadTicket(parsed.id, parsed.token)
          .then(() => setToken(parsed.token))
          .catch(() => window.sessionStorage.removeItem(storageKey));
      } catch {
        window.sessionStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => {
    if (
      !ticket ||
      !token ||
      ["served", "missed", "left"].includes(ticket.status)
    )
      return;
    const timer = window.setInterval(
      () => loadTicket(ticket.id, token).catch(() => undefined),
      10000,
    );
    return () => window.clearInterval(timer);
  }, [ticket, token]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);
  const joinQueue = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `${apiUrl}/api/clinics/${encodeURIComponent(clinic.name)}/queue-tickets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      const result = (await response.json()) as {
        ticket?: QueueTicket;
        capability?: string;
        error?: string;
      };
      if (!response.ok || !result.ticket || !result.capability)
        throw new Error(result.error || "Could not join the queue.");
      setTicket(result.ticket);
      setToken(result.capability);
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({ id: result.ticket.id, token: result.capability }),
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not join the queue.",
      );
    } finally {
      setLoading(false);
    }
  };
  const leaveQueue = async () => {
    if (!ticket || !token) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/queue-tickets/${ticket.id}/leave`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
      );
      const result = (await response.json()) as QueueTicket & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "Could not leave the queue.");
      setTicket(result);
      window.sessionStorage.removeItem(storageKey);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not leave the queue.",
      );
    } finally {
      setLoading(false);
    }
  };
  const peopleAhead = ticket
    ? (ticket.peopleAhead ?? Math.max((ticket.position ?? 1) - 1, 0))
    : 0;
  const requestNewTicket = () => {
    window.sessionStorage.removeItem(storageKey);
    setTicket(null);
    setToken("");
    setMessage("");
  };
  const displayedQueueNumber =
    ticket?.status === "waiting" ? peopleAhead + 1 : ticket?.queueNumber;
  const displayedScheduledAt =
    ticket?.status === "waiting"
      ? new Date(clock + peopleAhead * 3 * 60000).toISOString()
      : ticket?.scheduledAt;
  const statusText =
    ticket?.status === "ready" || ticket?.status === "called"
      ? "Your number has been called. Please proceed to the clinic desk."
      : ticket?.status === "served"
        ? "Your visit is complete."
        : ticket?.status === "missed"
          ? "This number was missed. Request a new number to join again."
          : ticket?.status === "left"
            ? "You left this queue."
            : "Your number is active. The server will confirm when it is ready.";
  return (
    <section className="detail-card queue-checkin-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PATIENT CHECK-IN</p>
          <h2>Request a queue number</h2>
          <p>
            Each clinic has its own live queue. Your allocated time updates from
            the people ahead of you.
          </p>
        </div>
        {ticket && (
          <StatusPill
            value={ticket.status === "waiting" ? "Waiting" : ticket.status}
          />
        )}
      </div>
      {ticket ? (
        <>
          <div className="ticket-number">
            #{displayedQueueNumber}
            <small>
              {ticket.status === "left"
                ? "YOUR ISSUED QUEUE NUMBER"
                : "YOUR QUEUE NUMBER"}
            </small>
          </div>
          <div className="queue-ticket-details">
            <span>
              <strong>{peopleAhead}</strong> people ahead
            </span>
            <span>
              <strong>{ticket.estimatedWait}</strong> min estimated wait
            </span>
            <span>
              <strong>
                {displayedScheduledAt
                  ? new Date(displayedScheduledAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </strong>{" "}
              allocated time
            </span>
          </div>
          <p className="queue-message">{statusText}</p>
          {ticket.status === "waiting" && (
            <button
              className="secondary-button"
              disabled={loading}
              onClick={leaveQueue}
            >
              {loading ? "Updating..." : "Leave queue"}
            </button>
          )}
          {["missed", "served", "left"].includes(ticket.status) && (
            <button
              className="primary-button"
              disabled={loading || clinic.status === "Closed"}
              onClick={requestNewTicket}
            >
              {clinic.status === "Closed"
                ? "Clinic closed"
                : "Get Queue Number"}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="queue-ticket-details">
            <span>
              <strong>{clinic.patients}</strong> patients waiting
            </span>
            <span>
              <strong>{clinic.wait ?? clinic.patients * 3}</strong> min
              estimated wait
            </span>
          </div>
          <button
            className="primary-button"
            disabled={loading || clinic.status === "Closed"}
            onClick={joinQueue}
          >
            {loading
              ? "Requesting..."
              : clinic.status === "Closed"
                ? "Clinic currently closed"
                : "Get Queue Number"}
          </button>
          {message && <p className="queue-error">{message}</p>}
        </>
      )}
    </section>
  );
}

function ClinicDetails({
  clinic,
  onBack,
}: {
  clinic: Clinic;
  onBack: () => void;
}) {
  return (
    <main className="public-main page-main">
      <button className="back-button" onClick={onBack}>
        Back to clinic directory
      </button>
      <div className="detail-grid">
        <section>
          <div className="detail-card">
            <StatusPill value={getQueueLabel(clinic)} />
            <span>{formatUpdatedAt(clinic.updatedAt)}</span>
            <h1>{clinic.name}</h1>
            <p>Primary community triage and medication dispensing location.</p>
            <hr />
            <p>Address: {clinic.address}</p>
            <p>Hours: {clinic.hours}</p>
            <p>Phone: {clinic.phone}</p>
          </div>
          <PatientQueue clinic={clinic} />
        </section>
        <section className="detail-card inventory-card">
          <div className="section-heading">
            <div>
              <h2>Pharmacy inventory</h2>
              <p>Medication availability currently reported by this clinic.</p>
            </div>
            <span className="live">
              <span className="dot" />{" "}
              {formatUpdatedAt(latestMedicationUpdate())}
            </span>
          </div>
          <MedicationTable clinicName={clinic.name} />
        </section>
      </div>
    </main>
  );
}

function Auth({
  onLogin,
  onRegister,
  onPublic,
  onBack,
  message,
}: {
  onLogin: (
    role: Role,
    email: string,
    password: string,
    token: string,
  ) => Promise<"admin-token-required" | void>;
  onRegister: (details: {
    name: string;
    email: string;
    password: string;
    clinic: string;
  }) => Promise<void>;
  onPublic: () => void;
  onBack: () => void;
  message: string;
}) {
  const [role, setRole] = useState<"staff" | "admin">(() => {
    if (typeof window === "undefined") return "staff";
    const resetParams = new URLSearchParams(window.location.hash.slice(1));
    const email = resetParams.get("resetEmail");
    const token = resetParams.get("resetToken");
    if (!email || !token) return "staff";
    return resetParams.get("resetRole") === "admin" ? "admin" : "staff";
  });
  const [adminTokenRequired, setAdminTokenRequired] = useState(false);
  const [mode, setMode] = useState<"signin" | "register" | "forgot" | "reset">(() => {
    if (typeof window === "undefined") return "signin";
    const resetParams = new URLSearchParams(window.location.hash.slice(1));
    const email = resetParams.get("resetEmail");
    const token = resetParams.get("resetToken");
    return email && token ? "reset" : "signin";
  });
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerClinic, setRegisterClinic] = useState(clinics[0]?.name ?? "");
  const [registerPassword, setRegisterPassword] = useState("");
  const [resetEmail, setResetEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.hash.slice(1)).get("resetEmail") ?? "";
  });
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.hash.slice(1)).get("resetToken") ?? "";
  });
  const [recoveryMessage, setRecoveryMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted) return;
    const values = new FormData(event.currentTarget);
    const submittedEmail = (
      mode === "reset" ? resetEmail : String(values.get("email") || "")
    )
      .trim()
      .toLowerCase();
    const password = String(values.get("password") || "");
    const token = String(values.get("token") || "").trim();
    setSubmitted(true);
    setRecoveryMessage("");

    try {
      if (mode === "register") {
        const name = registerName.trim();
        const email = registerEmail.trim().toLowerCase();
        if (!name || !email || !registerPassword || !registerClinic) {
          throw new Error("Complete the registration form before submitting.");
        }
        await onRegister({ name, email, password: registerPassword, clinic: registerClinic });
        setMode("signin");
        setRegisterName("");
        setRegisterEmail("");
        setRegisterPassword("");
        setRegisterClinic(clinics[0]?.name ?? "");
        setRecoveryMessage("Registration submitted. Your account is pending administrator approval.");
      } else if (mode === "forgot") {
        const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: submittedEmail }),
        });
        const result = (await response.json()) as {
          error?: string;
          message?: string;
          resetToken?: string;
        };
        if (!response.ok) throw new Error(result.error || "Password recovery could not be started.");
        setResetEmail(submittedEmail);
        setResetToken(result.resetToken || "");
        setRecoveryMessage(result.message || "Check your recovery instructions.");
      } else if (mode === "reset") {
        const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: submittedEmail, token, password }),
        });
        const result = (await response.json()) as {
          error?: string;
          message?: string;
        };
        if (!response.ok) throw new Error(result.error || "Password could not be reset.");
        setResetToken("");
        setMode("signin");
        setRecoveryMessage(result.message || "Password reset successfully. You can now sign in.");
      } else {
        if (adminTokenRequired && !/^\d{6}$/.test(token)) {
          throw new Error("Enter the 6-digit administrator security token.");
        }
        const loginResult = await onLogin(role, submittedEmail, password, token);
        if (loginResult === "admin-token-required") {
          setRole("admin");
          setAdminTokenRequired(true);
          setRecoveryMessage("Enter the administrator security token to continue.");
        }
      }
    } catch (error) {
      setRecoveryMessage(
        error instanceof Error ? error.message : "The request failed. Please try again.",
      );
    } finally {
      setSubmitted(false);
    }
  }

  const recoveryMode = mode === "forgot" || mode === "reset";
  const heading =
    mode === "register"
      ? "Create staff access request"
      : mode === "forgot"
        ? "Reset your password"
        : mode === "reset"
          ? "Choose a new password"
          : role === "admin"
            ? "Admin sign in"
            : "Staff sign in";

  const description =
    mode === "register"
      ? "Request access to a clinic. Your account remains pending until an administrator approves it."
      : mode === "forgot"
        ? "Enter the email address associated with your account."
        : mode === "reset"
          ? "Enter your recovery token and a new password."
          : "Enter your authorized credentials below.";

  return (
    <main className="auth-main">
      <form
        className="auth-card"
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !submitted) {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
      >
        <div className="auth-navigation">
          <button type="button" onClick={onPublic}>Return to the public portal</button>
          <button type="button" onClick={onBack}>Back to previous page</button>
        </div>

        <h2>{mode === "register" ? heading : recoveryMode ? heading : "Login"}</h2>
        <p>{description}</p>

        {(recoveryMessage || message) && (
          <div className="auth-message">{recoveryMessage || message}</div>
        )}

        {mode === "register" && (
          <>
            <label>
              Full name
              <input
                name="register-name"
                type="text"
                required
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="e.g. Dr. Sarah Jenkins"
              />
            </label>
            <label>
              Work email
              <input
                name="register-email"
                type="email"
                required
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                autoComplete="email"
                placeholder="name@clinic.gov"
              />
            </label>
            <label>
              Assigned clinic
              <select
                name="register-clinic"
                value={registerClinic}
                onChange={(event) => setRegisterClinic(event.target.value)}
              >
                {clinics.map((clinic) => (
                  <option key={clinic.name} value={clinic.name}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Create password
              <div className="password-wrapper">
                <input
                  name="register-password"
                  required
                  minLength={6}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button type="submit" className="primary-button" disabled={submitted}>
              {submitted ? "Submitting..." : "Request staff access"}
            </button>
          </>
        )}

        {mode === "forgot" && (
          <>
            <label>
              {role === "admin" ? "Administrator email" : "Clinical email"}
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder={role === "admin" ? "e.g. sys.admin@carequeue.gov" : "s.jenkins@metrocare.gov"}
              />
            </label>
            <button type="submit" className="primary-button" disabled={submitted}>
              {submitted ? "Requesting token..." : "Request reset token"}
            </button>
          </>
        )}

        {mode === "reset" && (
          <>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                autoComplete="email"
                placeholder={role === "admin" ? "e.g. sys.admin@carequeue.gov" : "s.jenkins@metrocare.gov"}
              />
            </label>
            <label>
              Reset token
              <input
                name="token"
                required
                minLength={32}
                defaultValue={resetToken}
                autoComplete="one-time-code"
              />
            </label>
            <label>
              New password
              <div className="password-wrapper">
                <input
                  name="password"
                  required
                  minLength={6}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button type="submit" className="primary-button" disabled={submitted}>
              {submitted ? "Resetting password..." : "Set new password"}
            </button>
          </>
        )}

        {mode === "signin" && (
          <>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setAdminTokenRequired(false);
                  setRole("staff");
                }}
                autoComplete="email"
                placeholder={role === "admin" ? "e.g. sys.admin@carequeue.gov" : "s.jenkins@metrocare.gov"}
              />
            </label>
            <label>
              Secure password
              <div className="password-wrapper">
                <input
                  name="password"
                  required
                  minLength={6}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {adminTokenRequired && (
              <label>
                Admin security token
                <input
                  name="token"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="6-digit verification code"
                />
              </label>
            )}
            <div className="auth-links">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setMode("forgot");
                  setRecoveryMessage("");
                }}
              >
                Forgot password?
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setMode("register");
                  setRecoveryMessage("");
                }}
              >
                Request staff access
              </button>
            </div>
            <button type="submit" className="primary-button" disabled={submitted}>
              {submitted ? "Authenticating..." : "Login"}
            </button>
          </>
        )}

        {(mode === "forgot" || mode === "reset" || mode === "register") && (
          <button
            type="button"
            className="text-link recovery-back"
            disabled={submitted}
            onClick={() => {
              setMode("signin");
              setRecoveryMessage("");
            }}
          >
            Back to sign in
          </button>
        )}
      </form>
    </main>
  );
}

function StaffCrudPanel({
  approvedStaff,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
}: {
  approvedStaff: StaffRegistration[];
  onCreateStaff: (staff: StaffUpdate & { role: "staff" | "admin"; password: string }) => Promise<{ temporaryPassword?: string }>;
  onUpdateStaff: (id: string, update: StaffUpdate) => void;
  onDeleteStaff: (id: string) => void;
}) {
  const [selectedClinic, setSelectedClinic] = useState(clinics[0].name);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"staff" | "admin">("staff");
  const [newPassword, setNewPassword] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const staff = approvedStaff.filter((member) => member.role === "staff");
  const filteredStaff = staff.filter(
    (member) => member.clinic === selectedClinic,
  );
  const edit = (member: StaffRegistration) => {
    const name = window.prompt("Staff name", member.name)?.trim();
    const email = window
      .prompt("Staff email", member.email)
      ?.trim()
      .toLowerCase();
    const clinic = window.prompt("Assigned clinic", member.clinic)?.trim();
    if (name && email && clinic)
      onUpdateStaff(member.id, { name, email, clinic });
  };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCreateMessage("");
    try {
      const result = await onCreateStaff({ name: newName.trim(), email: newEmail.trim().toLowerCase(), clinic: selectedClinic, role: newRole, password: newPassword });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setCreateMessage(result.temporaryPassword ? `Staff account created. Temporary password: ${result.temporaryPassword}` : "Staff account created and invitation email sent.");
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "Staff account could not be created.");
    } finally {
      setCreating(false);
    }
  };
  return (
    <section className="portal-panel staff-crud-panel">
      <div className="section-heading">
        <div>
          <h2>Manage staff records</h2>
          <p>Edit or remove approved staff for the selected clinic.</p>
        </div>
      </div>
      <div className="staff-create-form">
        <select
          value={selectedClinic}
          onChange={(event) => setSelectedClinic(event.target.value)}
        >
          {clinics.map((clinic) => (
            <option key={clinic.name}>{clinic.name}</option>
          ))}
        </select>
      </div>
      <form className="staff-create-form" onSubmit={create}>
        <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Full name" required />
        <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} type="email" placeholder="Email" required />
        <select value={newRole} onChange={(event) => setNewRole(event.target.value as "staff" | "admin")}><option value="staff">Staff</option><option value="admin">Administrator</option></select>
        <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" minLength={6} placeholder="Temporary password" required />
        <button className="primary-button" type="submit" disabled={creating}>{creating ? "Creating..." : "Create staff login"}</button>
        {createMessage && <span className="queue-message">{createMessage}</span>}
      </form>
      <div className="staff-crud-list">
        {filteredStaff.length === 0 ? (
          <div className="empty">No staff records for {selectedClinic}.</div>
        ) : (
          filteredStaff.map((member) => (
            <div className="staff-crud-row" key={member.id}>
              <span>
                <strong>{member.name}</strong>
                <small>
                  {member.email} â€¢ {member.clinic}
                </small>
              </span>
              <span className="staff-actions">
                <button
                  className="edit-button"
                  type="button"
                  onClick={() => edit(member)}
                >
                  Edit
                </button>
                <button
                  className="delete-button"
                  type="button"
                  onClick={() =>
                    window.confirm(`Remove ${member.name}?`) &&
                    onDeleteStaff(member.id)
                  }
                >
                  Delete
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function MedicationCollectionTickets({
  clinicName,
  medicationData,
}: {
  clinicName: string;
  medicationData: Medication[];
}) {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [message, setMessage] = useState("");
  const [selectedMedications, setSelectedMedications] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${apiUrl}/api/clinics/${encodeURIComponent(clinicName)}/queue-tickets`,
        );
        if (!response.ok)
          throw new Error("Unable to load clinic queue tickets.");
        const data = (await response.json()) as { tickets?: QueueTicket[] };
        if (active)
          setTickets(
            (data.tickets ?? []).filter((ticket) =>
              ["waiting", "ready", "called"].includes(ticket.status),
            ),
          );
      } catch {
        if (active) setTickets([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [clinicName]);

  const updateTicket = async (
    ticket: QueueTicket,
    action: "call" | "serve" | "miss",
  ) => {
    setActionId(ticket.id);
    setMessage("");
    try {
      const response = await fetch(
        `${apiUrl}/api/clinics/${encodeURIComponent(clinicName)}/queue-tickets/${ticket.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "serve"
              ? {
                  medications: Object.entries(selectedMedications).map(
                    ([name, quantity]) => ({ name, quantity }),
                  ),
                }
              : {},
          ),
        },
      );
      const result = (await response.json()) as QueueTicket & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "Ticket update failed.");
      setTickets((current) =>
        action === "serve" || action === "miss"
          ? current.filter((item) => item.id !== result.id)
          : current.map((item) => (item.id === result.id ? result : item)),
      );
      if (action === "serve") setSelectedMedications({});
      setMessage(
        action === "call"
          ? `Ticket #${ticket.queueNumber} called.`
          : action === "serve"
            ? `Ticket #${ticket.queueNumber} served.`
            : `Ticket #${ticket.queueNumber} marked as missed.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ticket update failed.",
      );
    } finally {
      setActionId("");
    }
  };

  return (
    <section className="portal-panel">
      <div className="section-heading">
        <div>
          <h2>Clinic queue</h2>
          <p>
            Call the next ticket, select the medication provided, then serve the
            patient.
          </p>
        </div>
      </div>
      {message && <p className="queue-message">{message}</p>}
      <div className="stockpile-editor">
        <h2>Medication for the selected patient</h2>
        <p>Select one or more medications. Stock is deducted when the patient is served.</p>
        {medicationData.map((medication) => {
          const quantity = selectedMedications[medication.name];
          return (
            <label key={medication.name}>
              <input
                type="checkbox"
                checked={quantity !== undefined}
                onChange={(event) =>
                  setSelectedMedications((current) => {
                    const next = { ...current };
                    if (event.target.checked) next[medication.name] = 1;
                    else delete next[medication.name];
                    return next;
                  })
                }
              />
              {medication.name} ({medication.stockCount} in stock)
              {quantity !== undefined && (
                <input
                  type="number"
                  min="1"
                  max={medication.stockCount}
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setSelectedMedications((current) => ({
                      ...current,
                      [medication.name]: Number(event.target.value),
                    }))
                  }
                />
              )}
            </label>
          );
        })}
      </div>
      {loading ? (
        <p className="empty">Loading clinic queue...</p>
      ) : tickets.length === 0 ? (
        <p className="empty">No active queue tickets.</p>
      ) : (
        <div className="staff-crud-list">
          {tickets.map((ticket) => (
            <div className="staff-crud-row" key={ticket.id}>
              <span>
                <strong>#{ticket.queueNumber}</strong>
                <small>
                  {ticket.status === "waiting"
                    ? `${ticket.peopleAhead ?? 0} people ahead`
                    : ticket.status === "ready" || ticket.status === "called"
                      ? "Called"
                      : ticket.status}
                </small>
              </span>
              <span className="staff-actions">
                <StatusPill
                  value={
                    ticket.status === "ready" || ticket.status === "called"
                      ? "Called"
                      : "Waiting"
                  }
                />
                {ticket.status === "waiting" && (
                  <button
                    className="primary-button"
                    disabled={actionId === ticket.id}
                    onClick={() => updateTicket(ticket, "call")}
                  >
                    {actionId === ticket.id ? "Updating..." : "Call"}
                  </button>
                )}
                {(ticket.status === "ready" || ticket.status === "called") && (
                  <button
                    className="primary-button"
                    disabled={actionId === ticket.id}
                    onClick={() => updateTicket(ticket, "serve")}
                  >
                    {actionId === ticket.id ? "Updating..." : "Serve"}
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StaffOperationsPanel({
  clinicData,
  enrolledClinic,
  medicationData,
  onUpdateClinic,
}: {
  clinicData: Clinic[];
  enrolledClinic: string;
  medicationData: Medication[];
  onUpdateClinic: (
    name: string,
    update: ClinicControlUpdate,
  ) => void | Promise<void>;
}) {
  const clinic =
    clinicData.find((item) => item.name === enrolledClinic) ?? clinicData[0];
  const [patients, setPatients] = useState(clinic.patients);
  const [wait, setWait] = useState(clinic.wait ?? 0);
  const [status, setStatus] = useState<Clinic["status"]>(getQueueLabel(clinic));
  const [savedMessage, setSavedMessage] = useState("");
  const showSaved = (message: string) => {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(""), 2500);
  };
  const commit = async () => {
    await onUpdateClinic(clinic.name, { status });
    showSaved("Updates published to the public dashboard");
  };
  return (
    <main className="queue-dashboard">
      <div className="queue-dashboard-title">
        <div>
          <p className="eyebrow">QUEUE MANAGEMENT</p>
          <h1>{clinic.name} queue</h1>
          <p>
            Patient count and estimated wait are calculated automatically from
            live check-ins.
          </p>
        </div>
        <span>
          Current Live Metrics:{" "}
          <strong>
            {clinic.wait ?? 0}m Wait / {clinic.patients} Patients in Queue
          </strong>
        </span>
      </div>
      <div className="queue-columns">
        <section className="queue-card">
          <h2>Live queue metrics</h2>
          <div className="queue-ticket-details">
            <span>
              <strong>{clinic.patients}</strong> patients waiting
            </span>
            <span>
              <strong>{clinic.wait ?? 0}</strong> min estimated wait
            </span>
            <span>
              <strong>Automatic</strong> progression
            </span>
          </div>
          <p className="queue-message">
            Patients receive queue numbers and allocated service times from the
            public clinic page. Leaving, serving, or missing a ticket updates
            these metrics automatically.
          </p>
          <hr />
          <label className="queue-label">Clinic status level</label>
          <div className="status-options">
            <button
              className={status === "Open - Low Wait" ? "selected" : ""}
              onClick={() => setStatus("Open - Low Wait")}
            >
              OPEN - LOW WAIT
            </button>
            <button
              className={status === "Open - Moderate Wait" ? "selected" : ""}
              onClick={() => setStatus("Open - Moderate Wait")}
            >
              OPEN - MODERATE WAIT
            </button>
            <button
              className={
                status === "Open - Long Wait" ? "selected long-wait" : ""
              }
              onClick={() => setStatus("Open - Long Wait")}
            >
              OPEN - LONG WAIT
            </button>
            <button
              className={
                status === "Open - Longer Wait" ? "selected longer-wait" : ""
              }
              onClick={() => setStatus("Open - Longer Wait")}
            >
              OPEN - LONGER WAIT
            </button>
            <button
              className={status === "Closed" ? "selected closed" : ""}
              onClick={() => setStatus("Closed")}
            >
              CLOSED
            </button>
          </div>
          <div className="queue-commit">
            <span>
              {savedMessage ||
                "Status changes affect whether patients can check in."}
            </span>
            <button className="primary-button" onClick={commit}>
              Publish status
            </button>
          </div>
        </section>
      </div>
      <MedicationCollectionTickets
        clinicName={clinic.name}
        medicationData={medicationData.filter(
          (medication) =>
            !medication.clinicName || medication.clinicName === clinic.name,
        )}
      />
    </main>
  );
  return (
    <main className="queue-dashboard">
      <div className="queue-dashboard-title">
        <div>
          <p className="eyebrow">QUEUE MANAGEMENT</p>
          <h1>Queue Velocity Controller</h1>
          <p>
            {clinic.name} - Update parameters displayed on the live public
            dashboard.
          </p>
        </div>
        <span>
          Current Live Metrics:{" "}
          <strong>
            {clinic.wait ?? 0}m Wait / {clinic.patients} Patients in Queue
          </strong>
        </span>
      </div>
      <div className="queue-columns">
        <section className="queue-card">
          <h2>Adjust Active Queue Metrics</h2>
          <label className="queue-label">
            Clinic status level (public display badge)
          </label>
          <div className="status-options">
            <button
              className={status === "Open - Low Wait" ? "selected" : ""}
              onClick={() => setStatus("Open - Low Wait")}
            >
              ● &nbsp; OPEN - LOW WAIT
            </button>
            <button
              className={status === "Open - Moderate Wait" ? "selected" : ""}
              onClick={() => setStatus("Open - Moderate Wait")}
            >
              ○ &nbsp; OPEN - MODERATE WAIT
            </button>
            <button
              className={status === "Open - Busy" ? "selected" : ""}
              onClick={() => setStatus("Open - Busy")}
            >
              ○ &nbsp; OPEN - BUSY
            </button>
            <button
              className={status === "Open - Very Busy" ? "selected" : ""}
              onClick={() => setStatus("Open - Very Busy")}
            >
              ○ &nbsp; OPEN - VERY BUSY
            </button>
            <button
              className={status === "Closed" ? "selected closed" : ""}
              onClick={() => setStatus("Closed")}
            >
              ○ &nbsp; CLOSED
            </button>
          </div>
          <hr />
          <div className="queue-label-row">
            <label className="queue-label">
              Patients currently checked-in (physical queue size)
            </label>
            <span>Typically ranges 0 - 50</span>
          </div>
          <div className="stepper">
            <button
              onClick={() => setPatients((value) => Math.max(0, value - 1))}
            >
              -
            </button>
            <strong>{patients}</strong>
            <button onClick={() => setPatients((value) => value + 1)}>+</button>
            <span>
              Patients undergoing triage or waiting for basic dispensary
              services.
            </span>
          </div>
          <hr />
          <div className="queue-label-row">
            <label className="queue-label">
              Estimated waiting time (minutes)
            </label>
            <span>Updates dynamically based on arrival rate</span>
          </div>
          <input
            className="wait-slider"
            type="range"
            min="0"
            max="120"
            value={wait}
            onChange={(event) => setWait(Number(event.target.value))}
          />
          <div className="slider-labels">
            <span>0m (Direct Admission)</span>
            <b>Active: {wait} mins</b>
            <span>120m+ (Extremely Busy)</span>
          </div>
          <hr />
          <div className="queue-commit">
            <span>
              {savedMessage ||
                "Changes publish to the public CareQueue site within 30 seconds."}
            </span>
            <button className="primary-button" onClick={commit}>
              ✓ &nbsp; Commit &amp; Publish Updates
            </button>
          </div>
        </section>
        <section className="queue-card queue-log">
          <h2>Queue Parameter Log</h2>
          <p>Historical log of updates pushed to {clinic.name}</p>
          <hr />
          <div className="log-entry current">
            <b>Queue wait set to {clinic.wait ?? 0} minutes</b>
            <small>Today - Current live status</small>
          </div>
          <div className="log-entry">
            <b>Active queue currently contains {clinic.patients} patients</b>
            <small>Public dashboard synchronized</small>
          </div>
          <div className="log-entry">
            <b>Clinic status level: {status}</b>
            <small>Ready for publication</small>
          </div>
          <div className="log-entry">
            <b>Facility initialized for morning triage</b>
            <small>Staff desk checkout</small>
          </div>
        </section>
      </div>
    </main>
  );
}

function StaffClinicOverview({
  clinicData,
  medicationData: allMedicationData,
  enrolledClinic,
}: {
  clinicData: Clinic[];
  medicationData: Medication[];
  enrolledClinic: string;
}) {
  const medicationData = allMedicationData.filter(
    (item) => !item.clinicName || item.clinicName === enrolledClinic,
  );
  const clinic =
    clinicData.find((item) => item.name === enrolledClinic) ?? clinicData[0];
  const alerts = medicationData.filter(
    (item) => item.availability !== "In Stock",
  );
  const queueLabel = getQueueLabel(clinic);
  return (
    <main className="staff-page">
      <div className="staff-page-title">
        <div>
          <p className="eyebrow">CLINIC OVERVIEW</p>
          <h1>{clinic.name} Portal</h1>
          <p>
            Assigned Node: {clinic.district} - {clinic.address}
          </p>
        </div>
        <span className="live">
          Current Live Status: <strong>{queueLabel.toUpperCase()}</strong>
        </span>
      </div>
      <div className="staff-stat-grid">
        <div>
          <small>LIVE WAITING TIME</small>
          <strong>{clinic.wait ?? 0} mins</strong>
          <span>Calculated from {clinic.patients} waiting cases</span>
        </div>
        <div>
          <small>ACTIVE QUEUE SIZE</small>
          <strong>{clinic.patients} People</strong>
          <span>Patients checked-in and waiting</span>
        </div>
        <div>
          <small>DISPENSARY LEVEL</small>
          <strong>{clinic.stock}% Stocked</strong>
          <span>
            {
              medicationData.filter(
                (item) => item.availability !== "Out of Stock",
              ).length
            }{" "}
            of {medicationData.length} essential medications stocked
          </span>
        </div>
      </div>
      <div className="staff-overview-grid">
        <section className="portal-panel">
          <div className="section-heading">
            <div>
              <h2>Queue Controller Quick Action</h2>
              <p>Quickly change the current clinic queue status.</p>
            </div>
          </div>
          <button
            className="primary-button"
            onClick={() =>
              document
                .querySelector(".staff-header nav button:nth-child(2)")
                ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
            }
          >
            Open Queue Management
          </button>
          <button
            className="secondary-button"
            onClick={() => window.location.reload()}
          >
            Sync Live Digital Signage
          </button>
          <div className="public-preview">
            <small>LIVE PUBLIC DISPLAY PREVIEW</small>
            <div>
              <StatusPill value={queueLabel} />
              <span>{clinic.distance} miles away</span>
              <h3>{clinic.name}</h3>
              <hr />
              <p>
                <span>
                  WAITING TIME<strong>{clinic.wait ?? 0} mins</strong>
                </span>
                <span>
                  PATIENTS IN LINE<strong>{clinic.patients} people</strong>
                </span>
              </p>
            </div>
          </div>
        </section>
        <section className="portal-panel">
          <div className="section-heading">
            <div>
              <h2>Critical Stock Monitor</h2>
              <p>Dispensary inventory items requiring attention.</p>
            </div>
            <StatusPill value={`${alerts.length} Alerts`} />
          </div>
          {alerts.map((item) => (
            <div className="stock-alert-row" key={item.name}>
              <strong>{item.name}</strong>
              <span>Stock status: {item.availability}</span>
              <StatusPill value={item.availability} />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function StaffStockpileController({
  medicationData: allMedicationData,
  enrolledClinic,
  onUpdateMedication,
  onRestockMedication,
}: {
  medicationData: Medication[];
  enrolledClinic: string;
  onUpdateMedication: (
    clinicName: string,
    name: string,
    update: MedicationControlUpdate,
  ) => void | Promise<void>;
  onRestockMedication: (
    clinicName: string,
    name: string,
    quantity: number,
  ) => Promise<Medication>;
}) {
  const medicationData = allMedicationData.filter(
    (item) => !item.clinicName || item.clinicName === enrolledClinic,
  );
  const [medicationName, setMedicationName] = useState(
    medicationData[0]?.name ?? "",
  );
  const medication =
    medicationData.find((item) => item.name === medicationName) ??
    medicationData[0];
  const [stockCount, setStockCount] = useState(medication?.stockCount ?? 0);
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const save = async () => {
    await onUpdateMedication(enrolledClinic, medication.name, { stockCount });
    setMessage("Stockpile update published to the public portal");
    window.setTimeout(() => setMessage(""), 2500);
  };
  const restock = async () => {
    try {
      const updated = await onRestockMedication(
        enrolledClinic,
        medication.name,
        restockQuantity,
      );
      setStockCount(updated.stockCount);
      setMessage(
        `Restocked ${restockQuantity} units. New total: ${updated.stockCount}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Stock could not be restocked.",
      );
    }
  };
  return (
    <main className="staff-page">
      <div className="staff-page-title">
        <div>
          <p className="eyebrow">STOCKPILE CONTROLLER</p>
          <h1>Live Pharmacy Dispensary Inventory</h1>
          <p>
            {enrolledClinic} - Update medication quantities shared with the
            public.
          </p>
        </div>
        {message && <span className="live">{message}</span>}
      </div>
      <div className="stockpile-grid">
        <section className="portal-panel stockpile-editor">
          <h2>Update Medication Stock</h2>
          <p>Select a medication and enter the current quantity.</p>
          <label>
            Medication
            <select
              value={medication.name}
              onChange={(event) => {
                const selected = medicationData.find(
                  (item) => item.name === event.target.value,
                );
                setMedicationName(event.target.value);
                if (selected) setStockCount(selected.stockCount);
              }}
            >
              {medicationData.map((item) => (
                <option key={item.name}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Clinic
            <input value={enrolledClinic} readOnly />
          </label>
          <label>
            Number in stock
            <input
              type="number"
              min="0"
              step="1"
              value={stockCount}
              onChange={(event) =>
                setStockCount(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </label>
          <button className="primary-button" onClick={save}>
            Commit &amp; Publish Stock Update
          </button>
          <hr />
          <label>
            Restock quantity
            <input
              type="number"
              min="1"
              step="1"
              value={restockQuantity}
              onChange={(event) =>
                setRestockQuantity(Number(event.target.value))
              }
            />
          </label>
          <button
            className="secondary-button"
            onClick={restock}
            disabled={restockQuantity < 1}
          >
            Restock Medication
          </button>
        </section>
        <section className="portal-panel">
          <div className="section-heading">
            <div>
              <h2>Current Stockpile</h2>
              <p>Medication records currently visible to patients.</p>
            </div>
          </div>
          <div className="stockpile-table">
            <div className="stockpile-head">
              <span>Medication</span>
              <span>Category</span>
              <span>Quantity</span>
              <span>Availability</span>
            </div>
            {medicationData.map((item) => (
              <div className="stockpile-row" key={item.name}>
                <strong>{item.name}</strong>
                <span>{item.category}</span>
                <span>{item.stockCount} units</span>
                <StatusPill value={item.availability} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminDashboard({
  clinicData,
  medicationData,
  systemSummary,
}: {
  clinicData: Clinic[];
  medicationData: Medication[];
  systemSummary: SystemSummary;
}) {
  const [reportMessage, setReportMessage] = useState("");
  const critical = medicationData.filter(
    (item) => item.availability !== "In Stock",
  );
  const generateInventoryReport = () => {
    if (!medicationData.length) {
      setReportMessage("No medication inventory is available to report.");
      return;
    }

    const generatedAt = new Date();
    const report = new jsPDF({ orientation: "landscape", format: "a4" });
    autoTable(report, {
      head: [["Medication", "Category", "Stock count", "Availability", "Reporting clinics", "Updated at"]],
      body: medicationData.map((item) => [
        item.name,
        item.category,
        item.stockCount,
        item.availability,
        item.clinicName || item.clinics || "Not reported",
        item.updatedAt || "Not reported",
      ]),
      startY: 30,
      margin: { top: 30, right: 10, bottom: 16, left: 10 },
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [0, 145, 135] },
      willDrawPage: () => {
        report.setFontSize(15);
        report.setTextColor(30, 50, 70);
        report.text("CareQueue Public Medication Inventory", 10, 15);
        report.setFontSize(9);
        report.setTextColor(90, 100, 110);
        report.text(`Generated ${generatedAt.toLocaleString()}`, 10, 22);
      },
      didDrawPage: () => {
        report.setFontSize(8);
        report.setTextColor(90, 100, 110);
        report.text(
          `Page ${report.internal.pages.length - 1}`,
          report.internal.pageSize.getWidth() - 10,
          report.internal.pageSize.getHeight() - 7,
          { align: "right" },
        );
      },
    });
    report.save(
      `carequeue-public-inventory-${generatedAt.toISOString().slice(0, 10)}.pdf`,
    );
    setReportMessage("Public inventory report downloaded.");
  };
  return (
    <main className="admin-page">
      <div className="admin-page-title">
        <div>
          <p className="eyebrow">ADMINISTRATION CONSOLE</p>
          <h1>Executive Health Hub Oversight</h1>
          <p>
            Live statistics and administrative parameters for registered local
            clinics.
          </p>
        </div>
        <div>
          <button
            className="primary-button"
            type="button"
            onClick={generateInventoryReport}
          >
            Generate public inventory report
          </button>
          {reportMessage && <p role="status">{reportMessage}</p>}
        </div>
      </div>
      <div className="admin-stats">
        <div>
          <small>ACTIVE CLINICS</small>
          <strong>{systemSummary.activeClinics} / 14</strong>
          <span>2 regional nodes offline</span>
        </div>
        <div>
          <small>TOTAL REGISTERED STAFF</small>
          <strong>{systemSummary.totalStaff} Staff</strong>
          <span>Approved clinical personnel</span>
        </div>
        <div>
          <small>SEVERE STOCK ALERTS</small>
          <strong>{critical.length} Drugs</strong>
          <span>Reporting below safe threshold</span>
        </div>
        <div>
          <small>LIVE PATIENTS IN QUEUE</small>
          <strong>
            {clinicData.reduce((total, clinic) => total + clinic.patients, 0)}{" "}
            Patients
          </strong>
          <span>
            Estimated average wait:{" "}
            {Math.round(
              clinicData
                .filter((clinic) => clinic.wait !== null)
                .reduce((total, clinic) => total + (clinic.wait ?? 0), 0) /
                Math.max(
                  clinicData.filter((clinic) => clinic.wait !== null).length,
                  1,
                ),
            )}{" "}
            mins
          </span>
        </div>
      </div>
      <div className="admin-columns">
        <section className="portal-panel">
          <div className="section-heading">
            <div>
              <h2>Active Queue Wait Times by Clinic Node</h2>
              <p>Live metrics published by on-duty clinical staff.</p>
            </div>
          </div>
          {clinicData
            .filter((clinic) => clinic.status !== "Closed")
            .map((clinic) => (
              <div className="admin-clinic-row" key={clinic.name}>
                <strong>{clinic.name}</strong>
                <span>
                  Estimated wait: <b>{clinic.wait ?? 0} mins</b> &nbsp;
                  Patients: <b>{clinic.patients}</b>
                </span>
                <StatusPill
                  value={
                    clinic.status.startsWith("Open - ")
                      ? clinic.status.slice("Open - ".length)
                      : clinic.status
                  }
                />
              </div>
            ))}
        </section>
        <section className="portal-panel">
          <div className="section-heading">
            <div>
              <h2>Critical Medication Shortfalls</h2>
              <p>Dispensary reports requiring attention.</p>
            </div>
          </div>
          {critical.slice(0, 4).map((item) => (
            <div className="admin-med-row" key={item.name}>
              <strong>{item.name}</strong>
              <span>{item.clinics}</span>
              <StatusPill value={item.availability} />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function AdminClinics({ clinicData, onCreateClinic, onUpdateClinic, onDeleteClinic }: { clinicData: Clinic[]; onCreateClinic: (clinic: Omit<Clinic, "id" | "distance" | "wait" | "patients" | "stock" | "status" | "updatedAt">) => Promise<void>; onUpdateClinic: (name: string, update: ClinicAdminUpdate) => Promise<void>; onDeleteClinic: (name: string) => Promise<void> }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", province: "", district: "", address: "", hours: "", phone: "" });
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateClinic(form);
    setForm({ name: "", province: "", district: "", address: "", hours: "", phone: "" });
    setShowCreate(false);
  };
  const edit = async (clinic: Clinic) => {
    const address = window.prompt("Clinic address", clinic.address)?.trim();
    const hours = window.prompt("Operating hours", clinic.hours)?.trim();
    const phone = window.prompt("Clinic phone", clinic.phone)?.trim();
    if (address && hours && phone) await onUpdateClinic(clinic.name, { address, hours, phone });
  };
  return (
    <main className="admin-page">
      <div className="admin-page-title">
        <div>
          <h1>Registered Public Clinics ({clinicData.length})</h1>
          <p>
            Manage active clinical locations, district assignments, operating
            hours, and live queue states.
          </p>
        </div>
        <button className="primary-button" onClick={() => setShowCreate((value) => !value)}>{showCreate ? "Close" : "+ Add New Clinic Node"}</button>
      </div>
      {showCreate && <form className="admin-filters" onSubmit={create}>{Object.entries(form).map(([key, value]) => <input key={key} value={value} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={key[0].toUpperCase() + key.slice(1)} required />)}<button className="primary-button" type="submit">Create clinic</button></form>}
      <div className="admin-filters">
        <input placeholder="Filter clinics by name, district, or address..." />
        <select>
          <option>District: All Regions</option>
        </select>
        <select>
          <option>Status: Open Now</option>
        </select>
        <button className="text-button">Reset Filters</button>
      </div>
      <div className="admin-table">
        <div className="admin-table-head">
          <span>Clinic Name & District</span>
          <span>Operating Hours</span>
          <span>Patients in Queue</span>
          <span>Overall Medication Stock</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {clinicData.map((clinic) => (
          <div className="admin-table-row" key={clinic.name}>
            <span>
              <strong>{clinic.name}</strong>
              <small>{clinic.address}</small>
            </span>
            <span>{clinic.hours}</span>
            <span>{clinic.patients} active</span>
            <span>{clinic.stock}% Stocked</span>
            <StatusPill value={clinic.status} />
            <span className="table-actions"><button onClick={() => edit(clinic)}>Edit</button> <button onClick={() => onDeleteClinic(clinic.name)}>Delete</button></span>
          </div>
        ))}
      </div>
    </main>
  );
}

function AdminStaff({
  approvedStaff,
  pendingStaff,
  onApprove,
  onReject,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
}: {
  approvedStaff: StaffRegistration[];
  pendingStaff: StaffRegistration[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCreateStaff: (staff: StaffUpdate & { role: "staff" | "admin"; password: string }) => Promise<{ temporaryPassword?: string }>;
  onUpdateStaff: (id: string, update: StaffUpdate) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
}) {
  const staff = dedupeStaffList([...approvedStaff, ...pendingStaff]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [password, setPassword] = useState("");
  const [clinic, setClinic] = useState(clinics[0].name);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const createStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setMessage("");
    try {
      const result = await onCreateStaff({ name: name.trim(), email: email.trim().toLowerCase(), clinic, role, password });
      setMessage(result.temporaryPassword ? `Created. Temporary password: ${result.temporaryPassword}` : "Created and invitation email sent.");
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Staff account could not be created.");
    } finally {
      setCreating(false);
    }
  };
  const editStaff = async (member: StaffRegistration) => {
    const name = window.prompt("Staff name", member.name)?.trim();
    const email = window.prompt("Staff email", member.email)?.trim().toLowerCase();
    const clinic = window.prompt("Assigned clinic", member.clinic)?.trim();
    if (name && email && clinic) await onUpdateStaff(member.id, { name, email, clinic });
  };
  return (
    <main className="admin-page">
      <div className="admin-page-title">
        <div>
          <h1>Staff Directory ({staff.length})</h1>
          <p>
            Configure health professionals, assigned roles, and account
            activation states.
          </p>
        </div>
        <button className="primary-button" onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? "Close" : "+ Register New Personnel"}
        </button>
      </div>
      {showCreate && (
        <form className="admin-filters" onSubmit={createStaff}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" required />
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email address" required />
          <select value={clinic} onChange={(event) => setClinic(event.target.value)}>
            {clinics.map((item) => <option key={item.name}>{item.name}</option>)}
          </select>
          <select value={role} onChange={(event) => setRole(event.target.value as "staff" | "admin")}>
            <option value="staff">Staff</option>
            <option value="admin">Administrator</option>
          </select>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} placeholder="Temporary password" required />
          <button className="primary-button" type="submit" disabled={creating}>{creating ? "Creating..." : "Create and email invite"}</button>
          {message && <span className="queue-message">{message}</span>}
        </form>
      )}
      <div className="admin-filters">
        <input placeholder="Search staff by name, email, or ID..." />
        <select>
          <option>Role: All Positions</option>
        </select>
        <select>
          <option>Node Assignment: All</option>
        </select>
        <button className="text-button">Reset Filters</button>
      </div>
      <div className="admin-table">
        <div className="admin-table-head">
          <span>Staff Member</span>
          <span>Professional Role</span>
          <span>Primary Assigned Clinic</span>
          <span>Credential Status</span>
          <span>Actions</span>
        </div>
        {staff.map((member) => (
          <div className="admin-table-row" key={member.id}>
            <span>
              <strong>{member.name}</strong>
              <small>{member.email}</small>
            </span>
            <span>
              {member.role === "admin" ? "Administrator" : "Clinical Staff"}
            </span>
            <span>{member.clinic}</span>
            {pendingStaff.some((pending) => pending.id === member.id) ? (
              <>
                <StatusPill value="Pending" />
                <span className="table-actions">
                  <button onClick={() => onApprove(member.id)}>Approve</button>{" "}
                  <button onClick={() => onReject(member.id)}>Reject</button>
                </span>
              </>
            ) : (
              <>
                <StatusPill value="Active" />
                <span className="table-actions">
                  <button onClick={() => editStaff(member)}>Edit</button>{" "}
                  <button onClick={() => window.confirm(`Delete ${member.name}?`) && onDeleteStaff(member.id)}>Delete</button>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function AdminMedications({
  medicationData,
  onCreateMedication,
  onRestockMedication,
}: {
  medicationData: Medication[];
  onCreateMedication: (
    medication: Omit<Medication, "availability">,
  ) => Promise<void>;
  onRestockMedication: (
    clinicName: string,
    name: string,
    quantity: number,
  ) => Promise<Medication>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [alertFilter, setAlertFilter] = useState("Severe Shortfall");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState("");
  const [restockClinic, setRestockClinic] = useState(clinics[0]?.name ?? "");
  const [restockMedication, setRestockMedication] = useState(
    medicationData[0]?.name ?? "",
  );
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [restockMessage, setRestockMessage] = useState("");
  const medicationOptions = Array.from(
    new Map(medicationData.map((item) => [item.name, item])).values(),
  );
  const clinicInventory = medicationData.filter(
    (item) => !item.clinicName || item.clinicName === restockClinic,
  );
  const categories = Array.from(
    new Set(medicationData.map((item) => item.category)),
  );
  const targetStock = (item: Medication) =>
    item.stockCount >= 250 ? item.stockCount : 250;
  const lowStockTrigger = (item: Medication) =>
    Math.round(targetStock(item) * 0.2);
  const filtered = clinicInventory.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      category === "All Categories" || item.category === category;
    const matchesAlert =
      alertFilter !== "Severe Shortfall" ||
      item.stockCount < lowStockTrigger(item);
    return matchesQuery && matchesCategory && matchesAlert;
  });
  const selectedRestockItem = medicationData.find(
    (item) =>
      item.name === restockMedication &&
      (!item.clinicName || item.clinicName === restockClinic),
  );
  const createMedication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await onCreateMedication({
        name: String(values.get("name") || "").trim(),
        category: String(values.get("category") || "").trim(),
        clinics: "All clinics",
        stockCount: Number(values.get("stockCount")),
      });
      form.reset();
      setAlertFilter("All Stock Levels");
      setShowCreateForm(false);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Medication could not be added.",
      );
    }
  };
  const restock = async () => {
    setRestockMessage("");
    try {
      const updated = await onRestockMedication(
        restockClinic,
        restockMedication,
        restockQuantity,
      );
      setRestockMessage(
        `Restocked ${restockQuantity} units. New total: ${updated.stockCount}.`,
      );
    } catch (error) {
      setRestockMessage(
        error instanceof Error
          ? error.message
          : "Stock could not be restocked.",
      );
    }
  };
  return (
    <main className="admin-page medication-admin-page">
      <div className="admin-page-title">
        <div>
          <h1>
            Medication Inventory - {restockClinic} ({clinicInventory.length})
          </h1>
          <p>Review clinic-specific quantities and add received stock.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setShowCreateForm((current) => !current);
            setCreateError("");
          }}
        >
          {showCreateForm ? "Cancel" : "+ Catalog New Medication"}
        </button>
      </div>
      {showCreateForm && (
        <form className="medication-create-form" onSubmit={createMedication}>
          <div>
            <label>
              Medication name
              <input
                name="name"
                required
                placeholder="e.g. Ibuprofen 200mg Tablets"
              />
            </label>
            <label>
              Therapeutic category
              <input name="category" required placeholder="e.g. Pain & Fever" />
            </label>
            <label>
              Opening stock quantity
              <input
                name="stockCount"
                type="number"
                min="0"
                step="1"
                required
                placeholder="0"
              />
            </label>
          </div>
          <div className="medication-create-actions">
            <button className="primary-button" type="submit">
              Add Medication
            </button>
            {createError && (
              <p className="medication-create-error">{createError}</p>
            )}
          </div>
        </form>
      )}
      <section className="portal-panel medication-restock-panel">
        <h2>Restock clinic inventory</h2>
        <div className="filter-row admin-restock-row">
          <label>
            Clinic
            <select
              value={restockClinic}
              onChange={(event) => setRestockClinic(event.target.value)}
            >
              {clinics.map((clinic) => (
                <option key={clinic.name} value={clinic.name}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Medication
            <select
              value={restockMedication}
              onChange={(event) => setRestockMedication(event.target.value)}
            >
              {medicationOptions.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity received
            <input
              type="number"
              min="1"
              step="1"
              value={restockQuantity}
              onChange={(event) =>
                setRestockQuantity(Number(event.target.value))
              }
            />
          </label>
          <button
            className="primary-button"
            onClick={restock}
            disabled={!selectedRestockItem || restockQuantity < 1}
          >
            Restock Medication
          </button>
        </div>
        {selectedRestockItem && (
          <p>
            Current stock: {selectedRestockItem.stockCount} units (
            {selectedRestockItem.availability})
          </p>
        )}
        {restockMessage && <p className="queue-message">{restockMessage}</p>}
      </section>
      <div className="medication-filters">
        <label className="medication-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search drugs by brand name, generic formulation..."
          />
        </label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option>All Categories</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={alertFilter}
          onChange={(event) => setAlertFilter(event.target.value)}
        >
          <option>Severe Shortfall</option>
          <option>All Stock Levels</option>
        </select>
        <button
          className="text-button"
          onClick={() => {
            setQuery("");
            setCategory("All Categories");
            setAlertFilter("Severe Shortfall");
          }}
        >
          Reset Filters
        </button>
      </div>
      <div className="medication-admin-table">
        <div className="medication-admin-head">
          <span>Medication Name &amp; Strength</span>
          <span>Therapeutic Category</span>
          <span>Current Stock</span>
          <span>Availability</span>
          <span>Low Stock Alarm Trigger</span>
        </div>
        {filtered.map((item) => (
          <div
            className="medication-admin-row"
            key={`${item.name}-${item.clinicName ?? restockClinic}`}
          >
            <span>
              <strong>{item.name}</strong>
              <small>Formulation: {item.category} medicine</small>
            </span>
            <span>{item.category}</span>
            <span>{item.stockCount.toLocaleString()} units</span>
            <span>{item.availability}</span>
            <span className="alarm-value">
              below {lowStockTrigger(item).toLocaleString()} units
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="empty">No medications match the selected filters.</p>
        )}
      </div>
    </main>
  );
}

function PortalContent({
  role,
  onLogout,
  pendingStaff,
  approvedStaff,
  onApprove,
  onReject,
  systemSummary,
  clinicData,
  medicationData: allMedicationData,
  enrolledClinic,
}: {
  role: Role;
  onLogout: () => void;
  pendingStaff: StaffRegistration[];
  approvedStaff: StaffRegistration[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  systemSummary: SystemSummary;
  clinicData: Clinic[];
  medicationData: Medication[];
  enrolledClinic: string;
}) {
  const admin = role === "admin";
  const medicationData = admin
    ? allMedicationData
    : allMedicationData.filter(
        (medication) =>
          !medication.clinicName || medication.clinicName === enrolledClinic,
      );
  const enrolledClinicData =
    clinicData.find((clinic) => clinic.name === enrolledClinic) ??
    clinicData[0];
  const stockedMedicationCount = medicationData.filter(
    (medication) => medication.availability !== "Out of Stock",
  ).length;
  useEffect(() => {
    const handleQuickAction = (event: MouseEvent) => {
      const button =
        event.target instanceof HTMLButtonElement ? event.target : null;
      if (!button) return;
      if (button.textContent === "Open queue management panel")
        document
          .querySelector(".staff-operations-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (button.textContent === "Sync live digital signage")
        window.location.reload();
    };
    document.addEventListener("click", handleQuickAction);
    return () => document.removeEventListener("click", handleQuickAction);
  }, []);
  return (
    <main className="admin-main">
      <div className="portal-top">
        <div>
          <p className="eyebrow">
            {admin ? "ADMINISTRATION CONSOLE" : "CLINIC STAFF PORTAL"}
          </p>
          <h1>
            {admin
              ? "Executive health hub oversight"
              : "Metro Family Care Centre portal"}
          </h1>
          <p>
            {admin
              ? "Live statistics and administrative parameters of registered local clinics."
              : "Assigned Node: Central District â€¢ 220 Plaza Avenue"}
          </p>
        </div>
        <button className="sign-out" onClick={onLogout}>
          Sign out
        </button>
      </div>
      <div className="stat-grid">
        <div>
          <small>{admin ? "ACTIVE CLINICS" : "LIVE WAITING TIME"}</small>
          <strong>
            {admin
              ? `${systemSummary.activeClinics}`
              : `${enrolledClinicData.wait ?? 0} mins`}
          </strong>
          <span>
            {admin
              ? "Current registered clinic count"
              : `Calculated from ${enrolledClinicData.patients} waiting cases`}
          </span>
        </div>
        <div>
          <small>
            {admin ? "TOTAL REGISTERED STAFF" : "ACTIVE QUEUE SIZE"}
          </small>
          <strong>
            {admin
              ? `${systemSummary.totalStaff} Staff`
              : `${enrolledClinicData.patients} People`}
          </strong>
          <span>
            {admin
              ? "Includes approved clinic staff only"
              : "Patients checked-in"}
          </span>
        </div>
        <div>
          <small>{admin ? "PENDING APPROVALS" : "DISPENSARY LEVEL"}</small>
          <strong>
            {admin
              ? `${systemSummary.pendingApprovals}`
              : `${Math.round((stockedMedicationCount / medicationData.length) * 100)}% Stocked`}
          </strong>
          <span>
            {admin
              ? "Staff registrations awaiting review"
              : `${stockedMedicationCount} of ${medicationData.length} essentials stocked`}
          </span>
        </div>
      </div>
      <div className="portal-grid">
        <section className="portal-panel">
          <div className="section-heading">
            <div>
              <h2>
                {admin
                  ? "Staff approval queue"
                  : "Queue controller quick action"}
              </h2>
              <p>
                {admin
                  ? "Review every staff registration before portal access is granted."
                  : "Quickly change current clinic queue status."}
              </p>
            </div>
          </div>
          {admin ? (
            <div className="approval-list">
              {pendingStaff.length === 0 ? (
                <p className="empty">
                  No staff registrations are waiting for approval.
                </p>
              ) : (
                pendingStaff.map((staff) => (
                  <div className="approval-row" key={staff.id}>
                    <div>
                      <strong>{staff.name}</strong>
                      <span>
                        {staff.email} â€¢ {staff.clinic}
                      </span>
                    </div>
                    <div className="approval-actions">
                      <button
                        className="approve-button"
                        onClick={() => onApprove(staff.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => onReject(staff.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <button className="primary-button">
                Open queue management panel
              </button>
              <button className="secondary-button">
                Sync live digital signage
              </button>
            </>
          )}
        </section>
        <section className="portal-panel">
          <div className="section-heading">
            <div>
              <h2>
                {admin
                  ? "Critical medication shortfalls"
                  : "Critical stock monitor"}
              </h2>
              <p>Dispensary reports requiring attention.</p>
            </div>
          </div>
          <div className="alert-list">
            {medications
              .filter((medicine) => medicine.availability !== "In Stock")
              .slice(0, 3)
              .map((medicine) => (
                <div key={medicine.name}>
                  <strong>{medicine.name}</strong>
                  <span>Stock status: {medicine.availability}</span>
                  <StatusPill value={medicine.availability} />
                </div>
              ))}
          </div>
        </section>
      </div>
      {admin && (
        <section className="portal-panel clinic-panel">
          <div className="section-heading">
            <div>
              <h2>Staff by clinic</h2>
              <p>
                All approved staff and administrators currently registered in
                the system.
              </p>
            </div>
          </div>
          <div className="clinic-staff-grid">
            {clinics.map((clinic) => {
              const clinicStaff = approvedStaff.filter(
                (staff) => staff.clinic === clinic.name,
              );
              return (
                <div className="clinic-staff-card" key={clinic.name}>
                  <strong>{clinic.name}</strong>
                  <span>
                    {clinicStaff.length} approved{" "}
                    {clinicStaff.length === 1
                      ? "staff member"
                      : "staff members"}
                  </span>
                  {clinicStaff.length > 0 ? (
                    clinicStaff.map((staff) => (
                      <div className="staff-row" key={staff.email}>
                        <span>{staff.name}</span>
                        <small>{staff.email}</small>
                      </div>
                    ))
                  ) : (
                    <small>No approved staff assigned</small>
                  )}
                </div>
              );
            })}
          </div>
          <div className="admin-staff-row">
            <strong>Administration</strong>
            <span>
              {approvedStaff.filter((staff) => staff.role === "admin").length}{" "}
              administrator(s)
            </span>
            {approvedStaff
              .filter((staff) => staff.role === "admin")
              .map((staff) => (
                <small key={staff.email}>
                  {staff.name} â€¢ {staff.email}
                </small>
              ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Portal({
  ...props
}: Parameters<typeof PortalContent>[0] & {
  clinicData: Clinic[];
  medicationData: Medication[];
  enrolledClinic: string;
  onCreateStaff: (staff: StaffUpdate & { role: "staff" | "admin"; password: string }) => Promise<{ temporaryPassword?: string }>;
  onUpdateStaff: (id: string, update: StaffUpdate) => void;
  onDeleteStaff: (id: string) => void;
  onUpdateClinic: (name: string, update: ClinicControlUpdate) => void;
  onUpdateMedication: (
    clinicName: string,
    name: string,
    update: MedicationControlUpdate,
  ) => void;
}) {
  return props.role === "admin" ? (
    <>
      <StaffCrudPanel
        approvedStaff={props.approvedStaff}
        onCreateStaff={props.onCreateStaff}
        onUpdateStaff={props.onUpdateStaff}
        onDeleteStaff={props.onDeleteStaff}
      />
      <PortalContent {...props} />
    </>
  ) : (
    <>
      <StaffOperationsPanel
        clinicData={props.clinicData}
        enrolledClinic={props.enrolledClinic}
        medicationData={props.medicationData}
        onUpdateClinic={props.onUpdateClinic}
      />
      <PortalContent {...props} />
    </>
  );
}

export default function Home() {
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "home";
    const resetParams = new URLSearchParams(window.location.hash.slice(1));
    return resetParams.has("resetEmail") && resetParams.has("resetToken")
      ? "login"
      : "home";
  });
  const [previousView, setPreviousView] = useState<View>("home");
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [role, setRole] = useState<Role>("public");
  const [staffName, setStaffName] = useState("Staff member");
  const [enrolledClinic, setEnrolledClinic] = useState(
    "Metro Family Care Centre",
  );
  const [pendingStaff, setPendingStaff] = useState<StaffRegistration[]>([]);
  const [approvedStaff, setApprovedStaff] =
    useState<StaffRegistration[]>(initialApprovedStaff);
  const [clinicData, setClinicData] = useState<Clinic[]>(clinics);
  const [medicationData, setMedicationData] =
    useState<Medication[]>(medications);
  const [systemSummary, setSystemSummary] = useState<SystemSummary>({
    activeClinics: clinics.length,
    totalStaff: initialApprovedStaff.filter((staff) => staff.role === "staff")
      .length,
    pendingApprovals: 0,
  });
  const [authMessage, setAuthMessage] = useState("");
  useEffect(() => {
    const resetParams = new URLSearchParams(window.location.hash.slice(1));
    if (!resetParams.has("resetEmail") || !resetParams.has("resetToken")) {
      const session = readStoredAuthSession();
      if (session) {
        startTransition(() => {
          setRole(session.role);
          if (session.name) setStaffName(session.name);
          if (session.clinic) setEnrolledClinic(session.clinic);
          setView(session.role === "admin" ? "adminDashboard" : "staffOverview");
        });
      }
    }
    if (!window.history.state?.careQueueView) {
      window.history.replaceState(
        { ...window.history.state, careQueueView: "home" },
        "",
        window.location.href,
      );
    }
    const handleBrowserBack = (event: PopStateEvent) => {
      const nextView = event.state?.careQueueView as View | undefined;
      setView(nextView || "home");
      setSelectedClinic(null);
    };
    window.addEventListener("popstate", handleBrowserBack);
    const loadPublicData = () =>
      fetch(`${apiUrl}/api/public-data`)
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data: { clinics: Clinic[]; medications: Medication[] }) => {
          clinics = data.clinics.map((clinic) => ({
            ...clinic,
            distance:
              clinics.find((current) => current.name === clinic.name)
                ?.distance ?? 0,
          }));
          medications = data.medications;
          setClinicData(clinics);
          setSelectedClinic((current) =>
            current
              ? (clinics.find((clinic) => clinic.name === current.name) ??
                current)
              : null,
          );
          setMedicationData(medications);
        })
        .catch(() => undefined);
    const loadStaff = () =>
      fetch(`${apiUrl}/api/staff`)
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((records: ApiStaff[]) => {
          const uniqueRecords = dedupeStaffList(records);
          setApprovedStaff(
            uniqueRecords
              .filter((staff) => staff.status === "approved")
              .map(toStaffRegistration),
          );
          setPendingStaff(
            uniqueRecords
              .filter((staff) => staff.status === "pending")
              .map(toStaffRegistration),
          );
        })
        .catch(() => undefined);
    const loadSummary = () =>
      fetch(`${apiUrl}/api/summary`)
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((summary: SystemSummary) => {
          setSystemSummary(summary);
        })
        .catch(() => undefined);
    loadPublicData();
    const publicDataTimer = window.setInterval(loadPublicData, 10000);
    loadStaff();
    loadSummary();
    const staffTimer = window.setInterval(loadStaff, 10000);
    const summaryTimer = window.setInterval(loadSummary, 10000);
    return () => {
      window.removeEventListener("popstate", handleBrowserBack);
      window.clearInterval(publicDataTimer);
      window.clearInterval(staffTimer);
      window.clearInterval(summaryTimer);
    };
  }, []);
  const navigate = useCallback(
    (nextView: View) => {
      if (nextView !== view) setPreviousView(view);
      window.history.pushState(
        { ...window.history.state, careQueueView: nextView },
        "",
        window.location.href,
      );
      setView(nextView);
      setSelectedClinic(null);
    },
    [view],
  );
  useEffect(() => {
    const handleKeyboardBack = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.matches("input, textarea, select, [contenteditable='true']") ??
        false;
      if (event.key === "Backspace" && !isEditable && view !== "home") {
        event.preventDefault();
        navigate(previousView);
      }
    };
    window.addEventListener("keydown", handleKeyboardBack);
    return () => window.removeEventListener("keydown", handleKeyboardBack);
  }, [navigate, previousView, view]);
  const createStaff = async (staff: StaffUpdate & { role: "staff" | "admin"; password: string }) => {
    const response = await fetch(`${apiUrl}/api/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...staff, status: "approved" }),
    });
    const result = (await response.json().catch(() => ({}))) as ApiStaff & { temporaryPassword?: string; error?: string };
    if (!response.ok) throw new Error(result.error || "Staff account could not be created.");
    const saved = toStaffRegistration(result);
    if (result.status === "approved") {
      setApprovedStaff((current) => [...current, saved]);
      setSystemSummary((current) => ({
        ...current,
        totalStaff: current.totalStaff + 1,
      }));
    } else {
      setPendingStaff((current) => [...current, saved]);
      setSystemSummary((current) => ({
        ...current,
        pendingApprovals: current.pendingApprovals + 1,
      }));
    }
    return { temporaryPassword: result.temporaryPassword };
  };
  const registerStaff = async ({ name, email, password, clinic }: { name: string; email: string; password: string; clinic: string }) => {
    const response = await fetch(`${apiUrl}/api/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        clinic,
        role: "staff",
        status: "pending",
      }),
    });
    const result = (await response.json().catch(() => ({}))) as ApiStaff & { error?: string };
    if (!response.ok) throw new Error(result.error || "Registration could not be submitted.");
    setPendingStaff((current) => [...current, toStaffRegistration(result)]);
    setSystemSummary((current) => ({
      ...current,
      pendingApprovals: current.pendingApprovals + 1,
    }));
  };
  const updateStaff = async (id: string, update: StaffUpdate) => {
    await fetch(`${apiUrl}/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    setApprovedStaff((current) =>
      current.map((staff) =>
        staff.id === id ? { ...staff, ...update } : staff,
      ),
    );
  };
  const deleteStaff = async (id: string) => {
    await fetch(`${apiUrl}/api/staff/${id}`, { method: "DELETE" });
    setApprovedStaff((current) => current.filter((staff) => staff.id !== id));
    setSystemSummary((current) => ({
      ...current,
      totalStaff: Math.max(current.totalStaff - 1, 0),
    }));
  };
  const updateClinic = async (name: string, update: ClinicControlUpdate) => {
    if (role === "staff" && name !== enrolledClinic) return;
    const response = await fetch(
      `${apiUrl}/api/clinics/${encodeURIComponent(name)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      },
    );
    if (!response.ok) throw new Error("Queue update failed");
    const saved = (await response.json()) as Clinic;
    clinics = clinics.map((clinic) =>
      clinic.name === name ? { ...clinic, ...saved } : clinic,
    );
    setClinicData((current) =>
      current.map((clinic) =>
        clinic.name === name ? { ...clinic, ...saved } : clinic,
      ),
    );
  };
  const createClinic = async (clinic: Omit<Clinic, "id" | "distance" | "wait" | "patients" | "stock" | "status" | "updatedAt">) => {
    const response = await fetch(`${apiUrl}/api/clinics`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clinic) });
    const result = (await response.json().catch(() => ({}))) as Clinic & { error?: string };
    if (!response.ok) throw new Error(result.error || "Clinic could not be created.");
    const saved = { ...result, distance: 0 };
    clinics = [...clinics, saved];
    setClinicData((current) => [...current, saved]);
  };
  const updateClinicAdmin = async (name: string, update: ClinicAdminUpdate) => {
    const response = await fetch(`${apiUrl}/api/clinics/${encodeURIComponent(name)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
    const result = (await response.json().catch(() => ({}))) as Clinic & { error?: string };
    if (!response.ok) throw new Error(result.error || "Clinic could not be updated.");
    const saved = { ...result, distance: clinics.find((clinic) => clinic.name === name)?.distance ?? 0 };
    clinics = clinics.map((clinic) => clinic.name === name ? saved : clinic);
    setClinicData((current) => current.map((clinic) => clinic.name === name ? saved : clinic));
  };
  const deleteClinic = async (name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    const response = await fetch(`${apiUrl}/api/clinics/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Clinic could not be deleted.");
    clinics = clinics.filter((clinic) => clinic.name !== name);
    setClinicData((current) => current.filter((clinic) => clinic.name !== name));
  };
  const updateMedication = async (
    clinicName: string,
    name: string,
    update: MedicationControlUpdate,
  ) => {
    if (role === "staff" && clinicName !== enrolledClinic) return;
    const response = await fetch(
      `${apiUrl}/api/medications/${encodeURIComponent(name)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...update, clinic: clinicName }),
      },
    );
    if (!response.ok) throw new Error("Medication update failed");
    const saved = (await response.json()) as Medication;
    medications = medications.map((medication) =>
      medication.name === name && medication.clinicName === clinicName
        ? { ...medication, ...saved }
        : medication,
    );
    setMedicationData((current) =>
      current.map((medication) =>
        medication.name === name && medication.clinicName === clinicName
          ? { ...medication, ...saved }
          : medication,
      ),
    );
  };
  const restockMedication = async (
    clinicName: string,
    name: string,
    quantity: number,
  ) => {
    const response = await fetch(
      `${apiUrl}/api/clinics/${encodeURIComponent(clinicName)}/medication-restocks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medication: name, quantity }),
      },
    );
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    } & Medication;
    if (!response.ok)
      throw new Error(result.error || "Stock could not be restocked.");
    medications = medications.map((medication) =>
      medication.name === name && medication.clinicName === clinicName
        ? { ...medication, ...result }
        : medication,
    );
    setMedicationData((current) =>
      current.map((medication) =>
        medication.name === name && medication.clinicName === clinicName
          ? { ...medication, ...result }
          : medication,
      ),
    );
    return result;
  };
  const createMedication = async (
    medication: Omit<Medication, "availability">,
  ) => {
    if (
      !medication.name ||
      !medication.category ||
      !Number.isInteger(medication.stockCount) ||
      medication.stockCount < 0
    )
      throw new Error(
        "Enter a name, category, and non-negative whole quantity.",
      );
    const response = await fetch(`${apiUrl}/api/medications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(medication),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    } & Medication;
    if (!response.ok)
      throw new Error(result.error || "Medication could not be added.");
    medications = [...medications, result];
    setMedicationData((current) => [...current, result]);
  };
  const login = async (
    nextRole: Role,
    email: string,
    password: string,
    token: string,
  ) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole, email, password, token }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        code?: string;
        error?: string;
        role?: Role;
        name?: string;
        email?: string;
        clinic?: string;
      };
      if (response.status === 428 && result.code === "ADMIN_TOKEN_REQUIRED") {
        return "admin-token-required";
      }
      if (!response.ok) {
        throw new Error(result.error || "Invalid credentials");
      }
      if (result.role !== "admin" && result.role !== "staff") {
        throw new Error("Login response did not include a valid account role.");
      }
      writeStoredAuthSession({
        role: result.role,
        name: result.name || "",
        email: result.email || email,
        clinic: result.clinic || "",
      });
      setRole(result.role);
      if (result.name) setStaffName(result.name);
      if (result.clinic) setEnrolledClinic(result.clinic);
      setView(result.role === "admin" ? "adminDashboard" : "staffOverview");
      setAuthMessage("");
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : nextRole === "admin"
            ? "Invalid administrator email, password, or security token."
            : "This staff account is still awaiting administrator approval.",
      );
    }
  };
  const approveStaff = async (id: string) => {
    const approved = pendingStaff.find((staff) => staff.id === id);
    if (!approved) return;
    await fetch(`${apiUrl}/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    setApprovedStaff((current) => [...current, { ...approved, role: "staff" }]);
    setPendingStaff((current) => current.filter((staff) => staff.id !== id));
    setSystemSummary((current) => ({
      ...current,
      totalStaff: current.totalStaff + 1,
      pendingApprovals: Math.max(current.pendingApprovals - 1, 0),
    }));
  };
  const rejectStaff = async (id: string) => {
    await fetch(`${apiUrl}/api/staff/${id}`, { method: "DELETE" });
    setPendingStaff((current) => current.filter((staff) => staff.id !== id));
    setSystemSummary((current) => ({
      ...current,
      pendingApprovals: Math.max(current.pendingApprovals - 1, 0),
    }));
  };
  const logout = () => {
    clearStoredAuthSession();
    setRole("public");
    setView("home");
  };
  if (role === "admin" && view !== "login" && view !== "home")
    return (
      <>
        <AdminHeader view={view} onNavigate={setView} onLogout={logout} />
        {view === "adminDashboard" && (
          <AdminDashboard
            clinicData={clinicData}
            medicationData={medicationData}
            systemSummary={systemSummary}
          />
        )}
        {view === "adminClinics" && <AdminClinics clinicData={clinicData} onCreateClinic={createClinic} onUpdateClinic={updateClinicAdmin} onDeleteClinic={deleteClinic} />}
        {view === "adminStaff" && (
          <AdminStaff
            approvedStaff={approvedStaff}
            pendingStaff={pendingStaff}
            onApprove={approveStaff}
            onReject={rejectStaff}
            onCreateStaff={createStaff}
            onUpdateStaff={updateStaff}
            onDeleteStaff={deleteStaff}
          />
        )}
        {view === "adminMedications" && (
          <AdminMedications
            medicationData={medicationData}
            onCreateMedication={createMedication}
            onRestockMedication={restockMedication}
          />
        )}
      </>
    );
  if (
    role === "staff" &&
    ["staffQueue", "staffOverview", "staffStock", "portal"].includes(view)
  )
    return (
      <>
        <StaffHeader
          view={view}
          onNavigate={setView}
          onLogout={logout}
          staffName={staffName}
          enrolledClinic={enrolledClinic}
        />
        {view === "staffQueue" && (
          <StaffOperationsPanel
            clinicData={clinicData}
            enrolledClinic={enrolledClinic}
            medicationData={medicationData}
            onUpdateClinic={updateClinic}
          />
        )}
        {view === "staffOverview" && (
          <StaffClinicOverview
            clinicData={clinicData}
            medicationData={medicationData}
            enrolledClinic={enrolledClinic}
          />
        )}
        {view === "staffStock" && (
          <StaffStockpileController
            medicationData={medicationData}
            enrolledClinic={enrolledClinic}
            onUpdateMedication={updateMedication}
            onRestockMedication={restockMedication}
          />
        )}
        {view === "portal" && (
          <Portal
            role={role}
            clinicData={clinicData}
            medicationData={medicationData}
            enrolledClinic={enrolledClinic}
            pendingStaff={pendingStaff}
            approvedStaff={approvedStaff}
            onApprove={approveStaff}
            onReject={rejectStaff}
            onCreateStaff={createStaff}
            onUpdateStaff={updateStaff}
            onDeleteStaff={deleteStaff}
            onUpdateClinic={updateClinic}
            onUpdateMedication={updateMedication}
            systemSummary={systemSummary}
            onLogout={logout}
          />
        )}
      </>
    );
  if (view === "login")
    return (
      <Auth
        message={authMessage}
        onLogin={login}
        onRegister={registerStaff}
        onPublic={() => navigate("home")}
        onBack={() => navigate(previousView)}
      />
    );
  return (
    <div className="app-shell">
      <PublicHeader view={view} onNavigate={navigate} />
      {view === "home" && (
        <PublicHome
          onNavigate={navigate}
          onClinic={(clinic) => {
            setSelectedClinic(clinic);
            setPreviousView(view);
            window.history.pushState(
              { ...window.history.state, careQueueView: "clinic" },
              "",
              window.location.href,
            );
            setView("clinic");
          }}
        />
      )}
      {view === "clinics" && (
        <Clinics
          onClinic={(clinic) => {
            setSelectedClinic(clinic);
            setPreviousView(view);
            window.history.pushState(
              { ...window.history.state, careQueueView: "clinic" },
              "",
              window.location.href,
            );
            setView("clinic");
          }}
        />
      )}
      {view === "medications" && <Medications />}
      {view === "clinic" && selectedClinic && (
        <ClinicDetails
          clinic={selectedClinic}
          onBack={() => navigate("clinics")}
        />
      )}
      <Footer />
    </div>
  );
}
