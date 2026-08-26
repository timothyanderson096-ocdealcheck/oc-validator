const REQUIRED_KEYS = [
  "status",
  "has_price",
  "has_exterior",
  "has_interior",
  "missing_evidence",
  "reason",
];

const ALLOWED_STATUSES = new Set(["valid", "invalid", "low_confidence"]);

function normalizeValidationResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidContract("Validator returned a non-object response.");
  }

  for (const key of REQUIRED_KEYS) {
    if (!(key in value)) {
      return invalidContract(`Validator response missing required field: ${key}.`);
    }
  }

  const {
    status,
    has_price: hasPrice,
    has_exterior: hasExterior,
    has_interior: hasInterior,
    missing_evidence: missingEvidence,
    reason,
  } = value;

  if (!ALLOWED_STATUSES.has(status)) {
    return invalidContract("Validator returned an unsupported status.");
  }

  if (
    typeof hasPrice !== "boolean" ||
    typeof hasExterior !== "boolean" ||
    typeof hasInterior !== "boolean"
  ) {
    return invalidContract("Validator evidence flags must be boolean values.");
  }

  if (
    !Array.isArray(missingEvidence) ||
    missingEvidence.some((item) => typeof item !== "string")
  ) {
    return invalidContract("Validator missing_evidence must be a list of strings.");
  }

  if (typeof reason !== "string" || reason.trim().length === 0) {
    return invalidContract("Validator reason must be a non-empty string.");
  }

  const hasAllRequiredEvidence = hasPrice && hasExterior && hasInterior;

  if (status === "valid" && !hasAllRequiredEvidence) {
    return invalidContract(
      "Validator cannot return valid unless all required evidence flags are true.",
    );
  }

  if (status === "valid" && missingEvidence.length !== 0) {
    return invalidContract(
      "Validator cannot return valid while missing_evidence is non-empty.",
    );
  }

  if (status !== "valid" && hasAllRequiredEvidence && missingEvidence.length === 0) {
    return {
      status,
      has_price: hasPrice,
      has_exterior: hasExterior,
      has_interior: hasInterior,
      missing_evidence: [],
      reason: reason.trim(),
    };
  }

  return {
    status,
    has_price: hasPrice,
    has_exterior: hasExterior,
    has_interior: hasInterior,
    missing_evidence: missingEvidence.map((item) => item.trim()).filter(Boolean),
    reason: reason.trim(),
  };
}

function invalidContract(reason) {
  return {
    status: "invalid",
    has_price: false,
    has_exterior: false,
    has_interior: false,
    missing_evidence: ["unknown"],
    reason,
  };
}

module.exports = {
  normalizeValidationResult,
};
