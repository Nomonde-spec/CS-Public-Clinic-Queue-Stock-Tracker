"use client";

import { FormEvent, useEffect, useState } from "react";

type View = "home" | "clinics" | "medications" | "clinic" | "login" | "portal" | "staffQueue" | "staffOverview" | "staffStock" | "adminDashboard" | "adminClinics" | "adminStaff" | "adminMedications";
type Role = "public" | "staff" | "admin";

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
  status: "Open" | "Closed" | "Open - Low Wait" | "Open - Moderate Wait" | "Open - Busy" | "Open - Very Busy" | "Busy" | "Very Busy";
  distance: number;
  updatedAt?: string;
};

type Medication = {
  name: string;
  category: string;
  availability: "In Stock" | "Low Stock" | "Out of Stock";
  clinics: string;
  stockCount: number;
};

type StaffRegistration = {
  id: string;
  name: string;
  email: string;
  clinic: string;
  role?: "admin" | "staff";
};

type StaffUpdate = Pick<StaffRegistration, "name" | "email" | "clinic">;
type SystemSummary = { activeClinics: number; totalStaff: number; pendingApprovals: number };
type ClinicControlUpdate = Pick<Clinic, "patients" | "wait" | "status">;
type MedicationControlUpdate = Pick<Medication, "availability" | "clinics" | "stockCount">;

const initialApprovedStaff: StaffRegistration[] = [
  { id: "admin-seed", name: "System Administrator", email: "sys.admin@carequeue.gov", clinic: "All clinics", role: "admin" },
  { id: "staff-seed", name: "Dr. Sarah Jenkins", email: "s.jenkins@metrocare.gov", clinic: "Metro Family Care Centre", role: "staff" },
];

let clinics: Clinic[] = [
  { name: "Metro Family Care Centre", province: "Gauteng", district: "Central District", address: "220 Plaza Avenue, Central District", hours: "Mon - Fri: 8:00 AM - 6:00 PM", phone: "+1 (555) 019-2834", wait: 12, patients: 4, stock: 98, status: "Open", distance: 0.8 },
  { name: "Northside Public Health Clinic", province: "KwaZulu-Natal", district: "Sector 12", address: "504 Medical Boulevard, Sector 12", hours: "Mon - Fri: 8:00 AM - 8:00 PM", phone: "+1 (555) 019-7621", wait: 35, patients: 14, stock: 84, status: "Open", distance: 1.5 },
  { name: "Eastside Community Dispensary", province: "Eastern Cape", district: "East Area", address: "102 Industrial Link, East Area", hours: "Mon - Fri: 9:00 AM - 5:00 PM", phone: "+1 (555) 019-4432", wait: 55, patients: 25, stock: 90, status: "Open", distance: 2.8 },
  { name: "Lakeside Community Clinic", province: "Western Cape", district: "Lakeside District", address: "11 Shoreline Road, Lakeside District", hours: "Mon - Fri: 8:00 AM - 4:00 PM", phone: "+1 (555) 019-1198", wait: null, patients: 0, stock: 55, status: "Closed", distance: 2.1 },
  { name: "Oakridge Triage & Care Node", province: "Free State", district: "Oakridge", address: "Hillside Drive, Oakridge", hours: "Open 24 Hours", phone: "+1 (555) 019-6674", wait: 8, patients: 2, stock: 95, status: "Open", distance: 4.5 },
  { name: "Mopani Community Health Centre", province: "Limpopo", district: "Mopani District", address: "18 Baobab Road, Mopani", hours: "Mon - Fri: 8:00 AM - 5:00 PM", phone: "+1 (555) 019-0106", wait: 18, patients: 7, stock: 89, status: "Open", distance: 6.2 },
  { name: "Highveld Public Clinic", province: "Mpumalanga", district: "Highveld", address: "64 Panorama Street, Highveld", hours: "Mon - Fri: 8:00 AM - 5:00 PM", phone: "+1 (555) 019-0107", wait: 42, patients: 18, stock: 76, status: "Open", distance: 8.7 },
  { name: "Karoo Wellness Clinic", province: "Northern Cape", district: "Karoo District", address: "7 Kalahari Avenue, Karoo", hours: "Mon - Fri: 8:00 AM - 4:00 PM", phone: "+1 (555) 019-0108", wait: 27, patients: 11, stock: 81, status: "Open", distance: 14.4 },
  { name: "Mthatha Public Health Node", province: "North West", district: "Mafikeng District", address: "31 Heritage Road, Mafikeng", hours: "Mon - Fri: 8:00 AM - 5:00 PM", phone: "+1 (555) 019-0109", wait: 65, patients: 31, stock: 68, status: "Open", distance: 22.1 },
];

let medications: Medication[] = [
  { name: "Amoxicillin 500mg Capsules", category: "Antibiotic", availability: "Low Stock", clinics: "50 units in stock", stockCount: 50 },
  { name: "Albuterol 90mcg Inhaler", category: "Respiratory", availability: "In Stock", clinics: "250 units in stock", stockCount: 250 },
  { name: "Metformin 850mg Tablets", category: "Antidiabetic", availability: "In Stock", clinics: "250 units in stock", stockCount: 250 },
  { name: "Paracetamol 500mg Tablets", category: "Pain & Fever", availability: "In Stock", clinics: "250 units in stock", stockCount: 250 },
  { name: "Atorvastatin 20mg Tablets", category: "Cardiovascular", availability: "Out of Stock", clinics: "0 / 5 in stock", stockCount: 0 },
  { name: "Lisinopril 10mg Tablets", category: "Cardiovascular", availability: "Low Stock", clinics: "50 units in stock", stockCount: 50 },
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
type ApiStaff = StaffRegistration & { status: "pending" | "approved" | "rejected" };
const toStaffRegistration = (staff: ApiStaff): StaffRegistration => ({ id: staff.id, name: staff.name, email: staff.email, clinic: staff.clinic, role: staff.role });
const getMedicationAvailability = (stockCount: number): Medication["availability"] => stockCount === 0 ? "Out of Stock" : stockCount >= 250 ? "In Stock" : "Low Stock";

function Logo({ staff = false, clinic }: { staff?: boolean; clinic?: string }) {
  return <div className="brand"><span className="brand-mark">+</span><span><strong>CareQueue {staff ? "Staff" : "Public Portal"}</strong><small>{staff ? clinic ?? "All clinics" : "Public health tracker"}</small></span></div>;
}

function AlertBar({ admin = false }: { admin?: boolean }) {
  return <div className={`alert-bar ${admin ? "admin-alert" : ""}`}><span className="alert-icon">!</span>{admin ? "SECURE STAFF PORTAL - Authorized system administrators only. Access and data alterations are recorded." : "Emergency Notice: If you are experiencing a life-threatening medical emergency, please call 911 immediately or go to the nearest Emergency Room."}</div>;
}

function PublicHeader({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  return <><AlertBar /><header className="site-header"><Logo /><nav><button className={view === "home" ? "active" : ""} onClick={() => onNavigate("home")}>Dashboard</button><button className={view === "clinics" || view === "clinic" ? "active" : ""} onClick={() => onNavigate("clinics")}>Find a Clinic</button><button className={view === "medications" ? "active" : ""} onClick={() => onNavigate("medications")}>Medication Search</button></nav><div className="header-status"><span className="dot" /> LIVE STATUS <small>No login required</small></div><button className="header-access" onClick={() => onNavigate("login")}>Staff/Admin Login / Register</button></header></>;
}

function AdminHeader({ view, onNavigate, onLogout }: { view: View; onNavigate: (view: View) => void; onLogout: () => void }) {
  return <><AlertBar admin /><header className="admin-header"><Logo staff /><nav><button className={view === "adminDashboard" ? "active" : ""} onClick={() => onNavigate("adminDashboard")}>Dashboard</button><button className={view === "adminClinics" ? "active" : ""} onClick={() => onNavigate("adminClinics")}>Clinics</button><button className={view === "adminStaff" ? "active" : ""} onClick={() => onNavigate("adminStaff")}>Staff Directory</button><button className={view === "adminMedications" ? "active" : ""} onClick={() => onNavigate("adminMedications")}>Medication Inventory</button></nav><div className="admin-account"><strong>sys.admin@carequeue.gov</strong><small>Administrator</small></div><button className="sign-out" onClick={onLogout}>Sign out</button></header></>;
}

function StaffHeader({ view, onNavigate, onLogout, staffName, enrolledClinic }: { view: View; onNavigate: (view: View) => void; onLogout: () => void; staffName: string; enrolledClinic: string }) {
  return <><AlertBar admin /><header className="admin-header staff-header"><Logo staff clinic={enrolledClinic} /><nav><button className={view === "staffOverview" ? "active" : ""} onClick={() => onNavigate("staffOverview")}>Clinic Overview</button><button className={view === "staffQueue" ? "active" : ""} onClick={() => onNavigate("staffQueue")}>Queue Management</button><button className={view === "staffStock" ? "active" : ""} onClick={() => onNavigate("staffStock")}>Stockpile Controller</button></nav><div className="admin-account"><strong>{staffName}</strong><small>{enrolledClinic}</small></div><button className="sign-out" onClick={onLogout}>Sign out</button></header></>;
}

function Footer() {
  return <footer><div><strong>CareQueue Public Portal</strong><p>An open public health initiative. Real-time patient counts, wait estimation models, and essential medication inventory status.</p></div><div><strong>SERVICES</strong><p>Wait Time Maps<br />Medication Stock Audits<br />Clinic Directories</p></div><div><strong>INFORMATION</strong><p>How Estimation Works<br />Data Accuracy Policy<br />Clinic Administration Portal</p></div><div className="footer-bottom">Copyright 2025 CareQueue Public Health System. All status data is indicative. <span>Last system sync: Just now</span></div></footer>;
}

function StatusPill({ value }: { value: string }) {
  return <span className={`pill ${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

  function getQueueLabel(clinic: Clinic): "Closed" | "Open - Low Wait" | "Open - Moderate Wait" | "Open - Busy" | "Open - Very Busy" {
  if (clinic.status === "Closed") return "Closed";
  if (clinic.status === "Open - Low Wait" || clinic.status === "Open - Moderate Wait" || clinic.status === "Open - Busy" || clinic.status === "Busy") return "Open - Busy";
  if (clinic.status === "Open - Very Busy" || clinic.status === "Very Busy") return "Open - Very Busy";
  return clinic.wait !== null && clinic.wait < 20 ? "Open - Low Wait" : "Open - Moderate Wait";
}

function formatUpdatedAt(updatedAt?: string) {
  if (!updatedAt) return "Updated just now";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000));
  return minutes === 0 ? "Updated just now" : `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

function PublicHome({ onNavigate, onClinic }: { onNavigate: (view: View) => void; onClinic: (clinic: Clinic) => void }) {
  const [selectedClinic, setSelectedClinic] = useState("");
  const [selectedMedication, setSelectedMedication] = useState("");
  return <main className="public-main">
    <section className="hero"><p className="eyebrow">PUBLIC HEALTH INFORMATION NETWORK</p><h1>Real-time clinic queues.<br /><em>Better prepared visits.</em></h1><p>Check current wait times, active patient counts, and essential medication availability in nearby public health clinics before you leave home.</p><div className="search-bar"><label>Clinic or district<select value={selectedClinic} onChange={(event) => setSelectedClinic(event.target.value)}><option value="">Select a clinic or district</option>{clinics.map((clinic) => <option value={clinic.name} key={clinic.name}>{clinic.name}</option>)}{Array.from(new Set(clinics.map((clinic) => clinic.district))).map((district) => <option value={district} key={district}>{district}</option>)}</select></label><span className="search-divider" /><label>Medication<select value={selectedMedication} onChange={(event) => setSelectedMedication(event.target.value)}><option value="">Select a medication</option>{medications.map((medication) => <option value={medication.name} key={medication.name}>{medication.name}</option>)}</select></label><button onClick={() => onNavigate(selectedMedication ? "medications" : "clinics")}>Search now</button></div></section>
    <section className="section-heading"><div><p className="eyebrow">LIVE LOCATIONS</p><h2>Nearest active clinics</h2><p>Sorted by closest distance to your location</p></div><button className="text-button" onClick={() => onNavigate("clinics")}>View all clinics</button></section>
    <div className="clinic-cards">{clinics.slice(0, 3).map((clinic) => <button className="clinic-card" key={clinic.name} onClick={() => onClinic(clinic)}><div className="card-top"><StatusPill value={getQueueLabel(clinic)} /><span>{clinic.distance} miles away</span></div><h3>{clinic.name}</h3><p>{clinic.address}</p><div className="card-meta"><span>{clinic.patients} patients in queue</span><span>Hours: {clinic.hours.replace("Mon - Fri: ", "")}</span><span className="stock">Stock: {clinic.stock}%</span></div><div className="wait">{clinic.wait ? `${clinic.wait} mins` : "-- mins"}<small>ESTIMATED WAIT</small></div></button>)}</div>
    <section className="stock-section"><div className="section-heading"><div><p className="eyebrow">ESSENTIAL MEDICATIONS</p><h2>Medication stock status</h2><p>Aggregated status across regional dispensaries</p></div><button className="text-button" onClick={() => onNavigate("medications")}>Find a medication</button></div><MedicationTable compact /></section>
  </main>;
}

function MedicationTable({ compact = false, query = "" }: { compact?: boolean; query?: string }) {
  const filtered = medications.filter((medicine) => medicine.name.toLowerCase().includes(query.toLowerCase()) || medicine.category.toLowerCase().includes(query.toLowerCase()));
  return <div className="table-wrap"><table><thead><tr><th>Medication name & strength</th><th>Category</th><th>Overall availability</th><th>Reporting dispensaries</th></tr></thead><tbody>{(compact ? filtered.slice(0, 5) : filtered).map((medicine) => <tr key={medicine.name}><td><strong>{medicine.name}</strong></td><td>{medicine.category}</td><td><StatusPill value={medicine.availability} /></td><td>{medicine.clinics}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No medicines match that search.</div>}</div>;
}

function Clinics({ onClinic }: { onClinic: (clinic: Clinic) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [distance, setDistance] = useState("5");
  const [maxWait, setMaxWait] = useState("Any");
  const distanceLimit = distance === "All" ? Infinity : Number(distance);
  const filtered = clinics.filter((clinic) => `${clinic.name} ${clinic.province} ${clinic.district} ${clinic.address}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || clinic.status === status) && clinic.distance <= distanceLimit && (maxWait === "Any" || (clinic.wait !== null && clinic.wait <= Number(maxWait))));
  return <main className="public-main page-main"><div className="page-title"><div><p className="eyebrow">CLINIC DIRECTORY</p><h1>Find a clinic</h1><p>Compare nearby public clinics by wait time, distance, and current stock levels.</p></div><span className="result-count">{filtered.length} clinics found nearby</span></div><div className="filter-row"><label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or district..." /></label><select value={distance} onChange={(event) => setDistance(event.target.value)}><option value="5">Distance: Within 5 miles</option><option value="10">Distance: Within 10 miles</option><option value="25">Distance: Within 25 miles</option><option value="50">Distance: Within 50 miles</option><option value="All">Distance: All clinics</option></select><select value={maxWait} onChange={(event) => setMaxWait(event.target.value)}><option value="Any">Max Wait Time: Any</option><option value="15">Max Wait Time: 15 min</option><option value="30">Max Wait Time: 30 min</option><option value="60">Max Wait Time: 60 min</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Open</option><option>Closed</option></select><button className="text-button" onClick={() => { setQuery(""); setStatus("All statuses"); setDistance("5"); setMaxWait("Any"); }}>Clear filters</button></div><div className="directory-layout"><div className="directory-list">{filtered.map((clinic) => <button className="directory-card" onClick={() => onClinic(clinic)} key={clinic.name}><div><h3>{clinic.name}</h3><p>{clinic.province} - {clinic.address} ({clinic.distance} mi)</p><div className="card-meta"><span>{clinic.patients} patients in queue</span><span>Wait: {clinic.wait === null ? "Closed" : `${clinic.wait} min`}</span><span className="stock">Stock: {clinic.stock}%</span></div></div><div><StatusPill value={clinic.wait !== null ? `${clinic.wait}m wait` : "Closed"} /></div></button>)}</div><div className="map-placeholder"><div className="map-grid" /><span className="map-pin pin-one">+<small>12 min</small></span><span className="map-pin pin-two">+<small>35 min</small></span><span className="map-pin pin-three">+<small>55 min</small></span><span className="map-label label-one">Metro Clinic (12 min)</span><span className="map-label label-two">Northside Clinic (35 min)</span></div></div></main>;
}

function Medications() {
  const [query, setQuery] = useState("Amoxicillin");
  return <main className="public-main page-main"><div className="page-title"><div><p className="eyebrow">MEDICATION AVAILABILITY</p><h1>Find clinics with medication stock</h1><p>Select a medication to view current availability across public clinics.</p></div></div><div className="med-search"><select className="medication-search-select" value={query} onChange={(event) => setQuery(event.target.value)}><option value="">Select a medication</option>{medications.map((medication) => <option key={medication.name} value={medication.name}>{medication.name}</option>)}</select><button>Search stock</button></div><section className="results-section"><div className="section-heading"><div><p className="eyebrow">LIVE STOCK AUDIT</p><h2>Results for &quot;{query || "all medication"}&quot;</h2></div><span>Updated just now</span></div><MedicationTable query={query} /></section></main>;
}

function ClinicDetailsLegacy({ clinic, onBack }: { clinic: Clinic; onBack: () => void }) {
  return <main className="public-main page-main"><button className="back-button" onClick={onBack}>Back to clinic directory</button><div className="detail-grid"><section><div className="detail-card"><StatusPill value={clinic.status} /><span>Last updated: 4 minutes ago</span><h1>{clinic.name}</h1><p>Primary community triage and medication dispensing location.</p><hr /><p>Address: {clinic.address}</p><p>Hours: {clinic.hours}</p><p>Phone: {clinic.phone}</p></div><div className="detail-card chart-card"><h2>Today&apos;s queue activity</h2><p>Historical average wait times compared with the current status.</p><div className="bars"><i style={{ height: "34%" }} /><i style={{ height: "60%" }} /><i style={{ height: "85%" }} /><i className="current" style={{ height: "28%" }} /><i style={{ height: "50%" }} /></div><div className="chart-labels"><span>9 AM</span><span>11 AM</span><span>1 PM</span><span>3 PM</span><span>5 PM</span></div></div></section><section className="detail-card inventory-card"><div className="section-heading"><div><h2>Pharmacy inventory</h2><p>Medication availability currently reported by this clinic.</p></div><span className="live"><span className="dot" /> Updated 10 minutes ago</span></div><MedicationTable /></section></div></main>;
}

function ClinicDetails({ clinic, onBack }: { clinic: Clinic; onBack: () => void }) {
  return <main className="public-main page-main"><button className="back-button" onClick={onBack}>Back to clinic directory</button><div className="detail-grid"><section><div className="detail-card"><StatusPill value={getQueueLabel(clinic)} /><span>{formatUpdatedAt(clinic.updatedAt)}</span><h1>{clinic.name}</h1><p>Primary community triage and medication dispensing location.</p><hr /><p>Address: {clinic.address}</p><p>Hours: {clinic.hours}</p><p>Phone: {clinic.phone}</p></div><div className="detail-card chart-card"><h2>Today&apos;s queue activity</h2><p>Historical average wait times compared with the current status.</p><div className="bars"><i style={{ height: "34%" }} /><i style={{ height: "60%" }} /><i style={{ height: "85%" }} /><i className="current" style={{ height: "28%" }} /><i style={{ height: "50%" }} /></div><div className="chart-labels"><span>9 AM</span><span>11 AM</span><span>1 PM</span><span>3 PM</span><span>5 PM</span></div></div></section><section className="detail-card inventory-card"><div className="section-heading"><div><h2>Pharmacy inventory</h2><p>Medication availability currently reported by this clinic.</p></div><span className="live"><span className="dot" /> {formatUpdatedAt(clinic.updatedAt)}</span></div><MedicationTable /></section></div></main>;
}

function Auth({ onLogin, onRegister, onPublic, message }: { onLogin: (role: Role, email: string, password: string, token: string) => void; onRegister: (registration: Omit<StaffRegistration, "id">) => void; onPublic: () => void; message: string }) {
  const [role, setRole] = useState<Role>("staff");
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") || "").trim().toLowerCase();
    const password = String(values.get("password") || "");
    const token = String(values.get("token") || "").trim();
    if (mode === "register") {
      onRegister({ name: String(values.get("name") || "").trim(), email, clinic: String(values.get("clinic") || "") });
      setMode("signin");
      return;
    }
    if (role === "admin" && !/^\d{6}$/.test(token)) return;
    setSubmitted(true);
    setTimeout(() => {
      onLogin(role, email, password, token);
      setSubmitted(false);
    }, 400);
  }
  return <main className="auth-main"><div className="auth-copy"><Logo staff={role === "staff"} /><p className="eyebrow">SECURE ACCESS</p><h1>{role === "admin" ? "Configure regional health services." : "Manage your clinic in real time."}</h1><p>Authorized {role === "admin" ? "administrators" : "clinical teams"} can update queue conditions, medication stock, and operational details for the public portal.</p><div className="access-note"><strong>Need public access?</strong><button onClick={onPublic}>Return to the public portal â†’</button></div></div><form className="auth-card" onSubmit={submit}><div className="role-switch"><button type="button" className={role === "staff" ? "selected" : ""} onClick={() => { setRole("staff"); setMode("signin"); }}>Staff access</button><button type="button" className={role === "admin" ? "selected" : ""} onClick={() => { setRole("admin"); setMode("signin"); }}>Admin access</button></div>{role === "staff" && <div className="auth-mode"><button type="button" className={mode === "signin" ? "selected" : ""} onClick={() => setMode("signin")}>Sign in</button><button type="button" className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")}>Register</button></div>}<h2>{mode === "register" ? "Register as staff" : role === "admin" ? "Admin sign in" : "Staff sign in"}</h2><p>{mode === "register" ? "Your account must be approved by an administrator before access is granted." : "Enter your authorized credentials below."}</p>{message && <div className="auth-message">{message}</div>}{mode === "register" && <><label>Full name<input name="name" required placeholder="e.g. Sarah Jenkins" /></label><label>Assigned clinic<select name="clinic" defaultValue=""><option value="" disabled>Select your clinic</option>{clinics.map((clinic) => <option key={clinic.name}>{clinic.name}</option>)}</select></label></>}<label>{role === "admin" ? "Administrator email" : "Clinical email or staff ID"}<input name="email" required placeholder={role === "admin" ? "e.g. sys.admin@carequeue.gov" : "s.jenkins@metrocare.gov"} /></label><label>Secure password<input name="password" required type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" /></label>{role === "admin" && <label>Security key token<input name="token" required placeholder="6-digit verification code" /></label>}<button className="primary-button" disabled={submitted}>{submitted ? "Authenticating..." : mode === "register" ? "Submit for admin approval" : "Authorize & sign in"}</button><div className="auth-foot">â—‰ Staff registrations remain pending until an admin approves them.</div></form></main>;
}

function StaffCrudPanel({ approvedStaff, onUpdateStaff, onDeleteStaff }: { approvedStaff: StaffRegistration[]; onUpdateStaff: (id: string, update: StaffUpdate) => void; onDeleteStaff: (id: string) => void }) {
  const [selectedClinic, setSelectedClinic] = useState(clinics[0].name);
  const staff = approvedStaff.filter((member) => member.role === "staff");
  const filteredStaff = staff.filter((member) => member.clinic === selectedClinic);
  const edit = (member: StaffRegistration) => {
    const name = window.prompt("Staff name", member.name)?.trim();
    const email = window.prompt("Staff email", member.email)?.trim().toLowerCase();
    const clinic = window.prompt("Assigned clinic", member.clinic)?.trim();
    if (name && email && clinic) onUpdateStaff(member.id, { name, email, clinic });
  };
  return <section className="portal-panel staff-crud-panel"><div className="section-heading"><div><h2>Manage staff records</h2><p>Edit or remove approved staff for the selected clinic.</p></div></div><div className="staff-create-form"><select value={selectedClinic} onChange={(event) => setSelectedClinic(event.target.value)}>{clinics.map((clinic) => <option key={clinic.name}>{clinic.name}</option>)}</select></div><div className="staff-crud-list">{filteredStaff.length === 0 ? <div className="empty">No staff records for {selectedClinic}.</div> : filteredStaff.map((member) => <div className="staff-crud-row" key={member.id}><span><strong>{member.name}</strong><small>{member.email} â€¢ {member.clinic}</small></span><span className="staff-actions"><button className="edit-button" type="button" onClick={() => edit(member)}>Edit</button><button className="delete-button" type="button" onClick={() => window.confirm(`Remove ${member.name}?`) && onDeleteStaff(member.id)}>Delete</button></span></div>)}</div></section>;
}

function StaffOperationsPanel({ clinicData, enrolledClinic, onUpdateClinic }: { clinicData: Clinic[]; enrolledClinic: string; onUpdateClinic: (name: string, update: ClinicControlUpdate) => void | Promise<void> }) {
  const clinic = clinicData.find((item) => item.name === enrolledClinic) ?? clinicData[0];
  const [patients, setPatients] = useState(clinic.patients);
  const [wait, setWait] = useState(clinic.wait ?? 0);
  const [status, setStatus] = useState<Clinic["status"]>(getQueueLabel(clinic));
  const [savedMessage, setSavedMessage] = useState("");
  const showSaved = (message: string) => {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(""), 2500);
  };
  const commit = async () => {
    await onUpdateClinic(clinic.name, { patients, wait, status });
    showSaved("Updates published to the public dashboard");
  };
    return <main className="queue-dashboard"><div className="queue-dashboard-title"><div><p className="eyebrow">QUEUE MANAGEMENT</p><h1>Queue Velocity Controller</h1><p>{clinic.name} - Update parameters displayed on the live public dashboard.</p></div><span>Current Live Metrics: <strong>{clinic.wait ?? 0}m Wait / {clinic.patients} Patients in Queue</strong></span></div><div className="queue-columns"><section className="queue-card"><h2>Adjust Active Queue Metrics</h2><label className="queue-label">Clinic status level (public display badge)</label><div className="status-options"><button className={status === "Open - Low Wait" ? "selected" : ""} onClick={() => setStatus("Open - Low Wait")}>● &nbsp; OPEN - LOW WAIT</button><button className={status === "Open - Moderate Wait" ? "selected" : ""} onClick={() => setStatus("Open - Moderate Wait")}>○ &nbsp; OPEN - MODERATE WAIT</button><button className={status === "Open - Busy" ? "selected" : ""} onClick={() => setStatus("Open - Busy")}>○ &nbsp; OPEN - BUSY</button><button className={status === "Open - Very Busy" ? "selected" : ""} onClick={() => setStatus("Open - Very Busy")}>○ &nbsp; OPEN - VERY BUSY</button><button className={status === "Closed" ? "selected closed" : ""} onClick={() => setStatus("Closed")}>○ &nbsp; CLOSED</button></div><hr /><div className="queue-label-row"><label className="queue-label">Patients currently checked-in (physical queue size)</label><span>Typically ranges 0 - 50</span></div><div className="stepper"><button onClick={() => setPatients((value) => Math.max(0, value - 1))}>-</button><strong>{patients}</strong><button onClick={() => setPatients((value) => value + 1)}>+</button><span>Patients undergoing triage or waiting for basic dispensary services.</span></div><hr /><div className="queue-label-row"><label className="queue-label">Estimated waiting time (minutes)</label><span>Updates dynamically based on arrival rate</span></div><input className="wait-slider" type="range" min="0" max="120" value={wait} onChange={(event) => setWait(Number(event.target.value))} /><div className="slider-labels"><span>0m (Direct Admission)</span><b>Active: {wait} mins</b><span>120m+ (Extremely Busy)</span></div><hr /><div className="queue-commit"><span>{savedMessage || "Changes publish to the public CareQueue site within 30 seconds."}</span><button className="primary-button" onClick={commit}>✓ &nbsp; Commit &amp; Publish Updates</button></div></section><section className="queue-card queue-log"><h2>Queue Parameter Log</h2><p>Historical log of updates pushed to {clinic.name}</p><hr /><div className="log-entry current"><b>Queue wait set to {clinic.wait ?? 0} minutes</b><small>Today - Current live status</small></div><div className="log-entry"><b>Active queue currently contains {clinic.patients} patients</b><small>Public dashboard synchronized</small></div><div className="log-entry"><b>Clinic status level: {status}</b><small>Ready for publication</small></div><div className="log-entry"><b>Facility initialized for morning triage</b><small>Staff desk checkout</small></div></section></div></main>;
}

function StaffClinicOverview({ clinicData, medicationData, enrolledClinic }: { clinicData: Clinic[]; medicationData: Medication[]; enrolledClinic: string }) {
  const clinic = clinicData.find((item) => item.name === enrolledClinic) ?? clinicData[0];
  const alerts = medicationData.filter((item) => item.availability !== "In Stock");
    const queueLabel = getQueueLabel(clinic);
    return <main className="staff-page"><div className="staff-page-title"><div><p className="eyebrow">CLINIC OVERVIEW</p><h1>{clinic.name} Portal</h1><p>Assigned Node: {clinic.district} - {clinic.address}</p></div><span className="live">Current Live Status: <strong>{queueLabel.toUpperCase()}</strong></span></div><div className="staff-stat-grid"><div><small>LIVE WAITING TIME</small><strong>{clinic.wait ?? 0} mins</strong><span>Calculated from {clinic.patients} waiting cases</span></div><div><small>ACTIVE QUEUE SIZE</small><strong>{clinic.patients} People</strong><span>Patients checked-in and waiting</span></div><div><small>DISPENSARY LEVEL</small><strong>{clinic.stock}% Stocked</strong><span>{medicationData.filter((item) => item.availability !== "Out of Stock").length} of {medicationData.length} essential medications stocked</span></div></div><div className="staff-overview-grid"><section className="portal-panel"><div className="section-heading"><div><h2>Queue Controller Quick Action</h2><p>Quickly change the current clinic queue status.</p></div></div><button className="primary-button" onClick={() => document.querySelector(".staff-header nav button:nth-child(2)")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))}>Open Queue Management</button><button className="secondary-button" onClick={() => window.location.reload()}>Sync Live Digital Signage</button><div className="public-preview"><small>LIVE PUBLIC DISPLAY PREVIEW</small><div><StatusPill value={queueLabel} /><span>{clinic.distance} miles away</span><h3>{clinic.name}</h3><hr /><p><span>WAITING TIME<strong>{clinic.wait ?? 0} mins</strong></span><span>PATIENTS IN LINE<strong>{clinic.patients} people</strong></span></p></div></div></section><section className="portal-panel"><div className="section-heading"><div><h2>Critical Stock Monitor</h2><p>Dispensary inventory items requiring attention.</p></div><StatusPill value={`${alerts.length} Alerts`} /></div>{alerts.map((item) => <div className="stock-alert-row" key={item.name}><strong>{item.name}</strong><span>Stock status: {item.availability}</span><StatusPill value={item.availability} /></div>)}</section></div></main>;
}

function StaffStockpileController({ medicationData, enrolledClinic, onUpdateMedication }: { medicationData: Medication[]; enrolledClinic: string; onUpdateMedication: (name: string, update: MedicationControlUpdate) => void | Promise<void> }) {
  const [medicationName, setMedicationName] = useState(medicationData[0]?.name ?? "");
  const medication = medicationData.find((item) => item.name === medicationName) ?? medicationData[0];
  const [stockCount, setStockCount] = useState(medication?.stockCount ?? 0);
  const [message, setMessage] = useState("");
  const save = async () => { const availability = getMedicationAvailability(stockCount); await onUpdateMedication(medication.name, { availability, stockCount, clinics: `${enrolledClinic}: ${stockCount} in stock` }); setMessage("Stockpile update published to the public portal"); window.setTimeout(() => setMessage(""), 2500); };
  return <main className="staff-page"><div className="staff-page-title"><div><p className="eyebrow">STOCKPILE CONTROLLER</p><h1>Live Pharmacy Dispensary Inventory</h1><p>{enrolledClinic} - Update medication quantities shared with the public.</p></div>{message && <span className="live">{message}</span>}</div><div className="stockpile-grid"><section className="portal-panel stockpile-editor"><h2>Update Medication Stock</h2><p>Select a medication and enter the current quantity.</p><label>Medication<select value={medication.name} onChange={(event) => { const selected = medicationData.find((item) => item.name === event.target.value); setMedicationName(event.target.value); if (selected) setStockCount(selected.stockCount); }}>{medicationData.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Clinic<input value={enrolledClinic} readOnly /></label><label>Number in stock<input type="number" min="0" step="1" value={stockCount} onChange={(event) => setStockCount(Math.max(0, Number(event.target.value) || 0))} /></label><button className="primary-button" onClick={save}>Commit &amp; Publish Stock Update</button></section><section className="portal-panel"><div className="section-heading"><div><h2>Current Stockpile</h2><p>Medication records currently visible to patients.</p></div></div><div className="stockpile-table"><div className="stockpile-head"><span>Medication</span><span>Category</span><span>Quantity</span><span>Availability</span></div>{medicationData.map((item) => <div className="stockpile-row" key={item.name}><strong>{item.name}</strong><span>{item.category}</span><span>{item.stockCount} units</span><StatusPill value={item.availability} /></div>)}</div></section></div></main>;
}

function AdminDashboard({ clinicData, medicationData, systemSummary }: { clinicData: Clinic[]; medicationData: Medication[]; systemSummary: SystemSummary }) {
  const critical = medicationData.filter((item) => item.availability !== "In Stock");
  return <main className="admin-page"><div className="admin-page-title"><div><p className="eyebrow">ADMINISTRATION CONSOLE</p><h1>Executive Health Hub Oversight</h1><p>Live statistics and administrative parameters for registered local clinics.</p></div><button className="primary-button">Generate public inventory report</button></div><div className="admin-stats"><div><small>ACTIVE CLINICS</small><strong>{systemSummary.activeClinics} / 14</strong><span>2 regional nodes offline</span></div><div><small>TOTAL REGISTERED STAFF</small><strong>{systemSummary.totalStaff} Staff</strong><span>Approved clinical personnel</span></div><div><small>SEVERE STOCK ALERTS</small><strong>{critical.length} Drugs</strong><span>Reporting below safe threshold</span></div><div><small>LIVE PATIENTS IN QUEUE</small><strong>{clinicData.reduce((total, clinic) => total + clinic.patients, 0)} Patients</strong><span>Estimated average wait: {Math.round(clinicData.filter((clinic) => clinic.wait !== null).reduce((total, clinic) => total + (clinic.wait ?? 0), 0) / Math.max(clinicData.filter((clinic) => clinic.wait !== null).length, 1))} mins</span></div></div><div className="admin-columns"><section className="portal-panel"><div className="section-heading"><div><h2>Active Queue Wait Times by Clinic Node</h2><p>Live metrics published by on-duty clinical staff.</p></div></div>{clinicData.filter((clinic) => clinic.status === "Open").map((clinic) => <div className="admin-clinic-row" key={clinic.name}><strong>{clinic.name}</strong><span>Estimated wait: <b>{clinic.wait ?? 0} mins</b> &nbsp; Patients: <b>{clinic.patients}</b></span><StatusPill value={clinic.wait !== null && clinic.wait < 20 ? "Low Wait" : "Moderate Wait"} /></div>)}</section><section className="portal-panel"><div className="section-heading"><div><h2>Critical Medication Shortfalls</h2><p>Dispensary reports requiring attention.</p></div></div>{critical.slice(0, 4).map((item) => <div className="admin-med-row" key={item.name}><strong>{item.name}</strong><span>{item.clinics}</span><StatusPill value={item.availability} /></div>)}</section></div></main>;
}

function AdminClinics({ clinicData }: { clinicData: Clinic[] }) {
  return <main className="admin-page"><div className="admin-page-title"><div><h1>Registered Public Clinics ({clinicData.length})</h1><p>Manage active clinical locations, district assignments, operating hours, and live queue states.</p></div><button className="primary-button">+ Add New Clinic Node</button></div><div className="admin-filters"><input placeholder="Filter clinics by name, district, or address..." /><select><option>District: All Regions</option></select><select><option>Status: Open Now</option></select><button className="text-button">Reset Filters</button></div><div className="admin-table"><div className="admin-table-head"><span>Clinic Name & District</span><span>Operating Hours</span><span>Patients in Queue</span><span>Overall Medication Stock</span><span>Status</span><span>Actions</span></div>{clinicData.map((clinic) => <div className="admin-table-row" key={clinic.name}><span><strong>{clinic.name}</strong><small>{clinic.address}</small></span><span>{clinic.hours}</span><span>{clinic.patients} active</span><span>{clinic.stock}% Stocked</span><StatusPill value={clinic.status} /><span className="table-actions">Edit &nbsp; Configure</span></div>)}</div></main>;
}

function AdminStaff({ approvedStaff, pendingStaff, onApprove, onReject }: { approvedStaff: StaffRegistration[]; pendingStaff: StaffRegistration[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  const staff = [...approvedStaff, ...pendingStaff];
  return <main className="admin-page"><div className="admin-page-title"><div><h1>Staff Directory ({staff.length})</h1><p>Configure health professionals, assigned roles, and account activation states.</p></div><button className="primary-button">+ Register New Personnel</button></div><div className="admin-filters"><input placeholder="Search staff by name, email, or ID..." /><select><option>Role: All Positions</option></select><select><option>Node Assignment: All</option></select><button className="text-button">Reset Filters</button></div><div className="admin-table"><div className="admin-table-head"><span>Staff Member</span><span>Professional Role</span><span>Primary Assigned Clinic</span><span>Credential Status</span><span>Actions</span></div>{staff.map((member) => <div className="admin-table-row" key={member.id}><span><strong>{member.name}</strong><small>{member.email}</small></span><span>{member.role === "admin" ? "Administrator" : "Clinical Staff"}</span><span>{member.clinic}</span>{pendingStaff.some((pending) => pending.id === member.id) ? <><StatusPill value="Pending" /><span className="table-actions"><button onClick={() => onApprove(member.id)}>Approve</button> <button onClick={() => onReject(member.id)}>Reject</button></span></> : <><StatusPill value="Active" /><span className="table-actions">Edit &nbsp; Suspend</span></>}</div>)}</div></main>;
}

function AdminMedications({ medicationData, onCreateMedication }: { medicationData: Medication[]; onCreateMedication: (medication: Omit<Medication, "availability">) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [alertFilter, setAlertFilter] = useState("Severe Shortfall");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState("");
  const categories = Array.from(new Set(medicationData.map((item) => item.category)));
  const targetStock = (item: Medication) => item.stockCount >= 250 ? item.stockCount : 250;
  const lowStockTrigger = (item: Medication) => Math.round(targetStock(item) * 0.2);
  const filtered = medicationData.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All Categories" || item.category === category;
    const matchesAlert = alertFilter !== "Severe Shortfall" || item.stockCount < lowStockTrigger(item);
    return matchesQuery && matchesCategory && matchesAlert;
  });
  const createMedication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    const values = new FormData(event.currentTarget);
    try {
      await onCreateMedication({ name: String(values.get("name") || "").trim(), category: String(values.get("category") || "").trim(), clinics: "All clinics", stockCount: Number(values.get("stockCount")) });
      event.currentTarget.reset();
      setAlertFilter("All Stock Levels");
      setShowCreateForm(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Medication could not be added.");
    }
  };
  return <main className="admin-page medication-admin-page"><div className="admin-page-title"><div><h1>Global Medication Inventory ({medicationData.length})</h1><p>Review generic medicines database, default target stock levels, and alert threshold parameters.</p></div><button className="primary-button" onClick={() => { setShowCreateForm((current) => !current); setCreateError(""); }}>{showCreateForm ? "Cancel" : "+ Catalog New Medication"}</button></div>{showCreateForm && <form className="medication-create-form" onSubmit={createMedication}><div><label>Medication name<input name="name" required placeholder="e.g. Ibuprofen 200mg Tablets" /></label><label>Therapeutic category<input name="category" required placeholder="e.g. Pain & Fever" /></label><label>Opening stock quantity<input name="stockCount" type="number" min="0" step="1" required placeholder="0" /></label></div><div className="medication-create-actions"><button className="primary-button" type="submit">Add Medication</button>{createError && <p className="medication-create-error">{createError}</p>}</div></form>}<div className="medication-filters"><label className="medication-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search drugs by brand name, generic formulation..." /></label><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All Categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={alertFilter} onChange={(event) => setAlertFilter(event.target.value)}><option>Severe Shortfall</option><option>All Stock Levels</option></select><button className="text-button" onClick={() => { setQuery(""); setCategory("All Categories"); setAlertFilter("Severe Shortfall"); }}>Reset Filters</button></div><div className="medication-admin-table"><div className="medication-admin-head"><span>Medication Name &amp; Strength</span><span>Therapeutic Category</span><span>Default Target Stock</span><span>Low Stock Alarm Trigger</span><span>Actions</span></div>{filtered.map((item) => <div className="medication-admin-row" key={item.name}><span><strong>{item.name}</strong><small>Formulation: {item.category} medicine</small></span><span>{item.category}</span><span>{targetStock(item).toLocaleString()} packs</span><span className="alarm-value">below {lowStockTrigger(item).toLocaleString()} packs</span><span className="table-actions"><button>Edit</button><button>Thresholds</button></span></div>)}{filtered.length === 0 && <p className="empty">No medications match the selected filters.</p>}</div></main>;
}

function PortalContent({ role, onLogout, pendingStaff, approvedStaff, onApprove, onReject, systemSummary, clinicData, medicationData, enrolledClinic }: { role: Role; onLogout: () => void; pendingStaff: StaffRegistration[]; approvedStaff: StaffRegistration[]; onApprove: (id: string) => void; onReject: (id: string) => void; systemSummary: SystemSummary; clinicData: Clinic[]; medicationData: Medication[]; enrolledClinic: string }) {
  const admin = role === "admin";
  const enrolledClinicData = clinicData.find((clinic) => clinic.name === enrolledClinic) ?? clinicData[0];
  const stockedMedicationCount = medicationData.filter((medication) => medication.availability !== "Out of Stock").length;
  useEffect(() => {
    const handleQuickAction = (event: MouseEvent) => {
      const button = event.target instanceof HTMLButtonElement ? event.target : null;
      if (!button) return;
      if (button.textContent === "Open queue management panel") document.querySelector(".staff-operations-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (button.textContent === "Sync live digital signage") window.location.reload();
    };
    document.addEventListener("click", handleQuickAction);
    return () => document.removeEventListener("click", handleQuickAction);
  }, []);
    return <main className="admin-main"><div className="portal-top"><div><p className="eyebrow">{admin ? "ADMINISTRATION CONSOLE" : "CLINIC STAFF PORTAL"}</p><h1>{admin ? "Executive health hub oversight" : "Metro Family Care Centre portal"}</h1><p>{admin ? "Live statistics and administrative parameters of registered local clinics." : "Assigned Node: Central District â€¢ 220 Plaza Avenue"}</p></div><button className="sign-out" onClick={onLogout}>Sign out</button></div><div className="stat-grid"><div><small>{admin ? "ACTIVE CLINICS" : "LIVE WAITING TIME"}</small><strong>{admin ? `${systemSummary.activeClinics}` : `${enrolledClinicData.wait ?? 0} mins`}</strong><span>{admin ? "Current registered clinic count" : `Calculated from ${enrolledClinicData.patients} waiting cases`}</span></div><div><small>{admin ? "TOTAL REGISTERED STAFF" : "ACTIVE QUEUE SIZE"}</small><strong>{admin ? `${systemSummary.totalStaff} Staff` : `${enrolledClinicData.patients} People`}</strong><span>{admin ? "Includes approved clinic staff only" : "Patients checked-in"}</span></div><div><small>{admin ? "PENDING APPROVALS" : "DISPENSARY LEVEL"}</small><strong>{admin ? `${systemSummary.pendingApprovals}` : `${Math.round((stockedMedicationCount / medicationData.length) * 100)}% Stocked`}</strong><span>{admin ? "Staff registrations awaiting review" : `${stockedMedicationCount} of ${medicationData.length} essentials stocked`}</span></div></div><div className="portal-grid"><section className="portal-panel"><div className="section-heading"><div><h2>{admin ? "Staff approval queue" : "Queue controller quick action"}</h2><p>{admin ? "Review every staff registration before portal access is granted." : "Quickly change current clinic queue status."}</p></div></div>{admin ? <div className="approval-list">{pendingStaff.length === 0 ? <p className="empty">No staff registrations are waiting for approval.</p> : pendingStaff.map((staff) => <div className="approval-row" key={staff.id}><div><strong>{staff.name}</strong><span>{staff.email} â€¢ {staff.clinic}</span></div><div className="approval-actions"><button className="approve-button" onClick={() => onApprove(staff.id)}>Approve</button><button className="reject-button" onClick={() => onReject(staff.id)}>Reject</button></div></div>)}</div> : <><button className="primary-button">Open queue management panel</button><button className="secondary-button">Sync live digital signage</button></>}</section><section className="portal-panel"><div className="section-heading"><div><h2>{admin ? "Critical medication shortfalls" : "Critical stock monitor"}</h2><p>Dispensary reports requiring attention.</p></div></div><div className="alert-list">{medications.filter((medicine) => medicine.availability !== "In Stock").slice(0, 3).map((medicine) => <div key={medicine.name}><strong>{medicine.name}</strong><span>Stock status: {medicine.availability}</span><StatusPill value={medicine.availability} /></div>)}</div></section></div>{admin && <section className="portal-panel clinic-panel"><div className="section-heading"><div><h2>Staff by clinic</h2><p>All approved staff and administrators currently registered in the system.</p></div></div><div className="clinic-staff-grid">{clinics.map((clinic) => { const clinicStaff = approvedStaff.filter((staff) => staff.clinic === clinic.name); return <div className="clinic-staff-card" key={clinic.name}><strong>{clinic.name}</strong><span>{clinicStaff.length} approved {clinicStaff.length === 1 ? "staff member" : "staff members"}</span>{clinicStaff.length > 0 ? clinicStaff.map((staff) => <div className="staff-row" key={staff.email}><span>{staff.name}</span><small>{staff.email}</small></div>) : <small>No approved staff assigned</small>}</div>; })}</div><div className="admin-staff-row"><strong>Administration</strong><span>{approvedStaff.filter((staff) => staff.role === "admin").length} administrator(s)</span>{approvedStaff.filter((staff) => staff.role === "admin").map((staff) => <small key={staff.email}>{staff.name} â€¢ {staff.email}</small>)}</div></section>}</main>;
}

function Portal({ ...props }: Parameters<typeof PortalContent>[0] & { clinicData: Clinic[]; medicationData: Medication[]; enrolledClinic: string; onCreateStaff: (staff: StaffUpdate) => void; onUpdateStaff: (id: string, update: StaffUpdate) => void; onDeleteStaff: (id: string) => void; onUpdateClinic: (name: string, update: ClinicControlUpdate) => void; onUpdateMedication: (name: string, update: MedicationControlUpdate) => void }) {
  return props.role === "admin" ? <><StaffCrudPanel approvedStaff={props.approvedStaff} onUpdateStaff={props.onUpdateStaff} onDeleteStaff={props.onDeleteStaff} /><PortalContent {...props} /></> : <><StaffOperationsPanel clinicData={props.clinicData} enrolledClinic={props.enrolledClinic} onUpdateClinic={props.onUpdateClinic} /><PortalContent {...props} /></>;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [role, setRole] = useState<Role>("public");
  const [staffName, setStaffName] = useState("Staff member");
  const [enrolledClinic, setEnrolledClinic] = useState("Metro Family Care Centre");
  const [pendingStaff, setPendingStaff] = useState<StaffRegistration[]>([]);
  const [approvedStaff, setApprovedStaff] = useState<StaffRegistration[]>(initialApprovedStaff);
  const [clinicData, setClinicData] = useState<Clinic[]>(clinics);
  const [medicationData, setMedicationData] = useState<Medication[]>(medications);
  const [systemSummary, setSystemSummary] = useState<SystemSummary>({ activeClinics: clinics.length, totalStaff: initialApprovedStaff.filter((staff) => staff.role === "staff").length, pendingApprovals: 0 });
  const [authMessage, setAuthMessage] = useState("");
  useEffect(() => {
    const loadPublicData = () => fetch(`${apiUrl}/api/public-data`).then((response) => response.ok ? response.json() : Promise.reject()).then((data: { clinics: Clinic[]; medications: Medication[] }) => {
      clinics = data.clinics.map((clinic) => ({ ...clinic, distance: clinics.find((current) => current.name === clinic.name)?.distance ?? 0 }));
      medications = data.medications;
      setClinicData(clinics);
      setMedicationData(medications);
    }).catch(() => undefined);
    const loadStaff = () => fetch(`${apiUrl}/api/staff`).then((response) => response.ok ? response.json() : Promise.reject()).then((records: ApiStaff[]) => {
      setApprovedStaff(records.filter((staff) => staff.status === "approved").map(toStaffRegistration));
      setPendingStaff(records.filter((staff) => staff.status === "pending").map(toStaffRegistration));
    }).catch(() => undefined);
    const loadSummary = () => fetch(`${apiUrl}/api/summary`).then((response) => response.ok ? response.json() : Promise.reject()).then((summary: SystemSummary) => {
      setSystemSummary(summary);
    }).catch(() => undefined);
    loadPublicData();
    const publicDataTimer = window.setInterval(loadPublicData, 10000);
    loadStaff();
    loadSummary();
    const staffTimer = window.setInterval(loadStaff, 10000);
    const summaryTimer = window.setInterval(loadSummary, 10000);
    return () => {
      window.clearInterval(publicDataTimer);
      window.clearInterval(staffTimer);
      window.clearInterval(summaryTimer);
    };
  }, []);
  const navigate = (nextView: View) => { setView(nextView); setSelectedClinic(null); };
  const registerStaff = async (registration: Omit<StaffRegistration, "id">) => {
    try {
      const response = await fetch(`${apiUrl}/api/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registration) });
      if (!response.ok) throw new Error("Registration failed");
      const saved = toStaffRegistration(await response.json() as ApiStaff);
      setPendingStaff((current) => [...current, saved]);
      setSystemSummary((current) => ({ ...current, pendingApprovals: current.pendingApprovals + 1 }));
    } catch {
      setPendingStaff((current) => [...current, { ...registration, id: String(Date.now()) }]);
      setSystemSummary((current) => ({ ...current, pendingApprovals: current.pendingApprovals + 1 }));
    }
    setAuthMessage("Registration submitted. An administrator must approve your account before you can sign in.");
  };
  const createStaff = async (staff: StaffUpdate) => { const response = await fetch(`${apiUrl}/api/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...staff, status: "approved" }) }); const saved = toStaffRegistration(await response.json() as ApiStaff); setApprovedStaff((current) => [...current, saved]); setSystemSummary((current) => ({ ...current, totalStaff: current.totalStaff + 1 })); };
  const updateStaff = async (id: string, update: StaffUpdate) => { await fetch(`${apiUrl}/api/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) }); setApprovedStaff((current) => current.map((staff) => staff.id === id ? { ...staff, ...update } : staff)); };
  const deleteStaff = async (id: string) => { await fetch(`${apiUrl}/api/staff/${id}`, { method: "DELETE" }); setApprovedStaff((current) => current.filter((staff) => staff.id !== id)); setSystemSummary((current) => ({ ...current, totalStaff: Math.max(current.totalStaff - 1, 0) })); };
  const updateClinic = async (name: string, update: ClinicControlUpdate) => {
    if (role === "staff" && name !== enrolledClinic) return;
    const response = await fetch(`${apiUrl}/api/clinics/${encodeURIComponent(name)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
    if (!response.ok) throw new Error("Queue update failed");
    const saved = await response.json() as Clinic;
    clinics = clinics.map((clinic) => clinic.name === name ? { ...clinic, ...saved } : clinic);
    setClinicData((current) => current.map((clinic) => clinic.name === name ? { ...clinic, ...saved } : clinic));
  };
  const updateMedication = async (name: string, update: MedicationControlUpdate) => {
    if (role === "staff" && !update.clinics.startsWith(`${enrolledClinic}:`)) return;
    const response = await fetch(`${apiUrl}/api/medications/${encodeURIComponent(name)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
    if (!response.ok) throw new Error("Medication update failed");
    const saved = await response.json() as Medication;
    medications = medications.map((medication) => medication.name === name ? { ...medication, ...saved } : medication);
    setMedicationData((current) => current.map((medication) => medication.name === name ? { ...medication, ...saved } : medication));
  };
  const createMedication = async (medication: Omit<Medication, "availability">) => {
    if (!medication.name || !medication.category || !Number.isInteger(medication.stockCount) || medication.stockCount < 0) throw new Error("Enter a name, category, and non-negative whole quantity.");
    const response = await fetch(`${apiUrl}/api/medications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(medication) });
    const result = await response.json().catch(() => ({})) as { error?: string } & Medication;
    if (!response.ok) throw new Error(result.error || "Medication could not be added.");
    medications = [...medications, result];
    setMedicationData((current) => [...current, result]);
  };
  const login = async (nextRole: Role, email: string, password: string, token: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: nextRole, email, password, token }) });
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(error.error || "Invalid credentials");
      }
      const result = await response.json();
      setRole(result.role);
      if (result.name) setStaffName(result.name);
      if (result.clinic) setEnrolledClinic(result.clinic);
      setView(result.role === "admin" ? "adminDashboard" : "staffOverview");
      setAuthMessage("");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : nextRole === "admin" ? "Invalid administrator email, password, or security token." : "This staff account is still awaiting administrator approval.");
    }
  };
  const approveStaff = async (id: string) => {
    const approved = pendingStaff.find((staff) => staff.id === id);
    if (!approved) return;
    await fetch(`${apiUrl}/api/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
    setApprovedStaff((current) => [...current, { ...approved, role: "staff" }]);
    setPendingStaff((current) => current.filter((staff) => staff.id !== id));
    setSystemSummary((current) => ({ ...current, totalStaff: current.totalStaff + 1, pendingApprovals: Math.max(current.pendingApprovals - 1, 0) }));
  };
  const rejectStaff = async (id: string) => { await fetch(`${apiUrl}/api/staff/${id}`, { method: "DELETE" }); setPendingStaff((current) => current.filter((staff) => staff.id !== id)); setSystemSummary((current) => ({ ...current, pendingApprovals: Math.max(current.pendingApprovals - 1, 0) })); };
  const logout = () => { setRole("public"); setView("home"); };
  if (role === "admin" && view !== "login" && view !== "home") return <><AdminHeader view={view} onNavigate={setView} onLogout={logout} />{view === "adminDashboard" && <AdminDashboard clinicData={clinicData} medicationData={medicationData} systemSummary={systemSummary} />}{view === "adminClinics" && <AdminClinics clinicData={clinicData} />}{view === "adminStaff" && <AdminStaff approvedStaff={approvedStaff} pendingStaff={pendingStaff} onApprove={approveStaff} onReject={rejectStaff} />}{view === "adminMedications" && <AdminMedications medicationData={medicationData} onCreateMedication={createMedication} />}</>;
  if (role === "staff" && ["staffQueue", "staffOverview", "staffStock", "portal"].includes(view)) return <><StaffHeader view={view} onNavigate={setView} onLogout={logout} staffName={staffName} enrolledClinic={enrolledClinic} />{view === "staffQueue" && <StaffOperationsPanel clinicData={clinicData} enrolledClinic={enrolledClinic} onUpdateClinic={updateClinic} />}{view === "staffOverview" && <StaffClinicOverview clinicData={clinicData} medicationData={medicationData} enrolledClinic={enrolledClinic} />}{view === "staffStock" && <StaffStockpileController medicationData={medicationData} enrolledClinic={enrolledClinic} onUpdateMedication={updateMedication} />}{view === "portal" && <Portal role={role} clinicData={clinicData} medicationData={medicationData} enrolledClinic={enrolledClinic} pendingStaff={pendingStaff} approvedStaff={approvedStaff} onApprove={approveStaff} onReject={rejectStaff} onCreateStaff={createStaff} onUpdateStaff={updateStaff} onDeleteStaff={deleteStaff} onUpdateClinic={updateClinic} onUpdateMedication={updateMedication} systemSummary={systemSummary} onLogout={logout} />}</>;
  if (view === "login") return <><AlertBar admin /><Auth message={authMessage} onRegister={registerStaff} onLogin={login} onPublic={() => navigate("home")} /></>;
  return <div className="app-shell"><PublicHeader view={view} onNavigate={navigate} />{view === "home" && <PublicHome onNavigate={navigate} onClinic={(clinic) => { setSelectedClinic(clinic); setView("clinic"); }} />}{view === "clinics" && <Clinics onClinic={(clinic) => { setSelectedClinic(clinic); setView("clinic"); }} />}{view === "medications" && <Medications />}{view === "clinic" && selectedClinic && <ClinicDetails clinic={selectedClinic} onBack={() => navigate("clinics")} />}<Footer /><button className="floating-login" onClick={() => navigate("login")}>Staff & admin access</button></div>;
}

