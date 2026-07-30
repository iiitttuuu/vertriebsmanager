import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = appSource.indexOf(marker);
  assert.notEqual(start, -1, `Funktion ${name} wurde nicht gefunden.`);
  const bodyStart = appSource.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return appSource.slice(start, index + 1);
      }
    }
  }
  throw new Error(`Funktion ${name} konnte nicht vollständig gelesen werden.`);
}

const context = {
  state: { settings: {} },
  PROVISION_LEDGER_ENTRY_TYPES: new Set(["credit", "reversal"]),
  normalizeText(value = "") {
    return String(value || "").trim().toLowerCase();
  },
  normalizeUserId(value = "") {
    return String(value || "").trim();
  },
  normalizeUserEmail(value = "") {
    return String(value || "").trim().toLowerCase();
  },
  normalizeUserRole(value = "") {
    return String(value || "").trim().toLowerCase();
  },
  parseOptionalNumber(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    const normalized = String(value ?? "").trim().replace(",", ".");
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  },
  getUserDisplayNameByUserId() {
    return "Mitarbeiter";
  },
  getDefaultProvisionRate() {
    return 25;
  },
};
vm.createContext(context);

[
  "sanitizeEmployeeRateValue",
  "sanitizeSignedEuroAmount",
  "formatEuroAmount",
  "formatNetEuroAmount",
  "normalizeEmployeeRatesByUserId",
  "normalizeEmployeeRatesByEmail",
  "normalizeEmployeeHonorariumEnabledByUserId",
  "normalizeEmployeeHonorariumEnabledByEmail",
  "isEmployeeHonorariumEnabled",
  "getEmployeeRateByUserId",
  "normalizeProvisionLedgerEntryType",
  "normalizeProvisionLedgerSource",
  "normalizeProvisionLedgerEntry",
  "normalizeProvisionLedgerEntries",
  "getEffectiveProvisionEntryAmountEur",
].forEach((name) => vm.runInContext(extractFunction(name), context));

context.state.settings = {
  employeeRatesByUserId: {},
  employeeRatesByEmail: {},
  employeeHonorariumEnabledByUserId: {},
  employeeHonorariumEnabledByEmail: {},
};
assert.equal(context.getEmployeeRateByUserId("user-standard"), 25, "Standardsatz muss gelten.");

context.state.settings = {
  employeeRatesByUserId: { "user-override": 40 },
  employeeRatesByEmail: {},
  employeeHonorariumEnabledByUserId: { "user-override": true },
  employeeHonorariumEnabledByEmail: {},
};
assert.equal(context.getEmployeeRateByUserId("user-override"), 40, "Override muss den Standardsatz ersetzen.");

context.state.settings = {
  employeeRatesByUserId: {},
  employeeRatesByEmail: {},
  employeeHonorariumEnabledByUserId: { "user-zero": true },
  employeeHonorariumEnabledByEmail: {},
};
assert.equal(
  context.getEmployeeRateByUserId("user-zero"),
  0,
  "Ein aktivierter Override mit 0,00 € darf nicht auf den Standardsatz zurückfallen."
);

context.state.settings = {
  employeeRatesByUserId: {},
  employeeRatesByEmail: { "vertrieb@example.com": 55 },
  employeeHonorariumEnabledByUserId: {},
  employeeHonorariumEnabledByEmail: { "vertrieb@example.com": true },
};
assert.equal(
  context.getEmployeeRateByUserId("user-email", "vertrieb@example.com"),
  55,
  "Ein per E-Mail hinterlegter Override muss bei der LIVE-Buchung gelten."
);

const ledger = context.normalizeProvisionLedgerEntries([
  {
    id: "credit-1",
    type: "credit",
    userId: "user-override",
    userName: "Vertrieb",
    providerId: "provider-1",
    amountEur: 40,
    createdAt: "2026-07-15T10:00:00.000Z",
  },
  {
    id: "reversal-1",
    type: "reversal",
    userId: "user-override",
    userName: "Vertrieb",
    providerId: "provider-1",
    amountEur: -40,
    reversalOfEntryId: "credit-1",
    createdAt: "2026-07-15T11:00:00.000Z",
  },
  {
    id: "legacy-reversal",
    type: "reversal",
    userId: "user-override",
    userName: "Vertrieb",
    providerId: "provider-1",
    amountEur: 0,
    reversalOfEntryId: "credit-1",
    createdAt: "2026-07-15T12:00:00.000Z",
  },
]);

const credit = ledger.find((entry) => entry.id === "credit-1");
const reversal = ledger.find((entry) => entry.id === "reversal-1");
const repairedLegacyReversal = ledger.find((entry) => entry.id === "legacy-reversal");
assert.equal(credit.amountEur, 40, "Die LIVE-Gutschrift muss den gebuchten Satz speichern.");
assert.equal(reversal.amountEur, -40, "Ein Storno muss den ursprünglichen Betrag negativ buchen.");
assert.equal(
  repairedLegacyReversal.amountEur,
  -40,
  "Ein fehlerhaft gespeichertes Alt-Storno muss aus der Originalgutschrift repariert werden."
);

context.findProvisionLedgerEntryById = (entryId) => ledger.find((entry) => entry.id === entryId) || null;
context.state.settings.employeeRatesByUserId["user-override"] = 99;
assert.equal(
  context.getEffectiveProvisionEntryAmountEur(credit),
  40,
  "Eine vorhandene Gutschrift darf sich nach einer Satzänderung nicht verändern."
);
assert.equal(
  context.getEffectiveProvisionEntryAmountEur(reversal),
  -40,
  "Ein vorhandenes Storno darf sich nach einer Satzänderung nicht verändern."
);
assert.equal(context.formatNetEuroAmount(-40), "- 40.00 €", "Negative Salden müssen negativ dargestellt werden.");
assert.equal(context.formatNetEuroAmount(40), "40.00 €", "Positive Salden müssen korrekt dargestellt werden.");

console.log("Provisionslogik geprüft: Standardsatz, Override, Betragssnapshot und Storno sind korrekt.");
