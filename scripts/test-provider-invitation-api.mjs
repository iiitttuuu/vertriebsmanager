import assert from "node:assert/strict";

const { default: toggleInvitationHandler } = await import(new URL("../api/providers/toggle-invitation.js", import.meta.url));
const { default: completeInvitationHandler } = await import(new URL("../api/providers/complete-invitation.js", import.meta.url));
const { default: resetInvitationHandler } = await import(new URL("../api/providers/reset-invitation.js", import.meta.url));

function createResponse(status, payload) {
  const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return serialized;
    },
    async json() {
      return serialized ? JSON.parse(serialized) : null;
    },
  };
}

function createResult() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

const providerId = "provider-123";
const authUserId = "11111111-1111-4111-8111-111111111111";
const claimUserId = "22222222-2222-4222-8222-222222222222";

async function runRequest({
  targetHandler = toggleInvitationHandler,
  profile,
  provider,
  body,
  providerUpdateResult = createResponse(200, [{ id: providerId }]),
}) {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const calls = [];
  const results = [
    createResponse(200, { id: authUserId }),
    createResponse(200, [profile]),
    createResponse(200, [provider]),
    providerUpdateResult,
  ];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const next = results.shift();
    if (next) {
      return next;
    }
    if (String(url).includes("/rest/v1/providers?")) {
      return createResponse(200, []);
    }
    if (String(url).includes("/rest/v1/app_state?")) {
      return createResponse(200, []);
    }
    throw new Error(`Unerwarteter Request: ${url}`);
  };
  process.env.SUPABASE_URL = "https://workflow-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  try {
    const result = createResult();
    await targetHandler(
      {
        method: "POST",
        headers: { authorization: "Bearer test-user-token" },
        body,
      },
      result
    );
    return { result, calls };
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = previousUrl;
    }
    if (previousServiceKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
    }
  }
}

function inProgressProvider(payload = {}) {
  return {
    id: providerId,
    name: "Testanbieter",
    status: "In Bearbeitung",
    in_progress_by_user_id: claimUserId,
    in_progress_by_name: "Claim-Inhaber",
    in_progress_by_role: "mitarbeiter",
    in_progress_at: "2026-07-24T12:00:00.000Z",
    updated_at: "2026-07-24T12:00:00.000Z",
    payload,
  };
}

const otherEmployee = await runRequest({
  profile: {
    user_id: authUserId,
    full_name: "Fremde Person",
    email: "other@example.test",
    role: "mitarbeiter",
    status: "active",
  },
  provider: inProgressProvider(),
  body: { providerId, enabled: true },
});
assert.equal(otherEmployee.result.statusCode, 403, "Fremde Mitarbeiter werden serverseitig abgewiesen.");
assert.match(otherEmployee.result.payload.error, /Nur die Person/, "Die Ablehnung erklärt die Claim-Regel.");
assert.equal(otherEmployee.calls.length, 3, "Bei fehlendem Claim darf kein Schreibrequest erfolgen.");

const owner = await runRequest({
  profile: {
    user_id: authUserId,
    full_name: "Claim-Inhaber",
    email: "owner@example.test",
    role: "mitarbeiter",
    status: "active",
  },
  provider: {
    ...inProgressProvider(),
    in_progress_by_user_id: authUserId,
  },
  body: { providerId, enabled: true },
});
assert.equal(owner.result.statusCode, 200, "Claim-Inhaber kann eine Einladung aktivieren.");
assert.equal(owner.result.payload.provider.invitationRequestStatus, "open", "Aktivieren speichert den offenen Einladungsauftrag.");
const ownerPatch = owner.calls.find(
  (call) => call.options?.method === "PATCH" && call.url.includes("/rest/v1/providers?")
);
assert.ok(ownerPatch, "Die erfolgreiche Aktivierung schreibt in die führende providers-Tabelle.");
assert.equal(JSON.parse(ownerPatch.options.body).payload.invitationRequestStatus, "open");
assert.match(ownerPatch.url, /updated_at=eq.2026-07-24T12%3A00%3A00.000Z/, "Der Schreibvorgang ist versionsgebunden.");

const legacyClaimed = await runRequest({
  profile: {
    user_id: authUserId,
    full_name: "Claim-Inhaber",
    email: "owner@example.test",
    role: "mitarbeiter",
    status: "active",
  },
  provider: { ...inProgressProvider(), status: "claimed", in_progress_by_user_id: authUserId },
  body: { providerId, enabled: true },
});
assert.equal(legacyClaimed.result.statusCode, 200, "Legacy-Status claimed bleibt serverseitig im Claim-Workflow.");

const legacyErfasst = await runRequest({
  profile: {
    user_id: authUserId,
    full_name: "Claim-Inhaber",
    email: "owner@example.test",
    role: "mitarbeiter",
    status: "active",
  },
  provider: { ...inProgressProvider(), status: "erfasst", in_progress_by_user_id: authUserId },
  body: { providerId, enabled: true },
});
assert.equal(legacyErfasst.result.statusCode, 200, "Legacy-Status erfasst bleibt serverseitig im Claim-Workflow.");

const adminCancels = await runRequest({
  profile: {
    user_id: authUserId,
    full_name: "Admin",
    email: "admin@example.test",
    role: "admin",
    status: "active",
  },
  provider: inProgressProvider({ invitationRequestStatus: "open", invitationRequestedByUserId: claimUserId }),
  body: { providerId, enabled: false },
});
assert.equal(adminCancels.result.statusCode, 200, "Admin darf eine offene Einladung unabhängig vom Claim zurücknehmen.");
assert.equal(adminCancels.result.payload.provider.invitationRequestStatus, "", "Deaktivieren leert den Einladungsauftrag.");

const wrongStatus = await runRequest({
  profile: {
    user_id: authUserId,
    full_name: "Admin",
    email: "admin@example.test",
    role: "admin",
    status: "active",
  },
  provider: { ...inProgressProvider(), status: "offen" },
  body: { providerId, enabled: true },
});
assert.equal(wrongStatus.result.statusCode, 409, "Ohne aktuellen In-Bearbeitung-Status bleibt der Schalter serverseitig gesperrt.");

const staleWrite = await runRequest({
  profile: {
    user_id: authUserId,
    full_name: "Claim-Inhaber",
    email: "owner@example.test",
    role: "mitarbeiter",
    status: "active",
  },
  provider: { ...inProgressProvider(), in_progress_by_user_id: authUserId },
  body: { providerId, enabled: true },
  providerUpdateResult: createResponse(200, []),
});
assert.equal(staleWrite.result.statusCode, 409, "Ein paralleler Status- oder Claim-Wechsel wird nicht überschrieben.");

const staleCompletion = await runRequest({
  targetHandler: completeInvitationHandler,
  profile: {
    user_id: authUserId,
    full_name: "Admin",
    email: "admin@example.test",
    role: "admin",
    status: "active",
  },
  provider: {
    ...inProgressProvider({ invitationRequestStatus: "open", invitationRequestedByUserId: claimUserId }),
  },
  body: { providerId },
  providerUpdateResult: createResponse(200, []),
});
assert.equal(staleCompletion.result.statusCode, 409, "Ein paralleles Zurücknehmen verhindert das veraltete Abschließen.");

const staleReset = await runRequest({
  targetHandler: resetInvitationHandler,
  profile: {
    user_id: authUserId,
    full_name: "Superadmin",
    email: "super@example.test",
    role: "superadmin",
    status: "active",
  },
  provider: {
    ...inProgressProvider({ invitationRequestStatus: "sent" }),
  },
  body: { providerId },
  providerUpdateResult: createResponse(200, []),
});
assert.equal(staleReset.result.statusCode, 409, "Ein paralleles Neu-Anfordern verhindert ein veraltetes Zurücksetzen.");
assert.match(staleReset.result.payload.error, /inzwischen geändert/, "Legacy-Status sent wird als erledigte Einladung erkannt.");

console.log("Einladungs-APIs geprüft: Claim, Statusvoraussetzung und Lifecycle-CAS sind serverseitig abgesichert.");
