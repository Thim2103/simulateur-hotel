// Defensive value coercion helpers. Every function here must never throw,
// regardless of the shape of the input (null/undefined/malformed JSON/
// arrays instead of objects/objects instead of arrays/etc.).

function tryParseJSON(value) {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false, value: undefined };
  }
}

export function safeArray(value, fallback = []) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const parsed = tryParseJSON(value);
    if (parsed.ok && Array.isArray(parsed.value)) return parsed.value;
    return fallback;
  }

  if (value && typeof value === "object") {
    // An object was provided where an array was expected: use its values
    // rather than discarding the data outright.
    return Object.values(value);
  }

  return fallback;
}

export function safeNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (typeof value === "boolean") return value ? 1 : 0;

  return fallback;
}

export function safeObject(value, fallback = {}) {
  if (Array.isArray(value)) return fallback;

  if (typeof value === "string") {
    const parsed = tryParseJSON(value);
    if (parsed.ok && parsed.value && typeof parsed.value === "object" && !Array.isArray(parsed.value)) {
      return parsed.value;
    }
    return fallback;
  }

  if (value && typeof value === "object") return value;

  return fallback;
}

export function safeString(value, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function safeJSON(value, fallback = null) {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "string") {
    const parsed = tryParseJSON(value);
    return parsed.ok ? parsed.value : fallback;
  }

  if (typeof value === "object") return value;

  return fallback;
}
