(() => {
  "use strict";

  const PROVIDERS_TABLE = "providers";
  const STATE_TABLE = "app_state";
  const PROVIDER_NOTES_TABLE = "provider_notes";
  const TOPIC_REQUESTS_TABLE = "topic_requests";
  const TOPIC_SUBTOPICS_TABLE = "topic_subtopics";
  const CONTENT_READ_RECEIPTS_TABLE = "content_read_receipts";
  const PROVIDER_NOTE_STORAGE_PREFIX = "VMMETA@";
  const ROUTE_RETURN_STORAGE_KEY = "mwc_vertrieb_route_return_v1";
  const COUNTRY_PREFERENCE_STORAGE_PREFIX = "mwc_vertrieb_country_v1";
  const TOPIC_NOTIFICATION_DISMISS_STORAGE_PREFIX = "mwc_vertrieb_topic_notification_dismiss_v1";
  const PROVIDER_STATUS_FLOW = Object.freeze([
    { key: "open", value: "offen", label: "Offen", detail: "Neu im Vertrieb", icon: "1" },
    { key: "inprogress", value: "in Bearbeitung", label: "In Bearbeitung", detail: "Kontakt läuft", icon: "2" },
    { key: "pending", value: "live_pending", label: "Live-Beantragung", detail: "Freigabe ausstehend", icon: "3" },
    { key: "live", value: "live", label: "LIVE", detail: "Freigegeben", icon: "✓" },
  ]);
  const ROOT = document.getElementById("sales-pwa-root");
  const TOAST = document.getElementById("sales-pwa-toast");
  const APP_VERSION = document.querySelector('meta[name="mwc-app-version"]')?.getAttribute("content") || "unbekannt";
  const SALES_ROLES = new Set(["mitarbeiter", "vertriebsmitarbeiter"]);
  const COVERAGE_STATES_BY_COUNTRY = Object.freeze({
    osterreich: ["Burgenland", "Kärnten", "Niederösterreich", "Oberösterreich", "Salzburg", "Steiermark", "Tirol", "Vorarlberg", "Wien"],
    oesterreich: ["Burgenland", "Kärnten", "Niederösterreich", "Oberösterreich", "Salzburg", "Steiermark", "Tirol", "Vorarlberg", "Wien"],
    austria: ["Burgenland", "Kärnten", "Niederösterreich", "Oberösterreich", "Salzburg", "Steiermark", "Tirol", "Vorarlberg", "Wien"],
    deutschland: ["Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"],
    germany: ["Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"],
  });
  const state = {
    client: null,
    profile: null,
    providers: [],
    categories: [],
    topicSubtopics: [],
    view: "home",
    detailId: "",
    wizard: { step: 1, providerId: "", values: createEmptyProviderValues() },
    filter: "open",
    coverageStateFilter: "all",
    coverageProviderFilter: null,
    providerStateFilter: "all",
    navigationHistory: [],
    search: "",
    providerNotesById: {},
    providerNotesLoadingById: {},
    providerNotesErrorById: {},
    providerNotesLoadedById: {},
    placeSuggestions: { name: [], address: [] },
    employeeMessages: [],
    topicRequests: [],
    readEmployeeMessageIds: new Set(),
    dismissedNotificationIds: new Set(),
    appPlatformCountry: "",
    countryFilter: "austria",
    helpCenter: { startVideo: null, onboardingVideos: [], privacyNoticeUrl: "", supportEmail: "", topics: [] },
    helpTopicId: "",
    notificationMenuOpen: false,
    push: { available: false, enabled: false, publicKey: "", hint: "" },
  };
  let toastTimer = 0;
  let googlePlacesReady = false;
  let googlePlacesLoading = null;

  function rememberRouteReturn(providerId) {
    try { sessionStorage.setItem(ROUTE_RETURN_STORAGE_KEY, JSON.stringify({ providerId: String(providerId || ""), at: Date.now() })); } catch (_error) { /* Die Ansicht bleibt im Speicher erhalten. */ }
  }
  function takeRouteReturn() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(ROUTE_RETURN_STORAGE_KEY) || "null");
      sessionStorage.removeItem(ROUTE_RETURN_STORAGE_KEY);
      if (!saved?.providerId || Date.now() - Number(saved.at || 0) > 15 * 60 * 1000) return "";
      return String(saved.providerId);
    } catch (_error) { return ""; }
  }
  let googlePlacesError = "";
  let googleAutocompleteService = null;
  let googlePlacesService = null;
  let googleSessionToken = null;
  let placeSearchTimer = 0;
  let placeSearchRequestId = 0;
  let refreshTimer = 0;
  let topicsLoadInFlight = null;
  let topicsRemoteUpdatedAt = "";

  function createEmptyProviderValues() {
    return {
      name: "", website: "", email: "", phone: "", address: "", postalCode: "", city: "", state: "", country: "Österreich", latitude: "", longitude: "", additionalLocations: [],
      contactSalutation: "", contactTitle: "", contactFirstName: "", contactLastName: "", contactPersonPhone: "", contactPersonEmail: "",
      adminOnly: false, dashboardCreated: false, competitor: false, competitorName: "", onlineOnly: false,
      coverageMode: "locations", coverageCountry: "", coverageStates: [], topicIds: [],
    };
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function normalize(value) { return String(value || "").trim().toLowerCase(); }
  function normalizeComparable(value) { return normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function appCountryKey(value) {
    const key = normalizeComparable(value);
    if (["austria", "osterreich", "oesterreich", "at"].includes(key)) return "austria";
    if (["germany", "deutschland", "de"].includes(key)) return "germany";
    if (["italy", "italien", "italia", "it"].includes(key)) return "italy";
    return "all";
  }
  function countryPreferenceStorageKey() { return `${COUNTRY_PREFERENCE_STORAGE_PREFIX}_${userId() || "default"}`; }
  function loadCountryPreference() {
    try { state.countryFilter = appCountryKey(localStorage.getItem(countryPreferenceStorageKey()) || "austria"); } catch (_error) { state.countryFilter = "austria"; }
  }
  function providerMatchesCountry(provider) {
    if (state.countryFilter === "all") return true;
    const countries = [provider?.country, provider?.coverageCountry, ...(Array.isArray(provider?.locations) ? provider.locations.map((location) => location?.country) : [])]
      .map(appCountryKey).filter((key) => key !== "all");
    return countries.length ? countries.includes(state.countryFilter) : state.countryFilter === "austria";
  }
  function appCountryProviders() { return state.providers.filter(providerMatchesCountry); }
  function optionalNumber(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function normalizeDedupPart(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }
  function topicSubtopicsFor(topicId) {
    const normalizedTopicId = String(topicId || "").trim();
    return (Array.isArray(state.topicSubtopics) ? state.topicSubtopics : [])
      .filter((entry) => String(entry?.topicId || "").trim() === normalizedTopicId)
      .map((entry) => String(entry?.name || "").trim())
      .filter(Boolean);
  }
  function parseFlag(value) { return value === true || ["true", "1", "yes", "ja"].includes(normalize(value)); }
  function roleLabel(role) { return normalize(role) === "vertriebsmitarbeiter" ? "Vertrieb" : "Mitarbeiter"; }
  function isSalesUser() { return SALES_ROLES.has(normalize(state.profile?.role)); }
  function isAdmin() { return ["admin", "superadmin", "supaadmin"].includes(normalize(state.profile?.role)); }
  function isSuperAdmin() { return ["superadmin", "supaadmin"].includes(normalize(state.profile?.role)); }
  // Entspricht canCurrentUserSetProviderDashboardCreated im Desktop-CRM.
  function canSetDashboardCreated() { return isAdmin() || normalize(state.profile?.role) === "vertriebsmitarbeiter"; }
  function userId() { return String(state.profile?.user_id || "").trim(); }
  function displayName() { return String(state.profile?.full_name || state.profile?.email || "Mitarbeiter").trim(); }
  function initials() { return displayName().split(/\s+/).map((part) => part[0] || "").join("").slice(0, 2).toUpperCase(); }
  function nowIso() { return new Date().toISOString(); }
  function createId(prefix) { return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`; }
  function formatDateTime(value) {
    const date = new Date(String(value || ""));
    if (Number.isNaN(date.getTime())) return "–";
    return new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
  function formatDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const date = new Date(`${raw}T12:00:00`);
    return Number.isNaN(date.getTime()) ? raw : new Intl.DateTimeFormat("de-AT", { dateStyle: "medium" }).format(date);
  }
  function safeHttpsUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const parsed = new URL(raw);
      return parsed.protocol === "https:" ? parsed.href : "";
    } catch (_error) { return ""; }
  }
  function normalizeNoteRole(role) {
    const value = normalize(role);
    return ["mitarbeiter", "vertriebsmitarbeiter", "admin", "superadmin", "supaadmin"].includes(value) ? value : "mitarbeiter";
  }

  function statusKey(status) {
    const value = normalize(status).replaceAll("_", " ");
    if (value === "in bearbeitung" || value === "erfasst") return "inprogress";
    if (["live pending", "live beantragung", "live beantragt"].includes(value)) return "pending";
    if (value === "live") return "live";
    if (["archiviert", "kein interesse"].includes(value)) return "closed";
    return "open";
  }
  function canonicalStatus(status) {
    const key = statusKey(status);
    return key === "inprogress" ? "in Bearbeitung" : key === "pending" ? "live_pending" : key === "live" ? "live" : key === "closed" ? "archiviert" : "offen";
  }
  function statusLabel(status) {
    return { open: "Offen", inprogress: "In Bearbeitung", pending: "Live-Beantragung", live: "LIVE", closed: "Abgeschlossen" }[statusKey(status)];
  }
  function statusBadge(status) { const key = statusKey(status); return `<span class="pwa-status pwa-status-${key}">${statusLabel(status)}</span>`; }
  function locationLabel(provider) { return [provider.city, provider.state, provider.country].filter(Boolean).join(", ") || "Standort noch ergänzen"; }
  function isMine(provider) {
    const id = userId();
    return [provider.createdByUserId, provider.responsibleUserId, provider.inProgressByUserId].some((value) => String(value || "").trim() === id);
  }
  // Offene Anbieter dürfen von jedem berechtigten Vertriebsmitarbeiter übernommen werden.
  // Ab „In Bearbeitung“ bleibt der Datensatz bei der übernehmenden Person gesperrt.
  function canManageProvider(provider) {
    return isAdmin() || statusKey(provider?.status) === "open" || isMine(provider);
  }
  function invitationStatus(provider) {
    const value = normalize(provider?.invitationRequestStatus || provider?.invitation_request_status).replaceAll("-", "_").replaceAll(" ", "_");
    if (["open", "offen", "pending", "angefordert"].includes(value)) return "open";
    if (["in_progress", "in_bearbeitung", "bearbeitung", "claimed"].includes(value)) return "inprogress";
    if (["completed", "complete", "done", "erledigt", "sent", "versendet"].includes(value)) return "completed";
    return "";
  }
  function invitationIsOpen(provider) { return ["open", "inprogress"].includes(invitationStatus(provider)); }
  function canManageProviderInvitation(provider) {
    const roleAllowed = isSalesUser() || isAdmin();
    const ownsInProgressClaim = String(provider?.inProgressByUserId || "").trim() === userId();
    return roleAllowed && statusKey(provider?.status) === "inprogress" && (isAdmin() || ownsInProgressClaim);
  }
  function providerInvitationHint(provider) {
    if (statusKey(provider?.status) !== "inprogress") return "Ab „In Bearbeitung“ verfügbar.";
    if (isAdmin()) return "Senden oder zurücknehmen.";
    const owner = String(provider?.inProgressByName || "").trim();
    if (!String(provider?.inProgressByUserId || "").trim()) return "Bearbeiter fehlt – bitte Admin informieren.";
    if (String(provider?.inProgressByUserId || "").trim() !== userId()) return `Nur ${owner || "der Bearbeiter"} kann ändern.`;
    return "Senden oder zurücknehmen.";
  }
  function statusFlowIndex(status) { return PROVIDER_STATUS_FLOW.findIndex((entry) => entry.key === statusKey(status)); }
  function canChangeProviderStatus(provider, nextKey) {
    const currentKey = statusKey(provider?.status);
    const nextKnown = PROVIDER_STATUS_FLOW.some((entry) => entry.key === nextKey);
    if (!canManageProvider(provider) || currentKey === "closed" || !nextKnown) return false;
    if (nextKey === currentKey) return true;
    // LIVE ist die finale Freigabe. Zurücksetzen wird im Desktop-CRM mit der
    // dazugehörigen Provisionskorrektur abgewickelt.
    if (currentKey === "live") return false;
    if (currentKey === "open") return ["open", "inprogress"].includes(nextKey);
    if (currentKey === "inprogress") return ["open", "inprogress", "pending"].includes(nextKey);
    if (currentKey === "pending") return ["open", "inprogress", "pending"].includes(nextKey) || (nextKey === "live" && isAdmin());
    return false;
  }
  function statusWorkflowHint(provider) {
    const currentKey = statusKey(provider?.status);
    if (!canManageProvider(provider)) return "Nur Leserechte";
    if (currentKey === "live") return "LIVE ist final – Rücksetzung im Desktop-CRM.";
    if (currentKey === "closed") return "Abgeschlossen";
    if (!isAdmin()) return "LIVE nur durch Admin";
    return "Wird sofort gespeichert";
  }
  function statusWorkflowMarkup(provider) {
    const currentKey = statusKey(provider.status);
    if (currentKey === "closed") return `<section class="pwa-status-workflow-card pwa-status-workflow-closed"><div class="pwa-status-field"><span>Status</span><output class="pwa-status-static">${escapeHtml(statusLabel(provider.status))}</output></div><p class="pwa-status-workflow-hint">${escapeHtml(statusWorkflowHint(provider))}</p></section>`;
    const options = PROVIDER_STATUS_FLOW.map((entry) => {
      const selected = entry.key === currentKey;
      const allowed = selected || canChangeProviderStatus(provider, entry.key);
      return `<option value="${entry.key}" ${selected ? "selected" : ""} ${allowed ? "" : "disabled"}>${entry.label}</option>`;
    }).join("");
    const canSelect = PROVIDER_STATUS_FLOW.some((entry) => entry.key !== currentKey && canChangeProviderStatus(provider, entry.key));
    return `<section class="pwa-status-workflow-card pwa-status-workflow-${currentKey}"><label class="pwa-status-field"><span>Status</span><select data-status-select aria-label="Anbieterstatus" ${canSelect ? "" : "disabled"}>${options}</select></label><p class="pwa-status-workflow-hint">${escapeHtml(statusWorkflowHint(provider))}</p></section>`;
  }
  function statusChangedByCurrentUser(provider) {
    const currentUserId = userId();
    if (!currentUserId) return false;
    return (Array.isArray(provider?.statusHistory) ? provider.statusHistory : []).some((entry) => {
      const actorId = String(entry?.byUserId || entry?.by_user_id || "").trim();
      const fromStatus = canonicalStatus(entry?.fromStatus || entry?.from_status || "");
      const toStatus = canonicalStatus(entry?.toStatus || entry?.to_status || "");
      return actorId === currentUserId && Boolean(toStatus) && fromStatus !== toStatus;
    });
  }
  function activeProviders() { return state.providers.filter((provider) => statusKey(provider.status) === "inprogress" && statusChangedByCurrentUser(provider)); }
  function changedStatusProviders() { return state.providers.filter((provider) => statusChangedByCurrentUser(provider)); }
  function isMyOpenProvider(provider) {
    const id = userId();
    if (!id || !["inprogress", "pending"].includes(statusKey(provider?.status))) return false;
    return [provider?.inProgressByUserId, provider?.responsibleUserId, provider?.liveRequestedByUserId].some((value) => String(value || "").trim() === id);
  }
  function myOpenProviders() { return state.providers.filter(isMyOpenProvider); }
  function recentlyEditedProviders() {
    const id = userId();
    return state.providers
      .filter((provider) => String(provider.updatedByUserId || provider.createdByUserId || "").trim() === id)
      .sort((left, right) => Date.parse(right.updatedAt || right.createdAt || "") - Date.parse(left.updatedAt || left.createdAt || ""))
      .slice(0, 3);
  }
  function isMyCoverageProvider(provider) {
    const id = userId();
    if (!id || provider?.competitor || statusKey(provider?.status) === "closed") return false;
    return [provider?.createdByUserId, provider?.responsibleUserId, provider?.inProgressByUserId, provider?.liveRequestedByUserId, provider?.provisionUserId]
      .some((value) => String(value || "").trim() === id);
  }
  function providerCoverageEntries(provider) {
    const locations = Array.isArray(provider?.locations) ? provider.locations : [];
    const country = String(provider?.coverageCountry || provider?.country || locations[0]?.country || "").trim();
    const selectedStates = Array.isArray(provider?.coverageStates) ? provider.coverageStates : [];
    const locationStates = locations.map((location) => String(location?.state || "").trim()).filter(Boolean);
    const states = provider?.coverageMode === "bigPlayer"
      ? (selectedStates.length ? selectedStates : (COVERAGE_STATES_BY_COUNTRY[normalizeComparable(country)] || locationStates))
      : locationStates;
    const seen = new Set();
    return states.map((stateLabel) => String(stateLabel || "").trim()).filter((stateLabel) => {
      const key = `${normalizeComparable(country)}|${normalizeComparable(stateLabel)}`;
      if (!stateLabel || seen.has(key)) return false;
      seen.add(key); return true;
    }).map((stateLabel) => ({ key: `${normalizeComparable(country)}|${normalizeComparable(stateLabel)}`, state: stateLabel, country }));
  }
  function coverageStateOptions(providers) {
    const entries = new Map();
    providers.forEach((provider) => providerCoverageEntries(provider).forEach((entry) => entries.set(entry.key, entry)));
    const values = Array.from(entries.values()).sort((left, right) => left.state.localeCompare(right.state, "de") || left.country.localeCompare(right.country, "de"));
    return values.map((entry) => ({ ...entry, label: entry.state }));
  }
  function providerCategoryNames(provider) {
    const topicCategories = new Map();
    state.categories.forEach((category) => category.subcategories.forEach((subcategory) => subcategory.topics.forEach((topic) => {
      topicCategories.set(String(topic.id || "").trim(), String(category.name || "Kategorie").trim() || "Kategorie");
    })));
    const categories = new Set((Array.isArray(provider?.topicIds) ? provider.topicIds : [])
      .map((topicId) => topicCategories.get(String(topicId || "").trim())).filter(Boolean));
    if (!categories.size) categories.add("Ohne Kategorie");
    return categories;
  }
  function coverageProviders() {
    return appCountryProviders().filter(isSuperAdmin()
      ? (provider) => !provider?.competitor && statusKey(provider?.status) !== "closed"
      : isMyCoverageProvider);
  }
  function coverageCategoryStats(providers) {
    const stats = new Map();
    providers.forEach((provider) => {
      providerCategoryNames(provider).forEach((name) => {
        const entry = stats.get(name) || { name, total: 0, dashboard: 0 };
        entry.total += 1;
        if (provider.dashboardCreated) entry.dashboard += 1;
        stats.set(name, entry);
      });
    });
    return Array.from(stats.values())
      .map((entry) => ({ ...entry, rate: entry.total ? Math.round((entry.dashboard / entry.total) * 100) : 0 }))
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, "de"));
  }
  function getProvider(id) { return state.providers.find((provider) => provider.id === id) || null; }
  function personalEmployeeMessages() {
    const currentUserId = userId();
    return currentUserId ? state.employeeMessages.filter((entry) => {
      const notificationId = `employee_message_${entry.id}`;
      const dismissed = state.dismissedNotificationIds.has(notificationId) || state.dismissedNotificationIds.has(`${currentUserId}::${notificationId}`);
      return entry.recipientUserIds.includes(currentUserId) && !dismissed && !state.readEmployeeMessageIds.has(entry.id);
    }) : [];
  }
  function unreadEmployeeMessages() {
    return personalEmployeeMessages();
  }
  function roleCanSeeHelpTopic(topic) {
    if (isAdmin()) return true;
    const roles = Array.isArray(topic?.roles) ? topic.roles : [];
    return !roles.length || roles.includes(normalize(state.profile?.role));
  }
  function countryCanSeeHelpTopic(topic) {
    const countries = Array.isArray(topic?.countries) ? topic.countries : ["all"];
    if (countries.some((country) => normalizeComparable(country) === "all" || normalizeComparable(country) === "alle")) return true;
    // Die PWA besitzt keinen eigenen Länderwechsel; sie nutzt die im CRM gesetzte Plattform-Länderauswahl.
    const configuredCountry = String(state.appPlatformCountry || "").trim();
    return !configuredCountry || normalizeComparable(configuredCountry) === "all" || countries.some((country) => normalizeComparable(country) === normalizeComparable(configuredCountry));
  }
  function visibleHelpTopics() {
    return state.helpCenter.topics.filter((topic) => topic.status === "active" && roleCanSeeHelpTopic(topic) && countryCanSeeHelpTopic(topic));
  }

  function showToast(message, tone = "") {
    window.clearTimeout(toastTimer);
    TOAST.textContent = message;
    TOAST.className = `pwa-toast ${tone}`.trim();
    toastTimer = window.setTimeout(() => TOAST.classList.add("hidden"), 5000);
  }
  function setBusy(button, busy, label = "Speichert …") {
    if (!button) return;
    button.disabled = busy;
    if (busy) { button.dataset.originalLabel = button.textContent; button.textContent = label; }
    else if (button.dataset.originalLabel) button.textContent = button.dataset.originalLabel;
  }

  function normalizeTopicIds(value) {
    let items = [];
    if (Array.isArray(value)) items = value;
    else if (value instanceof Set) items = Array.from(value);
    else if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return [];
      try { const parsed = JSON.parse(raw); items = Array.isArray(parsed) ? parsed : [raw]; }
      catch (_error) { items = raw.split(/[,;|\n]/); }
    } else if (value && typeof value === "object") {
      if (Array.isArray(value.topicIds)) items = value.topicIds;
      else if (Array.isArray(value.topic_ids)) items = value.topic_ids;
      else if (Array.isArray(value.ids)) items = value.ids;
    }
    return Array.from(new Set(items.map((item) => String(item && typeof item === "object" ? item.id ?? item.topicId ?? item.topic_id ?? "" : item || "").trim()).filter(Boolean)));
  }

  function stablePersistenceFingerprint(value) {
    if (Array.isArray(value)) return `[${value.map((entry) => stablePersistenceFingerprint(entry)).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stablePersistenceFingerprint(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value ?? null);
  }

  function providerPersistenceFingerprint(payload) {
    const comparable = { ...(payload && typeof payload === "object" ? payload : {}) };
    [
      "invitationRequestStatus", "invitation_request_status",
      "invitationRequestedAt", "invitation_requested_at",
      "invitationRequestedByUserId", "invitation_requested_by_user_id",
      "invitationRequestedByName", "invitation_requested_by_name",
      "invitationRequestedByRole", "invitation_requested_by_role",
      "invitationInProgressAt", "invitation_in_progress_at",
      "invitationInProgressByUserId", "invitation_in_progress_by_user_id",
      "invitationInProgressByName", "invitation_in_progress_by_name",
      "invitationInProgressByRole", "invitation_in_progress_by_role",
      "invitationCompletedAt", "invitation_completed_at",
      "invitationCompletedByUserId", "invitation_completed_by_user_id",
      "invitationCompletedByName", "invitation_completed_by_name",
      "invitationCompletedByRole", "invitation_completed_by_role",
    ].forEach((key) => delete comparable[key]);
    return stablePersistenceFingerprint(comparable);
  }

  function normalizeRow(row) {
    const payload = row?.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload : {};
    const locations = Array.isArray(row?.locations) && row.locations.length ? row.locations : Array.isArray(payload.locations) ? payload.locations : [];
    const firstLocation = locations[0] || {};
    return {
      ...payload,
      id: String(row?.id || payload.id || "").trim(),
      name: String(row?.name ?? payload.name ?? "").trim(),
      status: canonicalStatus(row?.status ?? payload.status ?? "offen"),
      website: String(row?.website ?? payload.website ?? "").trim(),
      email: String(row?.email ?? payload.email ?? "").trim(),
      phone: String(row?.phone ?? payload.phone ?? "").trim(),
      address: String(row?.address ?? payload.address ?? firstLocation.address ?? "").trim(),
      postalCode: String(row?.postal_code ?? payload.postalCode ?? firstLocation.postalCode ?? "").trim(),
      city: String(row?.city ?? payload.city ?? firstLocation.city ?? "").trim(),
      state: String(row?.state ?? payload.state ?? firstLocation.state ?? "").trim(),
      country: String(row?.country ?? payload.country ?? firstLocation.country ?? "").trim(),
      contactSalutation: String(row?.contact_salutation ?? payload.contactSalutation ?? "").trim(),
      contactTitle: String(row?.contact_title ?? payload.contactTitle ?? "").trim(),
      contactFirstName: String(row?.contact_first_name ?? payload.contactFirstName ?? "").trim(),
      contactLastName: String(row?.contact_last_name ?? payload.contactLastName ?? "").trim(),
      contactPersonPhone: String(row?.contact_person_phone ?? payload.contactPersonPhone ?? "").trim(),
      contactPersonEmail: String(row?.contact_person_email ?? payload.contactPersonEmail ?? "").trim(),
      competitorName: String(payload.competitorName ?? payload.competitor_name ?? "").trim(),
      adminOnly: parseFlag(row?.admin_only ?? payload.adminOnly ?? payload.admin_only),
      dashboardCreated: (() => {
        // Ältere Migrationen konnten die flache Spalte noch nicht befüllt
        // haben. Der JSON-Payload ist bis zum korrigierenden Write daher die
        // verlässlichere Quelle und darf nicht still mit false überschrieben werden.
        const raw = payload.dashboardCreated ?? payload.dashboard_created ?? row?.dashboard_created;
        return raw === undefined || raw === null ? ["angelegt", "erstellt", "created"].includes(normalize(row?.status ?? payload.status)) : parseFlag(raw);
      })(),
      competitor: (() => {
        const raw = payload.competitor ?? payload.isCompetitor ?? payload.competitor_flag;
        const name = String(payload.competitorName ?? payload.competitor_name ?? "").trim();
        return raw === undefined || raw === null ? Boolean(name) : parseFlag(raw);
      })(),
      onlineOnly: Boolean(row?.online_only ?? payload.onlineOnly),
      topicIds: normalizeTopicIds(row?.topic_ids ?? row?.topicIds ?? payload.topicIds ?? payload.topic_ids),
      latitude: row?.latitude ?? payload.latitude ?? firstLocation.latitude ?? null,
      longitude: row?.longitude ?? payload.longitude ?? firstLocation.longitude ?? null,
      locations: locations.length ? locations : [{ address: firstLocation.address || "", postalCode: firstLocation.postalCode || "", city: firstLocation.city || "", state: firstLocation.state || "", country: firstLocation.country || "" }],
      coverageMode: String(row?.coverage_mode ?? payload.coverageMode ?? payload.coverage_mode ?? "locations").trim() || "locations",
      coverageCountry: String(row?.coverage_country ?? payload.coverageCountry ?? payload.coverage_country ?? "").trim(),
      coverageStates: Array.isArray(row?.coverage_states) ? row.coverage_states : Array.isArray(payload.coverageStates) ? payload.coverageStates : [],
      createdAt: String(row?.source_created_at ?? payload.createdAt ?? "").trim(),
      createdByName: String(row?.created_by_name ?? payload.createdByName ?? "").trim(),
      createdByRole: String(row?.created_by_role ?? payload.createdByRole ?? "").trim(),
      createdByUserId: String(row?.created_by_user_id ?? payload.createdByUserId ?? "").trim(),
      updatedAt: String(row?.source_updated_at ?? payload.updatedAt ?? "").trim(),
      updatedByName: String(row?.updated_by_name ?? payload.updatedByName ?? "").trim(),
      updatedByRole: String(row?.updated_by_role ?? payload.updatedByRole ?? "").trim(),
      updatedByUserId: String(row?.updated_by_user_id ?? payload.updatedByUserId ?? "").trim(),
      responsibleUserId: String(row?.responsible_user_id ?? payload.responsibleUserId ?? "").trim(),
      responsibleName: String(row?.responsible_name ?? payload.responsibleName ?? "").trim(),
      responsibleRole: String(row?.responsible_role ?? payload.responsibleRole ?? "").trim(),
      inProgressByUserId: String(row?.in_progress_by_user_id ?? payload.inProgressByUserId ?? "").trim(),
      inProgressByName: String(row?.in_progress_by_name ?? payload.inProgressByName ?? "").trim(),
      inProgressByRole: String(row?.in_progress_by_role ?? payload.inProgressByRole ?? "").trim(),
      inProgressAt: String(row?.in_progress_at ?? payload.inProgressAt ?? "").trim(),
      invitationRequestStatus: String(payload.invitationRequestStatus ?? payload.invitation_request_status ?? row?.invitation_request_status ?? "").trim(),
      invitationRequestedAt: String(payload.invitationRequestedAt ?? payload.invitation_requested_at ?? row?.invitation_requested_at ?? "").trim(),
      invitationRequestedByUserId: String(payload.invitationRequestedByUserId ?? payload.invitation_requested_by_user_id ?? row?.invitation_requested_by_user_id ?? "").trim(),
      invitationRequestedByName: String(payload.invitationRequestedByName ?? payload.invitation_requested_by_name ?? row?.invitation_requested_by_name ?? "").trim(),
      invitationRequestedByRole: String(payload.invitationRequestedByRole ?? payload.invitation_requested_by_role ?? row?.invitation_requested_by_role ?? "").trim(),
      invitationCompletedAt: String(payload.invitationCompletedAt ?? payload.invitation_completed_at ?? row?.invitation_completed_at ?? "").trim(),
      invitationCompletedByName: String(payload.invitationCompletedByName ?? payload.invitation_completed_by_name ?? row?.invitation_completed_by_name ?? "").trim(),
      liveRequestedAt: String(row?.live_requested_at ?? payload.liveRequestedAt ?? "").trim(),
      liveRequestedByUserId: String(row?.live_requested_by_user_id ?? payload.liveRequestedByUserId ?? "").trim(),
      liveRequestedByName: String(row?.live_requested_by_name ?? payload.liveRequestedByName ?? "").trim(),
      liveRequestedByRole: String(row?.live_requested_by_role ?? payload.liveRequestedByRole ?? "").trim(),
      liveAt: String(row?.live_at ?? payload.liveAt ?? "").trim(),
      liveByUserId: String(row?.live_by_user_id ?? payload.liveByUserId ?? "").trim(),
      liveByName: String(row?.live_by_name ?? payload.liveByName ?? "").trim(),
      liveByRole: String(row?.live_by_role ?? payload.liveByRole ?? "").trim(),
      provisionUserId: String(row?.provision_user_id ?? payload.provisionUserId ?? "").trim(),
      provisionUserName: String(row?.provision_user_name ?? payload.provisionUserName ?? "").trim(),
      provisionUserRole: String(row?.provision_user_role ?? payload.provisionUserRole ?? "").trim(),
      provisionAssignedAt: String(row?.provision_assigned_at ?? payload.provisionAssignedAt ?? "").trim(),
      statusHistory: Array.isArray(row?.status_history) ? row.status_history : Array.isArray(payload.statusHistory) ? payload.statusHistory : [],
    };
  }

  function providerValues(provider) {
    return {
      name: provider.name, website: provider.website, email: provider.email, phone: provider.phone, address: provider.address, latitude: provider.latitude ?? "", longitude: provider.longitude ?? "",
      postalCode: provider.postalCode, city: provider.city, state: provider.state, country: provider.country,
      additionalLocations: (provider.locations || []).slice(1).map((location) => ({ address: location.address || "", postalCode: location.postalCode || "", city: location.city || "", state: location.state || "", country: location.country || "", latitude: location.latitude ?? null, longitude: location.longitude ?? null })),
      contactSalutation: provider.contactSalutation, contactTitle: provider.contactTitle, contactFirstName: provider.contactFirstName,
      contactLastName: provider.contactLastName, contactPersonPhone: provider.contactPersonPhone, contactPersonEmail: provider.contactPersonEmail,
      adminOnly: provider.adminOnly, dashboardCreated: provider.dashboardCreated, competitor: provider.competitor, competitorName: provider.competitorName,
      onlineOnly: provider.onlineOnly, coverageMode: provider.coverageMode || "locations", coverageCountry: provider.coverageCountry || "", coverageStates: provider.coverageStates || [], topicIds: normalizeTopicIds(provider.topicIds),
    };
  }
  function contactName(values) { return [values.contactSalutation, values.contactTitle, values.contactFirstName, values.contactLastName].filter(Boolean).join(" "); }
  function parseAdditionalLocations(value) {
    return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [address = "", postalCode = "", city = "", stateName = "", country = ""] = line.split("|").map((part) => part.trim());
      return { address, postalCode, city, state: stateName, country, latitude: null, longitude: null };
    });
  }
  function statusHistory(provider, nextStatus, timestamp) {
    return [...(Array.isArray(provider.statusHistory) ? provider.statusHistory : []), {
      id: createId("pst"), fromStatus: canonicalStatus(provider.status), toStatus: nextStatus, at: timestamp,
      byUserId: userId(), byName: displayName(), byRole: normalize(state.profile.role), source: "vertrieb_pwa",
    }];
  }
  function buildProviderRow(provider) {
    const latitude = optionalNumber(provider.latitude);
    const longitude = optionalNumber(provider.longitude);
    const coverageMode = provider.coverageMode === "bigPlayer" ? "bigPlayer" : "locations";
    const coverageCountry = coverageMode === "bigPlayer" ? String(provider.coverageCountry || provider.country || "").trim() : String(provider.country || "").trim();
    const coverageStates = coverageMode === "bigPlayer" && Array.isArray(provider.coverageStates) ? provider.coverageStates.filter(Boolean) : [];
    const location = { address: provider.address, postalCode: provider.postalCode, city: provider.city, state: provider.state, country: provider.country, latitude, longitude };
    const additionalLocations = Array.isArray(provider.additionalLocations)
      ? provider.additionalLocations
      : Array.isArray(provider.locations)
        ? provider.locations.slice(1)
        : parseAdditionalLocations(provider.additionalLocationsText);
    const locations = [location, ...additionalLocations.map((entry) => ({
      address: String(entry?.address || "").trim(), postalCode: String(entry?.postalCode || "").trim(), city: String(entry?.city || "").trim(), state: String(entry?.state || "").trim(), country: String(entry?.country || "").trim(),
      latitude: optionalNumber(entry?.latitude), longitude: optionalNumber(entry?.longitude),
    }))];
    const payload = {
      ...provider, coverageMode, coverage_mode: coverageMode, coverageCountry, coverage_country: coverageCountry, coverageStates, coverage_states: coverageStates, locations,
      contactPerson: contactName(provider), contact_person: contactName(provider), contact_person_phone: provider.contactPersonPhone,
      contact_person_email: provider.contactPersonEmail, topicIds: provider.topicIds || [], topic_ids: provider.topicIds || [],
      adminOnly: Boolean(provider.adminOnly), admin_only: Boolean(provider.adminOnly), dashboardCreated: Boolean(provider.dashboardCreated), dashboard_created: Boolean(provider.dashboardCreated),
      competitor: Boolean(provider.competitor), isCompetitor: Boolean(provider.competitor), competitorName: provider.competitor ? String(provider.competitorName || "").trim() : "", competitor_name: provider.competitor ? String(provider.competitorName || "").trim() : "",
      onlineOnly: Boolean(provider.onlineOnly), online_only: Boolean(provider.onlineOnly), latitude, longitude,
    };
    return {
      id: provider.id, payload, name: provider.name, status: provider.status, address: provider.address, postal_code: provider.postalCode,
      city: provider.city, state: provider.state, country: provider.country, website: provider.website, email: provider.email, phone: provider.phone,
      contact_salutation: provider.contactSalutation, contact_title: provider.contactTitle, contact_first_name: provider.contactFirstName,
      contact_last_name: provider.contactLastName, contact_person: contactName(provider), contact_person_phone: provider.contactPersonPhone,
      contact_person_email: provider.contactPersonEmail, admin_only: Boolean(provider.adminOnly), online_only: Boolean(provider.onlineOnly), topic_ids: provider.topicIds || [], locations,
      coverage_mode: coverageMode, coverage_country: coverageCountry, coverage_states: coverageStates, latitude, longitude, status_history: provider.statusHistory || [],
      source_created_at: provider.createdAt, created_by_name: provider.createdByName, created_by_role: provider.createdByRole,
      created_by_user_id: provider.createdByUserId, source_updated_at: provider.updatedAt, updated_by_name: provider.updatedByName,
      updated_by_role: provider.updatedByRole, updated_by_user_id: provider.updatedByUserId, responsible_user_id: provider.responsibleUserId || "",
      responsible_name: provider.responsibleName || "", responsible_role: provider.responsibleRole || "", in_progress_by_user_id: provider.inProgressByUserId || "",
      in_progress_by_name: provider.inProgressByName || "", in_progress_by_role: provider.inProgressByRole || "", in_progress_at: provider.inProgressAt || "",
      live_requested_at: provider.liveRequestedAt || "", live_requested_by_user_id: provider.liveRequestedByUserId || "",
      live_requested_by_name: provider.liveRequestedByName || "", live_requested_by_role: provider.liveRequestedByRole || "",
      live_at: provider.liveAt || "", live_by_user_id: provider.liveByUserId || "", live_by_name: provider.liveByName || "", live_by_role: provider.liveByRole || "",
      provision_user_id: provider.provisionUserId || "", provision_user_name: provider.provisionUserName || "", provision_user_role: provider.provisionUserRole || "",
      provision_assigned_at: provider.provisionAssignedAt || "",
    };
  }

  async function loadTopics() {
    if (topicsLoadInFlight) return topicsLoadInFlight;
    topicsLoadInFlight = (async () => {
      const { data, error } = await state.client.from(STATE_TABLE).select("payload, updated_at").eq("id", "main").maybeSingle();
      if (error || !data?.payload) return;
      const remoteUpdatedAt = String(data.updated_at || "").trim();
      if (remoteUpdatedAt && topicsRemoteUpdatedAt && remoteUpdatedAt < topicsRemoteUpdatedAt) return;
      const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
      if (!Array.isArray(payload.categories)) return;
      const categories = payload.categories;
      const nextCategories = categories.map((category) => ({
        id: String(category?.id || category?.name || "").trim(),
        name: String(category?.name || "Kategorie").trim(),
        subcategories: (Array.isArray(category?.subcategories) ? category.subcategories : []).map((subcategory) => ({
          id: String(subcategory?.id || subcategory?.name || "").trim(),
          name: String(subcategory?.name || "Themenbereich").trim(),
          topics: (Array.isArray(subcategory?.topics) ? subcategory.topics : []).map((topic) => ({
            id: String(topic?.id || "").trim(), name: String(topic?.name || "Thema").trim(),
          })).filter((topic) => topic.id),
        })).filter((subcategory) => subcategory.topics.length),
      })).filter((category) => category.subcategories.length);
      const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
      state.categories = nextCategories;
      const { data: subtopicRows, error: subtopicError } = await state.client
        .from(TOPIC_SUBTOPICS_TABLE)
        .select("topic_id, name")
        .order("name", { ascending: true });
      if (subtopicError) {
        console.warn("Sub-Themen konnten in der Vertriebs-App nicht geladen werden.", subtopicError);
        state.topicSubtopics = [];
      } else {
        state.topicSubtopics = (Array.isArray(subtopicRows) ? subtopicRows : [])
          .map((row) => ({ topicId: String(row?.topic_id || "").trim(), name: String(row?.name || "").trim() }))
          .filter((entry) => entry.topicId && entry.name);
      }
      topicsRemoteUpdatedAt = remoteUpdatedAt || topicsRemoteUpdatedAt;
      state.appPlatformCountry = String(settings.platformCountryFilter || "").trim();
      state.employeeMessages = normalizeEmployeeMessages(settings.secretaryEmployeeMessages);
      const { data: topicRows, error: topicError } = await state.client.from(TOPIC_REQUESTS_TABLE).select("*").order("requested_at", { ascending: false });
      if (topicError) throw topicError;
      state.topicRequests = (Array.isArray(topicRows) ? topicRows : []).map((row) => ({
        id: String(row?.id || "").trim(), topic: String(row?.topic || "").trim(), note: String(row?.note || "").trim(), providerName: String(row?.provider_name || "").trim(), requestedByName: String(row?.requested_by_name || "").trim(), requestedByUserId: String(row?.requested_by_user_id || "").trim(), createdAt: String(row?.requested_at || row?.created_at || "").trim(), status: String(row?.status || "open").trim(), resolvedTopicName: String(row?.resolved_topic_name || "").trim(),
      })).filter((entry) => entry.id && entry.topic);
      state.dismissedNotificationIds = new Set(
        Object.entries(settings.adminNotificationDismissedById && typeof settings.adminNotificationDismissedById === "object" ? settings.adminNotificationDismissedById : {})
          .filter(([, dismissed]) => dismissed === true || normalize(dismissed) === "true" || normalize(dismissed) === "1")
          .map(([notificationId]) => String(notificationId || "").trim()).filter(Boolean)
      );
      state.helpCenter = await resolveHelpCenterVimeoLinks(normalizeHelpCenter(settings.helpCenter));
    })();
    try {
      return await topicsLoadInFlight;
    } finally {
      topicsLoadInFlight = null;
    }
  }

  function normalizeEmployeeMessages(messagesLike) {
    const seenIds = new Set();
    return (Array.isArray(messagesLike) ? messagesLike : [])
      .map((entry) => {
        const id = String(entry?.id || "").trim().slice(0, 180);
        const body = String(entry?.body || entry?.message || "").trim().slice(0, 800);
        const recipientUserIds = Array.from(new Set(
          (Array.isArray(entry?.recipientUserIds) ? entry.recipientUserIds : entry?.recipientUserId ? [entry.recipientUserId] : [])
            .map((recipientId) => String(recipientId || "").trim()).filter(Boolean)
        ));
        const sentAtMs = Date.parse(String(entry?.sentAt || entry?.createdAt || ""));
        if (!id || !body || !recipientUserIds.length || !Number.isFinite(sentAtMs) || seenIds.has(id)) return null;
        seenIds.add(id);
        return {
          id,
          body,
          recipientUserIds,
          sentAt: new Date(sentAtMs).toISOString(),
          sentByName: String(entry?.sentByName || entry?.createdByName || "Superadmin").trim().slice(0, 180) || "Superadmin",
        };
      })
      .filter(Boolean)
      .sort((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt));
  }

  function normalizeHelpVideo(videoLike, index = 0) {
    const url = safeHttpsUrl(videoLike?.url);
    if (!url) return null;
    const id = String(videoLike?.id || `help_video_${index + 1}`).trim().slice(0, 180);
    return id ? {
      id,
      title: String(videoLike?.title || `Video ${index + 1}`).trim().slice(0, 120) || `Video ${index + 1}`,
      url,
      sortOrder: Math.max(1, Math.floor(Number(videoLike?.sortOrder)) || index + 1),
    } : null;
  }

  function normalizeHelpCenter(helpCenterLike) {
    const source = helpCenterLike && typeof helpCenterLike === "object" ? helpCenterLike : {};
    const startVideo = normalizeHelpVideo({ ...source.startVideo, id: "help_start_video" }, 0);
    const onboardingVideos = (Array.isArray(source.onboardingVideos) ? source.onboardingVideos : [])
      .map(normalizeHelpVideo).filter(Boolean)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const seenTopicIds = new Set();
    const topics = (Array.isArray(source.topics) ? source.topics : [])
      .map((topic, index) => {
        const id = String(topic?.id || "").trim().slice(0, 180);
        const title = String(topic?.title || "").trim().slice(0, 120);
        const summary = String(topic?.summary || "").trim().slice(0, 260);
        const content = String(topic?.content || "").trim().slice(0, 120000);
        if (!id || !title || !summary || !content || seenTopicIds.has(id)) return null;
        seenTopicIds.add(id);
        return {
          id, title, summary, content,
          videoUrl: safeHttpsUrl(topic?.videoUrl),
          roles: (Array.isArray(topic?.roles) ? topic.roles : []).map(normalize).filter(Boolean),
          countries: (Array.isArray(topic?.countries) ? topic.countries : ["all"]).map((country) => String(country || "").trim()).filter(Boolean),
          status: normalize(topic?.status || "active"),
          required: Boolean(topic?.required),
          sortOrder: Math.max(1, Math.floor(Number(topic?.sortOrder)) || index + 1),
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title, "de"));
    return {
      startVideo,
      onboardingVideos,
      privacyNoticeUrl: safeHttpsUrl(source.privacyNoticeUrl),
      supportEmail: String(source.supportEmail || "").trim().slice(0, 180),
      topics,
    };
  }

  function getVimeoVideoParts(value) {
    try {
      const parsed = new URL(safeHttpsUrl(value));
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      let id = "";
      let hash = String(parsed.searchParams.get("h") || "").trim();
      if (host === "player.vimeo.com") {
        id = pathParts[0] === "video" && /^\d+$/.test(pathParts[1] || "") ? pathParts[1] : "";
      } else if (host === "vimeo.com") {
        if (/^\d+$/.test(pathParts[0] || "")) {
          id = pathParts[0];
          if (!hash && /^[a-f0-9]{6,64}$/i.test(pathParts[1] || "")) hash = pathParts[1];
        } else {
          const videoIndex = pathParts.findIndex((part) => part === "video" || part === "videos");
          const candidate = videoIndex >= 0 ? pathParts[videoIndex + 1] : "";
          id = /^\d+$/.test(candidate || "") ? candidate : "";
        }
      }
      if (!/^\d{2,20}$/.test(id)) return null;
      return { id, hash: /^[a-f0-9]{6,64}$/i.test(hash) ? hash : "" };
    } catch (_error) { return null; }
  }

  function createVimeoEmbedUrl(parts) {
    if (!parts?.id) return "";
    const params = new URLSearchParams({ api: "1", dnt: "1" });
    if (parts.hash) params.set("h", parts.hash);
    return `https://player.vimeo.com/video/${parts.id}?${params.toString()}`;
  }

  function isVimeoResolvableUrl(value) {
    try {
      const parsed = new URL(safeHttpsUrl(value));
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      return host === "vimeo.com" && (
        /^\/share\/[0-9a-f-]{20,80}\/?$/i.test(parsed.pathname) ||
        /^\/reviews\/[0-9a-f-]{20,80}\/videos\/\d+\/?$/i.test(parsed.pathname)
      );
    } catch (_error) { return false; }
  }

  async function resolveVimeoUrl(value) {
    const url = safeHttpsUrl(value);
    if (!url || !isVimeoResolvableUrl(url)) return url;
    try {
      const response = await fetch("/api/help-videos/resolve-vimeo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json().catch(() => null);
      return response.ok && safeHttpsUrl(payload?.embedUrl) ? safeHttpsUrl(payload.embedUrl) : url;
    } catch (_error) { return url; }
  }

  async function resolveHelpCenterVimeoLinks(helpCenter) {
    const source = helpCenter && typeof helpCenter === "object" ? helpCenter : {};
    const resolveVideo = async (video) => video?.url ? { ...video, url: await resolveVimeoUrl(video.url) } : video;
    const [startVideo, onboardingVideos, topics] = await Promise.all([
      resolveVideo(source.startVideo),
      Promise.all((source.onboardingVideos || []).map(resolveVideo)),
      Promise.all((source.topics || []).map(async (topic) => topic?.videoUrl ? { ...topic, videoUrl: await resolveVimeoUrl(topic.videoUrl) } : topic)),
    ]);
    return { ...source, startVideo, onboardingVideos, topics };
  }

  async function loadEmployeeMessageReadReceipts() {
    const currentUserId = userId();
    if (!currentUserId) { state.readEmployeeMessageIds = new Set(); return; }
    const { data, error } = await state.client
      .from(CONTENT_READ_RECEIPTS_TABLE)
      .select("content_id")
      .eq("content_type", "employee_message")
      .eq("content_version", 1)
      .eq("reader_user_id", currentUserId);
    if (error) return;
    state.readEmployeeMessageIds = new Set((data || []).map((entry) => String(entry?.content_id || "").trim()).filter(Boolean));
  }
  async function loadProviders() {
    const { data, error } = await state.client.from(PROVIDERS_TABLE).select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    state.providers = (data || []).map(normalizeRow).filter((provider) => provider.id);
  }
  async function saveProvider(provider) {
    const row = buildProviderRow(provider);
    const { data: writtenRows, error } = await state.client
      .from(PROVIDERS_TABLE)
      .upsert(row, { onConflict: "id" })
      .select("*");
    if (error) throw error;
    if (!Array.isArray(writtenRows) || !writtenRows.some((entry) => String(entry?.id || "").trim() === String(row.id || "").trim())) {
      throw new Error("Anbieter-Speicherung wurde vom Server nicht bestätigt.");
    }
    // Ein separater Read entspricht einem Neuladen der App. Nur dieser Stand
    // darf als Erfolg gelten; RLS-Noops und Trigger-Anpassungen werden so
    // sichtbar statt lokal still weitergeführt.
    const { data: verifiedRow, error: verifyError } = await state.client
      .from(PROVIDERS_TABLE)
      .select("*")
      .eq("id", row.id)
      .maybeSingle();
    if (verifyError) throw verifyError;
    if (!verifiedRow) throw new Error("Anbieter ist nach dem Speichern nicht erneut ladbar.");
    if (providerPersistenceFingerprint(verifiedRow.payload) !== providerPersistenceFingerprint(row.payload)) {
      throw new Error("Anbieter wurde nicht vollständig gespeichert. Bitte erneut laden und Änderungen prüfen.");
    }
    const normalized = normalizeRow(verifiedRow);
    state.providers = [normalized, ...state.providers.filter((entry) => entry.id !== normalized.id)];
    return normalized;
  }
  async function claimRegistry(provider) {
    const signature = buildProviderDedupSignature(provider);
    const uniqueKey = signature?.key || "";
    if (!uniqueKey || uniqueKey.includes("name||")) return;
    const { error } = await state.client.from("provider_registry").upsert({ provider_id: provider.id, unique_key: uniqueKey, provider_name: provider.name, coverage_mode: signature.mode, country: signature.country, claimed_by_user_id: userId(), updated_at: nowIso() }, { onConflict: "provider_id" });
    if (!error) return { ok: true };
    const message = String(error.message || "").toLowerCase();
    if (String(error.code || "") === "23505" || message.includes("duplicate key value")) return { ok: false, duplicate: true };
    if ((message.includes("provider_registry") && message.includes("does not exist")) || message.includes("permission denied") || message.includes("row-level security")) return { ok: true, degraded: true };
    return { ok: false, error };
  }

  function buildProviderDedupSignature(provider) {
    if (!provider || !normalizeDedupPart(provider.name)) return null;
    const normalizedName = normalizeDedupPart(provider.name);
    const mode = provider.coverageMode === "bigPlayer" ? "bigPlayer" : "locations";
    if (mode === "bigPlayer") {
      const countryRaw = String(provider.coverageCountry || provider.country || "").trim();
      const country = normalizeDedupPart(countryRaw);
      return {
        mode, normalizedName, country, key: `name|${normalizedName}|${country || "__all__"}`,
        locationKey: `big|${normalizedName}|${country}`,
        locationLabel: countryRaw || "ohne Land",
      };
    }
    // Die flachen Felder sind auch im Desktop die kanonische Hauptadresse; so werden Bearbeitungen sofort geprüft.
    const primary = provider;
    const countryRaw = String(primary?.country || provider.country || "").trim();
    const stateRaw = String(primary?.state || provider.state || "").trim();
    const cityRaw = String(primary?.city || provider.city || "").trim();
    const postalRaw = String(primary?.postalCode || provider.postalCode || "").trim();
    const addressRaw = String(primary?.address || provider.address || "").trim();
    const country = normalizeDedupPart(countryRaw);
    return {
      mode, normalizedName, country, key: `name|${normalizedName}|${country || "__all__"}`,
      locationKey: `loc|${normalizedName}|${country}|${normalizeDedupPart(stateRaw)}|${normalizeDedupPart(cityRaw)}|${normalizeDedupPart(postalRaw)}|${normalizeDedupPart(addressRaw)}`,
      locationLabel: [addressRaw, postalRaw, cityRaw, stateRaw, countryRaw].filter(Boolean).join(", "),
    };
  }
  function namesLookSimilar(left, right) {
    const a = String(left || "").trim(); const b = String(right || "").trim();
    return Boolean(a && b && (a === b || (a.length >= 4 && b.includes(a)) || (b.length >= 4 && a.includes(b))));
  }
  async function validateProviderDuplication(provider, providerId = "") {
    const target = buildProviderDedupSignature(provider);
    if (!target?.key) return { ok: true, signature: target };
    const others = state.providers.filter((entry) => entry.id !== String(providerId || "").trim());
    const signatures = others.map((entry) => ({ provider: entry, signature: buildProviderDedupSignature(entry) }));
    const strict = signatures.find((entry) => entry.signature?.key === target.key);
    if (strict) {
      const label = strict.signature.locationLabel || locationLabel(strict.provider);
      showToast(`Doppelter Anbieter: „${strict.provider.name}“ (${label}). Speichern wurde gestoppt.`, "error");
      return { ok: false, signature: target };
    }
    const exactLocation = signatures.find((entry) => entry.signature?.locationKey && entry.signature.locationKey === target.locationKey);
    if (exactLocation) {
      const label = exactLocation.signature.locationLabel || locationLabel(exactLocation.provider);
      showToast(`Doppelter Standort: „${exactLocation.provider.name}“ (${label}). Speichern wurde gestoppt.`, "error");
      return { ok: false, signature: target };
    }
    const similar = signatures
      .filter((entry) => entry.signature?.normalizedName && namesLookSimilar(target.normalizedName, entry.signature.normalizedName))
      .filter((entry) => !target.country || !entry.signature.country || target.country === entry.signature.country)
      .slice(0, 4);
    if (similar.length) {
      const list = similar.map((entry) => `• ${entry.provider.name} (${entry.signature.locationLabel || locationLabel(entry.provider)})`).join("\n");
      if (!window.confirm(`Möglicher Doppelanbieter:\n${list}\n\nTrotzdem speichern?`)) return { ok: false, signature: target };
    }
    return { ok: true, signature: target };
  }

  function parseProviderNoteText(rawValue) {
    const rawText = String(rawValue || "").trim();
    const empty = { text: "", done: false, doneAt: "", doneByUserId: "", doneByName: "", doneByRole: "", task: false, dueDate: "", updatedAt: "", updatedByUserId: "", updatedByName: "", updatedByRole: "" };
    if (!rawText) return empty;
    const match = rawText.match(/^\[(VMMETA@)([^\]]+)\]\s*/i);
    if (!match) return { ...empty, text: rawText };
    let metadata = {};
    try { metadata = JSON.parse(decodeURIComponent(match[2] || "")); } catch (_error) { metadata = {}; }
    return {
      text: rawText.replace(/^\[(VMMETA@)([^\]]+)\]\s*/i, "").trim(),
      done: Boolean(metadata.done), doneAt: String(metadata.doneAt || "").trim(),
      doneByUserId: String(metadata.doneByUserId || "").trim(), doneByName: String(metadata.doneByName || "").trim(), doneByRole: normalizeNoteRole(metadata.doneByRole),
      task: Boolean(metadata.task), dueDate: String(metadata.dueDate || "").trim(),
      updatedAt: String(metadata.updatedAt || "").trim(), updatedByUserId: String(metadata.updatedByUserId || "").trim(), updatedByName: String(metadata.updatedByName || "").trim(), updatedByRole: normalizeNoteRole(metadata.updatedByRole),
    };
  }
  function normalizeProviderNote(row, index = 0) {
    const parsed = parseProviderNoteText(row?.note_text ?? row?.text);
    if (!parsed.text) return null;
    return {
      ...parsed,
      id: String(row?.id || `note_${index}`).trim(),
      providerId: String(row?.provider_id || row?.providerId || "").trim(),
      createdAt: String(row?.created_at || row?.createdAt || "").trim(),
      createdByUserId: String(row?.created_by_user_id || row?.createdByUserId || "").trim(),
      createdByName: String(row?.created_by_name || row?.createdByName || "").trim(),
      createdByRole: normalizeNoteRole(row?.created_by_role || row?.createdByRole),
      updatedAt: parsed.updatedAt || String(row?.updated_at || row?.updatedAt || "").trim(),
    };
  }
  function normalizeProviderNotes(rows) {
    return (Array.isArray(rows) ? rows : []).map(normalizeProviderNote).filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  function toProviderNoteStorageText(note) {
    const text = String(note?.text || "").trim();
    if (!text) return "";
    const metadata = {
      done: Boolean(note.done), doneAt: note.done ? String(note.doneAt || nowIso()) : "", doneByUserId: note.done ? String(note.doneByUserId || "") : "", doneByName: note.done ? String(note.doneByName || "") : "", doneByRole: note.done ? normalizeNoteRole(note.doneByRole) : "",
      task: Boolean(note.task), dueDate: note.task ? String(note.dueDate || "").trim() : "",
      updatedAt: String(note.updatedAt || "").trim(), updatedByUserId: String(note.updatedByUserId || "").trim(), updatedByName: String(note.updatedByName || "").trim(), updatedByRole: normalizeNoteRole(note.updatedByRole),
    };
    return `[${PROVIDER_NOTE_STORAGE_PREFIX}${encodeURIComponent(JSON.stringify(metadata))}] ${text}`;
  }
  function providerNotes(providerId) {
    const id = String(providerId || "").trim(); const provider = getProvider(id);
    const merged = new Map();
    normalizeProviderNotes(provider?.notes || []).forEach((note) => merged.set(note.id || `${note.createdByUserId}|${note.createdAt}|${note.text}`, note));
    normalizeProviderNotes(state.providerNotesById[id] || []).forEach((note) => merged.set(note.id || `${note.createdByUserId}|${note.createdAt}|${note.text}`, note));
    return Array.from(merged.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  async function loadProviderNotes(providerId, force = false) {
    const id = String(providerId || "").trim();
    if (!id || state.providerNotesLoadingById[id] || (!force && state.providerNotesLoadedById[id])) return providerNotes(id);
    state.providerNotesLoadingById[id] = true; state.providerNotesErrorById[id] = "";
    if (["detail", "activity"].includes(state.view) && state.detailId === id) renderView();
    try {
      const { data, error } = await state.client.from(PROVIDER_NOTES_TABLE).select("id, provider_id, note_text, created_by_user_id, created_by_name, created_by_role, created_at, updated_at").eq("provider_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      state.providerNotesById[id] = normalizeProviderNotes(data);
      state.providerNotesLoadedById[id] = true;
      return providerNotes(id);
    } catch (error) {
      const message = String(error?.message || "");
      state.providerNotesErrorById[id] = /provider_notes.*does not exist/i.test(message) ? "Notizen sind in Supabase noch nicht eingerichtet." : "Notizen konnten nicht geladen werden.";
      return providerNotes(id);
    } finally {
      delete state.providerNotesLoadingById[id];
      if (["detail", "activity"].includes(state.view) && state.detailId === id) renderView();
    }
  }

  function mapGooglePlaceToAddress(place) {
    const components = Array.isArray(place?.address_components) ? place.address_components : [];
    const find = (types) => {
      for (const type of types) {
        const component = components.find((entry) => entry?.types?.includes(type));
        if (component?.long_name) return component.long_name;
      }
      return "";
    };
    const street = [find(["route", "premise", "point_of_interest"]), find(["street_number"])].filter(Boolean).join(" ").trim();
    const latitude = typeof place?.geometry?.location?.lat === "function" ? place.geometry.location.lat() : null;
    const longitude = typeof place?.geometry?.location?.lng === "function" ? place.geometry.location.lng() : null;
    return {
      name: String(place?.name || "").trim(), street, postalCode: find(["postal_code"]),
      city: find(["locality", "postal_town", "administrative_area_level_3", "administrative_area_level_2", "sublocality", "sublocality_level_1"]),
      state: find(["administrative_area_level_1", "administrative_area_level_2"]), country: find(["country"]),
      formatted: String(place?.formatted_address || "").trim(), website: String(place?.website || "").trim(),
      phone: String(place?.international_phone_number || place?.formatted_phone_number || "").trim(), latitude, longitude,
    };
  }
  function mapAddressFromDescription(description) {
    const parts = String(description || "").split(",").map((entry) => entry.trim()).filter(Boolean);
    const result = { street: parts[0] || "", postalCode: "", city: "", state: "", country: parts.length > 1 ? parts[parts.length - 1] : "" };
    parts.slice(1, -1).forEach((entry) => {
      const match = entry.match(/\b(\d{4,6})\b\s*(.*)/);
      if (match) { result.postalCode ||= match[1]; result.city ||= String(match[2] || "").trim(); }
      else if (!result.state) result.state = entry;
    });
    return result;
  }
  function mapGoogleSuggestion(prediction) {
    return { placeId: String(prediction?.place_id || ""), mainText: String(prediction?.structured_formatting?.main_text || prediction?.description || ""), secondaryText: String(prediction?.structured_formatting?.secondary_text || ""), description: String(prediction?.description || "") };
  }
  function setupGooglePlaces() {
    if (!window.google?.maps?.places) throw new Error("Google Places ist nicht verfügbar.");
    googleAutocompleteService = new window.google.maps.places.AutocompleteService();
    googlePlacesService = new window.google.maps.places.PlacesService(document.createElement("div"));
    googleSessionToken = new window.google.maps.places.AutocompleteSessionToken();
    googlePlacesReady = true;
  }
  function loadGooglePlaces() {
    if (googlePlacesReady) return Promise.resolve();
    if (googlePlacesLoading) return googlePlacesLoading;
    const apiKey = String(window.APP_CONFIG?.GOOGLE_MAPS_API_KEY || "").trim();
    if (!apiKey) { googlePlacesError = "Google Maps ist nicht konfiguriert."; return Promise.reject(new Error(googlePlacesError)); }
    googlePlacesLoading = new Promise((resolve, reject) => {
      if (window.google?.maps?.places) {
        try { setupGooglePlaces(); resolve(); } catch (error) { reject(error); }
        return;
      }
      const existing = document.getElementById("pwa-google-places");
      const script = existing || document.createElement("script");
      script.id = "pwa-google-places";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=de&region=AT`;
      script.async = true; script.defer = true;
      script.addEventListener("load", () => { try { setupGooglePlaces(); resolve(); } catch (error) { reject(error); } }, { once: true });
      script.addEventListener("error", () => reject(new Error("Google Maps konnte nicht geladen werden.")), { once: true });
      if (!existing) document.head.append(script);
    }).catch((error) => { googlePlacesError = String(error?.message || "Google Maps ist nicht verfügbar."); throw error; });
    return googlePlacesLoading;
  }
  function clearPlaceSuggestions(kind) {
    state.placeSuggestions[kind] = [];
    const container = document.getElementById(`pwa-${kind}-suggestions`);
    if (container) { container.innerHTML = ""; container.classList.add("hidden"); }
  }
  function renderPlaceSuggestions(kind, message = "") {
    const container = document.getElementById(`pwa-${kind}-suggestions`);
    if (!container) return;
    const entries = state.placeSuggestions[kind] || [];
    if (!entries.length) {
      container.innerHTML = message ? `<p class="pwa-place-message">${escapeHtml(message)}</p>` : "";
      container.classList.toggle("hidden", !message);
      return;
    }
    container.innerHTML = entries.map((entry, index) => `<button type="button" class="pwa-place-suggestion" data-place-suggestion="${kind}:${index}"><b>${escapeHtml(entry.mainText || entry.description)}</b>${entry.secondaryText ? `<small>${escapeHtml(entry.secondaryText)}</small>` : ""}</button>`).join("");
    container.classList.remove("hidden");
  }
  function queuePlaceSuggestions(kind, query) {
    const value = String(query || "").trim();
    const minLength = kind === "name" ? 2 : 3;
    window.clearTimeout(placeSearchTimer);
    if (value.length < minLength) return clearPlaceSuggestions(kind);
    if (!googlePlacesReady || !googleAutocompleteService) {
      void loadGooglePlaces().then(() => queuePlaceSuggestions(kind, value)).catch(() => renderPlaceSuggestions(kind, googlePlacesError || "Google-Vorschläge sind nicht verfügbar."));
      return renderPlaceSuggestions(kind, "Google-Vorschläge werden geladen …");
    }
    placeSearchTimer = window.setTimeout(() => {
      const requestId = ++placeSearchRequestId;
      googleAutocompleteService.getPlacePredictions({ input: value, sessionToken: googleSessionToken, language: "de", ...(kind === "address" ? { types: ["address"] } : {}) }, (predictions, status) => {
        if (requestId !== placeSearchRequestId) return;
        const ok = status === window.google.maps.places.PlacesServiceStatus.OK;
        if (ok && predictions?.length) { state.placeSuggestions[kind] = predictions.map(mapGoogleSuggestion); return renderPlaceSuggestions(kind); }
        if (kind !== "name") return renderPlaceSuggestions(kind, "Keine passende Adresse gefunden.");
        googleAutocompleteService.getQueryPredictions({ input: value }, (fallback, fallbackStatus) => {
          if (requestId !== placeSearchRequestId) return;
          const fallbackOk = fallbackStatus === window.google.maps.places.PlacesServiceStatus.OK;
          state.placeSuggestions[kind] = fallbackOk && fallback?.length ? fallback.map(mapGoogleSuggestion) : [];
          renderPlaceSuggestions(kind, fallbackOk ? "" : "Keine passende Firma gefunden.");
        });
      });
    }, 230);
  }
  function getGooglePlace(placeId) {
    return new Promise((resolve, reject) => {
      if (!placeId || !googlePlacesService) return reject(new Error("Google-Ort ist nicht verfügbar."));
      googlePlacesService.getDetails({ placeId, fields: ["name", "address_components", "formatted_address", "geometry", "website", "formatted_phone_number", "international_phone_number"] }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) resolve(place);
        else reject(new Error("Details zu diesem Google-Eintrag konnten nicht geladen werden."));
      });
    });
  }
  function setWizardField(form, name, value, overwrite = true) {
    const clean = String(value ?? "").trim(); const input = form?.elements?.namedItem(name);
    if (clean && input && (overwrite || !String(input.value || "").trim())) input.value = clean;
  }
  async function applyPlaceSuggestion(kind, index) {
    const entry = state.placeSuggestions[kind]?.[Number(index)];
    const form = document.getElementById("pwa-wizard-form");
    if (!entry || !form) return;
    try {
      const place = entry.placeId ? await getGooglePlace(entry.placeId) : null;
      const mapped = place ? mapGooglePlaceToAddress(place) : { ...mapAddressFromDescription(entry.description), name: entry.mainText };
      setWizardField(form, "name", mapped.name || (kind === "name" ? entry.mainText : ""), kind === "name");
      setWizardField(form, "address", mapped.street || mapped.formatted, kind === "address");
      setWizardField(form, "postalCode", mapped.postalCode, kind === "address"); setWizardField(form, "city", mapped.city, kind === "address");
      setWizardField(form, "state", mapped.state, kind === "address"); setWizardField(form, "country", mapped.country, kind === "address");
      setWizardField(form, "website", mapped.website, false); setWizardField(form, "phone", mapped.phone, false);
      const nextValues = readWizardValues(form);
      ["address", "postalCode", "city", "state", "country"].forEach((field) => {
        const value = mapped[field === "address" ? "street" : field] || (field === "address" ? mapped.formatted : "");
        if (value && (kind === "address" || !nextValues[field])) nextValues[field] = value;
      });
      if (mapped.name) nextValues.name = mapped.name;
      if (mapped.website && !nextValues.website) nextValues.website = mapped.website;
      if (mapped.phone && !nextValues.phone) nextValues.phone = mapped.phone;
      state.wizard.values = { ...nextValues, latitude: mapped.latitude ?? state.wizard.values.latitude, longitude: mapped.longitude ?? state.wizard.values.longitude };
      clearPlaceSuggestions(kind);
      showToast("Google-Vorschlag übernommen.", "success");
    } catch (error) { showToast(String(error?.message || "Google-Vorschlag konnte nicht übernommen werden."), "error"); }
  }

  function renderAuth(message = "") {
    ROOT.innerHTML = `<section class="pwa-auth"><div class="pwa-auth-card"><div class="pwa-brand"><img src="/assets/pwa-vertrieb-icon.svg" alt="" />my-waycard CRM</div><h1>Willkommen</h1><p>Dein schneller Arbeitsbereich für Anbieter.</p><form id="pwa-login-form"><label class="pwa-field">E-Mail<input name="email" type="email" autocomplete="email" required /></label><label class="pwa-field">Passwort<input name="password" type="password" autocomplete="current-password" required /></label><button class="pwa-btn pwa-btn-primary pwa-btn-wide" type="submit">Anmelden</button></form>${message ? `<p id="pwa-login-message">${escapeHtml(message)}</p>` : ""}</div></section>`;
    document.getElementById("pwa-login-form").addEventListener("submit", signIn);
  }
  function topicRequestNotificationId(request) { return `topic_request_resolution_${String(request?.id || "").trim()}`; }
  function topicNotificationDismissStorageKey() { return `${TOPIC_NOTIFICATION_DISMISS_STORAGE_PREFIX}:${userId()}`; }
  function locallyDismissedTopicNotifications() {
    try { const value = JSON.parse(localStorage.getItem(topicNotificationDismissStorageKey()) || "[]"); return new Set(Array.isArray(value) ? value.map((id) => String(id || "").trim()).filter(Boolean) : []); } catch (_error) { return new Set(); }
  }
  function persistLocallyDismissedTopicNotification(notificationId) {
    const dismissed = locallyDismissedTopicNotifications(); dismissed.add(notificationId);
    try { localStorage.setItem(topicNotificationDismissStorageKey(), JSON.stringify(Array.from(dismissed).slice(-500))); } catch (_error) { /* Der zentrale Speicherversuch läuft zusätzlich. */ }
  }
  function topicRequestNotifications() {
    const currentUserId = userId();
    return (isSuperAdmin() ? state.topicRequests.filter((entry) => entry.status === "open") : state.topicRequests.filter((entry) => ["resolved", "rejected"].includes(entry.status)))
      .filter((entry) => {
        if (isSuperAdmin()) return true;
        const notificationId = topicRequestNotificationId(entry);
        return !locallyDismissedTopicNotifications().has(notificationId) && !state.dismissedNotificationIds.has(notificationId) && !state.dismissedNotificationIds.has(`${currentUserId}::${notificationId}`);
      });
  }
  function notificationBellMarkup() {
    const unread = unreadEmployeeMessages().length + topicRequestNotifications().length;
    return `<div class="pwa-notification-wrap"><button type="button" id="pwa-notification-btn" class="pwa-notification-btn ${unread ? "has-notifications" : ""}" aria-label="Benachrichtigungen öffnen" aria-expanded="false" aria-controls="pwa-notification-menu"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.5 9.25a4.5 4.5 0 1 1 9 0v2.17c0 .9.28 1.77.81 2.5l.95 1.3a1 1 0 0 1-.81 1.59H6.55a1 1 0 0 1-.81-1.6l.95-1.29c.53-.73.81-1.6.81-2.5V9.25Z"/><path d="M10 18.5a2 2 0 0 0 4 0"/></svg>${unread ? `<span class="pwa-notification-badge">${unread > 99 ? "99+" : unread}</span>` : ""}</button><section id="pwa-notification-menu" class="pwa-notification-menu hidden" aria-label="Benachrichtigungen"></section></div>`;
  }
  function isAppleMobileDevice() { return /iPhone|iPad|iPod/i.test(navigator.userAgent); }
  function pushSystemSettingsHint() {
    return isAppleMobileDevice()
      ? "Am iPhone kann eine Web-App diese Schalter aus Sicherheitsgründen nicht selbst ändern. Öffne Einstellungen → Mitteilungen → „my-waycard CRM“ und aktiviere Mitteilungen erlauben, Sperrbildschirm und Banner."
      : "Die Mitteilungsberechtigung wurde am Gerät blockiert. Öffne die App-Informationen von „my-waycard CRM“ und aktiviere dort Benachrichtigungen.";
  }
  function pushSetupHint() {
    if (typeof Notification === "undefined") return "Push wird von diesem Gerät noch nicht unterstützt.";
    if (Notification.permission === "denied") return pushSystemSettingsHint();
    if (Notification.permission === "default") return "Nach dem Antippen öffnet das Handy automatisch die Systemabfrage. Bitte dort „Erlauben“ wählen.";
    return "Falls keine Meldung auf dem Sperrbildschirm erscheint, prüfe die Mitteilungseinstellungen dieses Geräts.";
  }
  function notificationMenuMarkup() {
    const messages = personalEmployeeMessages();
    const topicRequests = topicRequestNotifications();
    const pushAction = state.push.available
      ? state.push.enabled
        ? `<p class="pwa-notification-push-status">Push-Mitteilungen sind auf diesem Gerät aktiv.<span>${escapeHtml(pushSetupHint())}</span></p><button type="button" class="pwa-notification-push-reset-btn" data-reset-push>Push für neuen Test zurücksetzen</button>`
        : `<button type="button" class="pwa-notification-push-btn" data-enable-push>Systemabfrage öffnen &amp; Push aktivieren</button>`
      : "";
    const inactiveSetupHint = state.push.available && !state.push.enabled && !state.push.hint ? `<p class="pwa-notification-push-hint">${escapeHtml(pushSetupHint())}</p>` : "";
    const pushMarkup = `${pushAction}${inactiveSetupHint}${state.push.hint ? `<p class="pwa-notification-push-hint">${escapeHtml(state.push.hint)}</p>` : ""}`;
    const requestMarkup = topicRequests.length ? `<div class="pwa-notification-list">${topicRequests.map((request) => { const resolved = request.status !== "open"; const title = resolved ? (request.status === "rejected" ? "Thema zugeordnet" : "Thema angelegt") : `Themenanfrage: ${request.topic}`; const detail = resolved ? (request.status === "rejected" ? `Bestehendes Thema „${request.resolvedTopicName || "Thema"}“ wurde deinem Anbieter zugeordnet.` : `„${request.resolvedTopicName || request.topic}“ wurde angelegt und deinem Anbieter zugeordnet.`) : [request.providerName && `Anbieter: ${request.providerName}`, request.requestedByName && `von ${request.requestedByName}`, request.note].filter(Boolean).join(" · "); return `<div class="pwa-notification-message"><span class="pwa-notification-message-head"><b>${escapeHtml(title)}</b><time>${escapeHtml(formatDateTime(request.createdAt))}</time></span><span>${escapeHtml(detail)}</span>${resolved ? `<button type="button" class="pwa-notification-dismiss" data-dismiss-topic-request="${escapeHtml(request.id)}" aria-label="Als gelesen markieren">Gelesen</button>` : ""}</div>`; }).join("")}</div>` : "";
    return `<div class="pwa-notification-menu-head"><div><p>Benachrichtigungen</p><small>${messages.length || topicRequests.length ? `${messages.length + topicRequests.length} offen` : "Persönliche Meldungen"}</small></div><button type="button" class="pwa-notification-close" data-close-notifications aria-label="Benachrichtigungen schließen">×</button></div>${requestMarkup}${messages.length ? `<div class="pwa-notification-list">${messages.map((message) => `<button type="button" class="pwa-notification-message ${state.readEmployeeMessageIds.has(message.id) ? "is-read" : ""}" data-pwa-message-id="${escapeHtml(message.id)}"><span class="pwa-notification-message-head"><b>Nachricht von ${escapeHtml(message.sentByName)}</b><time>${escapeHtml(formatDateTime(message.sentAt))}</time></span><span>${escapeHtml(message.body)}</span></button>`).join("")}</div>` : (!topicRequests.length ? '<p class="pwa-notification-empty">Keine persönlichen Meldungen.</p>' : "")}${pushMarkup}`;
  }
  function renderNotificationMenu() {
    const button = document.getElementById("pwa-notification-btn");
    const menu = document.getElementById("pwa-notification-menu");
    if (!button || !menu) return;
    const unread = unreadEmployeeMessages().length + topicRequestNotifications().length;
    button.classList.toggle("has-notifications", unread > 0);
    button.setAttribute("aria-expanded", String(state.notificationMenuOpen));
    const badge = button.querySelector(".pwa-notification-badge");
    if (unread && !badge) button.insertAdjacentHTML("beforeend", `<span class="pwa-notification-badge">${unread > 99 ? "99+" : unread}</span>`);
    if (!unread) badge?.remove();
    else if (badge) badge.textContent = unread > 99 ? "99+" : String(unread);
    menu.classList.toggle("hidden", !state.notificationMenuOpen);
    menu.innerHTML = notificationMenuMarkup();
    if ("setAppBadge" in navigator) {
      if (unread) void navigator.setAppBadge(unread).catch(() => {});
      else if ("clearAppBadge" in navigator) void navigator.clearAppBadge().catch(() => {});
    }
  }
  function setNotificationMenuOpen(open) {
    state.notificationMenuOpen = Boolean(open);
    renderNotificationMenu();
    if (state.notificationMenuOpen) {
      // Die Glocke ist in App und Desktop derselbe Posteingang. Beim Öffnen
      // wird der zentrale Stand nochmals gelesen, damit Gelesen sofort gilt.
      void Promise.all([loadEmployeeMessageReadReceipts(), loadTopics()]).then(() => renderNotificationMenu());
    }
  }
  async function dismissTopicRequestNotification(requestId) {
    const id = String(requestId || "").trim(); const currentUserId = userId();
    if (!id || !currentUserId) return;
    const notificationId = topicRequestNotificationId({ id }); const scopedId = `${currentUserId}::${notificationId}`;
    persistLocallyDismissedTopicNotification(notificationId);
    state.dismissedNotificationIds.add(scopedId); renderNotificationMenu();
    try {
      const { data, error } = await state.client.from(STATE_TABLE).select("payload").eq("id", "main").maybeSingle();
      if (error || !data?.payload) throw error || new Error("App-Einstellungen nicht gefunden.");
      const payload = data.payload && typeof data.payload === "object" ? data.payload : {}; const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
      const dismissed = settings.adminNotificationDismissedById && typeof settings.adminNotificationDismissedById === "object" ? settings.adminNotificationDismissedById : {};
      const { error: updateError } = await state.client.from(STATE_TABLE).update({ payload: { ...payload, settings: { ...settings, adminNotificationDismissedById: { ...dismissed, [scopedId]: true } } } }).eq("id", "main");
      if (updateError) throw updateError;
    } catch (error) {
      state.dismissedNotificationIds.delete(scopedId); renderNotificationMenu();
      showToast(`Nachricht konnte nicht gelöscht werden: ${String(error?.message || "Bitte erneut versuchen.")}`, "error");
    }
  }
  async function markEmployeeMessageRead(messageId) {
    const id = String(messageId || "").trim();
    if (!id || state.readEmployeeMessageIds.has(id)) return;
    state.readEmployeeMessageIds.add(id);
    renderNotificationMenu();
    const { error } = await state.client.from(CONTENT_READ_RECEIPTS_TABLE).upsert({
      content_type: "employee_message", content_id: id, content_version: 1, reader_user_id: userId(),
    }, { onConflict: "content_type,content_id,content_version,reader_user_id", ignoreDuplicates: true });
    if (error) console.warn("Lesestatus der Mitarbeiternachricht konnte nicht gespeichert werden.", error);
  }
  function urlBase64ToUint8Array(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - normalized.length % 4) % 4);
    const raw = window.atob(normalized + padding);
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
  }
  async function getPwaAccessToken() {
    const { data, error } = await state.client.auth.refreshSession();
    const accessToken = String(data?.session?.access_token || "").trim();
    if (error || !accessToken) throw new Error("Deine Anmeldung ist abgelaufen. Bitte einmal ab- und wieder anmelden.");
    return accessToken;
  }
  async function registerPushSubscription(subscription) {
    const accessToken = await getPwaAccessToken();
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "X-Supabase-Url": String(window.APP_CONFIG?.SUPABASE_URL || "").trim() },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(String(payload?.error || "Push-Mitteilungen konnten nicht aktiviert werden."));
  }
  async function unregisterPushSubscription(endpoint) {
    const accessToken = await getPwaAccessToken();
    const response = await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "X-Supabase-Url": String(window.APP_CONFIG?.SUPABASE_URL || "").trim() },
      body: JSON.stringify({ endpoint }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(String(payload?.error || "Push-Anmeldung konnte nicht zurückgesetzt werden."));
  }
  async function loadPushConfiguration() {
    const isHomeScreenApp = Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true);
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      state.push = {
        available: false,
        enabled: false,
        publicKey: "",
        hint: /iPhone|iPad|iPod/i.test(navigator.userAgent) && !isHomeScreenApp
          ? "Für Push am iPhone: Diese App zuerst in Safari über Teilen → Zum Home-Bildschirm hinzufügen und anschließend über das App-Symbol öffnen."
          : "Push wird von diesem Browser noch nicht unterstützt. Öffne die installierte Vertriebs-App oder verwende einen aktuellen Browser.",
      };
      renderNotificationMenu();
      return;
    }
    try {
      const response = await fetch("/api/push/config", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      const publicKey = String(payload?.publicKey || "").trim();
      if (!response.ok || !publicKey) {
        state.push = { available: false, enabled: false, publicKey: "", hint: "Push wird gerade eingerichtet. Bitte die App in wenigen Minuten erneut öffnen." };
        renderNotificationMenu();
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      state.push = { available: true, enabled: false, publicKey, hint: "" };
      if (subscription) {
        try {
          await registerPushSubscription(subscription);
          state.push.enabled = true;
        } catch (_error) {
          state.push.hint = "Die Handy-Berechtigung ist aktiv, aber die Anmeldung konnte noch nicht am Server gespeichert werden. Bitte „Push am Handy aktivieren“ erneut antippen.";
        }
      }
      renderNotificationMenu();
    } catch (_error) {
      state.push = { available: false, enabled: false, publicKey: "", hint: "Push konnte noch nicht geladen werden. Bitte die App kurz schließen und erneut öffnen." };
      renderNotificationMenu();
    }
  }
  async function enablePushNotifications(button) {
    if (!state.push.available || !state.push.publicKey) return;
    if (Notification.permission === "denied") {
      state.push.hint = pushSystemSettingsHint();
      renderNotificationMenu();
      showToast("Push-Mitteilungen wurden in den Systemeinstellungen blockiert.", "error");
      return;
    }
    setBusy(button, true, "Aktiviert …");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Bitte erlaube Push-Mitteilungen für die Vertriebs-App.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(state.push.publicKey) });
      await registerPushSubscription(subscription);
      state.push.enabled = true;
      state.push.hint = "";
      renderNotificationMenu();
      showToast("Push-Mitteilungen sind für dieses Gerät aktiv.", "success");
    } catch (error) {
      state.push.enabled = false;
      state.push.hint = Notification.permission === "denied" || Notification.permission === "default"
        ? pushSetupHint()
        : "Die Push-Anmeldung konnte noch nicht am Server gespeichert werden. Bitte später erneut versuchen.";
      renderNotificationMenu();
      showToast(String(error?.message || "Push-Mitteilungen konnten nicht aktiviert werden."), "error");
    }
    finally { setBusy(button, false); }
  }
  async function resetPushNotifications(button) {
    if (!state.push.available) return;
    if (!window.confirm("Push auf diesem Gerät zurücksetzen? Danach kannst du Push erneut aktivieren und frisch testen.")) return;
    setBusy(button, true, "Setzt zurück …");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = String(subscription?.endpoint || "").trim();
      if (subscription) await subscription.unsubscribe();
      if (endpoint) await unregisterPushSubscription(endpoint);
      state.push.enabled = false;
      state.push.hint = "Push wurde zurückgesetzt. Bitte jetzt „Systemabfrage öffnen & Push aktivieren“ antippen.";
      renderNotificationMenu();
      showToast("Push wurde für einen neuen Test zurückgesetzt.", "success");
    } catch (error) {
      state.push.hint = "Push konnte nicht vollständig zurückgesetzt werden. Bitte die App schließen und erneut versuchen.";
      renderNotificationMenu();
      showToast(String(error?.message || "Push konnte nicht zurückgesetzt werden."), "error");
    } finally { setBusy(button, false); }
  }
  function renderShell() {
    ROOT.innerHTML = `<div class="pwa-app"><header class="pwa-topbar"><div class="pwa-topbar-brand" aria-label="my-waycard CRM"><img src="/assets/my-waycard-logo-header.jpg" alt="my-waycard.com" /><strong>CRM</strong></div><div class="pwa-topbar-actions">${notificationBellMarkup()}<div class="pwa-account"><button id="pwa-profile-btn" class="pwa-avatar" aria-expanded="false" aria-controls="pwa-account-menu" title="Konto">${escapeHtml(initials())}</button><section id="pwa-account-menu" class="pwa-account-menu hidden"><p>${escapeHtml(displayName())}</p><label class="pwa-account-country"><span>Land</span><select data-app-country aria-label="Land einstellen"><option value="austria" ${state.countryFilter === "austria" ? "selected" : ""}>Österreich</option><option value="germany" ${state.countryFilter === "germany" ? "selected" : ""}>Deutschland</option><option value="italy" ${state.countryFilter === "italy" ? "selected" : ""}>Italien</option><option value="all" ${state.countryFilter === "all" ? "selected" : ""}>Alle</option></select></label><details class="pwa-account-password"><summary>Passwort ändern</summary><form id="pwa-password-change-form"><label>Neues Passwort<input name="password" type="password" autocomplete="new-password" minlength="8" required /></label><label>Passwort wiederholen<input name="passwordConfirm" type="password" autocomplete="new-password" minlength="8" required /></label><button type="submit">Passwort speichern</button></form></details><button type="button" class="pwa-account-signout" data-sign-out>Abmelden</button></section></div></div></header><main id="pwa-main"></main><nav class="pwa-bottom-nav" aria-label="Navigation"><div class="pwa-bottom-nav-inner"><button class="pwa-nav-btn pwa-nav-back" data-footer-back aria-label="Zur vorherigen Ansicht"><b class="pwa-nav-icon">‹</b><span>Zurück</span></button><button class="pwa-nav-btn" data-nav="home"><b class="pwa-nav-icon">⌂</b><span>Start</span></button><button class="pwa-nav-create" data-nav="create" aria-label="Neuen Anbieter anlegen"><b>＋</b><span>Neu</span></button></div></nav></div>`;
    const accountMenu = document.getElementById("pwa-account-menu");
    accountMenu?.querySelector("p")?.insertAdjacentHTML("afterend", `<p class="pwa-account-app-version">App-Version ${escapeHtml(APP_VERSION)}</p>`);
    ROOT.querySelector(".pwa-bottom-nav").addEventListener("click", (event) => { const back = event.target.closest("[data-footer-back]"); if (back) return navigateBack(); const button = event.target.closest("[data-nav]"); if (button) navigate(button.dataset.nav); });
    document.getElementById("pwa-profile-btn").addEventListener("click", () => {
      const menu = document.getElementById("pwa-account-menu"); const open = menu?.classList.toggle("hidden");
      document.getElementById("pwa-profile-btn")?.setAttribute("aria-expanded", String(!open));
    });
    ROOT.querySelector("[data-sign-out]")?.addEventListener("click", signOut);
    document.getElementById("pwa-account-menu")?.addEventListener("change", (event) => {
      if (!event.target?.matches?.("[data-app-country]")) return;
      const next = appCountryKey(event.target.value);
      try { localStorage.setItem(countryPreferenceStorageKey(), next); } catch (_error) { /* Die Auswahl gilt mindestens bis zum Schließen der App. */ }
      navigate("home", { countryFilter: next, providerStateFilter: "all", coverageStateFilter: "all", coverageProviderFilter: null }, { skipHistory: true });
    });
    document.getElementById("pwa-password-change-form")?.addEventListener("submit", changePassword);
    document.getElementById("pwa-notification-btn")?.addEventListener("click", () => setNotificationMenuOpen(!state.notificationMenuOpen));
    document.getElementById("pwa-notification-menu")?.addEventListener("click", (event) => {
      const close = event.target.closest("[data-close-notifications]"); if (close) return setNotificationMenuOpen(false);
      const message = event.target.closest("[data-pwa-message-id]"); if (message) return void markEmployeeMessageRead(message.dataset.pwaMessageId);
      const dismissTopicRequest = event.target.closest("[data-dismiss-topic-request]"); if (dismissTopicRequest) return void dismissTopicRequestNotification(dismissTopicRequest.dataset.dismissTopicRequest);
      const enable = event.target.closest("[data-enable-push]"); if (enable) return void enablePushNotifications(enable);
      const reset = event.target.closest("[data-reset-push]"); if (reset) return void resetPushNotifications(reset);
    });
    renderView();
    void loadPushConfiguration();
  }
  function renderView() {
    if (!state.profile) return;
    const main = document.getElementById("pwa-main");
    if (!main) return;
    main.className = `pwa-view${state.view === "home" ? " pwa-view-home" : ""}`;
    if (state.view === "home") main.innerHTML = homeMarkup();
    if (state.view === "providers") main.innerHTML = providersMarkup();
    if (state.view === "coverage") main.innerHTML = coveragePageMarkup();
    if (state.view === "create") main.innerHTML = wizardMarkup();
    if (state.view === "detail") main.innerHTML = detailMarkup();
    if (state.view === "activity") main.innerHTML = activityMarkup();
    if (state.view === "help") main.innerHTML = helpMarkup();
    if (state.view === "help-topic") main.innerHTML = helpTopicMarkup();
    bindViewEvents();
    if (state.view === "help-topic") bindHelpDocumentFrames(main);
    const activeNavigation = ["detail", "activity"].includes(state.view) ? "providers" : state.view === "help-topic" ? "help" : state.view === "coverage" ? "home" : state.view;
    ROOT.querySelectorAll("[data-nav]").forEach((button) => button.classList.toggle("active", button.dataset.nav === activeNavigation));
    const footerBack = ROOT.querySelector("[data-footer-back]");
    if (footerBack) footerBack.disabled = !state.navigationHistory.length;
  }
  function providerDashboardMarkers(provider) {
    return `${provider.dashboardCreated ? `<span class="pwa-provider-marker dashboard">Im Dashboard</span>` : ""}${provider.competitor ? `<span class="pwa-provider-marker competitor">Mitbewerb</span>` : ""}${provider.onlineOnly ? `<span class="pwa-provider-marker online">Online</span>` : ""}`;
  }
  function providerCard(provider) {
    const searchText = normalizeDedupPart([provider.name, provider.city, provider.phone, provider.country, provider.email].join(" "));
    const markers = providerDashboardMarkers(provider);
    return `<button class="pwa-provider-card ${provider.dashboardCreated ? "pwa-provider-card-dashboard" : ""} ${provider.competitor ? "pwa-provider-card-competitor" : ""}" data-provider-id="${escapeHtml(provider.id)}" data-provider-search-text="${escapeHtml(searchText)}"><div class="pwa-provider-card-top"><strong>${escapeHtml(provider.name || "Unbenannter Anbieter")}</strong>${statusBadge(provider.status)}</div><p>${escapeHtml(locationLabel(provider))}</p>${markers ? `<div class="pwa-provider-markers">${markers}</div>` : ""}<small>${provider.phone ? `☎ ${escapeHtml(provider.phone)}` : "Details öffnen"}</small></button>`;
  }
  function homeMarkup() {
    const recent = recentlyEditedProviders().filter(providerMatchesCountry); const open = myOpenProviders().filter(providerMatchesCountry);
    return `<section class="pwa-start-actions" aria-label="Schnelleinstieg"><button class="pwa-start-action coverage" data-home-action="coverage"><span>⌖</span><b>Abdeckung</b></button><button class="pwa-start-action work" data-home-action="work"><span>◷</span><b>Meine offenen Anbieter</b><em>${open.length}</em></button><button class="pwa-start-action providers" data-home-action="providers"><span>⌕</span><b>Anbieterliste</b></button><button class="pwa-start-action create" data-home-action="create"><span>＋</span><b>Neuen Anbieter anlegen</b></button><button class="pwa-start-action help" data-home-action="help"><span>?</span><b>Hilfe &amp; Anleitung</b></button></section><div class="pwa-section-head pwa-start-recent-head"><h2>Zuletzt bearbeitet</h2></div>${recent.length ? recent.map(providerCard).join("") : `<div class="pwa-empty pwa-empty-quiet">Noch keine bearbeiteten Anbieter</div>`}`;
  }
  function coveragePageMarkup() {
    const ownProviders = coverageProviders();
    const states = coverageStateOptions(ownProviders);
    if (state.coverageStateFilter !== "all" && !states.some((entry) => entry.key === state.coverageStateFilter)) state.coverageStateFilter = "all";
    const filtered = ownProviders.filter((provider) => state.coverageStateFilter === "all" || providerCoverageEntries(provider).some((entry) => entry.key === state.coverageStateFilter));
    const categories = coverageCategoryStats(filtered);
    const charts = categories.map((category) => `<button type="button" class="pwa-coverage-chart" data-coverage-category="${escapeHtml(category.name)}"><div class="pwa-coverage-chart-head"><span><b>${escapeHtml(category.name)}</b><small>${category.dashboard} von ${category.total} im Dashboard</small></span><strong>${category.rate}%</strong></div><div class="pwa-coverage-bar" role="progressbar" aria-label="${escapeHtml(`${category.name}: ${category.rate} Prozent im Dashboard angelegt`)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${category.rate}"><span style="--pwa-coverage-rate:${category.rate}%"></span></div><small class="pwa-coverage-chart-action">Anbieter anzeigen ›</small></button>`).join("");
    return `<section class="pwa-coverage-head"><p>${isSuperAdmin() ? "Alle Anbieter" : "Meine Anbieter"}</p><h1>Abdeckung</h1></section><label class="pwa-coverage-filter"><span>Bundesland</span><select data-coverage-state aria-label="Bundesland filtern"><option value="all">Alle Bundesländer</option>${states.map((entry) => `<option value="${escapeHtml(entry.key)}" ${entry.key === state.coverageStateFilter ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}</select></label><section class="pwa-coverage-charts">${charts || `<div class="pwa-empty pwa-empty-quiet">Für diese Auswahl gibt es noch keine Kategorien.</div>`}</section>`;
  }
  function providersMarkup() {
    const coverageFilter = state.coverageProviderFilter;
    const baseProviders = coverageFilter ? coverageProviders() : appCountryProviders();
    const states = coverageStateOptions(baseProviders);
    if (state.providerStateFilter !== "all" && !states.some((entry) => entry.key === state.providerStateFilter)) state.providerStateFilter = "all";
    const providers = baseProviders.filter((provider) => {
      const matchFilter = state.filter === "all" || (state.filter === "mine" ? isMyOpenProvider(provider) : statusKey(provider.status) === state.filter);
      const matchesCoverage = !coverageFilter || (coverageFilter.stateKey === "all" || providerCoverageEntries(provider).some((entry) => entry.key === coverageFilter.stateKey)) && providerCategoryNames(provider).has(coverageFilter.categoryName);
      const matchesState = state.providerStateFilter === "all" || providerCoverageEntries(provider).some((entry) => entry.key === state.providerStateFilter);
      return matchFilter && matchesCoverage && matchesState;
    }).sort((left, right) => String(left?.name || "").localeCompare(String(right?.name || ""), "de", { sensitivity: "base", ignorePunctuation: true, numeric: true }) || String(left?.id || "").localeCompare(String(right?.id || ""), "de"));
    const filters = [["mine", "Meine offen"], ["open", "Offen"], ["inprogress", "In Bearbeitung"], ["pending", "Live-Beantragung"], ["all", "Alle Status"]];
    const coverageHint = coverageFilter ? `<button type="button" class="pwa-coverage-result-filter" data-clear-coverage-filter>Abdeckung: ${escapeHtml(coverageFilter.stateLabel)} · ${escapeHtml(coverageFilter.categoryName)} <b>×</b></button>` : "";
    return `<div class="pwa-section-head"><h2>Anbieter</h2><span id="pwa-provider-count">${providers.length}</span></div>${coverageHint}<div class="pwa-list-tools"><input id="pwa-provider-search" class="pwa-search" type="search" inputmode="search" placeholder="Name, Ort oder Nummer" value="${escapeHtml(state.search)}" /><label class="pwa-provider-list-filter"><span>Status</span><select data-provider-status-filter aria-label="Anbieter nach Status filtern">${filters.map(([key, label]) => `<option value="${key}" ${state.filter === key ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="pwa-provider-list-filter"><span>Bundesland</span><select data-provider-state-filter aria-label="Anbieter nach Bundesland filtern"><option value="all">Alle Bundesländer</option>${states.map((entry) => `<option value="${escapeHtml(entry.key)}" ${state.providerStateFilter === entry.key ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}</select></label></div><div id="pwa-provider-list">${providers.map(providerCard).join("")}</div><div id="pwa-provider-search-empty" class="pwa-empty hidden">Keine passenden Anbieter.</div>${providers.length ? "" : `<div class="pwa-empty">Keine passenden Anbieter.<br />Über „Neu“ legst du einen Anbieter an.</div>`}`;
  }
  const CONTACT_SALUTATIONS = ["", "Herr", "Frau", "Firma", "Divers"];
  const CONTACT_TITLES = ["", "Dr.", "DDr.", "Mag.", "MMag.", "Mag. (FH)", "DI", "DI (FH)", "Dipl.-Ing.", "Ing.", "BSc", "BA", "MSc", "MA", "MBA", "PhD", "LL.M.", "Univ.-Prof.", "Prof."];
  function optionMarkup(options, selected, emptyLabel) {
    return options.map((entry) => `<option value="${escapeHtml(entry)}" ${selected === entry ? "selected" : ""}>${escapeHtml(entry || emptyLabel)}</option>`).join("");
  }
  function additionalLocationsMarkup(values) {
    const locations = Array.isArray(values.additionalLocations) ? values.additionalLocations : [];
    return `<section class="pwa-inline-section pwa-additional-locations"><div class="pwa-inline-section-head"><div><h3>Weitere Standorte</h3><p>Jeder Standort wird vollständig und getrennt gespeichert.</p></div><button type="button" class="pwa-icon-btn" data-add-location aria-label="Weiteren Standort hinzufügen">＋</button></div>${locations.map((location, index) => `<article class="pwa-location-card" data-additional-location><div class="pwa-location-card-head"><strong>Standort ${index + 2}</strong><button type="button" class="pwa-text-btn" data-remove-location="${index}">Entfernen</button></div><label class="pwa-field">Adresse<input data-location-field="address" value="${escapeHtml(location.address)}" /></label><div class="pwa-form-row pwa-form-row-wide"><label class="pwa-field">PLZ<input data-location-field="postalCode" inputmode="numeric" value="${escapeHtml(location.postalCode)}" /></label><label class="pwa-field">Ort<input data-location-field="city" value="${escapeHtml(location.city)}" /></label></div><div class="pwa-form-row"><label class="pwa-field">Land<input data-location-field="country" value="${escapeHtml(location.country)}" /></label><label class="pwa-field">Bundesland<input data-location-field="state" value="${escapeHtml(location.state)}" /></label></div></article>`).join("") || `<div class="pwa-inline-empty">Noch keine weiteren Standorte.</div>`}</section>`;
  }
  function coverageMarkup(values) {
    if (!isAdmin()) return "";
    const isBigPlayer = values.coverageMode === "bigPlayer";
    return `<section class="pwa-inline-section"><div class="pwa-inline-section-head"><div><h3>Standort &amp; Abdeckung</h3><p>Diese erweiterten Optionen entsprechen der Desktop-Ansicht.</p></div></div><div class="pwa-choice-stack"><label class="pwa-choice ${!isBigPlayer ? "selected" : ""}"><input type="radio" name="coverageMode" value="locations" ${!isBigPlayer ? "checked" : ""} /><span><b>Standorte per Adresse</b><small>Haupt- und weitere Standorte</small></span></label><label class="pwa-choice ${isBigPlayer ? "selected" : ""}"><input type="radio" name="coverageMode" value="bigPlayer" ${isBigPlayer ? "checked" : ""} /><span><b>Big Player</b><small>Landweit oder nach Bundesländern</small></span></label></div>${isBigPlayer ? `<label class="pwa-field">Abdeckungsland<input name="coverageCountry" value="${escapeHtml(values.coverageCountry || values.country)}" /></label><label class="pwa-field">Bundesländer <small>Optional, durch Komma getrennt</small><input name="coverageStatesText" value="${escapeHtml((values.coverageStates || []).join(", "))}" placeholder="z. B. Wien, Niederösterreich" /></label>` : ""}<label class="pwa-check"><input type="checkbox" name="onlineOnly" ${values.onlineOnly ? "checked" : ""} /><span><b>Online Anbieter</b><small>Nur online, Adresse bleibt der Firmensitz.</small></span></label></section>`;
  }
  function selectedTopicEntries(topicIds) {
    const selectedIds = normalizeTopicIds(topicIds);
    const availableTopics = new Map(state.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.topics.map((topic) => [topic.id, { id: topic.id, category: category.name, subcategory: subcategory.name, name: topic.name }]))));
    const entries = selectedIds.map((topicId) => availableTopics.get(topicId) || { id: topicId, name: "Thema nicht mehr verfügbar", unavailable: true });
    return { total: selectedIds.length, entries, missing: entries.filter((entry) => entry.unavailable).length };
  }
  function selectedTopicsSummaryMarkup(topicIds, options = {}) {
    const { total, entries, missing } = selectedTopicEntries(topicIds);
    const id = options.id ? ` id="${escapeHtml(options.id)}"` : "";
    const className = ["pwa-selected-topics", options.className].filter(Boolean).join(" ");
    if (!total) return `<section${id} class="${className} hidden"></section>`;
    const countLabel = `${total} ${total === 1 ? "Thema" : "Themen"}`;
    const list = entries.map((entry) => {
      const context = entry.unavailable ? "Dieses Thema ist nicht mehr im Katalog verfügbar." : [entry.category, entry.subcategory].filter(Boolean).join(" · ");
      const remove = options.canUnselect ? `<button type="button" class="pwa-selected-topic-remove" data-unselect-topic="${escapeHtml(entry.id)}" aria-label="${escapeHtml(`Thema ${entry.name} abwählen`)}">Entfernen</button>` : "";
      return `<li><b>${escapeHtml(entry.name)}</b><small>${escapeHtml(context)}</small>${remove}</li>`;
    }).join("");
    return `<section${id} class="${className}" aria-label="Gewählte Themen"><div class="pwa-selected-topics-head"><b>${escapeHtml(options.title || "Gewählte Themen")}</b><span>${escapeHtml(countLabel)}</span></div>${list ? `<ul>${list}</ul>` : ""}</section>`;
  }
  function topicMarkup(values) {
    if (!state.categories.length) return `<div class="pwa-empty">Die Themen konnten nicht geladen werden. Du kannst sie später im Desktop-CRM ergänzen.</div>`;
    const selected = new Set(normalizeTopicIds(values.topicIds));
    const topics = state.categories
      .flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.topics.map((topic) => ({ category, subcategory, topic }))))
      .sort((left, right) => `${left.category.name} ${left.subcategory.name} ${left.topic.name}`.localeCompare(`${right.category.name} ${right.subcategory.name} ${right.topic.name}`, "de"));
    const options = topics.map(({ category, subcategory, topic }) => {
      const subtopics = topicSubtopicsFor(topic.id);
      const searchText = normalizeDedupPart(`${category.name} ${subcategory.name} ${topic.name} ${subtopics.join(" ")}`);
      const subtopicHint = subtopics.length ? ` · Sub-Themen: ${subtopics.join(", ")}` : "";
      return `<label class="pwa-topic-option pwa-topic-option-search" data-topic-option data-topic-search-text="${escapeHtml(searchText)}"><input type="checkbox" data-topic-id="${escapeHtml(topic.id)}" value="${escapeHtml(topic.id)}" ${selected.has(topic.id) ? "checked" : ""} /><span><b>${escapeHtml(topic.name)}</b><small>${escapeHtml(category.name)} · ${escapeHtml(subcategory.name)}${escapeHtml(subtopicHint)}</small></span></label>`;
    }).join("");
    return `<section class="pwa-topic-picker"><label class="pwa-topic-search pwa-topic-search-primary"><span>⌕</span><input id="pwa-topic-search" type="search" placeholder="Thema suchen" autocomplete="off" /></label><div class="pwa-topic-selection-line"><strong id="pwa-topic-selected-count">${selected.size}</strong><span>Themen ausgewählt</span><small id="pwa-topic-visible-count">Thema suchen</small></div>${selectedTopicsSummaryMarkup(values.topicIds, { id: "pwa-topic-selected-summary", title: "Gewählte Themen", className: "pwa-topic-selected-summary", canUnselect: true })}<div class="pwa-topic-results pwa-topic-results-simple" id="pwa-topic-results">${options}</div><button type="button" id="pwa-topic-no-results" class="pwa-topic-no-results hidden" data-open-topic-request><b>Kein passendes Thema gefunden.</b><span>Kategorie anfragen ›</span></button><button type="button" class="pwa-topic-request-trigger" data-open-topic-request><span>+</span><b>Kategorie fehlt?</b><small>Wunsch an Superadmin senden</small><i>›</i></button></section>`;
  }
  function wizardStepMarkup(values, step) {
    if (step === 1) return `<h2>Anbieter</h2><label class="pwa-field">Name<input name="name" autocomplete="organization" required value="${escapeHtml(values.name)}" placeholder="Firma suchen" /><small class="pwa-field-hint">Google-Vorschläge übernehmen Adresse, Website und Telefon wenn vorhanden.</small></label><div id="pwa-name-suggestions" class="pwa-place-suggestions hidden"></div><label class="pwa-field">Telefon<input name="phone" type="tel" autocomplete="tel" value="${escapeHtml(values.phone)}" /></label><label class="pwa-field">E-Mail<input name="email" type="email" autocomplete="email" value="${escapeHtml(values.email)}" /></label><label class="pwa-field">Website<input name="website" type="url" inputmode="url" value="${escapeHtml(values.website)}" placeholder="https://" /></label><details class="pwa-more"><summary>Weitere Angaben</summary><div>${canSetDashboardCreated() ? `<label class="pwa-check"><input type="checkbox" name="dashboardCreated" ${values.dashboardCreated ? "checked" : ""} ${values.competitor ? "disabled" : ""} /><span><b>Im Dashboard angelegt</b><small>Wird wie im Desktop grün markiert.</small></span></label>` : ""}<label class="pwa-check"><input type="checkbox" name="competitor" ${values.competitor ? "checked" : ""} /><span>Mitbewerb</span></label>${values.competitor ? `<label class="pwa-field">Name des Mitbewerbs<input name="competitorName" required value="${escapeHtml(values.competitorName)}" /></label>` : ""}${isAdmin() ? `<label class="pwa-check"><input type="checkbox" name="adminOnly" ${values.adminOnly ? "checked" : ""} /><span>Nur Admin</span></label>` : ""}</div></details>`;
    if (step === 2) return `<h2>Adresse</h2><label class="pwa-field">Adresse<input name="address" autocomplete="street-address" required value="${escapeHtml(values.address)}" placeholder="Adresse suchen" /></label><div id="pwa-address-suggestions" class="pwa-place-suggestions hidden"></div><div class="pwa-form-row pwa-form-row-wide"><label class="pwa-field">PLZ<input name="postalCode" autocomplete="postal-code" required inputmode="numeric" value="${escapeHtml(values.postalCode)}" /></label><label class="pwa-field">Ort<input name="city" autocomplete="address-level2" required value="${escapeHtml(values.city)}" /></label></div><div class="pwa-form-row"><label class="pwa-field">Land<input name="country" autocomplete="country-name" required value="${escapeHtml(values.country)}" /></label><label class="pwa-field">Bundesland<input name="state" autocomplete="address-level1" required value="${escapeHtml(values.state)}" /></label></div><details class="pwa-more"><summary>Weitere Standorte &amp; Abdeckung</summary><div>${additionalLocationsMarkup(values)}${coverageMarkup(values)}</div></details>`;
    if (step === 3) return `<h2>Ansprechpartner</h2><div class="pwa-form-row"><label class="pwa-field">Anrede<select name="contactSalutation">${optionMarkup(CONTACT_SALUTATIONS, values.contactSalutation, "Bitte wählen")}</select></label><label class="pwa-field">Titel<select name="contactTitle">${optionMarkup(CONTACT_TITLES, values.contactTitle, "Ohne Titel")}</select></label></div><div class="pwa-form-row"><label class="pwa-field">Vorname<input name="contactFirstName" autocomplete="given-name" value="${escapeHtml(values.contactFirstName)}" /></label><label class="pwa-field">Nachname<input name="contactLastName" autocomplete="family-name" value="${escapeHtml(values.contactLastName)}" /></label></div>`;
    return `<h2>Themen</h2>${topicMarkup(values)}`;
  }
  function wizardMarkup() {
    const { step, values, providerId } = state.wizard;
    return `<div class="pwa-wizard-head"><h1>${providerId ? escapeHtml(values.name || "Anbieter") : "Neuer Anbieter"}</h1><p>${step} / 4</p></div><div class="pwa-steps">${[1, 2, 3, 4].map((entry) => `<span class="pwa-step-dot ${entry <= step ? "active" : ""}"></span>`).join("")}</div><form id="pwa-wizard-form" class="pwa-form-card">${wizardStepMarkup(values, step)}<div class="pwa-wizard-actions">${step > 1 ? `<button type="button" class="pwa-btn pwa-btn-secondary" data-wizard="back">Zurück</button>` : ""}${step < 4 ? `<button type="submit" class="pwa-btn pwa-btn-primary">Weiter</button>` : `<button type="button" class="pwa-btn pwa-btn-secondary" data-save="open">Offen speichern</button><button type="button" class="pwa-btn pwa-btn-primary" data-save="work">Speichern</button>`}</div></form>`;
  }
  function notesMarkup(provider) {
    const id = provider.id; const loading = Boolean(state.providerNotesLoadingById[id]); const error = String(state.providerNotesErrorById[id] || "");
    const notes = providerNotes(id).slice().sort((a, b) => Number(a.done) - Number(b.done) || String(b.createdAt).localeCompare(String(a.createdAt)));
    const list = loading && !notes.length
      ? `<p class="pwa-detail-empty">Notizen werden geladen …</p>`
      : notes.length ? notes.map((note) => {
        const own = note.createdByUserId === userId();
        const taskMeta = note.task ? `${note.dueDate ? `Fällig ${formatDate(note.dueDate)}` : "Aufgabe"}${note.done ? " · erledigt" : ""}` : "Notiz";
        return `<article class="pwa-note ${note.done ? "done" : ""}"><div class="pwa-note-top"><div><span class="pwa-note-kind">${escapeHtml(taskMeta)}</span><small>${escapeHtml(formatDateTime(note.createdAt))} · ${escapeHtml(note.createdByName || "Mitarbeiter")}</small></div>${note.task ? `<button type="button" class="pwa-note-done" data-note-done="${escapeHtml(note.id)}" data-note-next="${note.done ? "false" : "true"}" ${own ? "" : "disabled"}>${note.done ? "Offen" : "Erledigt"}</button>` : ""}</div><p>${escapeHtml(note.text).replace(/\n/g, "<br />")}</p>${note.updatedAt && note.updatedAt !== note.createdAt ? `<small class="pwa-note-updated">Geändert ${escapeHtml(formatDateTime(note.updatedAt))}${note.updatedByName ? ` · ${escapeHtml(note.updatedByName)}` : ""}</small>` : ""}</article>`;
      }).join("") : `<p class="pwa-detail-empty">Noch keine Notizen oder Aufgaben.</p>`;
    return `<details class="pwa-detail-card pwa-detail-disclosure" open><summary><span>Notizen &amp; Aufgaben</span><small>${notes.filter((note) => note.task && !note.done).length ? `${notes.filter((note) => note.task && !note.done).length} offen` : ""}</small></summary><div class="pwa-note-composer"><label class="pwa-field"><span>Neue Notiz</span><textarea id="pwa-note-text" maxlength="4000" placeholder="Kurz festhalten …"></textarea></label><div class="pwa-note-composer-options"><label class="pwa-check pwa-check-compact"><input id="pwa-note-task" type="checkbox" /><span>Als Aufgabe</span></label><label id="pwa-note-due-field" class="pwa-field pwa-note-due hidden"><span>Fällig</span><input id="pwa-note-due" type="date" /></label></div><button type="button" class="pwa-btn pwa-btn-secondary" data-add-provider-note="${escapeHtml(id)}">Hinzufügen</button></div>${error ? `<p class="pwa-detail-error">${escapeHtml(error)}</p>` : ""}<div class="pwa-note-list">${list}</div></details>`;
  }
  function statusHistoryMarkup(provider) {
    const entries = (Array.isArray(provider.statusHistory) ? provider.statusHistory : []).slice().sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    const events = entries.map((entry) => {
      const before = entry.fromStatus ? statusLabel(entry.fromStatus) : "Angelegt";
      const after = statusLabel(entry.toStatus || provider.status);
      return `<li><b>${escapeHtml(before)} → ${escapeHtml(after)}</b><small>${escapeHtml(formatDateTime(entry.at))}${entry.byName ? ` · ${escapeHtml(entry.byName)}` : ""}</small></li>`;
    });
    if (!events.length && provider.createdAt) events.push(`<li><b>Anbieter angelegt</b><small>${escapeHtml(formatDateTime(provider.createdAt))}${provider.createdByName ? ` · ${escapeHtml(provider.createdByName)}` : ""}</small></li>`);
    return `<details class="pwa-detail-card pwa-detail-disclosure"><summary><span>Verlauf</span><small>${events.length ? `${events.length} Einträge` : ""}</small></summary><div class="pwa-change-summary"><span>Zuletzt geändert</span><b>${escapeHtml(formatDateTime(provider.updatedAt || provider.createdAt))}</b><small>${escapeHtml(provider.updatedByName || provider.createdByName || "")}</small></div><ol class="pwa-status-timeline">${events.join("") || "<li><small>Noch kein Verlauf vorhanden.</small></li>"}</ol></details>`;
  }
  function providerWorkflowActionsMarkup(provider) {
    const canManage = canManageProvider(provider);
    const canToggleDashboard = canManage && canSetDashboardCreated() && !provider.competitor;
    const invitationState = invitationStatus(provider);
    const invitationOpen = invitationIsOpen(provider);
    const canToggleInvitation = canManageProviderInvitation(provider);
    const showInvitation = canManage && (isSalesUser() || isAdmin());
    if (!canToggleDashboard && !showInvitation) return "";
    const dashboardRow = canToggleDashboard
      ? `<label class="pwa-provider-setting"><span class="pwa-provider-setting-copy"><b>Im Dashboard angelegt</b></span><input class="pwa-setting-switch-input" type="checkbox" role="switch" data-dashboard-created-toggle aria-label="Im Dashboard angelegt" ${provider.dashboardCreated ? "checked" : ""} /><span class="pwa-setting-switch" aria-hidden="true"></span></label>`
      : "";
    const invitationText = invitationState === "completed"
      ? "Einladung wurde versendet."
      : invitationOpen
        ? "Einladungsauftrag ist offen."
        : providerInvitationHint(provider);
    const invitationAction = invitationState === "completed"
      ? `<span class="pwa-provider-setting-state success">Versendet</span>`
      : `<button class="pwa-provider-setting-action" type="button" data-invitation-toggle ${canToggleInvitation ? "" : "disabled"}>${invitationOpen ? "Zurücknehmen" : "Einladung senden"}</button>`;
    const invitationRow = showInvitation
      ? `<div class="pwa-provider-setting"><span class="pwa-provider-setting-copy"><b>Dashboard-Einladung</b><small>${escapeHtml(invitationText)}</small></span>${invitationAction}</div>`
      : "";
    return `<section class="pwa-provider-workflow-actions" aria-label="Anbieteraktionen"><p class="pwa-detail-section-label">Direkte Einstellungen</p>${dashboardRow}${invitationRow}</section>`;
  }
  function detailMarkup() {
    const provider = getProvider(state.detailId); if (!provider) return `<div class="pwa-empty">Anbieter wurde nicht gefunden.</div>`;
    const markers = providerDashboardMarkers(provider);
    const canManage = canManageProvider(provider);
    const address = [provider.address, [provider.postalCode, provider.city].filter(Boolean).join(" "), provider.state, provider.country].filter(Boolean).join(", ");
    const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
    const contactRows = [
      contactName(provider) ? `<div class="pwa-info-row"><span>Ansprechperson</span><b>${escapeHtml(contactName(provider))}</b></div>` : "",
      provider.phone ? `<a class="pwa-info-row" href="tel:${escapeHtml(provider.phone)}"><span>Telefon</span><b>${escapeHtml(provider.phone)}</b><i>›</i></a>` : "",
      provider.email ? `<a class="pwa-info-row" href="mailto:${escapeHtml(provider.email)}"><span>E-Mail</span><b>${escapeHtml(provider.email)}</b><i>›</i></a>` : "",
      provider.website ? `<a class="pwa-info-row" href="${escapeHtml(provider.website)}" target="_blank" rel="noopener"><span>Website</span><b>Website öffnen</b><i>›</i></a>` : "",
    ].filter(Boolean).join("");
    const detailRows = `${contactRows}<div class="pwa-info-row"><span>Adresse</span><b>${escapeHtml(address || "Noch nicht hinterlegt")}</b></div>`;
    const topicsSummary = selectedTopicsSummaryMarkup(provider.topicIds, { title: "Themen", className: "pwa-detail-topics" });
    return `<section class="pwa-provider-hero-card">${statusBadge(provider.status)}<h1 class="pwa-detail-title">${escapeHtml(provider.name)}</h1><p class="pwa-detail-location">${escapeHtml(locationLabel(provider))}</p>${markers ? `<div class="pwa-provider-markers pwa-detail-markers">${markers}</div>` : ""}</section>${statusWorkflowMarkup(provider)}${providerWorkflowActionsMarkup(provider)}<section class="pwa-detail-action-section"><p class="pwa-detail-section-label">Aktionen</p><div class="pwa-quick-action-grid">${provider.phone ? `<a class="pwa-quick-action primary" href="tel:${escapeHtml(provider.phone)}"><span>☎</span><b>Anrufen</b></a>` : ""}${mapUrl ? `<a class="pwa-quick-action" data-provider-route="${escapeHtml(provider.id)}" href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener"><span>⌖</span><b>Route</b></a>` : ""}<button class="pwa-quick-action" data-provider-activity="${escapeHtml(provider.id)}"><span>◷</span><b>Aktivität</b></button>${canManage ? `<button class="pwa-quick-action" data-edit-provider="${escapeHtml(provider.id)}"><span>✎</span><b>Bearbeiten</b></button>` : ""}</div></section>${topicsSummary}<details class="pwa-detail-card pwa-detail-disclosure pwa-provider-info-card"><summary><span>Kontakt &amp; Standort</span></summary><div class="pwa-info-list">${detailRows}</div></details>${canManage ? "" : `<p class="pwa-read-only-hint">Du siehst diesen Anbieter mit Leserechten.</p>`}`;
  }
  function activityMarkup() {
    const provider = getProvider(state.detailId);
    if (!provider) return `<div class="pwa-empty">Anbieter wurde nicht gefunden.</div>`;
    return `<section class="pwa-activity-head"><p>Aktivität</p><h1>${escapeHtml(provider.name)}</h1><span>${escapeHtml(locationLabel(provider))}</span></section>${notesMarkup(provider)}${statusHistoryMarkup(provider)}`;
  }
  function sanitizeHelpImageSrc(value) {
    const raw = String(value || "").trim();
    if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(raw) && raw.length <= 2_500_000) return raw;
    return safeHttpsUrl(raw);
  }
  function helpPlainTextMarkup(value) {
    return String(value || "").trim().split(/\r?\n\s*\r?\n/).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br />")}</p>`).join("");
  }
  function safeHelpRichHtml(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const source = /<\/?[a-z][^>]*>/i.test(raw) ? raw : helpPlainTextMarkup(raw);
    const template = document.createElement("template"); template.innerHTML = source;
    const output = document.createElement("div");
    const allowedTags = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "del", "mark", "small", "span", "div", "section", "article", "header", "ul", "ol", "li", "h2", "h3", "h4", "h5", "h6", "blockquote", "hr", "a", "img", "figure", "figcaption", "pre", "code", "kbd", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "details", "summary"]);
    const allowedClasses = new Set(["help-web-hero", "help-web-title", "help-web-lead", "help-web-grid", "help-web-grid-2", "help-web-grid-3", "help-web-card", "help-web-callout", "help-web-callout-success", "help-web-callout-warning", "help-web-divider", "help-web-text-sm", "help-web-text-lg", "help-web-text-xl", "help-web-text-2xl", "help-web-muted", "help-web-center", "help-web-eyebrow"]);
    const copyNodes = (from, to) => Array.from(from.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) { to.appendChild(document.createTextNode(node.textContent || "")); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = String(node.tagName || "").toLowerCase();
      if (!allowedTags.has(tag)) { copyNodes(node, to); return; }
      const clean = document.createElement(tag);
      const classes = String(node.getAttribute("class") || "").split(/\s+/).filter((entry) => allowedClasses.has(entry));
      if (classes.length) clean.className = Array.from(new Set(classes)).join(" ");
      if (tag === "a") { const href = safeHttpsUrl(node.getAttribute("href")); if (!href) { copyNodes(node, to); return; } clean.href = href; clean.target = "_blank"; clean.rel = "noopener noreferrer"; }
      if (tag === "img") { const src = sanitizeHelpImageSrc(node.getAttribute("src")); if (!src) return; clean.src = src; clean.alt = String(node.getAttribute("alt") || "Hilfe-Bild").trim().slice(0, 120) || "Hilfe-Bild"; clean.loading = "lazy"; clean.decoding = "async"; }
      to.appendChild(clean); copyNodes(node, clean);
    });
    copyNodes(template.content, output);
    return output.innerHTML;
  }
  function isHelpWebDocument(value) {
    return /<!doctype\s+html|<html[\s>]|<head[\s>]|<style[\s>]/i.test(String(value || "").trim());
  }
  function sanitizeHelpDocumentCss(value) {
    return String(value || "")
      .replace(/@import\s+(?:url\([^)]*\)|[^;]+);?/gi, "")
      .replace(/url\(\s*(['"]?)\s*javascript:[\s\S]*?\1\s*\)/gi, "")
      .replace(/expression\s*\(/gi, "");
  }
  const PWA_HELP_DOCUMENT_CSS = `
    :root { color-scheme: light; }
    html, body { width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
    body { margin: 0 !important; padding: 16px !important; color: #294b6b !important; background: #ffffff !important; font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; overflow-wrap: anywhere; }
    *, *::before, *::after { box-sizing: border-box !important; max-width: 100% !important; }
    img, video, svg, canvas { display: block; width: auto; max-width: 100% !important; height: auto !important; }
    table { display: block; width: 100% !important; max-width: 100% !important; overflow-x: auto; border-collapse: collapse; }
    th, td { min-width: 88px; padding: 8px; vertical-align: top; }
    pre, code { max-width: 100% !important; overflow-wrap: anywhere; white-space: pre-wrap; }
    a { color: #075a9a; overflow-wrap: anywhere; }
    @media (max-width: 520px) { body { padding: 14px !important; font-size: 15px !important; } h1 { font-size: 1.7em !important; } h2 { font-size: 1.35em !important; } h3 { font-size: 1.15em !important; } }
  `;
  function safeHelpDocumentMarkup(value, title = "Hilfe-Thema") {
    const raw = String(value || "").trim().slice(0, 120000);
    if (!raw || !isHelpWebDocument(raw)) return "";
    const parsed = new DOMParser().parseFromString(raw, "text/html");
    parsed.querySelectorAll("script, iframe, object, embed, base, link, form, input, button, textarea, select, option, meta").forEach((element) => element.remove());
    const customCss = Array.from(parsed.querySelectorAll("style")).map((style) => sanitizeHelpDocumentCss(style.textContent || "")).filter(Boolean).join("\n");
    parsed.querySelectorAll("style").forEach((element) => element.remove());
    parsed.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const name = String(attribute.name || "").toLowerCase();
        const attrValue = String(attribute.value || "").trim();
        if (name.startsWith("on") || name === "srcdoc") { element.removeAttribute(attribute.name); return; }
        if (["href", "src", "action", "formaction"].includes(name) && /^\s*(?:javascript|vbscript):/i.test(attrValue)) { element.removeAttribute(attribute.name); return; }
        if (name === "style") element.setAttribute("style", sanitizeHelpDocumentCss(attrValue));
      });
    });
    const language = String(parsed.documentElement.getAttribute("lang") || "de").trim().slice(0, 24) || "de";
    const safeTitle = String(title || "Hilfe-Thema").trim().slice(0, 160) || "Hilfe-Thema";
    const documentMarkup = `<!doctype html><html lang="${escapeHtml(language)}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(safeTitle)}</title><style>${customCss}\n${PWA_HELP_DOCUMENT_CSS}</style></head><body>${parsed.body.innerHTML}</body></html>`;
    return `<iframe class="pwa-help-document-frame" data-pwa-help-document sandbox="allow-same-origin" referrerpolicy="no-referrer" title="${escapeHtml(safeTitle)}" srcdoc="${escapeHtml(documentMarkup)}"></iframe>`;
  }
  function resizeHelpDocumentFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try {
      const documentElement = frame.contentDocument?.documentElement;
      const body = frame.contentDocument?.body;
      const height = Math.max(Number(documentElement?.scrollHeight || 0), Number(documentElement?.offsetHeight || 0), Number(body?.scrollHeight || 0), Number(body?.offsetHeight || 0), 180);
      frame.style.height = `${Math.ceil(height)}px`;
    } catch (_error) { /* Die Sandbox schützt die App; bei einem Sonderfall bleibt der Frame scrollbar. */ }
  }
  function bindHelpDocumentFrames(root) {
    root?.querySelectorAll?.("iframe[data-pwa-help-document]").forEach((frame) => {
      frame.addEventListener("load", () => resizeHelpDocumentFrame(frame), { once: true });
      window.requestAnimationFrame(() => resizeHelpDocumentFrame(frame));
    });
  }
  function isSupportedHelpVideoUrl(value) {
    const url = safeHttpsUrl(value);
    if (!url) return false;
    if (/\.(?:mp4|webm)(?:$|\?)/i.test(url)) return true;
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      return host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com" || host === "vimeo.com" || host === "player.vimeo.com";
    } catch (_error) { return false; }
  }
  function helpEmbeddedVideosMarkup(content, title) {
    const raw = String(content || "").trim();
    if (!raw || typeof DOMParser === "undefined") return "";
    try {
      const parsed = new DOMParser().parseFromString(raw, "text/html");
      const urls = Array.from(parsed.querySelectorAll("iframe[src], video[src], video source[src]"))
        .map((element) => safeHttpsUrl(element.getAttribute("src")))
        .filter(isSupportedHelpVideoUrl);
      const uniqueUrls = Array.from(new Set(urls)).slice(0, 6);
      return uniqueUrls.length
        ? `<section class="pwa-help-embedded-videos"><h2>Video</h2>${uniqueUrls.map((url, index) => videoMarkup(url, `${title} – Video ${index + 1}`)).join("")}</section>`
        : "";
    } catch (_error) { return ""; }
  }
  function videoMarkup(video, label = "Video") {
    const url = safeHttpsUrl(video?.url || video);
    if (!url) return "";
    let embed = "";
    try {
      const parsed = new URL(url); const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      const youtubeId = host === "youtu.be"
        ? parsed.pathname.split("/").filter(Boolean)[0] || ""
        : ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
          ? parsed.searchParams.get("v") || parsed.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/)?.[1] || ""
          : "";
      if (/^[A-Za-z0-9_-]{6,32}$/.test(youtubeId || "")) embed = `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`;
      if (host === "vimeo.com" || host === "player.vimeo.com") embed = createVimeoEmbedUrl(getVimeoVideoParts(url));
    } catch (_error) { /* Link wird unten als externer Link angeboten. */ }
    if (/\.(?:mp4|webm)(?:$|\?)/i.test(url)) return `<video class="pwa-help-video" controls playsinline preload="metadata"><source src="${escapeHtml(url)}" /></video>`;
    if (embed) return `<iframe class="pwa-help-video" src="${escapeHtml(embed)}" title="${escapeHtml(label)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    return `<a class="pwa-help-video-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} öffnen ↗</a>`;
  }
  function helpMarkup() {
    const topics = visibleHelpTopics();
    const videos = [state.helpCenter.startVideo, ...state.helpCenter.onboardingVideos].filter(Boolean);
    const contact = state.helpCenter.supportEmail ? `<a class="pwa-help-support" href="mailto:${escapeHtml(state.helpCenter.supportEmail)}">Support kontaktieren</a>` : "";
    return `<section class="pwa-help-head"><p>my-waycard Support</p><h1>Hilfe &amp; Start</h1><span>Kurze Anleitungen für unterwegs.</span></section>${videos.length ? `<section class="pwa-help-videos"><h2>Startvideos</h2>${videos.map((video) => `<article class="pwa-help-video-card"><b>${escapeHtml(video.title)}</b>${videoMarkup(video, video.title)}</article>`).join("")}</section>` : ""}<section class="pwa-help-topic-list"><div class="pwa-section-head"><h2>Hilfe-Themen</h2><span>${topics.length}</span></div>${topics.length ? topics.map((topic) => `<button type="button" class="pwa-help-topic-card" data-help-topic-id="${escapeHtml(topic.id)}"><span>${topic.required ? "Pflicht" : "Hilfe"}</span><b>${escapeHtml(topic.title)}</b><small>${escapeHtml(topic.summary)}</small><i>›</i></button>`).join("") : '<div class="pwa-empty pwa-empty-quiet">Für deine Rolle sind derzeit keine Hilfe-Themen verfügbar.</div>'}</section>${state.helpCenter.privacyNoticeUrl ? `<a class="pwa-help-privacy" href="${escapeHtml(state.helpCenter.privacyNoticeUrl)}" target="_blank" rel="noopener noreferrer">Datenschutzinformationen ↗</a>` : ""}${contact}`;
  }
  function helpTopicMarkup() {
    const topic = visibleHelpTopics().find((entry) => entry.id === state.helpTopicId);
    if (!topic) return `<div class="pwa-empty">Dieses Hilfe-Thema ist nicht mehr verfügbar.</div>`;
    const content = isHelpWebDocument(topic.content)
      ? safeHelpDocumentMarkup(topic.content, topic.title)
      : `<div class="pwa-help-topic-content">${safeHelpRichHtml(topic.content)}</div>`;
    const embeddedVideos = helpEmbeddedVideosMarkup(topic.content, topic.title);
    return `<article class="pwa-help-topic-detail"><header><p>${topic.required ? "Pflichtthema" : "Hilfe-Thema"}</p><h1>${escapeHtml(topic.title)}</h1><span>${escapeHtml(topic.summary)}</span></header>${content}${embeddedVideos}${topic.videoUrl ? `<section class="pwa-help-topic-video"><h2>Passendes Video</h2>${videoMarkup(topic.videoUrl, topic.title)}</section>` : ""}</article>`;
  }
  function providerQuality(provider) { const fields = [provider.name, provider.address, provider.postalCode, provider.city, provider.state, provider.country, provider.phone || provider.email, provider.contactPersonPhone || provider.contactPersonEmail || provider.contactFirstName]; return Math.round((fields.filter(Boolean).length / fields.length) * 100); }

  function navigationSnapshot() {
    return { view: state.view, detailId: state.detailId, viewBeforeDetail: state.viewBeforeDetail, filter: state.filter, search: state.search, coverageStateFilter: state.coverageStateFilter, coverageProviderFilter: state.coverageProviderFilter ? { ...state.coverageProviderFilter } : null, providerStateFilter: state.providerStateFilter, helpTopicId: state.helpTopicId, wizard: { ...state.wizard, values: { ...state.wizard.values } } };
  }
  function navigate(view, context = {}, options = {}) {
    if (!options.skipHistory && (state.view !== view || Object.keys(context).length)) state.navigationHistory.push(navigationSnapshot());
    state.view = view; if (!["detail", "activity"].includes(view) && !("detailId" in context)) state.detailId = "";
    if (view !== "help-topic" && !("helpTopicId" in context)) state.helpTopicId = "";
    if (view === "create" && !("wizard" in context)) state.wizard = { step: 1, providerId: "", values: createEmptyProviderValues() };
    Object.assign(state, context);
    renderView(); resetAppScrollPosition();
  }
  function navigateBack() {
    const previous = state.navigationHistory.pop();
    if (!previous) return;
    Object.assign(state, previous);
    renderView(); resetAppScrollPosition();
  }
  function readAdditionalLocations(form) {
    return Array.from(form.querySelectorAll("[data-additional-location]")).map((card) => ({
      address: String(card.querySelector('[data-location-field="address"]')?.value || "").trim(),
      postalCode: String(card.querySelector('[data-location-field="postalCode"]')?.value || "").trim(),
      city: String(card.querySelector('[data-location-field="city"]')?.value || "").trim(),
      state: String(card.querySelector('[data-location-field="state"]')?.value || "").trim(),
      country: String(card.querySelector('[data-location-field="country"]')?.value || "").trim(),
      latitude: null, longitude: null,
    }));
  }
  function readWizardValues(form) {
    const values = { ...state.wizard.values }; const formData = new FormData(form);
    ["name", "website", "email", "phone", "address", "postalCode", "city", "state", "country", "coverageCountry", "competitorName", "contactSalutation", "contactTitle", "contactFirstName", "contactLastName", "contactPersonPhone", "contactPersonEmail"].forEach((field) => { if (formData.has(field)) values[field] = String(formData.get(field) || "").trim(); });
    if (form.querySelector('[name="competitor"]')) values.competitor = formData.get("competitor") === "on";
    if (form.querySelector('[name="adminOnly"]')) values.adminOnly = formData.get("adminOnly") === "on";
    if (form.querySelector('[name="dashboardCreated"]')) values.dashboardCreated = formData.get("dashboardCreated") === "on";
    if (form.querySelector('[name="onlineOnly"]')) values.onlineOnly = formData.get("onlineOnly") === "on";
    if (form.querySelector('[name="coverageMode"]')) values.coverageMode = formData.get("coverageMode") === "bigPlayer" ? "bigPlayer" : "locations";
    if (form.querySelector('[name="coverageStatesText"]')) values.coverageStates = String(formData.get("coverageStatesText") || "").split(",").map((entry) => entry.trim()).filter(Boolean);
    if (form.querySelector("[data-additional-location]")) values.additionalLocations = readAdditionalLocations(form);
    const topicInputs = form.querySelectorAll("[data-topic-id]"); if (topicInputs.length) values.topicIds = Array.from(topicInputs).filter((input) => input.checked).map((input) => input.value);
    return values;
  }
  function syncTopicSelection(form) {
    if (!form) return;
    const values = readWizardValues(form);
    state.wizard.values = values;
    const count = form.querySelector("#pwa-topic-selected-count");
    if (count) count.textContent = String(values.topicIds.length);
    const summary = form.querySelector("#pwa-topic-selected-summary");
    if (summary) summary.outerHTML = selectedTopicsSummaryMarkup(values.topicIds, { id: "pwa-topic-selected-summary", title: "Gewählte Themen", className: "pwa-topic-selected-summary", canUnselect: true });
    const searchValue = String(form.querySelector("#pwa-topic-search")?.value || "").trim();
    if (searchValue) filterTopicPicker(searchValue, form);
  }
  function filterTopicPicker(query, scope = document.getElementById("pwa-wizard-form") || document) {
    const needle = normalizeDedupPart(query);
    const searchTerms = needle.split(" ").filter(Boolean);
    const options = Array.from(scope.querySelectorAll("[data-topic-option]"));
    options.forEach((option) => {
      const haystack = String(option.dataset.topicSearchText || "");
      const match = searchTerms.length > 0 && searchTerms.every((term) => haystack.includes(term));
      option.hidden = !match;
    });
    const visibleCount = options.filter((option) => !option.hidden).length;
    const count = scope.querySelector("#pwa-topic-visible-count");
    if (count) count.textContent = needle ? `${visibleCount} von ${options.length} Treffern` : "Thema suchen";
    const empty = scope.querySelector("#pwa-topic-no-results");
    if (empty) empty.classList.toggle("hidden", !needle || visibleCount > 0);
  }
  function openTopicRequestModal(topic = "") {
    document.getElementById("pwa-topic-request-modal")?.remove();
    const modal = document.createElement("div");
    modal.id = "pwa-topic-request-modal";
    modal.className = "pwa-topic-request-modal";
    modal.innerHTML = `<section class="pwa-topic-request-dialog" role="dialog" aria-modal="true" aria-labelledby="pwa-topic-request-title"><button type="button" class="pwa-topic-request-close" data-close-topic-request aria-label="Popup schließen">×</button><p class="pwa-topic-request-kicker">KATEGORIEANFRAGE</p><h2 id="pwa-topic-request-title">Wunsch an Superadmin</h2><p>Beschreibe kurz das fehlende Thema. Der Superadmin kann es anschließend erfassen oder passend zuordnen.</p><form id="pwa-topic-request-form"><label>Wunschkategorie<input name="topic" maxlength="120" value="${escapeHtml(topic)}" required autofocus /></label><label>Kurze Ergänzung <span>optional</span><textarea name="note" maxlength="400" placeholder="z. B. besondere Ausrichtung oder Zielgruppe"></textarea></label><button type="submit">Anfrage senden</button></form></section>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => { if (event.target === modal || event.target.closest("[data-close-topic-request]")) modal.remove(); });
    modal.querySelector("form")?.addEventListener("submit", requestTopic);
  }
  function openTopicRemovalConfirmation(topicId) {
    const form = document.getElementById("pwa-wizard-form");
    const normalizedTopicId = String(topicId || "").trim();
    const input = Array.from(form?.querySelectorAll("[data-topic-id]") || []).find((entry) => entry.value === normalizedTopicId);
    if (!form || !input?.checked) return;
    document.getElementById("pwa-topic-remove-confirmation")?.remove();
    const topicName = selectedTopicEntries([normalizedTopicId]).entries[0]?.name || "dieses Thema";
    const modal = document.createElement("div");
    modal.id = "pwa-topic-remove-confirmation";
    modal.className = "pwa-topic-remove-confirmation";
    modal.innerHTML = `<section class="pwa-topic-remove-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pwa-topic-remove-title" aria-describedby="pwa-topic-remove-copy"><h2 id="pwa-topic-remove-title">Thema entfernen?</h2><p id="pwa-topic-remove-copy">Möchtest du „${escapeHtml(topicName)}“ wirklich entfernen? Die Änderung wird erst beim Speichern des Anbieters übernommen.</p><div class="pwa-topic-remove-actions"><button type="button" data-cancel-topic-remove>Abbrechen</button><button type="button" data-confirm-topic-remove>Entfernen</button></div></section>`;
    const close = () => { document.removeEventListener("keydown", onKeydown); modal.remove(); };
    const onKeydown = (event) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-cancel-topic-remove]")) return close();
      if (!event.target.closest("[data-confirm-topic-remove]")) return;
      input.checked = false;
      syncTopicSelection(form);
      close();
    });
    document.body.appendChild(modal);
    document.addEventListener("keydown", onKeydown);
    requestAnimationFrame(() => modal.querySelector("[data-cancel-topic-remove]")?.focus());
  }
  async function requestTopic(event) {
    event.preventDefault();
    const form = event.currentTarget; const topic = String(new FormData(form).get("topic") || "").trim(); const note = String(new FormData(form).get("note") || "").trim();
    if (!topic) return;
    const button = form.querySelector('button[type="submit"]'); setBusy(button, true, "Sendet …");
    try {
      const request = { id: createId("topic_request"), topic, note, providerName: String(state.wizard.values?.name || "").trim(), requestedByName: displayName(), requestedByUserId: userId(), createdAt: nowIso(), status: "open" };
      const { error: insertError } = await state.client.from(TOPIC_REQUESTS_TABLE).insert({ id: request.id, topic: request.topic, note: request.note, provider_id: state.wizard.providerId || null, provider_name: request.providerName, requested_by_user_id: request.requestedByUserId, requested_by_name: request.requestedByName, requested_at: request.createdAt, status: "open" });
      if (insertError) throw insertError;
      state.topicRequests = [request, ...state.topicRequests]; form.closest(".pwa-topic-request-modal")?.remove();
      showToast("Themenanfrage wurde an den Superadmin gesendet.", "success"); renderNotificationMenu();
    } catch (error) { showToast(`Anfrage konnte nicht gesendet werden: ${String(error?.message || "Bitte erneut versuchen.")}`, "error"); }
    finally { setBusy(button, false); }
  }
  function filterProviderList(query) {
    const needle = normalizeDedupPart(query); const terms = needle.split(" ").filter(Boolean);
    const cards = Array.from(document.querySelectorAll("#pwa-provider-list [data-provider-id]"));
    let visibleCount = 0;
    cards.forEach((card) => {
      const haystack = String(card.dataset.providerSearchText || "");
      const match = !terms.length || terms.every((term) => haystack.includes(term));
      card.hidden = !match;
      if (match) visibleCount += 1;
    });
    const count = document.getElementById("pwa-provider-count"); if (count) count.textContent = String(visibleCount);
    document.getElementById("pwa-provider-search-empty")?.classList.toggle("hidden", visibleCount > 0 || !cards.length);
  }
  function bindKeyboardInput(input, onChange) {
    if (!input || input.dataset.keyboardBound) return;
    input.dataset.keyboardBound = "true";
    const handle = () => onChange(input.value);
    ["input", "search", "keyup", "compositionend"].forEach((type) => input.addEventListener(type, handle));
  }
  function validateStep(values, step) {
    const required = step === 1 ? ["name"] : step === 2 ? ["address", "postalCode", "city", "state", "country"] : [];
    return required.find((key) => !values[key]) || "";
  }
  async function submitWizard(event) {
    event.preventDefault(); const values = readWizardValues(event.currentTarget); const invalid = validateStep(values, state.wizard.step);
    if (invalid) { showToast("Bitte fülle alle Pflichtfelder aus.", "error"); return; }
    state.wizard.values = values;
    if (state.wizard.step < 4) { state.wizard.step += 1; renderView(); resetAppScrollPosition(); }
  }
  async function saveWizard(mode, button) {
    const form = document.getElementById("pwa-wizard-form"); const values = readWizardValues(form);
    if (!values.name || !values.address || !values.postalCode || !values.city || !values.state || !values.country) { showToast("Bitte vervollständige Unternehmen und Standort.", "error"); return; }
    if ((values.additionalLocations || []).some((location) => !location.address || !location.postalCode || !location.city || !location.state || !location.country)) { showToast("Bitte jeden weiteren Standort vollständig angeben oder entfernen.", "error"); return; }
    if (values.competitor && !values.competitorName) { showToast("Bitte den Namen des Mitbewerbs angeben.", "error"); return; }
    if (values.competitor) values.dashboardCreated = false;
    setBusy(button, true);
    try {
      const timestamp = nowIso(); const original = state.wizard.providerId ? getProvider(state.wizard.providerId) : null;
      const provider = { ...(original || {}), ...values, id: original?.id || createId("p"), status: original?.status || "offen", createdAt: original?.createdAt || timestamp, createdByName: original?.createdByName || displayName(), createdByRole: original?.createdByRole || normalize(state.profile.role), createdByUserId: original?.createdByUserId || userId(), updatedAt: timestamp, updatedByName: displayName(), updatedByRole: normalize(state.profile.role), updatedByUserId: userId(), statusHistory: original?.statusHistory || [] };
      if (mode === "work" && statusKey(provider.status) === "open") {
        provider.status = "in Bearbeitung"; provider.responsibleUserId = userId(); provider.responsibleName = displayName(); provider.responsibleRole = normalize(state.profile.role); provider.inProgressByUserId = userId(); provider.inProgressByName = displayName(); provider.inProgressByRole = normalize(state.profile.role); provider.inProgressAt = timestamp; provider.statusHistory = statusHistory({ ...provider, status: "offen" }, provider.status, timestamp);
      }
      const duplication = await validateProviderDuplication(provider, original?.id || "");
      if (!duplication.ok) return;
      const registryClaim = await claimRegistry(provider);
      if (!registryClaim?.ok) {
        showToast(registryClaim.duplicate ? "Dieser Anbieter existiert bereits in diesem Land." : "Duplikat-Schutz konnte nicht bestätigt werden.", "error");
        return;
      }
      const saved = await saveProvider(provider); navigate("detail", { detailId: saved.id, viewBeforeDetail: "home" }); void loadProviderNotes(saved.id); showToast(mode === "work" ? "Anbieter gespeichert und in Bearbeitung übernommen." : "Anbieter sicher in Supabase gespeichert.", "success");
    } catch (error) { showToast(`Speichern fehlgeschlagen: ${String(error.message || "Bitte erneut versuchen.")}`, "error"); }
    finally { setBusy(button, false); }
  }
  async function changeStatus(nextKey, button) {
    const original = getProvider(state.detailId); if (!original) return;
    const next = PROVIDER_STATUS_FLOW.find((entry) => entry.key === nextKey);
    if (!next || !canChangeProviderStatus(original, nextKey)) { showToast("Dieser Statuswechsel ist nicht erlaubt.", "error"); return; }
    button.disabled = true; button.classList.add("is-saving"); button.setAttribute("aria-busy", "true");
    try {
      const previousLabel = statusLabel(original.status);
      const timestamp = nowIso(); const provider = { ...original, status: next.value, updatedAt: timestamp, updatedByName: displayName(), updatedByRole: normalize(state.profile.role), updatedByUserId: userId(), statusHistory: statusHistory(original, next.value, timestamp) };
      if (nextKey === "inprogress") {
        provider.responsibleUserId = userId(); provider.responsibleName = displayName(); provider.responsibleRole = normalize(state.profile.role);
        provider.inProgressByUserId = userId(); provider.inProgressByName = displayName(); provider.inProgressByRole = normalize(state.profile.role); provider.inProgressAt = timestamp;
      } else {
        provider.inProgressByUserId = ""; provider.inProgressByName = ""; provider.inProgressByRole = ""; provider.inProgressAt = "";
      }
      if (nextKey === "open") {
        provider.responsibleUserId = ""; provider.responsibleName = ""; provider.responsibleRole = "";
      }
      if (nextKey === "pending") {
        provider.liveRequestedAt = timestamp; provider.liveRequestedByUserId = userId(); provider.liveRequestedByName = displayName(); provider.liveRequestedByRole = normalize(state.profile.role);
      }
      if (statusKey(original.status) === "pending" && !["pending", "live"].includes(nextKey)) {
        provider.liveRequestedAt = ""; provider.liveRequestedByUserId = ""; provider.liveRequestedByName = ""; provider.liveRequestedByRole = "";
      }
      if (nextKey === "live") {
        const provisionUserId = original.liveRequestedByUserId || original.responsibleUserId || userId();
        const provisionUserName = original.liveRequestedByName || original.responsibleName || displayName();
        const provisionUserRole = original.liveRequestedByRole || original.responsibleRole || normalize(state.profile.role);
        provider.liveAt = original.liveAt || timestamp; provider.liveByUserId = userId(); provider.liveByName = displayName(); provider.liveByRole = normalize(state.profile.role);
        provider.provisionUserId = original.provisionUserId || provisionUserId; provider.provisionUserName = original.provisionUserName || provisionUserName;
        provider.provisionUserRole = original.provisionUserRole || provisionUserRole; provider.provisionAssignedAt = original.provisionAssignedAt || timestamp;
      }
      await saveProvider(provider); renderView(); showToast(`${previousLabel} → ${statusLabel(next.value)} gespeichert.`, "success");
    } catch (error) { renderView(); showToast(`Status konnte nicht geändert werden: ${String(error.message || "")}`, "error"); }
    finally { button.disabled = false; button.classList.remove("is-saving"); button.removeAttribute("aria-busy"); }
  }
  async function changeDashboardCreated(nextValue, input) {
    const original = getProvider(state.detailId); if (!original) return;
    if (!canManageProvider(original) || !canSetDashboardCreated()) {
      renderView(); showToast("Du darfst diese Dashboard-Kennzeichnung nicht ändern.", "error"); return;
    }
    if (original.competitor) {
      renderView(); showToast("Bei Mitbewerb-Anbietern ist diese Kennzeichnung gesperrt.", "error"); return;
    }
    input.disabled = true; input.closest(".pwa-provider-setting")?.classList.add("is-saving");
    try {
      const dashboardCreated = Boolean(nextValue);
      await saveProvider({
        ...original,
        dashboardCreated,
        dashboard_created: dashboardCreated,
        updatedAt: nowIso(),
        updatedByName: displayName(),
        updatedByRole: normalize(state.profile.role),
        updatedByUserId: userId(),
      });
      renderView();
      showToast(dashboardCreated ? "Als im Dashboard angelegt markiert." : "Dashboard-Kennzeichnung entfernt.", "success");
    } catch (error) {
      renderView();
      showToast(`Dashboard-Kennzeichnung konnte nicht geändert werden: ${String(error?.message || "")}`, "error");
    } finally {
      input.disabled = false; input.closest(".pwa-provider-setting")?.classList.remove("is-saving");
    }
  }
  async function toggleProviderInvitation(button) {
    const original = getProvider(state.detailId); if (!original) return;
    if (!canManageProviderInvitation(original)) {
      showToast(providerInvitationHint(original), "error"); return;
    }
    const enabled = !invitationIsOpen(original);
    if (!enabled && !window.confirm(`Einladungsauftrag für „${original.name || "diesen Anbieter"}“ wirklich zurücknehmen?`)) return;
    button.disabled = true; button.classList.add("is-saving"); button.setAttribute("aria-busy", "true");
    try {
      const accessToken = await getPwaAccessToken();
      const response = await fetch("/api/providers/toggle-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Supabase-Url": String(window.APP_CONFIG?.SUPABASE_URL || "").trim(),
        },
        body: JSON.stringify({ providerId: original.id, enabled }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(payload?.error || "Einladung konnte nicht gespeichert werden."));
      try {
        await loadProviders();
      } catch (_refreshError) {
        const updated = payload?.provider && typeof payload.provider === "object" ? payload.provider : null;
        if (updated) {
          const merged = normalizeRow({ ...original, ...updated, payload: { ...original, ...updated } });
          state.providers = state.providers.map((provider) => provider.id === original.id ? merged : provider);
        }
      }
      renderView();
      showToast(enabled ? "Einladungsauftrag gespeichert." : "Einladungsauftrag zurückgenommen.", "success");
    } catch (error) {
      renderView();
      showToast(String(error?.message || "Einladung konnte nicht geändert werden."), "error");
    } finally {
      button.disabled = false; button.classList.remove("is-saving"); button.removeAttribute("aria-busy");
    }
  }
  async function addProviderNote(providerId, button) {
    const id = String(providerId || "").trim(); const textInput = document.getElementById("pwa-note-text");
    const text = String(textInput?.value || "").trim();
    if (!id || !text) { showToast("Bitte schreibe zuerst eine Notiz.", "error"); return; }
    const task = Boolean(document.getElementById("pwa-note-task")?.checked);
    const dueDate = String(document.getElementById("pwa-note-due")?.value || "").trim();
    const timestamp = nowIso();
    const note = { text, task, dueDate, done: false, doneAt: "", doneByUserId: "", doneByName: "", doneByRole: "", updatedAt: timestamp, updatedByUserId: userId(), updatedByName: displayName(), updatedByRole: normalizeNoteRole(state.profile?.role) };
    setBusy(button, true, "Speichert …");
    try {
      const { error } = await state.client.from(PROVIDER_NOTES_TABLE).insert({ provider_id: id, note_text: toProviderNoteStorageText(note), created_by_user_id: userId(), created_by_name: displayName(), created_by_role: normalizeNoteRole(state.profile?.role) });
      if (error) throw error;
      await loadProviderNotes(id, true);
      showToast(task ? "Aufgabe sicher in Supabase gespeichert." : "Notiz sicher in Supabase gespeichert.", "success");
    } catch (error) { showToast(`Notiz konnte nicht gespeichert werden: ${String(error?.message || "")}`, "error"); }
    finally { setBusy(button, false); }
  }
  async function setProviderNoteDone(providerId, noteId, nextDone, button) {
    const id = String(providerId || "").trim(); const note = providerNotes(id).find((entry) => entry.id === String(noteId || "").trim());
    if (!note || note.createdByUserId !== userId()) { showToast("Nur der Ersteller kann diese Aufgabe ändern.", "error"); return; }
    const timestamp = nowIso(); const updated = { ...note, done: Boolean(nextDone), doneAt: nextDone ? timestamp : "", doneByUserId: nextDone ? userId() : "", doneByName: nextDone ? displayName() : "", doneByRole: nextDone ? normalizeNoteRole(state.profile?.role) : "", updatedAt: timestamp, updatedByUserId: userId(), updatedByName: displayName(), updatedByRole: normalizeNoteRole(state.profile?.role) };
    setBusy(button, true, "…");
    try {
      const { error } = await state.client.from(PROVIDER_NOTES_TABLE).update({ note_text: toProviderNoteStorageText(updated) }).eq("id", note.id).eq("provider_id", id);
      if (error) throw error;
      await loadProviderNotes(id, true);
      showToast(nextDone ? "Aufgabe erledigt." : "Aufgabe wieder geöffnet.", "success");
    } catch (error) { showToast(`Aufgabe konnte nicht geändert werden: ${String(error?.message || "")}`, "error"); }
    finally { setBusy(button, false); }
  }
  async function refreshProviderData() {
    if (!state.profile || state.view === "create") return;
    try {
      await Promise.all([loadProviders(), loadTopics(), loadEmployeeMessageReadReceipts()]);
      if (state.view === "activity" && state.detailId) void loadProviderNotes(state.detailId, true);
      renderView();
      renderNotificationMenu();
    } catch (_error) {
      // Die aktuelle Ansicht bleibt bei einer kurzzeitigen Netzstörung bedienbar.
    }
  }
  function scheduleProviderRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => { void refreshProviderData(); }, 180);
  }
  function bindViewEvents() {
    const main = document.getElementById("pwa-main"); if (!main) return;
    if (!main.dataset.bound) {
      main.dataset.bound = "true";
      const runInputHandlers = (event) => {
        if (event.target?.id === "pwa-topic-search") filterTopicPicker(event.target.value);
        if (event.target?.matches?.('[name="name"]')) queuePlaceSuggestions("name", event.target.value);
        if (event.target?.matches?.('[name="address"]')) queuePlaceSuggestions("address", event.target.value);
      };
      main.addEventListener("input", runInputHandlers);
      main.addEventListener("search", runInputHandlers);
      main.addEventListener("keyup", runInputHandlers);
      main.addEventListener("change", (event) => {
        if (event.target?.id === "pwa-note-task") document.getElementById("pwa-note-due-field")?.classList.toggle("hidden", !event.target.checked);
        if (event.target?.matches?.("[data-status-select]")) return void changeStatus(event.target.value, event.target);
        if (event.target?.matches?.("[data-dashboard-created-toggle]")) return void changeDashboardCreated(event.target.checked, event.target);
        if (event.target?.matches?.("[data-coverage-state]")) { state.coverageStateFilter = event.target.value; return renderView(); }
        if (event.target?.matches?.("[data-provider-status-filter]")) { state.filter = event.target.value; return renderView(); }
        if (event.target?.matches?.("[data-provider-state-filter]")) { state.providerStateFilter = event.target.value; return renderView(); }
      });
      main.addEventListener("click", (event) => {
        const nav = event.target.closest("[data-nav]"); if (nav) return navigate(nav.dataset.nav);
        const homeAction = event.target.closest("[data-home-action]");
        if (homeAction) {
          const action = homeAction.dataset.homeAction;
          if (action === "providers") return navigate("providers", { filter: "open", search: "", coverageProviderFilter: null, providerStateFilter: "all" });
          if (action === "work") return navigate("providers", { filter: "mine", search: "", coverageProviderFilter: null, providerStateFilter: "all" });
          return navigate(action);
        }
        const helpTopic = event.target.closest("[data-help-topic-id]"); if (helpTopic) return navigate("help-topic", { helpTopicId: String(helpTopic.dataset.helpTopicId || "") });
        const providerButton = event.target.closest("[data-provider-id]"); if (providerButton) { const providerId = providerButton.dataset.providerId; navigate("detail", { detailId: providerId, viewBeforeDetail: state.view }); void loadProviderNotes(providerId); return; }
        const coverageCategory = event.target.closest("[data-coverage-category]");
        if (coverageCategory) {
          const stateOption = coverageStateOptions(coverageProviders()).find((entry) => entry.key === state.coverageStateFilter);
          return navigate("providers", { filter: "all", search: "", providerStateFilter: state.coverageStateFilter, coverageProviderFilter: { stateKey: state.coverageStateFilter, stateLabel: stateOption?.label || "Alle Bundesländer", categoryName: String(coverageCategory.dataset.coverageCategory || "") } });
        }
        const clearCoverageFilter = event.target.closest("[data-clear-coverage-filter]"); if (clearCoverageFilter) { state.coverageProviderFilter = null; return renderView(); }
        const wizard = event.target.closest("[data-wizard]"); if (wizard && wizard.dataset.wizard === "back") { state.wizard.values = readWizardValues(document.getElementById("pwa-wizard-form")); state.wizard.step -= 1; return renderView(); }
        const addLocation = event.target.closest("[data-add-location]"); if (addLocation) { state.wizard.values = readWizardValues(document.getElementById("pwa-wizard-form")); state.wizard.values.additionalLocations = [...(state.wizard.values.additionalLocations || []), { address: "", postalCode: "", city: "", state: "", country: state.wizard.values.country || "Österreich", latitude: null, longitude: null }]; return renderView(); }
        const removeLocation = event.target.closest("[data-remove-location]"); if (removeLocation) { state.wizard.values = readWizardValues(document.getElementById("pwa-wizard-form")); state.wizard.values.additionalLocations = (state.wizard.values.additionalLocations || []).filter((_location, index) => index !== Number(removeLocation.dataset.removeLocation)); return renderView(); }
        const unselectTopic = event.target.closest("[data-unselect-topic]"); if (unselectTopic) return openTopicRemovalConfirmation(unselectTopic.dataset.unselectTopic);
        const selectAllTopics = event.target.closest("[data-topic-select-all]"); if (selectAllTopics) { const ids = String(selectAllTopics.dataset.topicSelectAll || "").split(",").filter(Boolean); document.querySelectorAll("[data-topic-id]").forEach((input) => { if (ids.includes(input.value)) input.checked = true; }); return syncTopicSelection(document.getElementById("pwa-wizard-form")); }
        const openTopicRequest = event.target.closest("[data-open-topic-request]"); if (openTopicRequest) return openTopicRequestModal(String(document.getElementById("pwa-topic-search")?.value || "").trim());
        const suggestion = event.target.closest("[data-place-suggestion]"); if (suggestion) { const [kind, index] = String(suggestion.dataset.placeSuggestion || "").split(":"); return void applyPlaceSuggestion(kind, index); }
        const save = event.target.closest("[data-save]"); if (save) return saveWizard(save.dataset.save, save);
        const status = event.target.closest("[data-status]"); if (status) return changeStatus(status.dataset.status, status);
        const invitation = event.target.closest("[data-invitation-toggle]"); if (invitation) return void toggleProviderInvitation(invitation);
        const edit = event.target.closest("[data-edit-provider]"); if (edit) { const provider = getProvider(edit.dataset.editProvider); return navigate("create", { wizard: { step: 1, providerId: provider.id, values: providerValues(provider) } }); }
        const route = event.target.closest("[data-provider-route]"); if (route) { rememberRouteReturn(route.dataset.providerRoute); return; }
        const activity = event.target.closest("[data-provider-activity]"); if (activity) { const providerId = activity.dataset.providerActivity; navigate("activity", { detailId: providerId }); void loadProviderNotes(providerId); return; }
        const addNote = event.target.closest("[data-add-provider-note]"); if (addNote) return void addProviderNote(addNote.dataset.addProviderNote, addNote);
        const noteDone = event.target.closest("[data-note-done]"); if (noteDone) return void setProviderNoteDone(state.detailId, noteDone.dataset.noteDone, noteDone.dataset.noteNext === "true", noteDone);
      });
    }
    const search = document.getElementById("pwa-provider-search");
    if (search) { bindKeyboardInput(search, (value) => { state.search = value; filterProviderList(value); }); filterProviderList(search.value); }
    const topicSearch = document.getElementById("pwa-topic-search");
    if (topicSearch) {
      const updateTopicResults = () => filterTopicPicker(topicSearch.value, document.getElementById("pwa-wizard-form"));
      topicSearch.oninput = updateTopicResults;
      topicSearch.onsearch = updateTopicResults;
      topicSearch.onkeyup = updateTopicResults;
      updateTopicResults();
    }
    const form = document.getElementById("pwa-wizard-form"); if (form) form.addEventListener("submit", submitWizard);
    if (form) {
      bindKeyboardInput(form.elements.namedItem("name"), (value) => queuePlaceSuggestions("name", value));
      bindKeyboardInput(form.elements.namedItem("address"), (value) => queuePlaceSuggestions("address", value));
    }
    if (form) form.addEventListener("change", (event) => {
      if (event.target.matches("[data-topic-id]")) return syncTopicSelection(form);
      if (event.target.matches('[name="competitor"], [name="coverageMode"]')) { state.wizard.values = readWizardValues(form); if (state.wizard.values.competitor) state.wizard.values.dashboardCreated = false; return renderView(); }
    });
  }
  async function signIn(event) {
    event.preventDefault(); const button = event.currentTarget.querySelector("button[type=submit]"); setBusy(button, true, "Anmeldung …");
    const data = new FormData(event.currentTarget); const { error } = await state.client.auth.signInWithPassword({ email: String(data.get("email") || "").trim(), password: String(data.get("password") || "") });
    if (error) { setBusy(button, false); renderAuth(error.message || "Anmeldung fehlgeschlagen."); }
  }
  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget; const password = String(new FormData(form).get("password") || ""); const confirmation = String(new FormData(form).get("passwordConfirm") || "");
    if (password.length < 8) { showToast("Das Passwort muss mindestens 8 Zeichen haben.", "error"); return; }
    if (password !== confirmation) { showToast("Die Passwörter stimmen nicht überein.", "error"); return; }
    const button = form.querySelector('button[type="submit"]'); setBusy(button, true, "Speichert …");
    try {
      const { error } = await state.client.auth.updateUser({ password });
      if (error) throw error;
      form.reset(); form.closest("details")?.removeAttribute("open");
      showToast("Passwort wurde geändert.", "success");
    } catch (error) { showToast(`Passwort konnte nicht geändert werden: ${String(error?.message || "Bitte erneut versuchen.")}`, "error"); }
    finally { setBusy(button, false); }
  }
  async function signOut() { await state.client.auth.signOut(); state.profile = null; state.providers = []; renderAuth(); }
  function syncAppViewportHeight() {
    const visibleHeight = Math.round(window.visualViewport?.height || window.innerHeight || 0);
    if (visibleHeight > 0) document.documentElement.style.setProperty("--pwa-viewport-height", `${visibleHeight}px`);
  }
  function resetAppScrollPosition() {
    document.getElementById("pwa-main")?.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }
  async function bootstrap(session) {
    if (!session?.user) return renderAuth();
    try {
      const { data: profile, error } = await state.client.from("profiles").select("user_id,full_name,email,role,status").eq("user_id", session.user.id).maybeSingle();
      if (error || !profile || normalize(profile.status) !== "active") throw new Error("Dein Konto ist noch nicht aktiv.");
      state.profile = profile;
      loadCountryPreference();
      await Promise.all([loadProviders(), loadTopics(), loadEmployeeMessageReadReceipts()]);
      const routeReturnId = takeRouteReturn();
      state.view = getProvider(routeReturnId) ? "detail" : "home"; state.detailId = state.view === "detail" ? routeReturnId : ""; state.helpTopicId = "";
      renderShell();
      // Nach dem Login darf die vorher vom Browser für das Passwortfeld
      // gesetzte Scrollposition nicht die Startseite ohne Header öffnen.
      syncAppViewportHeight();
      resetAppScrollPosition();
      requestAnimationFrame(resetAppScrollPosition);
      window.setTimeout(resetAppScrollPosition, 120);
      if (state.view === "detail") void loadProviderNotes(state.detailId);
      if (!isSalesUser() && !isAdmin()) showToast("Diese PWA ist für den Vertriebsprozess optimiert.");
    } catch (error) { renderAuth(error.message || "Die Vertriebsdaten konnten nicht geladen werden."); }
  }
  async function start() {
    syncAppViewportHeight();
    if (!window.supabase?.createClient || !window.APP_CONFIG?.SUPABASE_URL || !window.APP_CONFIG?.SUPABASE_ANON_KEY) return renderAuth("Die App-Konfiguration ist unvollständig.");
    state.client = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "mwc_vertrieb_pwa_auth_v1" } });
    void loadGooglePlaces().catch(() => {});
    const { data } = await state.client.auth.getSession(); await bootstrap(data.session);
    state.client.auth.onAuthStateChange((_event, session) => { if (session?.user && !state.profile) void bootstrap(session); if (!session) renderAuth(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      const routeReturnId = takeRouteReturn();
      if (routeReturnId && getProvider(routeReturnId)) {
        state.detailId = routeReturnId; state.view = "detail"; renderView(); void loadProviderNotes(state.detailId);
      } else if (state.profile && state.view !== "home") navigate("home");
      scheduleProviderRefresh();
    });
    window.addEventListener("focus", scheduleProviderRefresh);
    window.visualViewport?.addEventListener("resize", syncAppViewportHeight);
    window.addEventListener("orientationchange", () => window.setTimeout(syncAppViewportHeight, 80));
    window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshProviderData();
    }, 60000);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/vertrieb-sw.js").catch(() => {});
  }
  document.addEventListener("DOMContentLoaded", start);
})();
