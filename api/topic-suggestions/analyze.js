const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_QUERY_LENGTH = 120;
const MAX_CATEGORIES = 100;
const MAX_SUBCATEGORIES_PER_CATEGORY = 120;
const MAX_TOPICS_PER_SUBCATEGORY = 250;
const MAX_SYNONYMS_PER_TOPIC = 60;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["synonym", "new_topic"] },
    topicId: { type: "string" },
    subcategoryId: { type: "string" },
    suggestedTopicName: { type: "string" },
    suggestedSynonyms: { type: "array", items: { type: "string" } },
    reason: { type: "string" },
  },
  required: ["kind", "topicId", "subcategoryId", "suggestedTopicName", "suggestedSynonyms", "reason"],
};

const AUDIT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          scope: { type: "string", enum: ["themenbereich", "thema", "synonym"] },
          categoryId: { type: "string" },
          subcategoryId: { type: "string" },
          topicId: { type: "string" },
          recommendationType: { type: "string", enum: ["umbenennen", "verschieben", "zusammenführen", "synonym_hinzufügen", "synonym_entfernen"] },
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["scope", "categoryId", "subcategoryId", "topicId", "recommendationType", "title", "description"],
      },
    },
  },
  required: ["recommendations"],
};

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function cleanText(value = "", maxLength = MAX_QUERY_LENGTH) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, maxLength);
}

function sanitizeSupabaseUrl(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized) ? normalized : "";
}

function getSupabaseConfig(req) {
  const requestedUrl = sanitizeSupabaseUrl(req?.headers?.["x-supabase-url"] || "");
  const environmentUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL || "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return {
    supabaseUrl: requestedUrl || environmentUrl,
    serviceRoleKey,
    ready: Boolean((requestedUrl || environmentUrl) && serviceRoleKey),
  };
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}

async function authenticateSuperadmin(req, supabaseUrl, serviceRoleKey) {
  const authorization = String(req?.headers?.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Nicht authentifiziert." };
  }
  const token = authorization.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: "Ungültiger Login-Token." };
  }
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${token}` },
  });
  const user = await userResponse.json().catch(() => null);
  const userId = String(user?.id || "").trim();
  if (!userResponse.ok || !userId) {
    return { ok: false, status: 401, error: "Login-Token ist abgelaufen oder ungültig." };
  }
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` } }
  );
  const profiles = await profileResponse.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  const role = String(profile?.role || "").trim().toLowerCase();
  const status = String(profile?.status || "").trim().toLowerCase();
  if (status !== "active" || !["superadmin", "supaadmin"].includes(role)) {
    return { ok: false, status: 403, error: "Die KI-Zuordnung ist nur für aktive Superadmins verfügbar." };
  }
  return { ok: true };
}

function sanitizeCatalog(rawCatalog) {
  const seenCategoryIds = new Set();
  const catalog = [];
  (Array.isArray(rawCatalog) ? rawCatalog : []).slice(0, MAX_CATEGORIES).forEach((rawCategory) => {
    const categoryId = cleanText(rawCategory?.id, 200);
    const categoryName = cleanText(rawCategory?.name, 160);
    if (!categoryId || !categoryName || seenCategoryIds.has(categoryId)) return;
    seenCategoryIds.add(categoryId);
    const seenSubcategoryIds = new Set();
    const subcategories = [];
    (Array.isArray(rawCategory?.subcategories) ? rawCategory.subcategories : [])
      .slice(0, MAX_SUBCATEGORIES_PER_CATEGORY)
      .forEach((rawSubcategory) => {
        const subcategoryId = cleanText(rawSubcategory?.id, 200);
        const subcategoryName = cleanText(rawSubcategory?.name, 160);
        if (!subcategoryId || !subcategoryName || seenSubcategoryIds.has(subcategoryId)) return;
        seenSubcategoryIds.add(subcategoryId);
        const seenTopicIds = new Set();
        const topics = [];
        (Array.isArray(rawSubcategory?.topics) ? rawSubcategory.topics : [])
          .slice(0, MAX_TOPICS_PER_SUBCATEGORY)
          .forEach((rawTopic) => {
            const topicId = cleanText(rawTopic?.id, 200);
            const topicName = cleanText(rawTopic?.name, 160);
            if (!topicId || !topicName || seenTopicIds.has(topicId)) return;
            seenTopicIds.add(topicId);
            const synonyms = Array.from(new Set(
              (Array.isArray(rawTopic?.synonyms) ? rawTopic.synonyms : [])
                .slice(0, MAX_SYNONYMS_PER_TOPIC)
                .map((entry) => cleanText(entry, 120))
                .filter(Boolean)
            ));
            topics.push({ id: topicId, name: topicName, synonyms });
          });
        subcategories.push({ id: subcategoryId, name: subcategoryName, topics });
      });
    catalog.push({ id: categoryId, name: categoryName, subcategories });
  });
  return catalog;
}

function getStructuredOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string" && content.text.trim()) return content.text;
    }
  }
  return "";
}

function buildInstruction(catalog) {
  return [
    "Du ordnest einen erfolglosen deutschen Suchbegriff einer festen Themen-Taxonomie zu.",
    "Kategorien sind unveränderlich. Du darfst niemals eine Kategorie oder einen Themenbereich neu vorschlagen.",
    "Entscheidungsreihenfolge: Suche zuerst ein bestehendes Hauptthema, zu dem der Suchbegriff als Synonym passt. Wähle kind synonym nur bei einer klaren inhaltlichen Zuordnung. Erst wenn kein vorhandenes Thema sinnvoll passt, wähle kind new_topic und ordne es einem vorhandenen Themenbereich zu.",
    "Bei synonym muss topicId exakt eine bestehende topic id aus dem Katalog sein; subcategoryId, suggestedTopicName und suggestedSynonyms bleiben leer.",
    "Bei new_topic muss subcategoryId exakt eine bestehende Themenbereich-id sein; topicId bleibt leer. suggestedTopicName ist ein kurzer, sinnvoller deutscher Themenname, nicht länger als 120 Zeichen und kein bereits bestehendes Thema. suggestedSynonyms enthält 3 bis 8 wichtige alternative Suchbegriffe. Die Begriffe müssen Anbietern helfen, Angebote, Kurse, Workshops oder Seminare zuverlässig diesem Thema zuzuordnen: bevorzuge konkrete Leistungsbegriffe, gängige Angebotsvarianten und gebräuchliche Bezeichnungen. Nenne keine allgemeinen Marketingbegriffe, keinen Themenname selbst und keine Dubletten. Wenn der Suchbegriff vom Themenname abweicht, nimm ihn als Synonym auf.",
    "Die Begründung ist kurz, sachlich und auf Deutsch. Erfinde keine Taxonomie-IDs.",
    `Katalog: ${JSON.stringify(catalog)}`,
  ].join("\n");
}

function buildAuditInstruction(catalog) {
  return [
    "Prüfe diese feste deutsche Themen-Taxonomie für die Zuordnung von Anbieter-Angeboten, Kursen, Workshops und Seminaren.",
    "Gib ausschließlich wirkliche, klar begründete Verbesserungen aus. Keine Stilkorrekturen, keine bloßen Geschmacksvorschläge, keine neuen Kategorien und keine Änderungen mit geringem Nutzen. Wenn die Struktur plausibel ist, gib eine leere recommendations-Liste zurück.",
    "Eine Empfehlung muss die Anbieter-Zuordnung spürbar verständlicher machen, etwa bei eindeutig falscher Einordnung, klarer Doppelung, missverständlichem Namen oder einem Synonym, das zu Fehlzuordnungen führt. Maximal 10 Empfehlungen.",
    "Alle IDs müssen exakt aus dem Katalog stammen. Für Themenbereich-Empfehlungen topicId leer lassen; für Themen-Empfehlungen topicId exakt setzen. Beschreibe die konkrete Änderung und ihren Nutzen knapp auf Deutsch. Änderungen niemals selbst durchführen.",
    `Katalog: ${JSON.stringify(catalog)}`,
  ].join("\n");
}

function normalizeAuditRecommendations(rawRecommendations, catalog) {
  const categories = new Set(catalog.map((entry) => entry.id));
  const subcategories = new Set(catalog.flatMap((category) => category.subcategories.map((entry) => entry.id)));
  const topics = new Set(catalog.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.topics.map((entry) => entry.id))));
  const allowedScopes = new Set(["themenbereich", "thema", "synonym"]);
  const allowedTypes = new Set(["umbenennen", "verschieben", "zusammenführen", "synonym_hinzufügen", "synonym_entfernen"]);
  return (Array.isArray(rawRecommendations) ? rawRecommendations : []).map((entry) => {
    const scope = cleanText(entry?.scope, 30);
    const categoryId = cleanText(entry?.categoryId, 200);
    const subcategoryId = cleanText(entry?.subcategoryId, 200);
    const topicId = cleanText(entry?.topicId, 200);
    const recommendationType = cleanText(entry?.recommendationType, 40);
    const title = cleanText(entry?.title, 160);
    const description = cleanText(entry?.description, 420);
    if (!allowedScopes.has(scope) || !allowedTypes.has(recommendationType) || !title || !description || !categories.has(categoryId)) return null;
    if ((scope === "themenbereich" && !subcategories.has(subcategoryId)) || (scope !== "themenbereich" && !topics.has(topicId))) return null;
    return { scope, categoryId, subcategoryId, topicId, recommendationType, title, description };
  }).filter(Boolean).slice(0, 10);
}

function normalizeSuggestion(rawSuggestion, catalog) {
  const kind = String(rawSuggestion?.kind || "").trim();
  const topicId = cleanText(rawSuggestion?.topicId, 200);
  const subcategoryId = cleanText(rawSuggestion?.subcategoryId, 200);
  const suggestedTopicName = cleanText(rawSuggestion?.suggestedTopicName, 120);
  const suggestedSynonyms = Array.from(new Set(
    (Array.isArray(rawSuggestion?.suggestedSynonyms) ? rawSuggestion.suggestedSynonyms : [])
      .map((entry) => cleanText(entry, 120))
      .filter((entry) => entry && entry.toLocaleLowerCase("de-AT") !== suggestedTopicName.toLocaleLowerCase("de-AT"))
  )).slice(0, 12);
  const reason = cleanText(rawSuggestion?.reason, 280);
  const topics = catalog.flatMap((category) =>
    category.subcategories.flatMap((subcategory) => subcategory.topics.map((topic) => ({ ...topic, subcategory })))
  );
  const subcategories = catalog.flatMap((category) => category.subcategories);
  if (kind === "synonym" && topics.some((topic) => topic.id === topicId)) {
    return { kind, topicId, subcategoryId: "", suggestedTopicName: "", suggestedSynonyms: [], reason };
  }
  if (kind === "new_topic" && suggestedTopicName && subcategories.some((subcategory) => subcategory.id === subcategoryId)) {
    const normalizedName = suggestedTopicName.toLocaleLowerCase("de-AT");
    if (!topics.some((topic) => topic.name.toLocaleLowerCase("de-AT") === normalizedName)) {
      return { kind, topicId: "", subcategoryId, suggestedTopicName, suggestedSynonyms, reason };
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!String(process.env.OPENAI_API_KEY || "").trim()) {
    sendJson(res, 503, { code: "openai_not_configured", error: "OPENAI_API_KEY ist für die KI-Zuordnung noch nicht hinterlegt." });
    return;
  }
  const { supabaseUrl, serviceRoleKey, ready } = getSupabaseConfig(req);
  if (!ready) {
    sendJson(res, 503, { error: "Die Server-Konfiguration für die KI-Zuordnung ist unvollständig." });
    return;
  }
  try {
    const authorization = await authenticateSuperadmin(req, supabaseUrl, serviceRoleKey);
    if (!authorization.ok) {
      sendJson(res, authorization.status, { error: authorization.error });
      return;
    }
    const body = parseBody(req);
    const auditMode = String(body?.mode || "").trim().toLowerCase() === "audit";
    const query = cleanText(body?.query);
    const catalog = sanitizeCatalog(body?.catalog);
    if ((!auditMode && query.length < 2) || !catalog.length) {
      sendJson(res, 400, { error: "Suchbegriff oder Themenstruktur ist ungültig." });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: String(process.env.OPENAI_TOPIC_SUGGESTION_MODEL || process.env.OPENAI_CEO_SECRETARY_MODEL || "gpt-5.6-luna").trim(),
          store: false,
          reasoning: { effort: "low" },
          text: { format: { type: "json_schema", name: auditMode ? "topic_structure_audit" : "topic_suggestion", strict: true, schema: auditMode ? AUDIT_RESPONSE_SCHEMA : RESPONSE_SCHEMA } },
          input: [
            { role: "developer", content: [{ type: "input_text", text: auditMode ? buildAuditInstruction(catalog) : buildInstruction(catalog) }] },
            { role: "user", content: [{ type: "input_text", text: auditMode ? "Prüfe die Taxonomie jetzt." : query }] },
          ],
        }),
        signal: controller.signal,
      });
      const payload = await openAiResponse.json().catch(() => null);
      if (!openAiResponse.ok) {
        sendJson(res, 502, { error: "Die KI-Zuordnung ist gerade nicht erreichbar." });
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(getStructuredOutputText(payload));
      } catch (_error) {
        sendJson(res, 502, { error: "Die KI-Zuordnung konnte keinen sicheren Vorschlag erstellen." });
        return;
      }
      const result = auditMode ? { recommendations: normalizeAuditRecommendations(parsed?.recommendations, catalog) } : normalizeSuggestion(parsed, catalog);
      if (!result) {
        sendJson(res, 502, { error: "Die KI-Zuordnung konnte keinen gültigen Vorschlag erstellen." });
        return;
      }
      sendJson(res, 200, result);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    sendJson(res, 500, {
      error: error?.name === "AbortError" ? "Die KI-Zuordnung braucht gerade zu lange. Bitte erneut versuchen." : "Die KI-Zuordnung ist gerade nicht erreichbar.",
    });
  }
}
