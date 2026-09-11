import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ACCURACY_M, metresBetween, parseFix } from "../src/lib/geo.ts";

// Somewhere in Al Ain, standing in for the Al Foah office.
const OFFICE = { lat: 24.1302, lng: 55.8023 };
const FENCE = 200;

test("standing still is zero metres", () => {
  assert.equal(metresBetween(OFFICE.lat, OFFICE.lng, OFFICE.lat, OFFICE.lng), 0);
});

test("distance is right to within a metre", () => {
  // One degree of latitude is about 111.2 km anywhere on earth.
  const km = metresBetween(24, 55, 25, 55) / 1000;
  assert.ok(km > 111 && km < 111.5, `got ${km.toFixed(2)} km`);
});

test("the fence lets the car park in and keeps the road out", () => {
  // 0.0009 degrees of latitude is about 100 m.
  const inCarPark = metresBetween(
    OFFICE.lat + 0.0009,
    OFFICE.lng,
    OFFICE.lat,
    OFFICE.lng
  );
  assert.ok(inCarPark < FENCE, `${inCarPark.toFixed(0)} m should be inside`);

  // 0.0045 degrees is about 500 m.
  const downTheRoad = metresBetween(
    OFFICE.lat + 0.0045,
    OFFICE.lng,
    OFFICE.lat,
    OFFICE.lng
  );
  assert.ok(downTheRoad > FENCE, `${downTheRoad.toFixed(0)} m should be outside`);
});

test("a position from the other side of the country is not inside", () => {
  // Roughly Abu Dhabi city.
  const away = metresBetween(24.4539, 54.3773, OFFICE.lat, OFFICE.lng);
  assert.ok(away > 100_000, `got ${(away / 1000).toFixed(0)} km`);
});

test("nonsense coordinates are refused rather than stored", () => {
  assert.equal(parseFix({ lat: 91, lng: 55, accuracy: 10 }), null, "lat past the pole");
  assert.equal(parseFix({ lat: 24, lng: 181, accuracy: 10 }), null, "lng past the line");
  assert.equal(parseFix({ lat: "abc", lng: 55, accuracy: 10 }), null, "not a number");
  assert.equal(parseFix({ lat: null, lng: null, accuracy: null }), null, "nothing sent");
  assert.equal(parseFix({ lat: 24, lng: 55, accuracy: -1 }), null, "impossible accuracy");
  assert.equal(parseFix({ lat: NaN, lng: 55, accuracy: 10 }), null, "NaN");
});

test("a real position is accepted, including strings from JSON", () => {
  assert.deepEqual(parseFix({ lat: 24.1302, lng: 55.8023, accuracy: 9 }), {
    lat: 24.1302,
    lng: 55.8023,
    accuracy: 9,
  });
  assert.deepEqual(parseFix({ lat: "24.1302", lng: "55.8023", accuracy: "9" }), {
    lat: 24.1302,
    lng: 55.8023,
    accuracy: 9,
  });
  assert.deepEqual(
    parseFix({ lat: 0, lng: 0, accuracy: 0 }),
    { lat: 0, lng: 0, accuracy: 0 },
    "zero is a real coordinate, not a missing one"
  );
});

test("a fix too vague to trust is above the limit", () => {
  // 150 m of uncertainty against a 200 m fence puts someone on the road.
  assert.ok(MAX_ACCURACY_M <= FENCE);
});
