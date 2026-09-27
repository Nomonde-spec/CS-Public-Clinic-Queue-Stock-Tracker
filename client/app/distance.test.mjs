import test from "node:test";
import assert from "node:assert/strict";
import distance from "./distance.js";

const { filterClinicsByRadius, getClinicDistance, getDistanceMiles, isValidCoordinates, provinceReferencePoints } = distance;

test("distance between identical coordinates is zero", () => {
  const location = { latitude: 0, longitude: 0 };
  assert.equal(getDistanceMiles(location, location), 0);
});

test("distance uses great-circle miles", () => {
  const losAngeles = { latitude: 34.0522, longitude: -118.2437 };
  const sanFrancisco = { latitude: 37.7749, longitude: -122.4194 };
  assert.ok(Math.abs(getDistanceMiles(losAngeles, sanFrancisco) - 347.4) < 1);
});

test("invalid and unavailable clinic coordinates have no distance", () => {
  const origin = { latitude: 0, longitude: 0 };
  assert.equal(getDistanceMiles(origin, { latitude: 91, longitude: 0 }), null);
  assert.equal(getDistanceMiles(origin, { latitude: 0, longitude: Infinity }), null);
  assert.equal(isValidCoordinates({ latitude: 0, longitude: -181 }), false);
});

test("radius filtering excludes unknown locations and sorts closest first", () => {
  const origin = { latitude: 0, longitude: 0 };
  const clinics = [
    { name: "Far", latitude: 0, longitude: 0.1 },
    { name: "Unknown", latitude: null, longitude: null },
    { name: "Near", latitude: 0, longitude: 0.01 },
  ];
  const matches = filterClinicsByRadius(clinics, origin, 5);
  assert.deepEqual(matches.map(({ clinic }) => clinic.name), ["Near"]);
  assert.equal(filterClinicsByRadius(clinics, origin, 0.7).length, 1);
  assert.equal(filterClinicsByRadius(clinics, origin, 0.6).length, 0);
});

test("province reference points provide explicitly approximate distances", () => {
  const clinic = { name: "Gauteng clinic", province: "Gauteng", latitude: null, longitude: null };
  const result = getClinicDistance(clinic, provinceReferencePoints.Gauteng);
  assert.deepEqual(result, { distanceMiles: 0, isApproximate: true });
});

test("exact clinic coordinates take precedence over the province reference", () => {
  const clinic = { name: "Clinic", province: "Gauteng", latitude: 0, longitude: 0 };
  const result = getClinicDistance(clinic, { latitude: 0, longitude: 0 });
  assert.deepEqual(result, { distanceMiles: 0, isApproximate: false });
});

test("unsupported province has no estimate and is omitted from radius results", () => {
  const clinic = { name: "Unknown province clinic", province: "Unmapped Province", latitude: null, longitude: null };
  const origin = { latitude: -26.2041, longitude: 28.0473 };
  assert.equal(getClinicDistance(clinic, origin), null);
  assert.deepEqual(filterClinicsByRadius([clinic], origin, 50), []);
});

test("province estimate includes a clinic exactly on the radius boundary", () => {
  const origin = { latitude: 0, longitude: 0 };
  const referencePoints = { TestProvince: { latitude: 0, longitude: 1 } };
  const clinic = { name: "Boundary clinic", province: "TestProvince", latitude: null, longitude: null };
  const distanceMiles = getDistanceMiles(origin, referencePoints.TestProvince);
  const matches = filterClinicsByRadius([clinic], origin, distanceMiles, referencePoints);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].isApproximate, true);
});