import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const providerDeletionPolicySource = readFileSync(
  new URL("../supabase/patch_provider_deletion_lifecycle.sql", import.meta.url),
  "utf8"
);

assert.match(
  appSource,
  /if \(targetElement\.closest\("\.provider-actions-cell"\)\) \{\s*return;\s*\}/,
  "Klicks in der Aktionsspalte dürfen nicht den Datensatz-Editor öffnen."
);

assert.match(
  appSource,
  /if \(providerSaveInFlight\) \{\s*\/\/ Nicht als Fehler behandeln:[\s\S]*?return waitForProviderSaveCompletion\(\);\s*\}/,
  "Ein Wechsel zur Übersicht wartet auf einen bereits laufenden Anbieter-Speichervorgang."
);
assert.match(
  appSource,
  /providerFormDirty = false;\s*providerDraftPendingResume = false;\s*providerStatusTouchedInForm = false;/,
  "Nach bestätigtem Anbieter-Speichern werden alle Entwurfsmarker zurückgesetzt."
);
assert.match(
  appSource,
  /async function syncProvidersTableWithStateNow[\s\S]*?await ensureFreshSupabaseSessionForWrite\(\)/,
  "Kritische Anbieter-Synchronisierungen prüfen vor dem Write die Login-Sitzung."
);
assert.match(
  appSource,
  /isSupabaseAuthSessionError\(error\)[\s\S]*?refreshAuthSessionToken\(\)[\s\S]*?_authRefreshRetried: true/,
  "Ein durch Ablauf abgewiesener Anbieter-Write wird genau einmal mit frischem Token wiederholt."
);
assert.match(
  appSource,
  /async function persistManagementCategoryStructureChange[\s\S]*?managementCategoryPersistQueue[\s\S]*?skipProvidersTableSync: !options\?\.providersSync/,
  "Änderungen an Kategorien, Themenbereichen und Themen werden serialisiert und zentral bestätigt gespeichert."
);
assert.match(
  appSource,
  /function handleEditCategory[\s\S]*?managementCategorySaveRevision \+= 1;[\s\S]*?persistManagementCategoryStructureChange/,
  "Das Bearbeiten einer Kategorie nutzt den geschützten Stammdaten-Speicherweg statt des verzögerten Autosaves."
);
assert.match(
  appSource,
  /async function handleDeleteTopic[\s\S]*?providersSync: \{ forceFullSync: true \}/,
  "Beim Löschen eines Themas werden auch betroffene Anbieterzuordnungen zentral synchronisiert."
);
assert.match(
  appSource,
  /function findTopicByNormalizedName\(nameLike, excludedTopicId = ""\)[\s\S]*?getAllTopics\(\)\.find/,
  "Themennamen werden für den Duplikatschutz über alle Stammdaten hinweg normalisiert verglichen."
);
assert.match(
  appSource,
  /els\.topicForm\.addEventListener\("submit"[\s\S]*?findTopicByNormalizedName\(name\)[\s\S]*?existiert bereits[\s\S]*?createId\("topic"\)/,
  "Beim Anlegen eines Themas werden Doppeleinträge vor dem Speichern blockiert."
);
assert.match(
  appSource,
  /const mergedCategories = options\?\.persistCategories === true[\s\S]*?: remoteState\.categories;/,
  "Unabhängige CRM-Speicherungen übernehmen immer den aktuellen Kategorienstand vom Server."
);
assert.match(
  appSource,
  /async function persistManagementCategoryStructureChange[\s\S]*?persistCategories: true/,
  "Nur bestätigte Stammdaten-Aktionen dürfen Kategorien und Themen zentral überschreiben."
);
assert.match(
  appSource,
  /persistCategories: effectiveOptions\?\.persistCategories === true/,
  "Die explizite Stammdaten-Option muss bis zum finalen Supabase-Speicherschritt weitergereicht werden."
);
assert.match(
  appSource,
  /async function saveManagementCategoriesWithVerification\(\)[\s\S]*?verifyManagementCategoriesOnServer\(expectedCategories\)/,
  "Der manuelle Stammdaten-Speicherbutton prüft den geschriebenen Serverstand."
);

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
  ROLE_MITARBEITER: "mitarbeiter",
  ROLE_VERTRIEBSMITARBEITER: "vertriebsmitarbeiter",
  ROLE_ADMIN: "admin",
  ROLE_SUPERADMIN: "superadmin",
  PROVIDER_STATUS_CREATED: "angelegt",
  PROVIDER_STATUS_LIVE_PENDING: "live_pending",
  PROVIDER_STATUS_ARCHIVED: "archiviert",
  PROVIDER_CREATOR_DELETE_WINDOW_MS: 24 * 60 * 60 * 1000,
  providerListShowArchived: false,
  authProfile: null,
  normalizeText(value = "") {
    return String(value || "").trim().toLowerCase();
  },
  normalizeUserId(value = "") {
    return String(value || "").trim().replace(/^profile_/i, "");
  },
  normalizeUserRole(value = "") {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "supaadmin" ? "superadmin" : normalized;
  },
  parseBooleanFlag(value) {
    return value === true || ["true", "1", "yes", "ja"].includes(String(value || "").trim().toLowerCase());
  },
  normalizeProviderStatusValue(value = "") {
    const normalized = String(value || "").trim().toLowerCase().replace(/[-_]+/g, " ");
    if (["angelegt", "erstellt", "created"].includes(normalized)) {
      return "angelegt";
    }
    if (["erfasst", "in bearbeitung", "in progress", "progress", "bearbeitung", "claimed"].includes(normalized)) {
      return "in Bearbeitung";
    }
    if (["live pending", "live beantragt", "freigabe ausstehend"].includes(normalized)) {
      return "live_pending";
    }
    return normalized;
  },
  getCurrentUserId() {
    return "";
  },
  getUserDisplayNameByUserId(userId) {
    return userId === "claim-a" ? "Alicia Claim" : "";
  },
  providerVisibleForCurrentUser(provider) {
    return provider?.visible !== false;
  },
  isRoleAdmin(user) {
    return ["admin", "superadmin"].includes(String(user?.role || "").trim().toLowerCase());
  },
};
vm.createContext(context);

[
  "isSuperAdmin",
  "canCurrentUserExportProviders",
  "isSalesRepresentative",
  "canCurrentUserSetProviderDashboardCreated",
  "canCurrentUserUseProviderListSuperAdminFilters",
  "normalizeProviderInvitationRequestStatus",
  "getProviderInvitationRequestStatus",
  "isProviderInvitationRequestOpen",
  "isProviderInProgress",
  "getProviderInProgressClaimUserId",
  "getCurrentUserStableId",
  "getProviderRecordedInProgressClaimUserId",
  "isProviderInvitationLockedByAnotherUser",
  "isCurrentUserProviderInProgressOwner",
  "canCurrentUserManageProviderInvitation",
  "getProviderInvitationPermissionHint",
  "canCurrentUserRequestProviderInvitation",
  "canCurrentUserCancelProviderInvitation",
  "getProviderCompetitorName",
  "isProviderCompetitor",
  "canCurrentUserOpenProvider",
  "isProviderInProgressLockedForCurrentUser",
  "canCurrentUserWriteProviderDuringBackgroundSync",
  "normalizeProviderStatusHistoryEntry",
  "normalizeProviderStatusHistory",
  "getProviderCreatedAtMs",
  "isProviderCreatedWithinDeleteWindow",
  "hasProviderStatusEverChanged",
  "isProviderEligibleForPermanentDeletion",
  "canCurrentUserArchiveProvider",
  "findProviderRecordById",
  "isAllowedSalesNavigationTarget",
  "getProviderStatusBucket",
  "getProviderStatusFormComparableValue",
  "canSalesRepresentativeSetProviderStatus",
  "getProviderOverviewStatus",
  "providerMatchesStatusFilter",
  "normalizeQueuedProvidersSync",
  "mergeQueuedProvidersSync",
  "normalizeCountryLabel",
].forEach((name) => vm.runInContext(extractFunction(name), context));

const owner = { sourceId: "claim-a", name: "Alicia Claim", role: "mitarbeiter" };
const otherEmployee = { sourceId: "claim-b", name: "Benedikt Other", role: "mitarbeiter" };
const otherSales = { sourceId: "claim-c", name: "Carla Sales", role: "vertriebsmitarbeiter" };
const admin = { sourceId: "admin-1", name: "Admin", role: "admin" };
const superadmin = { sourceId: "super-1", name: "Superadmin", role: "superadmin" };

assert.equal(context.canCurrentUserExportProviders(superadmin), true, "Nur Superadmins dürfen Anbieter als CSV exportieren.");
assert.equal(context.canCurrentUserExportProviders(admin), false, "Admins dürfen keinen Anbieter-CSV-Export erstellen.");
assert.equal(context.canCurrentUserExportProviders(owner), false, "Mitarbeiter dürfen keinen Anbieter-CSV-Export erstellen.");
assert.equal(
  context.canCurrentUserSetProviderDashboardCreated(otherSales),
  true,
  "Vertriebsmitarbeiter dürfen Anbieter als im Dashboard angelegt markieren."
);
assert.equal(
  context.canCurrentUserSetProviderDashboardCreated(owner),
  false,
  "Mitarbeiter ohne Vertriebsrolle dürfen den Dashboard-Status nicht ändern."
);
assert.match(
  indexSource,
  /id="provider-export-btn" class="btn btn-primary superadmin-only-view"/,
  "Der Anbieter-CSV-Export wird außerhalb der Superadmin-Rolle ausgeblendet."
);

const openProvider = { id: "open", status: "offen", visible: true };
const inProgressByA = {
  id: "in-progress-a",
  status: "in Bearbeitung",
  inProgressByUserId: "claim-a",
  inProgressByName: "Alicia Claim",
  responsibleUserId: "claim-b",
  visible: true,
};
const inProgressWithoutClaim = { id: "in-progress-no-claim", status: "in Bearbeitung", visible: true };
const inProgressClaimedInHistory = {
  id: "in-progress-history-claim",
  status: "In Bearbeitung",
  visible: true,
  statusHistory: [{ toStatus: "In Bearbeitung", byUserId: "claim-a" }],
};
const liveProvider = { id: "live", status: "live", visible: true };
const archivedProvider = { id: "archived", status: "archiviert", visible: true };
const competitorProvider = {
  id: "competitor",
  status: "offen",
  visible: true,
  competitor: true,
  competitorName: "Muster-Mitbewerb",
};
const nowMs = Date.parse("2026-07-24T12:00:00.000Z");
const untouchedNewProvider = {
  id: "new-provider",
  status: "offen",
  createdAt: "2026-07-23T13:00:00.000Z",
  statusHistory: [{ fromStatus: "", toStatus: "offen", at: "2026-07-23T13:00:00.000Z" }],
};
const statusChangedThenResetProvider = {
  ...untouchedNewProvider,
  statusHistory: [
    { fromStatus: "", toStatus: "offen", at: "2026-07-23T13:00:00.000Z" },
    { fromStatus: "offen", toStatus: "in Bearbeitung", at: "2026-07-23T14:00:00.000Z" },
    { fromStatus: "in Bearbeitung", toStatus: "offen", at: "2026-07-23T15:00:00.000Z" },
  ],
};

assert.equal(
  context.findProviderRecordById("570", [{ id: 570, name: "Numerische Anbieter-ID" }])?.name,
  "Numerische Anbieter-ID",
  "Datensatz-Klicks finden auch ältere Anbieter mit numerischer ID."
);
assert.equal(
  context.normalizeCountryLabel("ÖSterreich"),
  "Österreich",
  "Falsch geschriebene Österreich-Varianten werden in der Landauswahl zusammengeführt."
);

assert.equal(context.canCurrentUserRequestProviderInvitation(openProvider, owner), false, "Ohne In-Bearbeitung-Status keine Einladung.");
assert.equal(
  context.getProviderInvitationPermissionHint(openProvider, owner),
  "Die Einladung ist erst verfügbar, wenn der Status „In Bearbeitung“ gesetzt wurde.",
  "Der Status-Hinweis benennt klar die Voraussetzung für eine Einladung."
);
assert.equal(context.canCurrentUserOpenProvider(openProvider, otherEmployee), true, "Sichtbare offene Anbieter bleiben zugänglich.");
assert.equal(
  context.canCurrentUserOpenProvider(competitorProvider, otherEmployee),
  false,
  "Ein bei Mitbewerb platzierter Anbieter ist für Mitarbeiter gesperrt."
);
assert.equal(
  context.canCurrentUserOpenProvider(competitorProvider, admin),
  true,
  "Admin kann den Mitbewerb-Fall zur Klärung einsehen."
);
assert.equal(
  context.hasProviderStatusEverChanged(untouchedNewProvider),
  false,
  "Der anfängliche Neu-Status zählt nicht als Statusänderung."
);
assert.equal(
  context.isProviderEligibleForPermanentDeletion(untouchedNewProvider),
  true,
  "Ein unveränderter Neu-Datensatz kann grundsätzlich endgültig gelöscht werden."
);
assert.equal(
  context.isProviderCreatedWithinDeleteWindow(untouchedNewProvider, nowMs),
  true,
  "Der Ersteller darf einen Neu-Datensatz innerhalb von 24 Stunden löschen."
);
assert.equal(
  context.isProviderCreatedWithinDeleteWindow(
    { ...untouchedNewProvider, createdAt: "2026-07-23T11:59:59.000Z" },
    nowMs
  ),
  false,
  "Nach Ablauf von 24 Stunden ist endgültiges Löschen für keine Rolle mehr möglich."
);
assert.equal(
  context.hasProviderStatusEverChanged(statusChangedThenResetProvider),
  true,
  "Auch ein zurückgesetzter Status bleibt dauerhaft von der Löschung ausgeschlossen."
);
assert.equal(
  context.isProviderEligibleForPermanentDeletion(statusChangedThenResetProvider),
  false,
  "Nach einer Statusänderung bleibt nur Archivierung möglich."
);
assert.match(
  indexSource,
  /id="provider-archive-btn"/,
  "Admin und Superadmin erhalten eine eigene Archivierungsaktion."
);
assert.match(indexSource, /data-superadmin-login-audit>Letzte CRM-Anmeldung<\/th>/, "Superadmins sehen die letzte CRM-Anmeldung je Mitarbeiter.");
assert.match(appSource, /void recordCurrentUserLogin\(\)/, "Jede erfolgreiche CRM-Anmeldung wird zentral protokolliert.");
assert.match(indexSource, /data-target="ceo-secretary-section">\s*Sekretär/, "Der Navigationspunkt CEO Office heißt Sekretär.");
assert.doesNotMatch(indexSource, /data-nav-toggle="activities-submenu"/, "Aktivitäten wird nicht mehr in der Navigation angezeigt.");
assert.doesNotMatch(indexSource, /data-target="conversation-notes-section"/, "Gesprächsnotizen ist nicht mehr als Navigationseintrag verfügbar.");
assert.match(indexSource, /data-target="users-section">\s*Mitarbeiter/, "Die allgemeine Mitarbeiterliste ist im Organisationsmenü erreichbar.");
assert.match(indexSource, /data-target="employee-admin-section">\s*Mitarbeiterverwaltung/, "Superadmins erreichen die Mitarbeiterverwaltung mit der Login-Übersicht.");
const financeNavigationIndex = indexSource.indexOf('data-nav-toggle="finance-submenu"');
assert.ok(financeNavigationIndex >= 0, "Die Finanznavigation bleibt unverändert erreichbar.");
assert.doesNotMatch(
  indexSource,
  /data-target="my-inventory-section"/,
  "Mein Inventar ist für Mitarbeiter und Vertrieb kein eigener Navigationseintrag mehr."
);
assert.match(
  indexSource,
  /id="my-account-section"[\s\S]*id="my-account-inventory-section"[\s\S]*id="my-inventory-list"/,
  "Zugeordnetes Inventar ist klar gegliedert in Mein Konto integriert."
);
assert.match(
  appSource,
  /const isEmployeeAccount = \[ROLE_MITARBEITER, ROLE_VERTRIEBSMITARBEITER\]\.includes\(currentRole\)[\s\S]*myAccountInventorySection\.classList\.toggle\("hidden", !showInMyAccount\)/,
  "Nur Mitarbeiter und Vertrieb sehen ihr zugeordnetes Inventar im Konto; für Admins bleibt es in Organisation."
);
assert.match(
  appSource,
  /myAccountLayout\?\.classList\.toggle\("has-account-inventory", showInMyAccount\)/,
  "Die Kontoseite markiert einen sichtbaren Inventarbereich für die gleich große Zweispalten-Anordnung."
);
assert.match(
  stylesSource,
  /\.my-account-layout \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)[\s\S]*\.my-account-layout:not\(\.has-account-inventory\) \.my-account-password-form \{[\s\S]*grid-column: 1 \/ -1/,
  "Passwort und Inventar stehen gleich groß nebeneinander; ohne Inventar nutzt das Passwort die volle Breite."
);
assert.match(
  appSource,
  /async function refreshProviderOverviewFromSupabase[\s\S]*renderProvidersTable\(\)/,
  "Die Anbieterübersicht wird im Hintergrund ohne manuelle Aktualisierung nachgezogen."
);
assert.match(
  appSource,
  /remoteUpdatedAt && remoteUpdatedAt === lastRemoteStateUpdatedAt[\s\S]*refreshProviderOverviewFromSupabase\(\{ force: true \}\)/,
  "Die geöffnete Anbieterübersicht wird bei jedem leisen Remote-Pull abgeglichen."
);
assert.match(
  appSource,
  /const preserveProvidersTable = !canRefreshProviderOverviewSilently\(\) \|\| !providersChanged;/,
  "Die Anbieterübersicht wird nur bei tatsächlich geänderten Anbieter-Daten neu gezeichnet."
);
assert.match(
  appSource,
  /upsert\(chunk, \{ onConflict: "id" \}\)\.select\("id"\)[\s\S]*Anbieter-Speicherung wurde nicht bestätigt/,
  "Ein Anbieter-Upsert gilt erst nach bestätigter providers-ID als gespeichert."
);
assert.match(
  appSource,
  /hasExplicitProviderTableSyncAction\(providersSync\)[\s\S]*providers_sync_failed/,
  "Explizite Anbieter-Änderungen fallen nicht still auf app_state zurück."
);
assert.match(indexSource, /app-provider-workflow-v66/, "Die Anbieter-Statuslogik wird ohne Browser-Cache geladen.");
assert.match(indexSource, /styles-provider-workflow-v66/, "Die Anbieter-Statusleiste wird ohne Browser-Cache gestaltet.");
assert.match(
  indexSource,
  /data-target="provider-coverage-section"[\s\S]*Abdeckung/,
  "Superadmins und Vertriebsmitarbeiter finden die Abdeckung direkt unter Anbieter."
);
assert.match(
  indexSource,
  /id="my-account-nav-btn"[\s\S]*data-target="my-account-section"[\s\S]*id="my-account-password-form"[\s\S]*currentPassword[\s\S]*newPassword[\s\S]*confirmPassword/,
  "Alle Rollen erreichen über Mein Konto einen eigenen, abgesicherten Passwortwechsel."
);
assert.match(
  appSource,
  /async function handleMyAccountPasswordChange\(\)[\s\S]*signInWithPassword\([\s\S]*updateUser\(\{ password: newPassword, current_password: currentPassword \}\)/,
  "Das aktuelle Passwort wird vor der Änderung geprüft; nur danach wird das neue Passwort an Supabase übergeben."
);
assert.match(
  indexSource,
  /id="my-account-password-rules"[\s\S]*data-rule="special"[\s\S]*data-rule="match"/,
  "Mein Konto zeigt während der Eingabe alle Passwort-Kriterien sichtbar an."
);
assert.match(
  appSource,
  /function refreshMyAccountPasswordRules\(\)[\s\S]*getAuthSignUpPasswordValidation/,
  "Die Kriterien unter Mein Konto werden direkt aus der laufenden Passworteingabe aktualisiert."
);
assert.match(
  indexSource,
  /id="auth-forgot-password-btn"[\s\S]*id="auth-password-recovery-form"[\s\S]*id="auth-password-recovery-rules"/,
  "Die Anmeldung bietet Passwort vergessen und eine gesicherte Passwort-Neuvergabe."
);
assert.match(
  appSource,
  /resetPasswordForEmail\(email, \{ redirectTo: getPasswordRecoveryRedirectUrl\(\) \}\)[\s\S]*client\.auth\.updateUser\(\{ password: newPassword \}\)/,
  "Ein Rücksetzlink führt in eine eigene Sitzung, die nur das neue Passwort speichern kann."
);
assert.match(
  indexSource,
  /id="provider-analytics-state-filter"[\s\S]*id="provider-analytics-category-list"[\s\S]*id="provider-analytics-opportunity-list"/,
  "Die Abdeckungsansicht bietet Bundesland-Filter, Kategorie-Balken und Chancenliste."
);
assert.match(
  appSource,
  /function getProviderAnalyticsScope\(\)[\s\S]*providerVisibleForCurrentUser\(provider, currentUser, platformCountryFilter\)[\s\S]*!isProviderCompetitor\(provider\)[\s\S]*PROVIDER_STATUS_ARCHIVED/,
  "Die Abdeckung folgt Plattform-Land und Sichtbarkeit und zählt nur aktive eigene Anbieter."
);
assert.match(
  appSource,
  /function canCurrentUserViewProviderAnalytics\(user = getCurrentUser\(\)\)[\s\S]*isSuperAdmin\(user\)[\s\S]*isSalesRepresentative\(user\)/,
  "Die Abdeckung ist für Superadmins und Vertriebsmitarbeiter freigegeben."
);
assert.match(
  appSource,
  /function renderProviderAnalyticsSection\(\)[\s\S]*canCurrentUserViewProviderAnalytics\(\)[\s\S]*isProviderDashboardCreated\(provider\)/,
  "Die Abdeckung wertet den Dashboard-Status aus."
);
assert.match(
  indexSource,
  /id="provider-analytics-detail-modal"[\s\S]*id="provider-analytics-detail-open-overview"/,
  "Eine Kategorie kann ihre fehlenden Anbieter zeigen und in die Übersicht weiterführen."
);
assert.match(
  appSource,
  /function openProviderAnalyticsCategoryModal\(categoryId\)[\s\S]*!isProviderDashboardCreated\(provider\)[\s\S]*openProviderAnalyticsCategoryInOverview/,
  "Kategorie-Details zeigen nur fehlende Anbieter und können exakt zur Anbieterübersicht wechseln."
);
assert.match(
  indexSource,
  /id="provider-list-search-field"[\s\S]*provider-list-primary-filters[\s\S]*Alle Personen[\s\S]*id="provider-list-category-filter"[\s\S]*Alle Bundesländer[\s\S]*provider-list-extra-filters provider-list-advanced-filter-view[\s\S]*Archivierte Anbieter einblenden[\s\S]*Nur Mitbewerb[\s\S]*Im Dashboard angelegte ausblenden/,
  "Die Suche steht getrennt; der erweiterte Filter liegt eingeklappt unter den Standardfiltern."
);
assert.match(
  appSource,
  /function renderProviderCategoryFilters\(\)[\s\S]*Alle Kategorien[\s\S]*Ohne Kategorie[\s\S]*providerMatchesDashboardCreatedVisibilityFilter/,
  "Die Anbieterübersicht kann nach Kategorie filtern und bereits im Dashboard angelegte Datensätze ausblenden."
);
assert.match(
  appSource,
  /function canCurrentUserUseProviderListAdvancedFilters\(currentUser = getCurrentUser\(\)\)[\s\S]*isSuperAdmin\(currentUser\) \|\| isSalesRepresentative\(currentUser\)[\s\S]*function canCurrentUserUseProviderListSuperAdminFilters[\s\S]*isSuperAdmin\(currentUser\)[\s\S]*providerListShowArchived = false[\s\S]*providerListShowCompetitors = false/,
  "Vertrieb erhält den Dashboard-Ausschluss, Archiv- und Mitbewerbfilter bleiben funktional Superadmins vorbehalten."
);
assert.match(
  appSource,
  /const lockedByInProgress = isProviderInProgressLockedForCurrentUser\(provider, currentUser\)[\s\S]*Gesperrt · In Bearbeitung durch[\s\S]*provider-analytics-detail-provider-lock/,
  "Im Kategorie-Popup werden von anderen Mitarbeitern gesperrte Anbieter sichtbar begründet."
);
assert.match(
  indexSource,
  /class="provider-meta-dashboard-toggle provider-dashboard-created-toggle hidden"[\s\S]*name="dashboardCreated"/,
  "Admins und Vertriebsmitarbeiter erhalten einen separaten Schalter für bereits angelegte Anbieter."
);
assert.match(
  appSource,
  /const dashboardCreated = competitor[\s\S]*canSetDashboardCreated[\s\S]*dashboardCreated,[\s\S]*dashboard_created: dashboardCreated/,
  "Der Dashboard-Status wird beim Speichern für Vertriebsmitarbeiter übernommen und bei Mitbewerb deaktiviert."
);
assert.match(
  appSource,
  /async function syncProviderDashboardCreatedToggle[\s\S]*localChangesPendingRemoteSync = true;[\s\S]*renderProvidersTable\(\)[\s\S]*persistCriticalStateSnapshot\(\{[\s\S]*providersSync/,
  "Der Dashboard-Status aktualisiert die Anbieterübersicht sofort und wird anschließend synchronisiert."
);
assert.doesNotMatch(
  extractFunction("syncProviderDashboardCreatedToggle"),
  /deferAppState: true/,
  "Der Dashboard-Schalter wartet auf den vollständig bestätigten Server-Speichervorgang."
);
assert.match(
  indexSource,
  /class="provider-dashboard-created-sync"[\s\S]*aria-label="Dashboard-Status wird synchronisiert"/,
  "Der Dashboard-Schalter enthält einen Ladeindikator für die Synchronisierung."
);
assert.match(
  indexSource,
  /name="competitor"[\s\S]*Mitbewerb[\s\S]*name="competitorName"/,
  "Anbieter bearbeiten bietet eine Mitbewerb-Markierung mit verpflichtendem Namen."
);
assert.doesNotMatch(indexSource, /provider-competitor-symbol/, "Der Mitbewerb-Schalter enthält kein Einbahnzeichen.");
assert.match(
  appSource,
  /async function syncProviderCompetitorToggle[\s\S]*requestProviderCompetitorName[\s\S]*persistCriticalStateSnapshot/,
  "Mitbewerb-Markierungen werden mit Namensabfrage sofort synchronisiert."
);
assert.match(
  extractFunction("syncProviderCompetitorToggle"),
  /remoteStatePullInFlight[\s\S]*pullWaitDeadline[\s\S]*persistCriticalStateSnapshot/,
  "Der Mitbewerb-Schalter wartet auf laufende Hintergrund-Pulls und speichert anschließend exklusiv."
);
assert.doesNotMatch(
  extractFunction("syncProviderCompetitorToggle"),
  /Mitbewerb entfernen/,
  "Das Deaktivieren der Mitbewerb-Markierung benötigt keine zweite Bestätigung."
);
assert.match(
  stylesSource,
  /\.provider-status-slider\.status-in-progress \.provider-status-slider-indicator \{[\s\S]*linear-gradient\(135deg, #075fc1 0%, #1687eb 50%, #70b8ff 100%\)/,
  "Der Status In Bearbeitung ist als deutlicher blauer Verlauf gestaltet."
);
assert.match(
  stylesSource,
  /\.provider-status-slider\.status-live \.provider-status-slider-indicator \{[\s\S]*linear-gradient\(135deg, #0a8b47 0%, #16bf67 50%, #7ce49d 100%\)/,
  "Der Live-Status ist als deutlicher grüner Verlauf gestaltet."
);
assert.match(
  appSource,
  /Mitbewerb-Hinweis[\s\S]*Trotzdem aktivieren/,
  "Das Aktivieren von Dashboard angelegt warnt bei Mitbewerb-Datensätzen."
);
assert.match(
  appSource,
  /class="provider-competitor-info"[\s\S]*class="provider-competitor-symbol"/,
  "Die Anbieterübersicht kennzeichnet Mitbewerb mit dem roten Einbahnzeichen."
);
assert.match(
  indexSource,
  /class="provider-audit-history"[\s\S]*provider-created-meta[\s\S]*provider-live-meta[\s\S]*class="provider-status-workflow"/,
  "Die Anbieter-Historie steht über der Statusleiste über die gesamte Breite."
);
assert.match(
  appSource,
  /class="provider-competitor-popover"[\s\S]*Mitbewerb[\s\S]*competitorName[\s\S]*zur Klärung durch den Admin gesperrt/,
  "Das Einbahnzeichen zeigt den Mitbewerb und die Sperre zur Admin-Klärung im Hover-Fenster."
);
assert.match(
  stylesSource,
  /\.provider-competitor-popover \{[\s\S]*min-width: 340px;[\s\S]*backdrop-filter: blur\(18px\) saturate\(1\.2\);/,
  "Das Mitbewerb-Hoverfeld ist groß und mit einer dezenten Glasoptik gestaltet."
);
assert.match(
  appSource,
  /function isProviderCompetitorLockedForCurrentUser[\s\S]*isProviderCompetitor\(provider\) && !isRoleAdmin\(currentUser\)/,
  "Mitbewerb-Datensätze sind für Mitarbeiter bis zur Admin-Klärung gesperrt."
);
assert.match(
  appSource,
  /async function syncProviderDashboardCreatedToggle[\s\S]*if \(isProviderCompetitor\(provider\)\)[\s\S]*zur Klärung durch den Admin gesperrt/,
  "Bei Mitbewerb kann der Dashboard-Schalter nicht aktiviert werden."
);
assert.match(
  appSource,
  /async function leaveProviderForm[\s\S]*close && isProviderCompetitor\(activeProvider\)[\s\S]*clearProviderForm\(\)[\s\S]*setProvidersView\("list"\)/,
  "Ein bereits synchronisierter Mitbewerb-Datensatz lässt sich immer zurück zur Übersicht schließen."
);
assert.match(appSource, /function canSalesRepresentativeSetProviderStatus/, "Statuswechsel für Vertriebsmitarbeiter werden separat eingeschränkt.");
assert.match(appSource, /Anbieter bereits im Dashboard angelegt/, "Bereits angelegte Anbieter erhalten einen eindeutigen Hinweis.");
assert.doesNotMatch(indexSource, /sales-dashboard-header-chip/, "Funktionslose Tabs stehen nicht mehr unter dem Vertriebs-Dashboard.");
assert.match(appSource, /sectionId === "employee-admin-section" && !roleSuperAdmin/, "Die Login-Übersicht ist ausschließlich für Superadmins geschützt.");
assert.match(appSource, /function mergeEmployeeLastLoginAtByUserId/, "Login-Zeitstempel werden beim parallelen Speichern zusammengeführt.");
assert.match(appSource, /automaticLoginPopupShownForSession/, "Pro Anmeldung wird höchstens ein automatisches Pop-up geöffnet.");
assert.match(appSource, /await persistCriticalStateSnapshot\(\{ retries: 3 \}\)/, "Die Auswahl „Nicht mehr automatisch anzeigen“ wird zentral gespeichert.");
assert.match(indexSource, /id="ceo-secretary-team-message-form"/, "Der Sekretär bietet ein Formular für Mitarbeiternachrichten.");
assert.match(appSource, /function handleCeoSecretaryTeamMessageSubmit/, "Sekretär-Nachrichten werden serverseitig gespeichert.");
assert.match(appSource, /kind: "employee_message"/, "Empfänger sehen Sekretär-Nachrichten in ihrer Glocke.");
assert.match(indexSource, /id="login-notification-briefing-close" class="btn btn-success">Schließen/, "Der Login-Hinweis lässt sich schließen.");
assert.doesNotMatch(indexSource, /id="login-notification-briefing-show-all"/, "Der Login-Hinweis führt nicht direkt in die Glocke.");
assert.match(appSource, /Nachricht von \$\{senderName\}/, "Glockenmeldungen nennen den sendenden Superadmin.");
assert.match(appSource, /Nachricht dauerhaft entfernen/, "Das X einer Glockenmeldung ist als dauerhafte Löschung bezeichnet.");
assert.match(appSource, /data-login-notification-dismiss/, "Meldungen können bereits im Login-Popup dauerhaft entfernt werden.");
assert.match(appSource, /const dismissible = true;/, "Jede Glockenmeldung bietet ein X zum dauerhaften Entfernen.");
assert.match(
  appSource,
  /if \(options\?\.notification === true\) \{\s*appendAdminSystemNotification\(text, tone\);/,
  "Technische Browser- und Statushinweise werden nicht automatisch in der Glocke angezeigt."
);
assert.match(
  appSource,
  /adminNotificationDismissedById: mergedAdminNotificationDismissedById/,
  "Eine mit X entfernte Glockenmeldung bleibt beim zentralen Speichern dauerhaft entfernt."
);
assert.match(
  indexSource,
  /class="brand-logo-mark"[\s\S]*src="\/assets\/my-waycard-logo\.png\?v=20260724-2"[\s\S]*class="brand-crm-label">CRM<\/strong>/,
  "Der Header zeigt CRM rechts neben dem Logo."
);
assert.doesNotMatch(indexSource, /class="brand-domain">my-waycard\.com<\/span>/, "Die Domain steht nicht mehr über CRM.");
assert.match(
  appSource,
  /function applyHeaderBrandingLogo\(logoUrl, options = \{\}\)[\s\S]*els\.brandLogoImage\.src = logoUrl/,
  "Eine gespeicherte Branding-Datei oder -URL wird im Header gesetzt."
);
assert.match(
  appSource,
  /const logoUrl = configuredLogoUrl \|\| HEADER_DEFAULT_LOGO_URL[\s\S]*applyHeaderBrandingLogo\(logoUrl, \{ isCustom: Boolean\(configuredLogoUrl\) \}\)/,
  "Eine gespeicherte Branding-Datei wird direkt und ohne nachgelagerte Bildumwandlung im Header angezeigt."
);
assert.match(
  appSource,
  /await readFileAsDataUrl\(logoFile\)[\s\S]*persistCriticalStateSnapshot\(\{ retries: 3 \}\)/,
  "Ein hochgeladenes Header-Logo wird erst nach dauerhafter Speicherung bestätigt."
);
assert.match(
  appSource,
  /function isProviderLifecycleActionAvailableInEditor\(providerId\)/,
  "Lösch- und Archivaktionen sind ausdrücklich an den Anbieter-Editor gebunden."
);
assert.match(
  extractFunction("isProviderLifecycleActionAvailableInEditor"),
  /providersViewMode === "form"[\s\S]*providerDetailTab === "master"/,
  "Löschen und Archivieren sind nur auf der Seite Anbieter bearbeiten im Stammdaten-Tab verfügbar."
);
assert.match(
  providerDeletionPolicySource,
  /created_at >= now\(\) - interval '24 hours'/,
  "Die 24-Stunden-Löschfrist wird serverseitig geprüft."
);
assert.match(
  providerDeletionPolicySource,
  /public\.is_superadmin\(\)\s*and created_at >= now\(\) - interval '24 hours'\s*and not public\.provider_status_has_changed/,
  "Auch Superadmins dürfen nur innerhalb von 24 Stunden unveränderte Neu-Datensätze endgültig löschen."
);

assert.match(
  appSource,
  /data-provider-invitation-status-blocked="true"/,
  "Bei einem fehlenden In-Bearbeitung-Status bleibt der Einladungs-Schalter für den Hinweis ansprechbar."
);
assert.match(
  appSource,
  /openProviderInvitationInfoModal\(\{ state: "permission" \}\)/,
  "Die Status-Sperre öffnet nach einem Klick den einzelnen Einladungs-Hinweisdialog."
);
assert.doesNotMatch(
  appSource,
  /providersTableBody\.addEventListener\("pointerover"/,
  "Der Status-Hinweis darf nicht bereits beim Überfahren der Schaltfläche erscheinen."
);
assert.match(
  appSource,
  /\["pending", "success", "error", "permission", "provider-locked"\]/,
  "Der Einladungsdialog kennt auch den Sperrhinweis für bereits bearbeitete Anbieter."
);

assert.equal(context.canCurrentUserRequestProviderInvitation(inProgressByA, owner), true, "Claim-Inhaber darf einladen.");
assert.equal(context.canCurrentUserCancelProviderInvitation({ ...inProgressByA, invitationRequestStatus: "open" }, owner), true, "Claim-Inhaber darf offene Einladung zurücknehmen.");
assert.equal(context.canCurrentUserOpenProvider(inProgressByA, owner), true, "Claim-Inhaber darf Anbieter öffnen.");
assert.equal(
  context.isProviderInvitationLockedByAnotherUser(inProgressByA, otherEmployee),
  true,
  "Eine fremde Bearbeitung zeigt beim Einladungs-Schalter den Bearbeitungs-Hinweis."
);
assert.equal(
  context.isProviderInvitationLockedByAnotherUser(inProgressByA, owner),
  false,
  "Der Claim-Inhaber erhält keinen falschen Fremd-Bearbeitungs-Hinweis."
);
assert.equal(
  context.isProviderInvitationLockedByAnotherUser(statusChangedThenResetProvider, otherEmployee),
  false,
  "Ein Anbieter mit aktuellem Neu-Status zeigt trotz früherer Bearbeitung nur den Neu-Status-Hinweis."
);

assert.equal(context.canCurrentUserRequestProviderInvitation(inProgressByA, otherEmployee), false, "Fremder Mitarbeiter darf nicht einladen.");
assert.equal(context.canCurrentUserCancelProviderInvitation({ ...inProgressByA, invitationRequestStatus: "open" }, otherEmployee), false, "Fremder Mitarbeiter darf nicht zurücknehmen.");
assert.equal(context.canCurrentUserOpenProvider(inProgressByA, otherEmployee), false, "Fremder Mitarbeiter darf nicht öffnen.");
assert.equal(context.canCurrentUserOpenProvider(inProgressByA, otherSales), false, "Fremder Vertrieb darf nicht öffnen.");
assert.equal(
  context.isProviderInProgressLockedForCurrentUser(inProgressByA, otherEmployee),
  true,
  "Ein von einer anderen Person bearbeiteter Anbieter löst den Sperrhinweis aus."
);
assert.match(
  appSource,
  /title: "Datensatz bereits in Bearbeitung"/,
  "Die Anbieterübersicht enthält einen eindeutigen Sperrhinweis."
);
assert.match(
  appSource,
  /openProviderOverviewLockedModal\(provider\)/,
  "Ein Klick auf einen gesperrten Anbieter öffnet den Sperrhinweis statt des Editors."
);
assert.match(
  appSource,
  /function openProviderInvitationLockedModal\(provider\)/,
  "Der Einladungs-Schalter kennt einen eigenen Hinweis für fremde Bearbeitungen."
);
assert.match(
  appSource,
  /Dieser Datensatz wurde bereits von \$\{responsibleLabel\} auf „In Bearbeitung“ gesetzt/,
  "Der Einladungs-Hinweis erklärt die Bearbeitung durch eine andere Person eindeutig."
);

assert.equal(context.canCurrentUserRequestProviderInvitation(inProgressByA, admin), false, "Ein fremder Admin darf keinen laufenden Datensatz einladen.");
assert.equal(context.canCurrentUserCancelProviderInvitation({ ...inProgressByA, invitationRequestStatus: "open" }, admin), false, "Ein fremder Admin darf keinen laufenden Auftrag zurücknehmen.");
assert.equal(context.canCurrentUserOpenProvider(inProgressByA, admin), false, "Ein fremder Admin darf einen laufenden Datensatz nicht öffnen.");
assert.equal(context.canCurrentUserOpenProvider(inProgressByA, superadmin), true, "Superadmin darf öffnen.");

assert.equal(context.canCurrentUserOpenProvider(inProgressWithoutClaim, owner), false, "Fehlende Claim-ID wird fail-closed behandelt.");
assert.equal(context.canCurrentUserRequestProviderInvitation(inProgressWithoutClaim, owner), false, "Ohne belastbaren Claim keine Einladung.");
assert.equal(context.canCurrentUserOpenProvider(inProgressWithoutClaim, admin), false, "Auch Admins dürfen einen laufenden Legacy-Datensatz ohne Claim nicht öffnen.");

assert.equal(
  context.canCurrentUserOpenProvider(inProgressClaimedInHistory, owner),
  true,
  "Der Inhaber eines nur im Statusverlauf gespeicherten Claims darf seinen Anbieter öffnen."
);
assert.equal(
  context.canCurrentUserOpenProvider(inProgressClaimedInHistory, otherSales),
  false,
  "Der Statusverlauf öffnet fremden Vertriebsmitarbeitern keinen laufenden Anbieter."
);

["erfasst", "progress", "claimed"].forEach((legacyStatus) => {
  const legacyInProgress = { ...inProgressByA, status: legacyStatus };
  assert.equal(
    context.canCurrentUserOpenProvider(legacyInProgress, otherEmployee),
    false,
    `Legacy-Status ${legacyStatus} bleibt für fremde Mitarbeiter gesperrt.`
  );
  assert.equal(
    context.canCurrentUserRequestProviderInvitation(legacyInProgress, owner),
    true,
    `Claim-Inhaber kann bei Legacy-Status ${legacyStatus} einladen.`
  );
});

assert.equal(context.canCurrentUserOpenProvider(liveProvider, otherEmployee), true, "Andere Status werden nicht als In-Bearbeitung gesperrt.");
assert.equal(context.canCurrentUserRequestProviderInvitation(liveProvider, admin), false, "Auch Admin benötigt den aktuellen In-Bearbeitung-Status für den Schalter.");

assert.equal(
  context.isAllowedSalesNavigationTarget("sales-phone-section", "vertriebsmitarbeiter"),
  false,
  "Telefonakquise ist für Vertriebsmitarbeiter nicht erreichbar."
);
assert.equal(
  context.isAllowedSalesNavigationTarget("tour-planner-section", "vertriebsmitarbeiter"),
  false,
  "Tourenplanung ist für Vertriebsmitarbeiter nicht erreichbar."
);
assert.equal(
  context.isAllowedSalesNavigationTarget("provider-coverage-section", "vertriebsmitarbeiter"),
  true,
  "Anbieter-Abdeckung ist für Vertriebsmitarbeiter erreichbar."
);
assert.equal(
  context.isAllowedSalesNavigationTarget("providers-section", "vertriebsmitarbeiter"),
  true,
  "Anbieter bleibt für Vertriebsmitarbeiter erreichbar."
);
assert.equal(
  context.isAllowedSalesNavigationTarget("sales-phone-section", "mitarbeiter"),
  true,
  "Die Einschränkung gilt ausschließlich für die Rolle Vertriebsmitarbeiter."
);
assert.equal(
  context.canSalesRepresentativeSetProviderStatus("offen", "in Bearbeitung"),
  true,
  "Vertriebsmitarbeiter dürfen offene Anbieter in Bearbeitung nehmen."
);
assert.equal(
  context.canSalesRepresentativeSetProviderStatus("in Bearbeitung", "live_pending"),
  true,
  "Vertriebsmitarbeiter dürfen ihre Bearbeitung zur Live-Beantragung weiterstellen."
);
assert.equal(
  context.canSalesRepresentativeSetProviderStatus("offen", "live_pending"),
  false,
  "Vertriebsmitarbeiter dürfen die Live-Beantragung nicht überspringen."
);
assert.equal(
  context.canSalesRepresentativeSetProviderStatus("live_pending", "live"),
  false,
  "Die finale LIVE-Freigabe bleibt Admins vorbehalten."
);

function assertProviderOverviewStatus(status, expectedKey, expectedLabel, message) {
  const result = context.getProviderOverviewStatus(status);
  assert.equal(result.key, expectedKey, message);
  assert.equal(result.label, expectedLabel, message);
}

assertProviderOverviewStatus("offen", "offen", "Offen", "Die Anbieterübersicht zeigt offene Datensätze als Offen.");
assertProviderOverviewStatus(
  "angelegt",
  "offen",
  "Offen",
  "Die Altkennzeichnung Angelegt wird in der Übersicht als bearbeitbarer offener Vorgang behandelt."
);
assertProviderOverviewStatus(
  "rueckruf",
  "in Bearbeitung",
  "In Bearbeitung",
  "Telefonakquise-Detailstatus werden in der Anbieterübersicht zusammengefasst."
);
assertProviderOverviewStatus(
  "live_pending",
  "live_pending",
  "Live-Beantragung",
  "Eine Live-Beantragung bleibt in der Anbieterübersicht eindeutig erkennbar."
);
assertProviderOverviewStatus("live", "live", "LIVE", "LIVE bleibt in der Anbieterübersicht eindeutig erkennbar.");
assertProviderOverviewStatus(
  "archiviert",
  "archiviert",
  "Archiviert",
  "Archivierte Anbieter erhalten nur in der Superadmin-Ansicht einen eindeutigen Status."
);
assert.equal(
  context.canCurrentUserArchiveProvider(liveProvider, superadmin),
  true,
  "Superadmins können Anbieter im Bearbeiten-Formular archivieren."
);
assert.equal(
  context.providerMatchesStatusFilter(archivedProvider, "archiviert", superadmin),
  true,
  "Superadmins können archivierte Anbieter über den Statusfilter anzeigen."
);
assert.equal(
  context.providerMatchesStatusFilter(archivedProvider, "archiviert", admin),
  false,
  "Admins erhalten keine Archivansicht in der Anbieterübersicht."
);
assert.equal(
  context.providerMatchesStatusFilter(archivedProvider, "all", superadmin),
  false,
  "Archivierte Anbieter bleiben bis zur bewussten Auswahl des Archivfilters ausgeblendet."
);

assert.equal(
  context.canCurrentUserWriteProviderDuringBackgroundSync(inProgressByA, owner),
  true,
  "Claim-Inhaber darf seinen laufenden Datensatz im Hintergrund speichern."
);
assert.equal(
  context.canCurrentUserWriteProviderDuringBackgroundSync(inProgressByA, otherEmployee),
  false,
  "Ein Hintergrundsync darf einen fremden laufenden Datensatz nicht überschreiben."
);
assert.equal(
  context.canCurrentUserWriteProviderDuringBackgroundSync(openProvider, otherEmployee),
  true,
  "Nicht gesperrte Datensätze bleiben im Hintergrund speicherbar."
);

const mergedUpserts = context.mergeQueuedProvidersSync(
  { upsertProviderIds: ["provider-a"], deleteProviderIds: [], forceFullSync: false },
  { upsertProviderIds: ["provider-b"], deleteProviderIds: [], forceFullSync: false }
);
assert.equal(
  JSON.stringify(mergedUpserts),
  JSON.stringify({ upsertProviderIds: ["provider-a", "provider-b"], deleteProviderIds: [], forceFullSync: false }),
  "Mehrere Änderungen innerhalb eines Speicherintervalls werden zusammengeführt."
);
const deletionWins = context.mergeQueuedProvidersSync(
  { upsertProviderIds: ["provider-a"], deleteProviderIds: [], forceFullSync: false },
  { upsertProviderIds: [], deleteProviderIds: ["provider-a"], forceFullSync: false }
);
assert.equal(
  JSON.stringify(deletionWins),
  JSON.stringify({ upsertProviderIds: [], deleteProviderIds: ["provider-a"], forceFullSync: false }),
  "Eine spätere Löschung ersetzt einen früheren Upsert desselben Datensatzes."
);
const fullSyncWins = context.mergeQueuedProvidersSync(
  { upsertProviderIds: ["provider-a"], deleteProviderIds: [], forceFullSync: false },
  { upsertProviderIds: [], deleteProviderIds: [], forceFullSync: true }
);
assert.equal(fullSyncWins.forceFullSync, true, "Ein vollständiger Abgleich umfasst alle vorherigen Änderungen.");

const linkHandlerStart = appSource.indexOf("async function handleLinkPartnerRequestToExistingProvider");
const linkHandlerEnd = appSource.indexOf("\nasync function handlePartnerRequestResponsibilityTransfer", linkHandlerStart);
assert.notEqual(linkHandlerStart, -1, "Der Partneranfrage-Verknüpfungsprozess ist vorhanden.");
assert.notEqual(linkHandlerEnd, -1, "Das Ende des Partneranfrage-Verknüpfungsprozesses ist vorhanden.");
const linkHandlerSource = appSource.slice(linkHandlerStart, linkHandlerEnd);
assert.match(
  linkHandlerSource,
  /providersSync:\s*\{\s*upsertProviderIds:\s*\[provider\.id\]/,
  "Das Verknüpfen einer Partneranfrage aktualisiert den Anbieter statt ihn zu löschen."
);
assert.doesNotMatch(
  linkHandlerSource,
  /providersSync:\s*\{\s*deleteProviderIds:\s*\[provider\.id\]/,
  "Das Verknüpfen einer Partneranfrage darf keinen Anbieter löschen."
);

console.log("Anbieter-Workflow geprüft: In-Bearbeitung-Claim, Einladung und Editorzugriff sind konsistent.");
