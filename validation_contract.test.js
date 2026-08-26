const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeValidationResult } = require("./validation_contract");

test("accepts a complete valid result", () => {
  const result = normalizeValidationResult({
    status: "valid",
    has_price: true,
    has_exterior: true,
    has_interior: true,
    missing_evidence: [],
    reason: "All required evidence is present.",
  });

  assert.equal(result.status, "valid");
  assert.equal(result.has_price, true);
  assert.deepEqual(result.missing_evidence, []);
});

test("fails closed when valid contradicts evidence flags", () => {
  const result = normalizeValidationResult({
    status: "valid",
    has_price: true,
    has_exterior: false,
    has_interior: true,
    missing_evidence: ["exterior vehicle photo"],
    reason: "Looks valid.",
  });

  assert.equal(result.status, "invalid");
  assert.equal(result.has_exterior, false);
  assert.deepEqual(result.missing_evidence, ["unknown"]);
});

test("fails closed when required fields are missing", () => {
  const result = normalizeValidationResult({
    status: "valid",
    has_price: true,
  });

  assert.equal(result.status, "invalid");
  assert.match(result.reason, /missing required field/i);
});

test("fails closed on unsupported status", () => {
  const result = normalizeValidationResult({
    status: "maybe",
    has_price: true,
    has_exterior: true,
    has_interior: true,
    missing_evidence: [],
    reason: "Unsure.",
  });

  assert.equal(result.status, "invalid");
});

test("preserves low_confidence when evidence is present but confidence is low", () => {
  const result = normalizeValidationResult({
    status: "low_confidence",
    has_price: true,
    has_exterior: true,
    has_interior: true,
    missing_evidence: [],
    reason: "Interior image is blurry.",
  });

  assert.equal(result.status, "low_confidence");
  assert.equal(result.has_interior, true);
});
