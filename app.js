const STORAGE_KEY = "vertriebsmanager_state_v1";
const REMOTE_STATE_ROW_ID = "main";
const REMOTE_SAVE_DEBOUNCE_MS = 450;
const REMOTE_SYNC_INTERVAL_MS = 2500;
const MAP_COLOR_PALETTE = [
  "#1d4ed8",
  "#0f766e",
  "#16a34a",
  "#b45309",
  "#7e22ce",
  "#be185d",
  "#0369a1",
  "#4d7c0f",
  "#475569",
  "#b91c1c",
];
const PREDEFINED_TERRITORY_COUNTRIES = ["Österreich", "Deutschland"];
const DASHBOARD_DEFAULT_COUNTRY = "Österreich";
const PREDEFINED_STATES_BY_COUNTRY = {
  osterreich: [
    "Burgenland",
    "Kärnten",
    "Niederösterreich",
    "Oberösterreich",
    "Salzburg",
    "Steiermark",
    "Tirol",
    "Vorarlberg",
    "Wien",
  ],
  oesterreich: [
    "Burgenland",
    "Kärnten",
    "Niederösterreich",
    "Oberösterreich",
    "Salzburg",
    "Steiermark",
    "Tirol",
    "Vorarlberg",
    "Wien",
  ],
  austria: [
    "Burgenland",
    "Kärnten",
    "Niederösterreich",
    "Oberösterreich",
    "Salzburg",
    "Steiermark",
    "Tirol",
    "Vorarlberg",
    "Wien",
  ],
  deutschland: [
    "Baden-Württemberg",
    "Bayern",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hessen",
    "Mecklenburg-Vorpommern",
    "Niedersachsen",
    "Nordrhein-Westfalen",
    "Rheinland-Pfalz",
    "Saarland",
    "Sachsen",
    "Sachsen-Anhalt",
    "Schleswig-Holstein",
    "Thüringen",
  ],
  germany: [
    "Baden-Württemberg",
    "Bayern",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hessen",
    "Mecklenburg-Vorpommern",
    "Niedersachsen",
    "Nordrhein-Westfalen",
    "Rheinland-Pfalz",
    "Saarland",
    "Sachsen",
    "Sachsen-Anhalt",
    "Schleswig-Holstein",
    "Thüringen",
  ],
};
const AUSTRIA_STATE_COORDINATES = {
  burgenland: { lat: 47.5162, lng: 16.6187 },
  karnten: { lat: 46.7222, lng: 14.1806 },
  niederosterreich: { lat: 48.1081, lng: 15.8046 },
  oberosterreich: { lat: 48.2335, lng: 14.2478 },
  salzburg: { lat: 47.8095, lng: 13.055 },
  steiermark: { lat: 47.3593, lng: 14.4696 },
  tirol: { lat: 47.2537, lng: 11.6015 },
  vorarlberg: { lat: 47.2692, lng: 9.8926 },
  wien: { lat: 48.2082, lng: 16.3738 },
};
const GERMANY_STATE_COORDINATES = {
  "baden-wurttemberg": { lat: 48.6616, lng: 9.3501 },
  bayern: { lat: 48.7904, lng: 11.4979 },
  berlin: { lat: 52.52, lng: 13.405 },
  brandenburg: { lat: 52.4125, lng: 12.5316 },
  bremen: { lat: 53.0793, lng: 8.8017 },
  hamburg: { lat: 53.5511, lng: 9.9937 },
  hessen: { lat: 50.6521, lng: 9.1624 },
  "mecklenburg-vorpommern": { lat: 53.6127, lng: 12.4296 },
  niedersachsen: { lat: 52.6367, lng: 9.8451 },
  "nordrhein-westfalen": { lat: 51.4332, lng: 7.6616 },
  "rheinland-pfalz": { lat: 49.9929, lng: 7.8462 },
  saarland: { lat: 49.3964, lng: 7.023 },
  sachsen: { lat: 51.1045, lng: 13.2017 },
  "sachsen-anhalt": { lat: 51.9503, lng: 11.6923 },
  "schleswig-holstein": { lat: 54.2194, lng: 9.6961 },
  thuringen: { lat: 50.9848, lng: 11.0299 },
};
const PREDEFINED_STATE_COORDINATES_BY_COUNTRY = {
  osterreich: AUSTRIA_STATE_COORDINATES,
  oesterreich: AUSTRIA_STATE_COORDINATES,
  austria: AUSTRIA_STATE_COORDINATES,
  deutschland: GERMANY_STATE_COORDINATES,
  germany: GERMANY_STATE_COORDINATES,
};
const PROVIDER_COVERAGE_MODE_LOCATIONS = "locations";
const PROVIDER_COVERAGE_MODE_BIG_PLAYER = "bigPlayer";
const DEFAULT_MAP_PARAMETERS = {
  categoryRadiusKm: 20,
  subcategoryRadiusKm: 20,
  topicRadiusKm: 20,
  stateTopThreshold: 0,
  stateFlopThreshold: 1,
};
const DASHBOARD_STATUS_FILTER_LIVE_ONLY = "liveOnly";
const DASHBOARD_STATUS_FILTER_LIVE_AND_OPEN = "liveAndOpen";
const PROVIDER_TOPIC_TEMPLATES = [
  { id: "", name: "Vorlage wählen..." },
  { id: "all", name: "Alle Themen", keywords: [] },
  {
    id: "finance",
    name: "Finanzen & Controlling",
    keywords: ["finanz", "controlling", "buchhaltung", "steuer", "rechnung"],
  },
  {
    id: "sales_marketing",
    name: "Vertrieb & Marketing",
    keywords: ["vertrieb", "verkauf", "marketing", "crm", "lead", "kunden"],
  },
  {
    id: "digital_it",
    name: "Digital & IT",
    keywords: ["digital", "daten", "it", "automatisierung", "ki", "programmierung"],
  },
];

const defaultState = {
  sessionUserId: "",
  users: [],
  providers: [],
  categories: [],
  settings: {
    platformCountryFilter: DASHBOARD_DEFAULT_COUNTRY,
    dashboardStatusFilter: DASHBOARD_STATUS_FILTER_LIVE_ONLY,
    mapParameters: { ...DEFAULT_MAP_PARAMETERS },
    userTerritoriesByEmail: {},
    userTerritoriesByUserId: {},
    employeeRatesByUserId: {},
    employeeHonorariumEnabledByUserId: {},
    providerTargetsByCountry: {},
  },
};

let state = cloneDefaultState();
let editingUserId = null;
let editingProviderId = null;
let usersViewMode = "list";
let providersViewMode = "list";
let providerListSearchTerm = "";
let providerDetailTab = "master";
let userTerritoryDraft = [];
let selectedCategoryId = null;
let selectedSubcategoryId = null;
let providerTopicSelection = new Set();
let providerAdditionalLocationsDraft = [];
let providerCoverageStatesDraft = [];
let addressSearchDebounceId = null;
let providerNameSearchDebounceId = null;
let currentAddressSuggestions = [];
let currentProviderNameSuggestions = [];
let providerStatusLastFormValue = "offen";
let providerLiveStatusConfirmedInForm = false;
let googleMapsReady = false;
let googleAutocompleteService = null;
let googlePlacesService = null;
let googleGeocoder = null;
let googleSessionToken = null;
let providerLocationAutocompletes = [];
let userAddressAutocompleteBinding = null;
let addressPredictionRequestId = 0;
let providerNamePredictionRequestId = 0;
let googlePlacesLoadError = "";
let dashboardMap = null;
let dashboardMapMarkers = [];
let dashboardMapCircles = [];
let dashboardMapInfoWindows = [];
let providerGeocodeInFlight = new Set();
let platformCountryFilter = DASHBOARD_DEFAULT_COUNTRY;
let dashboardStatusFilter = DASHBOARD_STATUS_FILTER_LIVE_ONLY;
let mapLevelFilter = "category";
let mapItemFilter = "all";
let matrixLevelFilter = "category";
let dashboardAdminTab = "map";
let employeeRangeMode = "last24h";
let employeeRangeDate = getTodayDateInputValue();
let employeeRangeFromDate = getTodayDateInputValue();
let employeeRangeToDate = getTodayDateInputValue();
let employeeRangeMonth = getCurrentMonthInputValue();
let employeeRangeYear = String(new Date().getFullYear());
let parameterTargetCountry = "";
let selectedEmployeeActivityUserId = "";
let providerNotesCacheByProviderId = {};
let providerNotesLoadedProviderIds = new Set();
let providerNotesLoadingProviderIds = new Set();
let providerNotesErrorByProviderId = {};
let editingProviderNoteId = "";
let supabaseClient = null;
let storageMode = "local";
let remoteSaveTimeoutId = null;
let lastRemotePayloadFingerprint = "";
let remoteSyncIntervalId = null;
let remoteStatePullInFlight = false;
let remoteStatePushInFlight = false;
let providerRegistryMissingWarned = false;
let authSession = null;
let authProfile = null;
let boundEvents = false;
let suppressNextSignedOutAuthMessage = false;
let authMode = "signin";

const els = {
  authGate: document.getElementById("auth-gate"),
  authForm: document.getElementById("auth-form"),
  authModeSignInBtn: document.getElementById("auth-mode-signin-btn"),
  authModeSignUpBtn: document.getElementById("auth-mode-signup-btn"),
  authSignInFields: document.getElementById("auth-signin-fields"),
  authSignUpFields: document.getElementById("auth-signup-fields"),
  authSignInEmail: document.getElementById("auth-signin-email"),
  authSignInPassword: document.getElementById("auth-signin-password"),
  authSignUpFullName: document.getElementById("auth-signup-full-name"),
  authSignUpEmail: document.getElementById("auth-signup-email"),
  authSignUpPassword: document.getElementById("auth-signup-password"),
  authSubmitBtn: document.getElementById("auth-submit-btn"),
  authMessage: document.getElementById("auth-message"),
  currentUserLabel: document.getElementById("current-user-label"),
  signOutBtn: document.getElementById("sign-out-btn"),
  roleBadge: document.getElementById("role-badge"),
  platformCountrySelect: document.getElementById("platform-country-select"),
  navButtons: document.querySelectorAll(".nav-btn"),
  panels: document.querySelectorAll(".panel"),
  adminOnlyNav: document.querySelectorAll(".admin-only"),
  userCreateBtn: document.getElementById("user-create-btn"),
  userCancelBtn: document.getElementById("user-cancel-btn"),
  usersListView: document.getElementById("users-list-view"),
  usersFormView: document.getElementById("users-form-view"),
  userForm: document.getElementById("user-form"),
  userAddressInput: document.getElementById("user-address-input"),
  userCountryInput: document.getElementById("user-country-input"),
  userCountryDatalist: document.getElementById("user-country-datalist"),
  userCountryAddBtn: document.getElementById("user-country-add-btn"),
  userSelectedCountries: document.getElementById("user-selected-countries"),
  userCountryStatePanels: document.getElementById("user-country-state-panels"),
  usersTableBody: document.getElementById("users-table-body"),
  userSaveBtn: document.getElementById("user-save-btn"),
  userHonorariumField: document.getElementById("user-honorarium-field"),
  userHonorariumEnabled: document.getElementById("user-honorarium-enabled"),
  userHonorariumRate: document.getElementById("user-honorarium-rate"),
  userHonorariumHint: document.getElementById("user-honorarium-hint"),
  providerCreateBtn: document.getElementById("provider-create-btn"),
  providerHeadingLabel: document.getElementById("provider-heading-label"),
  providerListSearchField: document.getElementById("provider-list-search-field"),
  providerListSearchInput: document.getElementById("provider-list-search-input"),
  providerHeaderLiveLight: document.getElementById("provider-header-live-light"),
  providersListView: document.getElementById("providers-list-view"),
  providersFormView: document.getElementById("providers-form-view"),
  providerForm: document.getElementById("provider-form"),
  providerStatusSlider: document.getElementById("provider-status-slider"),
  providerDetailTabButtons: document.querySelectorAll("[data-provider-detail-tab-btn]"),
  providerMasterTabPanel: document.getElementById("provider-master-tab-panel"),
  providerNotesTabPanel: document.getElementById("provider-notes-tab-panel"),
  providerNameInput: document.getElementById("provider-name-input"),
  providerWebsiteInput: document.getElementById("provider-website-input"),
  providerWebsitePreviewLink: document.getElementById("provider-website-preview-link"),
  providerNameSuggestions: document.getElementById("provider-name-suggestions"),
  providerCoverageConfig: document.getElementById("provider-coverage-config"),
  providerCoverageCountryInput: document.getElementById("provider-coverage-country-input"),
  providerCoverageCountryDatalist: document.getElementById("provider-coverage-country-datalist"),
  providerCoverageStateList: document.getElementById("provider-coverage-state-list"),
  providerCoverageStateWrap: document.getElementById("provider-coverage-state-wrap"),
  providerAddressInput: document.getElementById("provider-address-input"),
  providerAddressSuggestions: document.getElementById("provider-address-suggestions"),
  providerLatitudeInput: document.getElementById("provider-latitude-input"),
  providerLongitudeInput: document.getElementById("provider-longitude-input"),
  providerLocationAddBtn: document.getElementById("provider-location-add"),
  providerLocationsList: document.getElementById("provider-locations-list"),
  providerTopicTemplate: document.getElementById("provider-topic-template"),
  providerTemplateApply: document.getElementById("provider-template-apply"),
  providerTopicClear: document.getElementById("provider-topic-clear"),
  providerTopicSearch: document.getElementById("provider-topic-search"),
  providerBigPlayerTopicTools: document.getElementById("provider-bigplayer-topic-tools"),
  providerBigPlayerModeInputs: document.querySelectorAll('input[name="provider-bigplayer-mode"]'),
  providerBigPlayerRowAll: document.getElementById("provider-bigplayer-row-all"),
  providerBigPlayerRowCategory: document.getElementById("provider-bigplayer-row-category"),
  providerBigPlayerRowSubcategory: document.getElementById("provider-bigplayer-row-subcategory"),
  providerBigPlayerAllBtn: document.getElementById("provider-bigplayer-all-btn"),
  providerBigPlayerCategorySelect: document.getElementById("provider-bigplayer-category-select"),
  providerBigPlayerSubcategoryCategorySelect: document.getElementById(
    "provider-bigplayer-subcategory-category-select"
  ),
  providerBigPlayerCategoryBtn: document.getElementById("provider-bigplayer-category-btn"),
  providerBigPlayerSubcategorySelect: document.getElementById("provider-bigplayer-subcategory-select"),
  providerBigPlayerSubcategoryBtn: document.getElementById("provider-bigplayer-subcategory-btn"),
  providerBigPlayerClearBtn: document.getElementById("provider-bigplayer-clear-btn"),
  providerBigPlayerSelectionSummary: document.getElementById("provider-bigplayer-selection-summary"),
  providerCreatedMeta: document.getElementById("provider-created-meta"),
  providerUpdatedMeta: document.getElementById("provider-updated-meta"),
  providerLiveMeta: document.getElementById("provider-live-meta"),
  providerTopicResults: document.getElementById("provider-topic-results"),
  providerTopicChips: document.getElementById("provider-topic-chips"),
  providersTableBody: document.getElementById("providers-table-body"),
  providerSaveBtn: document.getElementById("provider-save-btn"),
  providerResetBtn: document.getElementById("provider-reset-btn"),
  providerNoteInput: document.getElementById("provider-note-input"),
  providerNoteAddBtn: document.getElementById("provider-note-add-btn"),
  providerNotesList: document.getElementById("provider-notes-list"),
  categoryForm: document.getElementById("category-form"),
  subcategoryForm: document.getElementById("subcategory-form"),
  topicForm: document.getElementById("topic-form"),
  categoriesList: document.getElementById("categories-list"),
  subcategoriesList: document.getElementById("subcategories-list"),
  topicsList: document.getElementById("topics-list"),
  subcategoryContext: document.getElementById("subcategory-context"),
  topicContext: document.getElementById("topic-context"),
  managementCatCount: document.getElementById("management-cat-count"),
  managementSubcatCount: document.getElementById("management-subcat-count"),
  managementTopicCount: document.getElementById("management-topic-count"),
  statUsers: document.getElementById("stat-users"),
  statProviders: document.getElementById("stat-providers"),
  statTopics: document.getElementById("stat-topics"),
  dashboardMapPanel: document.getElementById("dashboard-map-panel"),
  mapCountrySelect: document.getElementById("map-country-select"),
  mapLevelSelect: document.getElementById("map-level-select"),
  mapItemSelect: document.getElementById("map-item-select"),
  mapRadiusInfo: document.getElementById("map-radius-info"),
  dashboardMapCanvas: document.getElementById("dashboard-map-canvas"),
  dashboardMapEmpty: document.getElementById("dashboard-map-empty"),
  dashboardMapLegend: document.getElementById("dashboard-map-legend"),
  dashboardStatusFilterInputs: document.querySelectorAll('input[name="dashboard-status-filter"]'),
  dashboardAdminTabs: document.getElementById("dashboard-admin-tabs"),
  dashboardAdminTabButtons: document.querySelectorAll("[data-dashboard-admin-tab]"),
  dashboardAdminPanels: document.querySelectorAll(".dashboard-admin-tab-panel"),
  dashboardLiveKpis: document.getElementById("dashboard-live-kpis"),
  dashboardMatrixPanel: document.getElementById("dashboard-matrix-panel"),
  dashboardStateRanking: document.getElementById("dashboard-state-ranking"),
  dashboardWeekLiveActivations: document.getElementById("dashboard-week-live-activations"),
  matrixCountrySelect: document.getElementById("matrix-country-select"),
  matrixLevelSelect: document.getElementById("matrix-level-select"),
  dashboardMatrixInfo: document.getElementById("dashboard-matrix-info"),
  dashboardMatrixWrap: document.getElementById("dashboard-matrix-wrap"),
  dashboardMatrixHead: document.getElementById("dashboard-matrix-head"),
  dashboardMatrixBody: document.getElementById("dashboard-matrix-body"),
  dashboardMatrixEmpty: document.getElementById("dashboard-matrix-empty"),
  dashboardMatrixStatusValue: document.getElementById("dashboard-matrix-status-value"),
  dashboardEmployeePanel: document.getElementById("dashboard-employee-panel"),
  employeeRangeMode: document.getElementById("employee-range-mode"),
  employeeCountrySelect: document.getElementById("employee-country-select"),
  employeeDateWrap: document.getElementById("employee-date-wrap"),
  employeeFromWrap: document.getElementById("employee-from-wrap"),
  employeeToWrap: document.getElementById("employee-to-wrap"),
  employeeMonthWrap: document.getElementById("employee-month-wrap"),
  employeeYearWrap: document.getElementById("employee-year-wrap"),
  employeeDateInput: document.getElementById("employee-date-input"),
  employeeFromInput: document.getElementById("employee-from-input"),
  employeeToInput: document.getElementById("employee-to-input"),
  employeeMonthInput: document.getElementById("employee-month-input"),
  employeeYearInput: document.getElementById("employee-year-input"),
  employeeStatusKpis: document.getElementById("employee-status-kpis"),
  employeeExtendedWrap: document.getElementById("employee-extended-wrap"),
  employeeHonorariumKpis: document.getElementById("employee-honorarium-kpis"),
  employeeRangeInfo: document.getElementById("employee-range-info"),
  employeeActivityWrap: document.getElementById("employee-activity-wrap"),
  employeeActivityBody: document.getElementById("employee-activity-body"),
  employeeActivityEmpty: document.getElementById("employee-activity-empty"),
  employeeRaceWrap: document.getElementById("employee-race-wrap"),
  employeeRaceInfo: document.getElementById("employee-race-info"),
  employeeRaceBoard: document.getElementById("employee-race-board"),
  employeeDetailPanel: document.getElementById("employee-detail-panel"),
  employeeDetailDialog: document.getElementById("employee-detail-dialog"),
  employeeDetailClose: document.getElementById("employee-detail-close"),
  employeeDetailTitle: document.getElementById("employee-detail-title"),
  employeeDetailBody: document.getElementById("employee-detail-body"),
  liveConfirmPanel: document.getElementById("live-confirm-panel"),
  liveConfirmText: document.getElementById("live-confirm-text"),
  liveConfirmClose: document.getElementById("live-confirm-close"),
  liveConfirmNo: document.getElementById("live-confirm-no"),
  liveConfirmYes: document.getElementById("live-confirm-yes"),
  deleteConfirmPanel: document.getElementById("delete-confirm-panel"),
  deleteConfirmText: document.getElementById("delete-confirm-text"),
  deleteConfirmClose: document.getElementById("delete-confirm-close"),
  deleteConfirmNo: document.getElementById("delete-confirm-no"),
  deleteConfirmYes: document.getElementById("delete-confirm-yes"),
  mapParamsForm: document.getElementById("map-params-form"),
  providerTargetForm: document.getElementById("provider-target-form"),
  paramRadiusCategory: document.getElementById("param-radius-category"),
  paramRadiusSubcategory: document.getElementById("param-radius-subcategory"),
  paramRadiusTopic: document.getElementById("param-radius-topic"),
  paramStateTopThreshold: document.getElementById("param-state-top-threshold"),
  paramStateFlopThreshold: document.getElementById("param-state-flop-threshold"),
  paramTargetCountry: document.getElementById("param-target-country"),
  paramTargetValue: document.getElementById("param-target-value"),
  paramTargetInfo: document.getElementById("param-target-info"),
  paramTargetList: document.getElementById("param-target-list"),
  dashboardProviderTargetGauge: document.getElementById("dashboard-provider-target-gauge"),
};

initialize();

function setAppLoadingState(isLoading) {
  document.body.classList.toggle("app-loading", Boolean(isLoading));
}

function normalizeAuthMode(mode) {
  return mode === "signup" ? "signup" : "signin";
}

function setAuthFieldRequired(field, required) {
  if (!field) {
    return;
  }
  field.required = Boolean(required);
}

function setAuthMode(mode, { preserveMessage = false } = {}) {
  authMode = normalizeAuthMode(mode);
  const signInMode = authMode === "signin";

  if (els.authModeSignInBtn) {
    els.authModeSignInBtn.classList.toggle("active", signInMode);
  }
  if (els.authModeSignUpBtn) {
    els.authModeSignUpBtn.classList.toggle("active", !signInMode);
  }
  if (els.authSignInFields) {
    els.authSignInFields.classList.toggle("hidden", !signInMode);
  }
  if (els.authSignUpFields) {
    els.authSignUpFields.classList.toggle("hidden", signInMode);
  }
  if (els.authSubmitBtn) {
    els.authSubmitBtn.textContent = signInMode ? "Anmelden" : "Registrieren";
  }

  if (signInMode) {
    if (els.authSignInEmail && !els.authSignInEmail.value && els.authSignUpEmail?.value) {
      els.authSignInEmail.value = els.authSignUpEmail.value;
    }
  } else if (els.authSignUpEmail && !els.authSignUpEmail.value && els.authSignInEmail?.value) {
    els.authSignUpEmail.value = els.authSignInEmail.value;
  }

  setAuthFieldRequired(els.authSignInEmail, signInMode);
  setAuthFieldRequired(els.authSignInPassword, signInMode);
  setAuthFieldRequired(els.authSignUpFullName, !signInMode);
  setAuthFieldRequired(els.authSignUpEmail, !signInMode);
  setAuthFieldRequired(els.authSignUpPassword, !signInMode);

  if (!preserveMessage && els.authMessage) {
    els.authMessage.textContent = "";
  }
}

async function initialize() {
  setAppLoadingState(true);
  setAuthMode("signin", { preserveMessage: true });
  clearLegacyAuthErrorParams();
  const authReady = await initializeAuth();
  bindEvents();
  if (!authReady) {
    showAuthGate("Bitte melde dich an.");
    return;
  }
  await bootstrapAfterAuth();
  hideAuthGate();
}

async function bootstrapAfterAuth() {
  await hydrateState();
  await syncUsersFromSupabase();
  ensureSessionUser();
  ensureManagementSelection();
  initGooglePlaces();
  setUsersView("list");
  setProvidersView("list");
  startRemoteStateSync();
  renderAll();
  setAppLoadingState(false);
}

function bindEvents() {
  if (boundEvents) {
    return;
  }
  boundEvents = true;

  els.authForm.addEventListener("submit", handleAuthFormSubmit);
  els.authModeSignInBtn?.addEventListener("click", () => {
    setAuthMode("signin");
  });
  els.authModeSignUpBtn?.addEventListener("click", () => {
    setAuthMode("signup");
  });
  els.signOutBtn.addEventListener("click", handleSignOut);

  els.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("hidden")) {
        return;
      }
      const target = button.dataset.target;
      setActiveSection(target);
    });
  });

  els.dashboardAdminTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!isAdmin()) {
        return;
      }
      const nextTab = button.dataset.dashboardAdminTab || "map";
      setDashboardAdminTab(nextTab);
    });
  });

  els.userCreateBtn.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    clearUserForm();
    setUsersView("form");
  });

  els.userCancelBtn.addEventListener("click", () => {
    clearUserForm();
    setUsersView("list");
  });

  els.userCountryAddBtn?.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    const country = String(els.userCountryInput?.value || "").trim();
    if (!country) {
      return;
    }
    addUserTerritoryCountry(country);
    if (els.userCountryInput) {
      els.userCountryInput.value = "";
    }
    renderUserTerritoryOptions();
  });

  els.userCountryInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    els.userCountryAddBtn?.click();
  });

  els.userSelectedCountries?.addEventListener("click", (event) => {
    const removeBtn = event.target.closest("button[data-remove-country-index]");
    if (!removeBtn || !isAdmin()) {
      return;
    }
    const countryIndex = Number(removeBtn.dataset.removeCountryIndex);
    if (!Number.isInteger(countryIndex)) {
      return;
    }
    removeUserTerritoryCountryByIndex(countryIndex);
    renderUserTerritoryOptions();
  });

  els.userCountryStatePanels?.addEventListener("change", (event) => {
    if (!isAdmin()) {
      return;
    }
    const allToggle = event.target.closest("input[data-country-all-index]");
    if (allToggle) {
      const countryIndex = Number(allToggle.dataset.countryAllIndex);
      if (!Number.isInteger(countryIndex)) {
        return;
      }
      setUserTerritoryCountryAllState(countryIndex, allToggle.checked);
      renderUserTerritoryOptions();
      return;
    }
    const stateToggle = event.target.closest("input[data-country-state-index]");
    if (!stateToggle) {
      return;
    }
    const countryIndex = Number(stateToggle.dataset.countryStateIndex);
    const stateLabel = String(stateToggle.dataset.countryStateLabel || "").trim();
    if (!Number.isInteger(countryIndex) || !stateLabel) {
      return;
    }
    setUserTerritoryStateSelection(countryIndex, stateLabel, stateToggle.checked);
    renderUserTerritoryOptions();
  });

  els.userHonorariumEnabled?.addEventListener("change", () => {
    syncUserHonorariumFieldState();
  });

  els.userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isAdmin()) {
      return;
    }

    const territoryValidation = validateUserTerritoryDraft();
    if (!territoryValidation.valid) {
      window.alert(territoryValidation.message);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const userPayload = {
      name: formData.get("name").toString().trim(),
      address: formData.get("address").toString().trim(),
      email: (formData.get("email") ?? els.userForm.elements.email.value).toString().trim(),
      phone: formData.get("phone").toString().trim(),
      role: formData.get("role").toString(),
      territories: getSelectedTerritoriesFromForm(),
      honorariumEnabled: Boolean(formData.get("honorariumEnabled")),
      honorariumRate: String(formData.get("honorariumRate") || "").trim(),
    };

    if (!userPayload.name || !userPayload.address || !userPayload.email || !userPayload.phone) {
      return;
    }

    const selectedUser = editingUserId
      ? state.users.find((entry) => entry.id === editingUserId) || null
      : null;
    const success = await saveEmployeeRecord(userPayload, selectedUser);
    if (!success) {
      return;
    }

    await syncUsersFromSupabase();
    clearUserForm();
    setUsersView("list");
    renderAll();
  });

  els.usersTableBody.addEventListener("click", (event) => {
    const activateButton = event.target.closest("button[data-activate-user]");
    if (activateButton) {
      if (!isAdmin()) {
        return;
      }
      void handleActivateUser(activateButton.dataset.activateUser);
      return;
    }

    const editButton = event.target.closest("button[data-edit-user]");
    if (editButton) {
      if (!isAdmin()) {
        return;
      }
      const user = state.users.find((entry) => entry.id === editButton.dataset.editUser);
      if (!user) {
        return;
      }
      editingUserId = user.id;
      fillUserForm(user);
      setUsersView("form");
      return;
    }

    const deleteButton = event.target.closest("button[data-delete-user]");
    if (deleteButton) {
      if (!isAdmin()) {
        return;
      }
      void handleDeleteUser(deleteButton.dataset.deleteUser);
    }
  });

  els.providerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const adminUser = isAdmin();

    const formData = new FormData(event.currentTarget);
    const previousProvider = editingProviderId
      ? state.providers.find((entry) => entry.id === editingProviderId) || null
      : null;
    if (editingProviderId && !previousProvider) {
      window.alert("Anbieter konnte nicht gefunden werden.");
      return;
    }
    if (previousProvider && !adminUser && !providerVisibleForCurrentUser(previousProvider)) {
      return;
    }

    const requestedCoverageMode = normalizeProviderCoverageMode(formData.get("coverageMode"));
    const coverageMode = adminUser
      ? requestedCoverageMode
      : previousProvider
        ? getProviderCoverageMode(previousProvider)
        : PROVIDER_COVERAGE_MODE_LOCATIONS;
    const coverageCountryInput = adminUser
      ? String(formData.get("coverageCountry") || "").trim()
      : previousProvider
        ? getProviderCoverageCountry(previousProvider)
        : String(formData.get("coverageCountry") || "").trim();
    if (adminUser) {
      syncProviderCoverageStatesDraftFromDom();
    }
    const selectedCoverageStates = adminUser
      ? normalizeProviderCoverageStates(providerCoverageStatesDraft)
      : previousProvider
        ? getProviderCoverageStates(previousProvider)
        : [];
    const selectedTopics = Array.from(providerTopicSelection);
    const primaryLocation = normalizeProviderLocation({
      address: formData.get("address"),
      postalCode: formData.get("postalCode"),
      city: formData.get("city"),
      country: formData.get("country"),
      state: formData.get("state"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
    });
    syncProviderAdditionalLocationsDraftFromDom();
    const additionalLocations = providerAdditionalLocationsDraft
      .map((location) => normalizeProviderLocation(location))
      .filter((location) => hasProviderLocationContent(location));

    if (coverageMode === PROVIDER_COVERAGE_MODE_LOCATIONS) {
      const hasInvalidAdditionalLocation = additionalLocations.some(
        (location) => !isProviderLocationComplete(location)
      );
      if (hasInvalidAdditionalLocation) {
        window.alert(
          "Bitte alle zusätzlichen Standorte vollständig ausfüllen (Adresse, PLZ, Ort, Bundesland, Land) oder leeren."
        );
        return;
      }
    }

    const providerLocations = [primaryLocation, ...additionalLocations].filter((location) =>
      coverageMode === PROVIDER_COVERAGE_MODE_LOCATIONS
        ? hasProviderLocationContent(location)
        : isProviderLocationComplete(location)
    );

    const coverageCountry =
      coverageMode === PROVIDER_COVERAGE_MODE_BIG_PLAYER
        ? coverageCountryInput || primaryLocation.country
        : primaryLocation.country;
    if (coverageMode === PROVIDER_COVERAGE_MODE_BIG_PLAYER && !coverageCountry) {
      window.alert("Bitte beim Big Player ein Land angeben.");
      return;
    }

    const normalizedCoverageStates =
      coverageMode === PROVIDER_COVERAGE_MODE_BIG_PLAYER
        ? normalizeProviderCoverageStatesForCountry(selectedCoverageStates, coverageCountry)
        : [];

    const providerPayload = {
      name: formData.get("name").toString().trim(),
      address: primaryLocation.address,
      postalCode: primaryLocation.postalCode,
      city: primaryLocation.city,
      country: primaryLocation.country,
      state: primaryLocation.state,
      website: formData.get("website").toString().trim(),
      email: formData.get("email").toString().trim(),
      phone: formData.get("phone").toString().trim(),
      status: normalizeProviderStatusValue(formData.get("status").toString()),
      adminOnly: parseBooleanFlag(formData.get("adminOnly")),
      admin_only: parseBooleanFlag(formData.get("adminOnly")),
      onlineOnly: parseBooleanFlag(formData.get("onlineOnly")),
      online_only: parseBooleanFlag(formData.get("onlineOnly")),
      topicIds: selectedTopics,
      latitude: primaryLocation.latitude,
      longitude: primaryLocation.longitude,
      locations: providerLocations,
      coverageMode,
      coverageCountry,
      coverageStates: normalizedCoverageStates,
    };

    if (!adminUser && previousProvider && getProviderCoverageMode(previousProvider) === PROVIDER_COVERAGE_MODE_BIG_PLAYER) {
      const existingLocations = getProviderLocations(previousProvider);
      const existingPrimaryLocation = existingLocations[0] || createEmptyProviderLocation();
      providerPayload.coverageMode = PROVIDER_COVERAGE_MODE_BIG_PLAYER;
      providerPayload.coverageCountry = getProviderCoverageCountry(previousProvider);
      providerPayload.coverageStates = normalizeProviderCoverageStatesForCountry(
        getProviderCoverageStates(previousProvider),
        providerPayload.coverageCountry
      );
      providerPayload.locations = existingLocations;
      providerPayload.address = existingPrimaryLocation.address;
      providerPayload.postalCode = existingPrimaryLocation.postalCode;
      providerPayload.city = existingPrimaryLocation.city;
      providerPayload.country = existingPrimaryLocation.country;
      providerPayload.state = existingPrimaryLocation.state;
      providerPayload.latitude = existingPrimaryLocation.latitude;
      providerPayload.longitude = existingPrimaryLocation.longitude;
    }

    if (!providerPayload.name) {
      return;
    }
    if (
      providerPayload.coverageMode === PROVIDER_COVERAGE_MODE_LOCATIONS &&
      !isProviderLocationComplete(primaryLocation)
    ) {
      return;
    }

    if (!adminUser && !editingProviderId && hasCurrentUserTerritoryAssignment()) {
      const territories = getCurrentUserTerritories();
      if (!territories.length) {
        window.alert("Dir ist aktuell kein gültiges Gebiet zugewiesen.");
        return;
      }
      const primaryInAssignedTerritory = territories.some((territory) => {
        const territoryCountry = normalizeText(territory.country || "");
        const territoryState = normalizeText(territory.state || "");
        const locationCountry = normalizeText(primaryLocation.country || "");
        const locationState = normalizeText(primaryLocation.state || "");
        if (!territoryCountry || !locationCountry || territoryCountry !== locationCountry) {
          return false;
        }
        if (!territoryState) {
          return true;
        }
        return territoryState === locationState;
      });
      if (!primaryInAssignedTerritory) {
        window.alert(
          "Neue Anbieter kannst du nur mit Hauptadresse in deinen zugewiesenen Gebieten anlegen. Zusätzliche Standorte dürfen auch außerhalb liegen."
        );
        return;
      }
    }

    const targetProviderId = editingProviderId || createId("p");
    const duplicateGuard = await validateProviderDuplicationBeforeSave(providerPayload, targetProviderId);
    if (!duplicateGuard.ok) {
      return;
    }

    const wasLiveBeforeEdit = previousProvider ? isLiveStatus(previousProvider.status) : false;
    const shouldBecomeLive = isLiveStatus(providerPayload.status);
    if (shouldBecomeLive && !wasLiveBeforeEdit && !providerLiveStatusConfirmedInForm) {
      const confirmed = await confirmProviderLiveActivation(providerPayload.name || previousProvider?.name || "");
      if (!confirmed) {
        setProviderStatusInForm(previousProvider ? previousProvider.status : "offen");
        syncProviderStatusSliderUi();
        providerLiveStatusConfirmedInForm = false;
        return;
      }
      providerLiveStatusConfirmedInForm = true;
    }

    const claimResult = await claimProviderRegistryKey(
      targetProviderId,
      duplicateGuard.signature,
      providerPayload.name || ""
    );
    if (!claimResult.ok) {
      if (claimResult.duplicate) {
        window.alert("Anbieter existiert bereits (Duplikat-Sperre). Speichern wurde gestoppt.");
      } else {
        window.alert("Anbieter konnte nicht gespeichert werden (Duplikat-Schutz). Bitte erneut versuchen.");
      }
      return;
    }

    const actor = getCurrentActorInfo();
    const nowIso = new Date().toISOString();

    if (editingProviderId) {
      const provider = previousProvider;
      if (!adminUser) {
        const existingAdminOnly = isProviderAdminOnly(provider);
        providerPayload.adminOnly = existingAdminOnly;
        providerPayload.admin_only = existingAdminOnly;
        const existingOnlineOnly = isProviderOnlineOnly(provider);
        providerPayload.onlineOnly = existingOnlineOnly;
        providerPayload.online_only = existingOnlineOnly;
      }
      const wasLive = isLiveStatus(provider.status);
      Object.assign(provider, providerPayload, {
        updatedAt: nowIso,
        updatedByName: actor.name,
        updatedByRole: actor.role,
        updatedByUserId: actor.userId,
      });
      if (!provider.createdAt) {
        provider.createdAt = nowIso;
      }
      if (!provider.createdByName) {
        provider.createdByName = actor.name;
      }
      if (!provider.createdByRole) {
        provider.createdByRole = actor.role;
      }
      if (!provider.createdByUserId) {
        provider.createdByUserId = actor.userId;
      }
      if (!wasLive && isLiveStatus(provider.status)) {
        ensureProviderLiveActivationMetadata(provider, actor, nowIso);
      } else if (isLiveStatus(provider.status) && !provider.liveAt) {
        ensureProviderLiveActivationMetadata(provider, actor, nowIso);
      }
    } else {
      const newProvider = {
        id: targetProviderId,
        ...providerPayload,
        notes: [],
        createdAt: nowIso,
        createdByName: actor.name,
        createdByRole: actor.role,
        createdByUserId: actor.userId,
        updatedAt: nowIso,
        updatedByName: actor.name,
        updatedByRole: actor.role,
        updatedByUserId: actor.userId,
      };
      if (isLiveStatus(newProvider.status)) {
        ensureProviderLiveActivationMetadata(newProvider, actor, nowIso);
      }
      state.providers.push(newProvider);
    }

    saveState();
    clearProviderForm();
    setProvidersView("list");
    clearAddressSuggestions();
    renderAll();
  });

  els.providerForm.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.matches('input[name="status"]')) {
      const previousStatus = normalizeProviderStatusValue(providerStatusLastFormValue);
      const nextStatus = normalizeProviderStatusValue(getProviderStatusFromForm());
      const switchedToLive = nextStatus === "live" && previousStatus !== "live";
      if (switchedToLive) {
        const providerName = String(els.providerNameInput?.value || "").trim();
        const confirmed = await confirmProviderLiveActivation(providerName);
        if (!confirmed) {
          setProviderStatusInForm(previousStatus);
          syncProviderStatusSliderUi();
          providerLiveStatusConfirmedInForm = false;
          providerStatusLastFormValue = previousStatus;
          return;
        }
        providerLiveStatusConfirmedInForm = true;
      } else if (nextStatus !== "live") {
        providerLiveStatusConfirmedInForm = false;
      }
      syncProviderStatusSliderUi();
    }
  });

  els.providerCreateBtn.addEventListener("click", () => {
    clearProviderForm();
    setProvidersView("form");
  });

  els.providerListSearchInput?.addEventListener("input", () => {
    providerListSearchTerm = String(els.providerListSearchInput.value || "").trim();
    renderProvidersTable();
  });

  els.providerResetBtn.addEventListener("click", () => {
    clearProviderForm();
    setProvidersView("list");
  });

  els.providerDetailTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.providerDetailTabBtn || "master";
      setProviderDetailTab(nextTab);
    });
  });

  els.providerNoteAddBtn?.addEventListener("click", () => {
    void handleAddProviderNote();
  });

  els.providerNotesList?.addEventListener("click", (event) => {
    const editButton = event.target.closest("button[data-edit-provider-note]");
    if (editButton) {
      void handleStartProviderNoteEdit(editButton.dataset.editProviderNote || "");
      return;
    }
    const deleteButton = event.target.closest("button[data-delete-provider-note]");
    if (deleteButton) {
      void handleDeleteProviderNote(deleteButton.dataset.deleteProviderNote || "");
    }
  });

  els.providerAddressInput.addEventListener("input", () => {
    clearProviderCoordinates();
    queueAddressSuggestionSearch();
  });

  els.providerNameInput?.addEventListener("input", () => {
    queueProviderNameSuggestionSearch();
  });

  els.providerWebsiteInput?.addEventListener("input", () => {
    syncProviderWebsitePreviewLink();
  });

  ["postalCode", "city", "state", "country"].forEach((fieldName) => {
    const field = els.providerForm.elements[fieldName];
    if (!field) {
      return;
    }
    field.addEventListener("input", () => {
      clearProviderCoordinates();
    });
  });

  els.providerAddressInput.addEventListener("blur", (event) => {
    const nextFocusedElement = event.relatedTarget;
    if (
      nextFocusedElement instanceof Element &&
      els.providerAddressSuggestions.contains(nextFocusedElement)
    ) {
      return;
    }
    window.setTimeout(() => {
      clearAddressSuggestions();
    }, 220);
  });

  els.providerNameInput?.addEventListener("blur", (event) => {
    const nextFocusedElement = event.relatedTarget;
    if (
      nextFocusedElement instanceof Element &&
      els.providerNameSuggestions?.contains(nextFocusedElement)
    ) {
      return;
    }
    window.setTimeout(() => {
      clearProviderNameSuggestions();
    }, 220);
  });

  els.providerForm.querySelectorAll('input[name="coverageMode"]').forEach((input) => {
    input.addEventListener("change", () => {
      syncProviderCoverageStatesDraftFromDom();
      syncProviderCoverageFormState();
    });
  });

  els.providerCoverageCountryInput?.addEventListener("input", () => {
    syncProviderCoverageStatesDraftFromDom();
    renderProviderCoverageStateOptions();
  });

  els.providerCoverageStateList?.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[data-provider-coverage-state]");
    if (!checkbox) {
      return;
    }
    const stateLabel = String(checkbox.dataset.providerCoverageState || "").trim();
    if (!stateLabel) {
      return;
    }
    const key = normalizeText(stateLabel);
    const coverageCountry = getCoverageCountryFromForm();
    const currentStates = normalizeProviderCoverageStatesForCountry(
      providerCoverageStatesDraft,
      coverageCountry
    );
    const nextStates = checkbox.checked
      ? currentStates.concat(stateLabel)
      : currentStates.filter((entry) => normalizeText(entry) !== key);
    providerCoverageStatesDraft = normalizeProviderCoverageStatesForCountry(nextStates, coverageCountry);
    renderProviderCoverageStateOptions();
  });

  els.providerLocationAddBtn?.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    syncProviderAdditionalLocationsDraftFromDom();
    providerAdditionalLocationsDraft.push(createEmptyProviderLocation());
    renderProviderAdditionalLocations();
  });

  els.providerLocationsList?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("button[data-remove-provider-location]");
    if (!removeButton || !isAdmin()) {
      return;
    }
    syncProviderAdditionalLocationsDraftFromDom();
    const index = Number(removeButton.dataset.removeProviderLocation);
    if (!Number.isInteger(index) || index < 0 || index >= providerAdditionalLocationsDraft.length) {
      return;
    }
    providerAdditionalLocationsDraft.splice(index, 1);
    renderProviderAdditionalLocations();
  });

  els.providerLocationsList?.addEventListener("input", (event) => {
    const changedField = event.target?.dataset?.locationField || "";
    if (!["address", "postalCode", "city", "state", "country"].includes(changedField)) {
      return;
    }
    const row = event.target.closest("[data-provider-location-index]");
    if (!row) {
      return;
    }
    const latInput = row.querySelector('input[data-location-field="latitude"]');
    const lngInput = row.querySelector('input[data-location-field="longitude"]');
    if (latInput) {
      latInput.value = "";
    }
    if (lngInput) {
      lngInput.value = "";
    }
  });

  els.providerAddressSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-address-index]");
    if (!button || !isAdmin()) {
      return;
    }
    const index = Number(button.dataset.addressIndex);
    applyAddressSuggestion(index);
  });

  const preventSuggestionBlur = (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(".address-suggestion-item")) {
      return;
    }
    event.preventDefault();
  };
  els.providerAddressSuggestions.addEventListener("pointerdown", preventSuggestionBlur);
  els.providerNameSuggestions?.addEventListener("pointerdown", preventSuggestionBlur);

  els.providerNameSuggestions?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-provider-name-index]");
    if (!button || !isAdmin()) {
      return;
    }
    const index = Number(button.dataset.providerNameIndex);
    applyProviderNameSuggestion(index);
  });

  els.providerTopicSearch?.addEventListener("input", () => {
    renderProviderTopicPicker();
  });

  els.providerBigPlayerModeInputs?.forEach((input) => {
    input.addEventListener("change", () => {
      renderProviderBigPlayerTopicTools();
    });
  });

  els.providerBigPlayerCategorySelect?.addEventListener("change", () => {
    renderProviderBigPlayerTopicTools();
  });

  els.providerBigPlayerSubcategoryCategorySelect?.addEventListener("change", () => {
    renderProviderBigPlayerTopicTools();
  });

  els.providerBigPlayerAllBtn?.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    getAllTopics().forEach((topic) => providerTopicSelection.add(topic.id));
    renderProviderTopicPicker();
  });

  els.providerBigPlayerCategoryBtn?.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    const categoryId = String(els.providerBigPlayerCategorySelect?.value || "").trim();
    if (!categoryId) {
      return;
    }
    const category = state.categories.find((entry) => entry.id === categoryId);
    if (!category) {
      return;
    }
    collectTopicIdsFromCategory(category).forEach((topicId) => providerTopicSelection.add(topicId));
    renderProviderTopicPicker();
  });

  els.providerBigPlayerSubcategoryBtn?.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    const categoryId = String(
      els.providerBigPlayerSubcategoryCategorySelect?.value || els.providerBigPlayerCategorySelect?.value || ""
    ).trim();
    const subcategoryId = String(els.providerBigPlayerSubcategorySelect?.value || "").trim();
    if (!categoryId || !subcategoryId) {
      return;
    }
    const category = state.categories.find((entry) => entry.id === categoryId);
    const subcategory = category?.subcategories.find((entry) => entry.id === subcategoryId);
    if (!subcategory) {
      return;
    }
    subcategory.topics.forEach((topic) => providerTopicSelection.add(topic.id));
    renderProviderTopicPicker();
  });

  els.providerBigPlayerClearBtn?.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    providerTopicSelection.clear();
    renderProviderTopicPicker();
  });

  els.providerTopicResults.addEventListener("click", (event) => {
    const resetSearchButton = event.target.closest("button[data-reset-topic-search]");
    if (resetSearchButton) {
      if (els.providerTopicSearch) {
        els.providerTopicSearch.value = "";
      }
      renderProviderTopicPicker();
      return;
    }

    const button = event.target.closest("button[data-topic-id]");
    if (!button || !isAdmin()) {
      return;
    }

    const topicId = button.dataset.topicId;
    if (!topicId) {
      return;
    }

    if (providerTopicSelection.has(topicId)) {
      providerTopicSelection.delete(topicId);
    } else {
      providerTopicSelection.add(topicId);
    }
    renderProviderTopicPicker();
  });

  els.providerTopicChips.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-remove-topic]");
    if (!button || !isAdmin()) {
      return;
    }
    providerTopicSelection.delete(button.dataset.removeTopic);
    renderProviderTopicPicker();
  });

  els.providerTemplateApply?.addEventListener("click", () => {
    if (!isAdmin() || !els.providerTopicTemplate) {
      return;
    }
    applyProviderTopicTemplate(els.providerTopicTemplate.value);
    renderProviderTopicPicker();
  });

  els.providerTopicClear?.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    providerTopicSelection.clear();
    renderProviderTopicPicker();
  });

  els.platformCountrySelect?.addEventListener("change", () => {
    setPlatformCountryFilter(String(els.platformCountrySelect.value || "all"));
  });

  els.dashboardStatusFilterInputs?.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      setDashboardStatusFilter(input.value);
    });
  });

  els.mapCountrySelect?.addEventListener("change", () => {
    setPlatformCountryFilter(String(els.mapCountrySelect.value || "all"));
  });

  els.mapLevelSelect?.addEventListener("change", () => {
    mapLevelFilter = els.mapLevelSelect.value || "category";
    mapItemFilter = "all";
    renderDashboardMap();
  });

  els.mapItemSelect?.addEventListener("change", () => {
    mapItemFilter = els.mapItemSelect.value || "all";
    renderDashboardMap();
  });

  els.matrixCountrySelect?.addEventListener("change", () => {
    setPlatformCountryFilter(String(els.matrixCountrySelect.value || "all"));
  });

  els.matrixLevelSelect?.addEventListener("change", () => {
    matrixLevelFilter = els.matrixLevelSelect.value || "category";
    renderBundeslandMatrix();
  });

  els.employeeRangeMode?.addEventListener("change", () => {
    employeeRangeMode = els.employeeRangeMode.value || "last24h";
    selectedEmployeeActivityUserId = "";
    renderDashboardEmployeePanel();
  });

  els.employeeCountrySelect?.addEventListener("change", () => {
    setPlatformCountryFilter(String(els.employeeCountrySelect.value || "all"));
  });

  els.employeeDateInput?.addEventListener("change", () => {
    employeeRangeDate = els.employeeDateInput.value || getTodayDateInputValue();
    selectedEmployeeActivityUserId = "";
    renderDashboardEmployeePanel();
  });

  els.employeeFromInput?.addEventListener("change", () => {
    employeeRangeFromDate = els.employeeFromInput.value || getTodayDateInputValue();
    selectedEmployeeActivityUserId = "";
    renderDashboardEmployeePanel();
  });

  els.employeeToInput?.addEventListener("change", () => {
    employeeRangeToDate = els.employeeToInput.value || employeeRangeFromDate || getTodayDateInputValue();
    selectedEmployeeActivityUserId = "";
    renderDashboardEmployeePanel();
  });

  els.employeeMonthInput?.addEventListener("change", () => {
    employeeRangeMonth = els.employeeMonthInput.value || getCurrentMonthInputValue();
    selectedEmployeeActivityUserId = "";
    renderDashboardEmployeePanel();
  });

  els.employeeYearInput?.addEventListener("change", () => {
    employeeRangeYear = String(els.employeeYearInput.value || new Date().getFullYear()).trim();
    selectedEmployeeActivityUserId = "";
    renderDashboardEmployeePanel();
  });

  els.employeeActivityBody?.addEventListener("click", (event) => {
    const detailsButton = event.target.closest("button[data-employee-details]");
    if (!detailsButton) {
      return;
    }
    selectedEmployeeActivityUserId = detailsButton.dataset.employeeDetails || "";
    renderDashboardEmployeePanel();
  });

  els.employeeDetailBody?.addEventListener("change", async (event) => {
    const liveToggle = event.target.closest("input[data-live-toggle-provider]");
    if (!liveToggle) {
      return;
    }
    const providerId = liveToggle.dataset.liveToggleProvider || "";
    await updateProviderLiveStatus(providerId, !!liveToggle.checked);
    renderAll();
  });

  els.employeeDetailClose?.addEventListener("click", () => {
    clearSelectedEmployeeDetails();
  });

  els.employeeDetailPanel?.addEventListener("click", (event) => {
    if (event.target === els.employeeDetailPanel) {
      clearSelectedEmployeeDetails();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isEmployeeDetailsModalOpen()) {
      clearSelectedEmployeeDetails();
    }
  });

  els.mapParamsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    state.settings = normalizeSettings({
      ...state.settings,
      mapParameters: {
        categoryRadiusKm: formData.get("radiusCategory"),
        subcategoryRadiusKm: formData.get("radiusSubcategory"),
        topicRadiusKm: formData.get("radiusTopic"),
        stateTopThreshold: formData.get("stateTopThreshold"),
        stateFlopThreshold: formData.get("stateFlopThreshold"),
      },
    });

    saveState();
    renderMapParameterForm();
    renderActiveDashboardAdminPanel();
    window.alert("Parameter gespeichert.");
  });

  els.paramTargetCountry?.addEventListener("change", () => {
    parameterTargetCountry = String(els.paramTargetCountry.value || "").trim();
    renderProviderTargetParameterForm();
  });

  els.providerTargetForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const country = String(formData.get("targetCountry") || "").trim();
    if (!country) {
      window.alert("Bitte ein Land auswählen.");
      return;
    }
    parameterTargetCountry = country;

    const rawTarget = String(formData.get("targetValue") || "").trim();
    const targetValue = sanitizeProviderTargetValue(rawTarget);
    const shouldClear = rawTarget === "" || targetValue <= 0;

    const targetsMap = getProviderTargetsByCountry();
    const countryKey = normalizeText(country);
    if (!countryKey) {
      window.alert("Ungültiges Land.");
      return;
    }
    if (shouldClear) {
      delete targetsMap[countryKey];
    } else {
      targetsMap[countryKey] = {
        country,
        target: targetValue,
      };
    }

    state.settings = normalizeSettings({
      ...state.settings,
      providerTargetsByCountry: targetsMap,
    });
    saveState();
    renderMapParameterForm();
    renderActiveDashboardAdminPanel();
    window.alert(
      shouldClear
        ? `Zielwert für ${country} entfernt.`
        : `Zielwert für ${country} gespeichert (${targetValue} Live-Anbieter).`
    );
  });

  els.providersTableBody.addEventListener("click", (event) => {
    const editButton = event.target.closest("button[data-edit-provider]");
    if (editButton) {
      const providerId = editButton.dataset.editProvider;
      const provider = state.providers.find((entry) => entry.id === providerId);
      if (!provider) {
        return;
      }
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return;
      }
      if (!isAdmin() && !providerVisibleForCurrentUser(provider, currentUser)) {
        return;
      }

      editingProviderId = provider.id;
      fillProviderForm(provider);
      els.providerSaveBtn.textContent = "Aktualisieren";
      setProvidersView("form");
      return;
    }

    const viewButton = event.target.closest("button[data-view-provider]");
    if (viewButton) {
      const providerId = viewButton.dataset.viewProvider;
      const provider = state.providers.find((entry) => entry.id === providerId);
      if (!provider) {
        return;
      }
      editingProviderId = provider.id;
      fillProviderForm(provider);
      els.providerSaveBtn.textContent = "Aktualisieren";
      setProviderDetailTab("master");
      setProvidersView("form");
      return;
    }

    const deleteButton = event.target.closest("button[data-delete-provider]");
    if (deleteButton) {
      const providerId = deleteButton.dataset.deleteProvider;
      const provider = state.providers.find((entry) => entry.id === providerId);
      if (!provider) {
        return;
      }
      if (!canCurrentUserDeleteProvider(provider)) {
        window.alert("Du kannst nur Anbieter löschen, die du selbst angelegt hast.");
        return;
      }
      void handleDeleteProvider(providerId);
    }
  });

  els.providersTableBody.addEventListener("change", async (event) => {
    const liveToggle = event.target.closest("input[data-live-toggle-provider]");
    if (!liveToggle) {
      return;
    }
    const providerId = liveToggle.dataset.liveToggleProvider || "";
    await updateProviderLiveStatus(providerId, !!liveToggle.checked);
    renderAll();
  });

  els.categoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name").toString().trim();
    if (!name) {
      return;
    }

    const category = {
      id: createId("cat"),
      name,
      subcategories: [],
    };

    state.categories.push(category);
    selectedCategoryId = category.id;
    selectedSubcategoryId = null;

    saveState();
    event.currentTarget.reset();
    renderAll();
  });

  els.subcategoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name").toString().trim();
    const category = getSelectedCategory();

    if (!category || !name) {
      return;
    }

    const subcategory = {
      id: createId("sub"),
      name,
      topics: [],
    };

    category.subcategories.push(subcategory);
    selectedSubcategoryId = subcategory.id;

    saveState();
    event.currentTarget.reset();
    renderAll();
  });

  els.topicForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name").toString().trim();

    const category = getSelectedCategory();
    const subcategory = getSelectedSubcategory();

    if (!category || !subcategory || !name) {
      return;
    }

    subcategory.topics.push({
      id: createId("topic"),
      name,
    });

    saveState();
    event.currentTarget.reset();
    renderAll();
  });

  els.categoriesList.addEventListener("click", (event) => {
    const editButton = event.target.closest("button[data-edit-category]");
    if (editButton) {
      if (!isAdmin()) {
        return;
      }
      handleEditCategory(editButton.dataset.editCategory);
      return;
    }

    const deleteButton = event.target.closest("button[data-delete-category]");
    if (deleteButton) {
      if (!isAdmin()) {
        return;
      }
      void handleDeleteCategory(deleteButton.dataset.deleteCategory);
      return;
    }

    const selectButton = event.target.closest("button[data-select-category]");
    if (!selectButton) {
      return;
    }

    selectedCategoryId = selectButton.dataset.selectCategory;
    selectedSubcategoryId = null;
    ensureManagementSelection();
    renderAll();
  });

  els.subcategoriesList.addEventListener("click", (event) => {
    const editButton = event.target.closest("button[data-edit-subcategory]");
    if (editButton) {
      if (!isAdmin()) {
        return;
      }
      handleEditSubcategory(editButton.dataset.editSubcategory);
      return;
    }

    const deleteButton = event.target.closest("button[data-delete-subcategory]");
    if (deleteButton) {
      if (!isAdmin()) {
        return;
      }
      void handleDeleteSubcategory(deleteButton.dataset.deleteSubcategory);
      return;
    }

    const selectButton = event.target.closest("button[data-select-subcategory]");
    if (!selectButton) {
      return;
    }

    selectedSubcategoryId = selectButton.dataset.selectSubcategory;
    ensureManagementSelection();
    renderAll();
  });

  els.topicsList.addEventListener("click", (event) => {
    const editButton = event.target.closest("button[data-edit-topic]");
    if (editButton) {
      if (!isAdmin()) {
        return;
      }
      handleEditTopic(editButton.dataset.editTopic);
      return;
    }

    const deleteButton = event.target.closest("button[data-delete-topic]");
    if (deleteButton) {
      if (!isAdmin()) {
        return;
      }
      void handleDeleteTopic(deleteButton.dataset.deleteTopic);
    }
  });

  syncProviderCoverageFormState();
  setProviderDetailTab("master");
  syncProviderWebsitePreviewLink();
}

function renderAll() {
  ensureManagementSelection();
  syncPlatformCountryFilterFromSettings();
  syncDashboardStatusFilterFromSettings();
  renderUserSwitch();
  renderRoleState();
  renderPlatformCountryControl();
  renderDashboardStatusFilterControl();
  renderDashboardStats();
  renderMapParameterForm();
  renderDashboardAdminTabs();
  renderDashboardLiveKpis();
  renderDashboardMap();
  renderBundeslandMatrix();
  renderDashboardEmployeePanel();
  renderUserTerritoryOptions();
  renderUsersTable();
  renderManagementSummary();
  renderCategoryList();
  renderSubcategoriesList();
  renderTopicsList();
  renderProviderCoverageCountryDatalist();
  renderProviderTemplateOptions();
  renderProviderTopicPicker();
  renderProvidersTable();
}

function renderUserSwitch() {
  const activeUser = getCurrentUser();
  if (!activeUser) {
    els.currentUserLabel.textContent = "Nicht angemeldet";
    return;
  }

  els.currentUserLabel.textContent = String(activeUser.name || "Benutzer").trim();
}

function renderRoleState() {
  const activeUser = getCurrentUser();
  if (!activeUser) {
    els.roleBadge.textContent = "Nicht angemeldet";
    els.adminOnlyNav.forEach((button) => {
      button.classList.add("hidden");
    });
    document.querySelectorAll(".admin-only-view").forEach((element) => {
      element.classList.add("hidden");
    });
    return;
  }

  const admin = activeUser.role === "admin";
  els.roleBadge.textContent = admin ? "Rolle: Admin" : "Rolle: Mitarbeiter";

  els.adminOnlyNav.forEach((button) => {
    button.classList.toggle("hidden", !admin);
  });
  document.querySelectorAll(".admin-only-view").forEach((element) => {
    element.classList.toggle("hidden", !admin);
  });

  if (els.userCreateBtn) {
    els.userCreateBtn.classList.toggle("hidden", !admin || usersViewMode === "form");
  }
  if (els.providerCreateBtn) {
    els.providerCreateBtn.classList.toggle("hidden", providersViewMode === "form");
  }

  document.querySelectorAll(".admin-lock").forEach((container) => {
    const controls = container.querySelectorAll("input, select, textarea, button");
    controls.forEach((control) => {
      if (control.dataset.adminLockExempt === "true") {
        return;
      }
      control.disabled = !admin;
    });
  });

  if (!admin) {
    setUsersView("list");
    setProvidersView("list");
    const currentPanel = document.querySelector(".panel.active");
    if (
      currentPanel?.id === "users-section" ||
      currentPanel?.id === "parameters-section"
    ) {
      setActiveSection("dashboard-section");
    }
  }
}

function renderDashboardStats() {
  const activeUsers = state.users.filter(
    (entry) => entry.source === "profile" && isUserStatusActive(entry.status)
  ).length;
  const visibleProviders = getVisibleProvidersForCurrentUser();
  if (els.statUsers) {
    els.statUsers.textContent = String(activeUsers);
  }
  if (els.statProviders) {
    els.statProviders.textContent = String(visibleProviders.length);
  }
  if (els.statTopics) {
    els.statTopics.textContent = String(getAllTopics().length);
  }
}

function renderMapParameterForm() {
  const params = getMapParameters();
  if (els.paramRadiusCategory) {
    els.paramRadiusCategory.value = String(params.categoryRadiusKm);
  }
  if (els.paramRadiusSubcategory) {
    els.paramRadiusSubcategory.value = String(params.subcategoryRadiusKm);
  }
  if (els.paramRadiusTopic) {
    els.paramRadiusTopic.value = String(params.topicRadiusKm);
  }
  if (els.paramStateTopThreshold) {
    els.paramStateTopThreshold.value = String(params.stateTopThreshold);
  }
  if (els.paramStateFlopThreshold) {
    els.paramStateFlopThreshold.value = String(params.stateFlopThreshold);
  }
  renderProviderTargetParameterForm();
}

function sanitizeProviderTargetValue(value) {
  const parsed = parseOptionalNumber(value);
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(1000000, Math.round(parsed)));
}

function normalizeProviderTargetsByCountry(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
    return {};
  }
  const normalized = {};
  Object.entries(rawMap).forEach(([entryKey, entryValue]) => {
    const sourceObject =
      entryValue && typeof entryValue === "object" && !Array.isArray(entryValue)
        ? entryValue
        : { country: entryKey, target: entryValue };
    const country = String(sourceObject.country || entryKey || "").trim();
    const target = sanitizeProviderTargetValue(sourceObject.target);
    const countryKey = normalizeText(country);
    if (!countryKey || target <= 0) {
      return;
    }
    normalized[countryKey] = {
      country,
      target,
    };
  });
  return normalized;
}

function getProviderTargetsByCountry() {
  return normalizeProviderTargetsByCountry(state.settings?.providerTargetsByCountry || {});
}

function getProviderTargetForCountry(country) {
  const countryKey = normalizeText(country);
  if (!countryKey) {
    return 0;
  }
  const entry = getProviderTargetsByCountry()[countryKey];
  return sanitizeProviderTargetValue(entry?.target || 0);
}

function getProviderTargetTotalForAllCountries() {
  return Object.values(getProviderTargetsByCountry()).reduce((sum, entry) => {
    return sum + sanitizeProviderTargetValue(entry?.target || 0);
  }, 0);
}

function formatPercentLabel(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0,0";
  }
  return value.toLocaleString("de-AT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function renderProviderTargetParameterForm() {
  if (!els.paramTargetCountry || !els.paramTargetValue) {
    return;
  }

  const countries = getAvailableCountriesFromProviders();
  if (!countries.length) {
    els.paramTargetCountry.innerHTML = "";
    els.paramTargetValue.value = "";
    if (els.paramTargetInfo) {
      els.paramTargetInfo.textContent = "Keine Länder verfügbar.";
    }
    if (els.paramTargetList) {
      els.paramTargetList.innerHTML = "";
    }
    return;
  }

  const dashboardCountryFilter = getAdminDashboardCountryFilter();
  if (dashboardCountryFilter !== "all" && countries.includes(dashboardCountryFilter)) {
    if (!parameterTargetCountry || !countries.includes(parameterTargetCountry)) {
      parameterTargetCountry = dashboardCountryFilter;
    }
  }
  if (!countries.includes(parameterTargetCountry)) {
    parameterTargetCountry = countries[0] || "";
  }

  els.paramTargetCountry.innerHTML = countries
    .map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`)
    .join("");
  els.paramTargetCountry.value = parameterTargetCountry;

  const currentTarget = getProviderTargetForCountry(parameterTargetCountry);
  els.paramTargetValue.value = currentTarget > 0 ? String(currentTarget) : "";
  if (els.paramTargetInfo) {
    els.paramTargetInfo.textContent =
      currentTarget > 0
        ? `Aktuell: ${parameterTargetCountry} = ${currentTarget} Live-Anbieter (Zielwert)`
        : `Noch kein Zielwert für ${parameterTargetCountry} gespeichert.`;
  }

  if (els.paramTargetList) {
    const targetEntries = Object.values(getProviderTargetsByCountry()).sort((a, b) =>
      a.country.localeCompare(b.country, "de")
    );
    els.paramTargetList.innerHTML = targetEntries.length
      ? targetEntries
          .map(
            (entry) => `
              <span class="param-target-chip">
                ${escapeHtml(entry.country)}: <strong>${escapeHtml(String(entry.target))}</strong>
              </span>
            `
          )
          .join("")
      : '<span class="param-target-empty">Keine Zielwerte hinterlegt.</span>';
  }
}

function normalizeDashboardAdminTab(tabId) {
  return ["map", "matrix", "employee"].includes(tabId) ? tabId : "map";
}

function isAdminDashboardMode() {
  return isAdmin();
}

function canCurrentUserViewEmployeeDashboardPanel() {
  if (isAdminDashboardMode()) {
    return true;
  }
  return Boolean(getCurrentUser());
}

function isDashboardAdminTabActive(tabId) {
  return normalizeDashboardAdminTab(tabId) === dashboardAdminTab;
}

function setDashboardAdminTab(tabId) {
  dashboardAdminTab = normalizeDashboardAdminTab(tabId);
  if (dashboardAdminTab !== "employee") {
    selectedEmployeeActivityUserId = "";
    closeEmployeeDetailsModal();
  }
  renderDashboardAdminTabs();
  renderActiveDashboardAdminPanel();
}

function renderDashboardAdminTabs() {
  dashboardAdminTab = normalizeDashboardAdminTab(dashboardAdminTab);
  const adminDashboardMode = isAdminDashboardMode();
  const canViewEmployeePanel = canCurrentUserViewEmployeeDashboardPanel();

  if (els.dashboardAdminTabs) {
    els.dashboardAdminTabs.classList.toggle("hidden", !adminDashboardMode);
  }

  els.dashboardAdminTabButtons.forEach((button) => {
    const tabId = button.dataset.dashboardAdminTab || "";
    button.classList.toggle("active", adminDashboardMode && tabId === dashboardAdminTab);
    button.disabled = !adminDashboardMode;
  });

  els.dashboardAdminPanels.forEach((panel) => {
    const panelTab = panel.dataset.dashboardAdminPanel || "";
    if (!adminDashboardMode) {
      const hidePanel =
        panelTab !== "map" && (panelTab !== "employee" || !canViewEmployeePanel);
      panel.classList.toggle("hidden", hidePanel);
      return;
    }
    panel.classList.toggle("hidden", panelTab !== dashboardAdminTab);
  });
}

function normalizeCountryFilterSelection(value) {
  const raw = String(value || "").trim();
  if (!raw || normalizeText(raw) === "all") {
    return "all";
  }
  return raw;
}

function getCountryFilterOptionsForCurrentUser() {
  const visibleProviders = getVisibleProvidersForCurrentUser("all");
  return Array.from(
    new Set(
      PREDEFINED_TERRITORY_COUNTRIES.concat(
        getProviderLocationEntries(visibleProviders, "all")
          .map((entry) => String(entry.location.country || "").trim())
          .filter(Boolean)
      )
    )
  ).sort((a, b) => a.localeCompare(b, "de"));
}

function syncPlatformCountryFilterFromSettings() {
  const countries = getCountryFilterOptionsForCurrentUser();
  const settingsCountryFilter = normalizeCountryFilterSelection(
    state.settings?.platformCountryFilter || DASHBOARD_DEFAULT_COUNTRY
  );
  const nextFilter =
    settingsCountryFilter === "all" || countries.includes(settingsCountryFilter)
      ? settingsCountryFilter
      : getDefaultDashboardCountryFilter(countries);
  platformCountryFilter = nextFilter;
  if (normalizeCountryFilterSelection(state.settings?.platformCountryFilter) !== nextFilter) {
    state.settings = normalizeSettings({
      ...state.settings,
      platformCountryFilter: nextFilter,
    });
  }
}

function normalizeDashboardStatusFilter(value) {
  return value === DASHBOARD_STATUS_FILTER_LIVE_AND_OPEN
    ? DASHBOARD_STATUS_FILTER_LIVE_AND_OPEN
    : DASHBOARD_STATUS_FILTER_LIVE_ONLY;
}

function syncDashboardStatusFilterFromSettings() {
  const nextFilter = normalizeDashboardStatusFilter(state.settings?.dashboardStatusFilter);
  dashboardStatusFilter = nextFilter;
  if (state.settings?.dashboardStatusFilter !== nextFilter) {
    state.settings = normalizeSettings({
      ...state.settings,
      dashboardStatusFilter: nextFilter,
    });
  }
}

function getDashboardStatusFilterLabel() {
  return dashboardStatusFilter === DASHBOARD_STATUS_FILTER_LIVE_AND_OPEN ? "LIVE + OFFEN" : "nur LIVE";
}

function renderDashboardStatusFilterControl() {
  els.dashboardStatusFilterInputs?.forEach((input) => {
    input.checked = normalizeDashboardStatusFilter(input.value) === dashboardStatusFilter;
  });
  if (els.dashboardMatrixStatusValue) {
    els.dashboardMatrixStatusValue.textContent = getDashboardStatusFilterLabel();
  }
}

function renderPlatformCountryControl() {
  if (!els.platformCountrySelect) {
    return;
  }

  const countries = getCountryFilterOptionsForCurrentUser();
  const availableOptions = ['<option value="all">Alle Länder</option>']
    .concat(countries.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`))
    .join("");
  els.platformCountrySelect.innerHTML = availableOptions;

  if (!countries.includes(platformCountryFilter) && platformCountryFilter !== "all") {
    platformCountryFilter = getDefaultDashboardCountryFilter(countries);
  }
  els.platformCountrySelect.value = platformCountryFilter;
}

function setPlatformCountryFilter(nextCountryFilter, { persist = true } = {}) {
  const countries = getCountryFilterOptionsForCurrentUser();
  const normalized = normalizeCountryFilterSelection(nextCountryFilter);
  const nextFilter =
    normalized === "all" || countries.includes(normalized)
      ? normalized
      : getDefaultDashboardCountryFilter(countries);
  const currentFilter = normalizeCountryFilterSelection(platformCountryFilter);
  const unchanged = normalizeText(currentFilter) === normalizeText(nextFilter);

  platformCountryFilter = nextFilter;
  if (unchanged) {
    return;
  }
  selectedEmployeeActivityUserId = "";
  closeEmployeeDetailsModal();

  if (persist) {
    state.settings = normalizeSettings({
      ...state.settings,
      platformCountryFilter: nextFilter,
    });
    saveState();
  }
  renderAll();
}

function setDashboardStatusFilter(nextFilter, { persist = true } = {}) {
  const normalized = normalizeDashboardStatusFilter(nextFilter);
  if (dashboardStatusFilter === normalized) {
    renderDashboardStatusFilterControl();
    return;
  }

  dashboardStatusFilter = normalized;
  selectedEmployeeActivityUserId = "";
  closeEmployeeDetailsModal();

  if (persist) {
    state.settings = normalizeSettings({
      ...state.settings,
      dashboardStatusFilter: normalized,
    });
    saveState();
  }
  renderAll();
}

function getAdminDashboardCountryFilter() {
  return platformCountryFilter || "all";
}

function getDashboardStateRankingCountryFilter() {
  return platformCountryFilter || "all";
}

function providerMatchesDashboardStatusFilter(provider) {
  const bucket = getProviderStatusBucket(provider?.status);
  if (dashboardStatusFilter === DASHBOARD_STATUS_FILTER_LIVE_AND_OPEN) {
    return bucket === "live" || bucket === "open";
  }
  return bucket === "live";
}

function filterProvidersByDashboardStatusFilter(providers) {
  return (Array.isArray(providers) ? providers : []).filter((provider) => providerMatchesDashboardStatusFilter(provider));
}

function getProviderStateEntriesForRanking(provider, countryFilter = "all") {
  const normalizedCountryFilter = normalizeText(countryFilter);
  const includeAllCountries = !countryFilter || countryFilter === "all";
  const entriesByKey = new Map();
  getProviderEffectiveLocations(provider).forEach((location) => {
    const country = String(location?.country || "").trim();
    if (!country) {
      return;
    }
    const normalizedCountry = normalizeText(country);
    if (!includeAllCountries && normalizedCountry !== normalizedCountryFilter) {
      return;
    }
    const state = String(location?.state || "").trim() || "Ohne Bundesland";
    const normalizedState = normalizeText(state);
    const key = `${normalizedCountry}|${normalizedState}`;
    if (!entriesByKey.has(key)) {
      entriesByKey.set(key, {
        key,
        country,
        state,
      });
    }
  });
  return Array.from(entriesByKey.values());
}

function collectDashboardStateRankingRows(countryFilter = "all") {
  const visibleProviders = filterProvidersByDashboardStatusFilter(getVisibleProvidersForCurrentUser());
  const rowsByKey = new Map();

  visibleProviders.forEach((provider) => {
    const stateEntries = getProviderStateEntriesForRanking(provider, countryFilter);
    stateEntries.forEach((entry) => {
      const existing = rowsByKey.get(entry.key);
      if (existing) {
        existing.count += 1;
        return;
      }
      rowsByKey.set(entry.key, {
        ...entry,
        count: 1,
      });
    });
  });

  if (countryFilter && countryFilter !== "all") {
    const country = String(countryFilter || "").trim();
    const normalizedCountry = normalizeText(country);
    getAvailableStatesForCountry(country).forEach((stateLabel) => {
      const state = String(stateLabel || "").trim();
      if (!state) {
        return;
      }
      const key = `${normalizedCountry}|${normalizeText(state)}`;
      if (!rowsByKey.has(key)) {
        rowsByKey.set(key, {
          key,
          country,
          state,
          count: 0,
        });
      }
    });
  }

  return Array.from(rowsByKey.values());
}

function renderDashboardStateRankingList(items, countryFilter = "all", emptyLabel = "Keine Bundesländer verfügbar.") {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="dashboard-state-empty">${escapeHtml(emptyLabel)}</p>`;
  }
  const singleCountry = countryFilter && countryFilter !== "all";
  return `
    <ul class="dashboard-state-list">
      ${items
        .map((entry) => {
          const stateLabel = singleCountry
            ? entry.state
            : `${entry.country} · ${entry.state}`;
          return `
            <li>
              <span>${escapeHtml(stateLabel)}</span>
              <strong>${escapeHtml(String(entry.count))}</strong>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function renderDashboardStateRanking(countryFilter = getDashboardStateRankingCountryFilter()) {
  if (!els.dashboardStateRanking) {
    return;
  }
  const currentUser = getCurrentUser();
  if (!currentUser) {
    els.dashboardStateRanking.innerHTML = "";
    return;
  }

  const rows = collectDashboardStateRankingRows(countryFilter);
  const params = getMapParameters();
  const topThreshold = sanitizeStateRankingThreshold(params.stateTopThreshold, DEFAULT_MAP_PARAMETERS.stateTopThreshold);
  const flopThreshold = sanitizeStateRankingThreshold(
    params.stateFlopThreshold,
    DEFAULT_MAP_PARAMETERS.stateFlopThreshold
  );
  const topRows = rows
    .filter((entry) => entry.count > topThreshold)
    .slice()
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      if (a.country !== b.country) {
        return a.country.localeCompare(b.country, "de");
      }
      return a.state.localeCompare(b.state, "de");
    });
  const flopRows = rows
    .filter((entry) => entry.count < flopThreshold)
    .slice()
    .sort((a, b) => {
      if (a.count !== b.count) {
        return a.count - b.count;
      }
      if (a.country !== b.country) {
        return a.country.localeCompare(b.country, "de");
      }
      return a.state.localeCompare(b.state, "de");
    });

  const scopeLabel = countryFilter === "all"
    ? !isAdminDashboardMode() && hasCurrentUserTerritoryAssignment()
      ? "Zugewiesene Gebiete"
      : "Alle Länder"
    : countryFilter;
  const statusScopeLabel = getDashboardStatusFilterLabel();

  els.dashboardStateRanking.innerHTML = `
    <article class="dashboard-state-card dashboard-state-card-top">
      <h4>Top Bundesländer</h4>
      <p>${escapeHtml(scopeLabel)} · ${escapeHtml(statusScopeLabel)} · Anbieter &gt; ${escapeHtml(String(topThreshold))}</p>
      ${renderDashboardStateRankingList(
        topRows,
        countryFilter,
        `Keine Bundesländer mit Anbieter > ${topThreshold}.`
      )}
    </article>
    <article class="dashboard-state-card dashboard-state-card-flop">
      <h4>Flop Bundesländer</h4>
      <p>${escapeHtml(scopeLabel)} · ${escapeHtml(statusScopeLabel)} · Anbieter &lt; ${escapeHtml(String(flopThreshold))}</p>
      ${renderDashboardStateRankingList(
        flopRows,
        countryFilter,
        `Keine Bundesländer mit Anbieter < ${flopThreshold}.`
      )}
    </article>
  `;
}

function formatCompactDashboardList(items, maxItems = 4, emptyLabel = "–") {
  const labels = Array.isArray(items)
    ? Array.from(
        new Set(
          items
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        )
      )
    : [];
  if (!labels.length) {
    return emptyLabel;
  }
  if (labels.length <= maxItems) {
    return labels.join(", ");
  }
  return `${labels.slice(0, maxItems).join(", ")} +${labels.length - maxItems}`;
}

function getUserDisplayNameByUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return "";
  }
  const userEntry = state.users.find(
    (entry) => entry.source === "profile" && String(entry.sourceId || "").trim() === normalizedUserId
  );
  return String(userEntry?.name || userEntry?.email || "").trim();
}

function getProviderLiveByDisplayName(provider) {
  const explicitName = String(provider?.liveByName || "").trim();
  if (explicitName) {
    return explicitName;
  }
  const fallbackName = getUserDisplayNameByUserId(provider?.liveByUserId);
  if (fallbackName) {
    return fallbackName;
  }
  return "Unbekannt";
}

function getProviderRegionSummary(provider, countryFilter = "all") {
  const scopedLocations = getProviderEffectiveLocations(provider).filter((location) =>
    locationMatchesCountry(location, countryFilter)
  );
  const locations = scopedLocations.length ? scopedLocations : getProviderEffectiveLocations(provider);
  if (!locations.length) {
    return {
      statesLabel: "Ohne Bundesland",
      countriesLabel: countryFilter === "all" ? "–" : String(countryFilter || "").trim() || "–",
    };
  }

  const states = locations
    .map((location) => String(location?.state || "").trim() || "Ohne Bundesland")
    .sort((a, b) => a.localeCompare(b, "de"));
  const countries = locations
    .map((location) => String(location?.country || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));

  return {
    statesLabel: formatCompactDashboardList(states, 999, "Ohne Bundesland"),
    countriesLabel: formatCompactDashboardList(countries, 999, countryFilter === "all" ? "–" : countryFilter),
  };
}

function renderDashboardWeekLiveActivations() {
  if (!els.dashboardWeekLiveActivations) {
    return;
  }
  const adminMode = isAdminDashboardMode();
  const showPanel = adminMode && dashboardAdminTab === "map";
  els.dashboardWeekLiveActivations.classList.toggle("hidden", !showPanel);
  if (!showPanel) {
    els.dashboardWeekLiveActivations.innerHTML = "";
    return;
  }

  const countryFilter = getAdminDashboardCountryFilter();
  const weekStart = getStartOfWeek(new Date());
  const now = new Date();
  const range = { start: weekStart, end: now };
  const liveRows = getVisibleProvidersForCurrentUser()
    .filter((provider) => isLiveStatus(provider?.status))
    .filter((provider) => providerMatchesCountry(provider, countryFilter))
    .map((provider) => {
      const liveEvent = getProviderLiveEvent(provider);
      return {
        provider,
        liveAt: liveEvent.liveAt,
      };
    })
    .filter((entry) => isIsoInRange(entry.liveAt, range))
    .sort((a, b) => new Date(b.liveAt).getTime() - new Date(a.liveAt).getTime());

  const countryLabel = countryFilter === "all" ? "Alle Länder" : countryFilter;
  const rangeLabel = `Diese Woche (${formatDateRangeLabel(weekStart)} bis ${formatDateRangeLabel(now)})`;
  if (!liveRows.length) {
    els.dashboardWeekLiveActivations.innerHTML = `
      <article class="dashboard-week-live-card">
        <div class="dashboard-week-live-head">
          <h3>Diese Woche LIVE geschaltet</h3>
          <p>${escapeHtml(countryLabel)} · ${escapeHtml(rangeLabel)}</p>
        </div>
        <p class="empty">Keine LIVE-Schaltungen im gewählten Zeitraum.</p>
      </article>
    `;
    return;
  }

  els.dashboardWeekLiveActivations.innerHTML = `
    <article class="dashboard-week-live-card">
      <div class="dashboard-week-live-head">
        <h3>Diese Woche LIVE geschaltet</h3>
        <p>${escapeHtml(countryLabel)} · ${escapeHtml(rangeLabel)}</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Anbieter</th>
              <th>Bundesland</th>
              <th>Land</th>
              <th>Freigeschaltet von</th>
            </tr>
          </thead>
          <tbody>
            ${liveRows
              .map((entry) => {
                const region = getProviderRegionSummary(entry.provider, countryFilter);
                return `
                  <tr>
                    <td>${escapeHtml(String(entry.provider?.name || "–"))}</td>
                    <td>${escapeHtml(region.statesLabel)}</td>
                    <td>${escapeHtml(region.countriesLabel)}</td>
                    <td>${escapeHtml(getProviderLiveByDisplayName(entry.provider))}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderDashboardKpiDetailItems(items, emptyLabel = "Keine Live-Einträge") {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="dashboard-live-kpi-empty">${escapeHtml(emptyLabel)}</p>`;
  }
  return `
    <ul class="dashboard-live-kpi-list">
      ${items.map((item) => `<li>${escapeHtml(String(item || ""))}</li>`).join("")}
    </ul>
  `;
}

function renderDashboardLiveKpis() {
  if (!els.dashboardLiveKpis) {
    return;
  }
  const adminMode = isAdminDashboardMode();
  els.dashboardLiveKpis.classList.toggle("hidden", !adminMode);
  if (!adminMode) {
    els.dashboardLiveKpis.innerHTML = "";
    renderDashboardProviderTargetGauge();
    renderDashboardWeekLiveActivations();
    return;
  }

  const countryFilter = getAdminDashboardCountryFilter();
  const scopedProviders = filterProvidersByDashboardStatusFilter(getVisibleProvidersForCurrentUser())
    .filter((provider) => providerMatchesCountry(provider, countryFilter));
  const topics = getAllTopics();
  const topicLookup = new Map(topics.map((topic) => [topic.id, topic]));
  const categoryNameById = new Map(state.categories.map((category) => [category.id, category.name]));
  const subcategoryNameById = new Map(
    topics.map((topic) => [topic.subcategoryId, topic.subcategoryName]).filter((entry) => entry[0])
  );
  const liveCategoryIds = new Set();
  const liveSubcategoryIds = new Set();
  const liveTopicIds = new Set();

  scopedProviders.forEach((provider) => {
    (provider.topicIds || []).forEach((topicId) => {
      const topic = topicLookup.get(topicId);
      if (!topic) {
        return;
      }
      liveTopicIds.add(topic.id);
      liveSubcategoryIds.add(topic.subcategoryId);
      liveCategoryIds.add(topic.categoryId);
    });
  });

  const liveCategoryNames = Array.from(liveCategoryIds)
    .map((categoryId) => categoryNameById.get(categoryId) || "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));
  const liveSubcategoryNames = Array.from(liveSubcategoryIds)
    .map((subcategoryId) => subcategoryNameById.get(subcategoryId) || "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));
  const liveTopicNames = Array.from(liveTopicIds)
    .map((topicId) => topicLookup.get(topicId)?.name || "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));

  const countryLabel = countryFilter === "all" ? "Alle Länder (kumuliert)" : countryFilter;
  const statusLabel = dashboardStatusFilter === DASHBOARD_STATUS_FILTER_LIVE_AND_OPEN ? "Live + offen" : "Live";
  els.dashboardLiveKpis.innerHTML = `
    <article class="dashboard-live-kpi-card" tabindex="0">
      <p>Kategorien ${escapeHtml(statusLabel)}</p>
      <h3>${escapeHtml(String(liveCategoryIds.size))}</h3>
      <small>${escapeHtml(countryLabel)}</small>
      <div class="dashboard-live-kpi-tooltip" role="tooltip">
        <h4>Kategorien</h4>
        ${renderDashboardKpiDetailItems(
          liveCategoryNames,
          statusLabel === "Live" ? "Keine Live-Kategorien" : "Keine Kategorien für Live + offen"
        )}
      </div>
    </article>
    <article class="dashboard-live-kpi-card" tabindex="0">
      <p>Themenbereiche ${escapeHtml(statusLabel)}</p>
      <h3>${escapeHtml(String(liveSubcategoryIds.size))}</h3>
      <small>${escapeHtml(countryLabel)}</small>
      <div class="dashboard-live-kpi-tooltip" role="tooltip">
        <h4>Themenbereiche</h4>
        ${renderDashboardKpiDetailItems(
          liveSubcategoryNames,
          statusLabel === "Live" ? "Keine Live-Themenbereiche" : "Keine Themenbereiche für Live + offen"
        )}
      </div>
    </article>
    <article class="dashboard-live-kpi-card" tabindex="0">
      <p>Themen ${escapeHtml(statusLabel)}</p>
      <h3>${escapeHtml(String(liveTopicIds.size))}</h3>
      <small>${escapeHtml(countryLabel)}</small>
      <div class="dashboard-live-kpi-tooltip" role="tooltip">
        <h4>Themen</h4>
        ${renderDashboardKpiDetailItems(
          liveTopicNames,
          statusLabel === "Live" ? "Keine Live-Themen" : "Keine Themen für Live + offen"
        )}
      </div>
    </article>
  `;
  renderDashboardProviderTargetGauge();
  renderDashboardWeekLiveActivations();
}

function renderDashboardProviderTargetGauge() {
  if (!els.dashboardProviderTargetGauge) {
    return;
  }
  const adminMode = isAdminDashboardMode();
  const showGauge = adminMode && dashboardAdminTab === "map";
  els.dashboardProviderTargetGauge.classList.toggle("hidden", !showGauge);
  if (!showGauge) {
    els.dashboardProviderTargetGauge.innerHTML = "";
    return;
  }

  const countryFilter = getAdminDashboardCountryFilter();
  const countryLabel = countryFilter === "all" ? "Alle Länder (kumuliert)" : countryFilter;
  const scopedProviders = filterProvidersByDashboardStatusFilter(getVisibleProvidersForCurrentUser())
    .filter((provider) => providerMatchesCountry(provider, countryFilter));
  const providerCount = scopedProviders.length;
  const statusScopeLabel = dashboardStatusFilter === DASHBOARD_STATUS_FILTER_LIVE_AND_OPEN ? "Live/Offen" : "Live";
  const targetValue =
    countryFilter === "all" ? getProviderTargetTotalForAllCountries() : getProviderTargetForCountry(countryFilter);
  const hasTarget = targetValue > 0;
  const rawPercent = hasTarget ? (providerCount / targetValue) * 100 : 0;
  const displayPercent = hasTarget ? rawPercent : 0;
  const clampedPercent = Math.max(0, Math.min(100, displayPercent));
  const needleAngle = -90 + (clampedPercent / 100) * 180;

  let statusText = "";
  if (!hasTarget) {
    statusText =
      countryFilter === "all"
        ? "Kein kumulierter Zielwert hinterlegt. Bitte Zielwerte je Land in den Parametern setzen."
        : `Für ${countryLabel} ist noch kein Zielwert hinterlegt.`;
  } else if (providerCount >= targetValue) {
    statusText = `Ziel erreicht: ${providerCount - targetValue} über Ziel.`;
  } else {
    statusText = `${targetValue - providerCount} bis zum Ziel.`;
  }

  const percentLabel = `${formatPercentLabel(displayPercent)}%`;
  const targetLabel = hasTarget ? String(targetValue) : "nicht gesetzt";
  const inactiveClass = !hasTarget ? "is-inactive" : "";
  const progressDash = `${clampedPercent} 100`;
  const safeNeedleAngle = Number.isFinite(needleAngle) ? needleAngle : -90;
  const needleRad = (safeNeedleAngle * Math.PI) / 180;
  const needleCenterX = 160;
  const needleCenterY = 160;
  const needleLength = 102;
  const needleTipX = needleCenterX + Math.sin(needleRad) * needleLength;
  const needleTipY = needleCenterY - Math.cos(needleRad) * needleLength;
  const needleDx = needleTipX - needleCenterX;
  const needleDy = needleTipY - needleCenterY;
  const needleNorm = Math.hypot(needleDx, needleDy) || 1;
  const needleUnitX = needleDx / needleNorm;
  const needleUnitY = needleDy / needleNorm;
  const needlePerpX = -needleUnitY;
  const needlePerpY = needleUnitX;
  const needleTipBaseDistance = 13;
  const needleTipHalfWidth = 5.2;
  const needleBaseX = needleTipX - needleUnitX * needleTipBaseDistance;
  const needleBaseY = needleTipY - needleUnitY * needleTipBaseDistance;
  const needleLeftX = needleBaseX + needlePerpX * needleTipHalfWidth;
  const needleLeftY = needleBaseY + needlePerpY * needleTipHalfWidth;
  const needleRightX = needleBaseX - needlePerpX * needleTipHalfWidth;
  const needleRightY = needleBaseY - needlePerpY * needleTipHalfWidth;

  els.dashboardProviderTargetGauge.innerHTML = `
    <article class="target-meter-card ${inactiveClass}">
      <div class="target-meter-head">
        <p>Zielwert ${escapeHtml(statusScopeLabel)}-Anbieter</p>
        <span>${escapeHtml(countryLabel)}</span>
      </div>
      <div class="target-meter-body">
        <div class="target-meter-visual">
          <svg class="target-meter-svg" viewBox="0 0 320 220" aria-hidden="true">
            <defs>
              <linearGradient id="target-meter-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0d2d63"></stop>
                <stop offset="56%" stop-color="#1f5da8"></stop>
                <stop offset="100%" stop-color="#b8f1c9"></stop>
              </linearGradient>
              <filter id="target-meter-needle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#081f45" flood-opacity="0.35" />
              </filter>
            </defs>
            <path d="M 40 160 A 120 120 0 0 1 280 160" class="target-meter-track" pathLength="100"></path>
            <path
              d="M 40 160 A 120 120 0 0 1 280 160"
              class="target-meter-progress"
              pathLength="100"
              style="stroke-dasharray:${progressDash};"
            ></path>
            <line
              x1="${needleCenterX.toFixed(2)}"
              y1="${needleCenterY.toFixed(2)}"
              x2="${needleBaseX.toFixed(2)}"
              y2="${needleBaseY.toFixed(2)}"
              class="target-meter-needle-back"
            ></line>
            <line
              x1="${needleCenterX.toFixed(2)}"
              y1="${needleCenterY.toFixed(2)}"
              x2="${needleBaseX.toFixed(2)}"
              y2="${needleBaseY.toFixed(2)}"
              class="target-meter-needle"
            ></line>
            <path
              d="M${needleTipX.toFixed(2)} ${needleTipY.toFixed(2)} L${needleLeftX.toFixed(2)} ${needleLeftY.toFixed(
                2
              )} L${needleRightX.toFixed(2)} ${needleRightY.toFixed(2)} Z"
              class="target-meter-needle-tip"
            ></path>
            <circle cx="160" cy="160" r="10" class="target-meter-pivot"></circle>
            <circle cx="160" cy="160" r="3.4" class="target-meter-pivot-dot"></circle>
            <text x="40" y="186" class="target-meter-edge-label">0%</text>
            <text x="280" y="186" class="target-meter-edge-label">100%</text>
          </svg>
        </div>
        <div class="target-meter-foot">
          <strong>${escapeHtml(percentLabel)}</strong>
          <p>${escapeHtml(String(providerCount))} ${escapeHtml(statusScopeLabel)} von ${escapeHtml(targetLabel)}</p>
          <small>${escapeHtml(statusText)}</small>
        </div>
      </div>
    </article>
  `;
}

function renderActiveDashboardAdminPanel() {
  if (!isSectionActive("dashboard-section")) {
    return;
  }
  renderDashboardLiveKpis();
  renderDashboardStateRanking();
  if (!isAdminDashboardMode()) {
    renderDashboardMap();
    if (canCurrentUserViewEmployeeDashboardPanel()) {
      renderDashboardEmployeePanel();
    } else {
      closeEmployeeDetailsModal();
    }
    return;
  }

  if (dashboardAdminTab === "matrix") {
    renderBundeslandMatrix();
    return;
  }
  if (dashboardAdminTab === "employee") {
    renderDashboardEmployeePanel();
    return;
  }
  renderDashboardMap();
}

function renderDashboardMap() {
  if (!els.dashboardMapPanel || !els.dashboardMapCanvas) {
    return;
  }
  if (!isSectionActive("dashboard-section")) {
    return;
  }
  if (isAdminDashboardMode() && !isDashboardAdminTabActive("map")) {
    return;
  }

  renderDashboardMapControls();
  renderDashboardLiveKpis();
  const radiusKm = getRadiusKmForLevel(mapLevelFilter);
  if (els.mapRadiusInfo) {
    els.mapRadiusInfo.textContent = `Treffer-Umkreis: ${radiusKm} km (${getMapLevelLabel(mapLevelFilter)})`;
  }

  if (!googleMapsReady || !window.google?.maps) {
    showDashboardMapEmpty(
      googlePlacesLoadError ||
        "Google Maps wird geladen. Wenn es leer bleibt: API-Key, Referrer, Billing und APIs prüfen."
    );
    return;
  }

  if (!dashboardMap) {
    dashboardMap = new window.google.maps.Map(els.dashboardMapCanvas, {
      center: { lat: 48.2082, lng: 16.3738 },
      zoom: 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
  }

  clearDashboardMapOverlays();

  const allTopics = getAllTopics();
  const topicLookup = new Map(allTopics.map((topic) => [topic.id, topic]));
  const scopedProviders = filterProvidersByDashboardStatusFilter(getVisibleProvidersForCurrentUser());
  const countryLocationEntries = getProviderLocationEntries(scopedProviders, platformCountryFilter);
  queueProviderGeocoding(countryLocationEntries);
  const countryLocationsWithCoords = countryLocationEntries.filter((entry) => !!getProviderCoordinates(entry.location));

  const hits = countryLocationsWithCoords
    .map((entry) => {
      const coords = getProviderCoordinates(entry.location);
      if (!coords) {
        return null;
      }
      const groups = getProviderGroupsForLevel(entry.provider, mapLevelFilter, topicLookup);
      const fallbackGroup = {
        id: `unassigned_${mapLevelFilter}`,
        label: "Ohne Zuordnung",
      };
      const groupsWithFallback = groups.length ? groups : [fallbackGroup];
      const relevantGroups =
        mapItemFilter === "all" ? groupsWithFallback : groupsWithFallback.filter((group) => group.id === mapItemFilter);
      if (!relevantGroups.length) {
        return null;
      }
      return {
        provider: entry.provider,
        location: entry.location,
        coords,
        groups: relevantGroups,
        colorGroup: mapItemFilter === "all" ? relevantGroups[0] : relevantGroups[0],
      };
    })
    .filter(Boolean);

  if (!hits.length) {
    if (!countryLocationEntries.length) {
      const emptyStatusText =
        dashboardStatusFilter === DASHBOARD_STATUS_FILTER_LIVE_AND_OPEN
          ? "Status LIVE oder OFFEN"
          : "Status LIVE";
      showDashboardMapEmpty(`Für das gewählte Land gibt es noch keine Anbieter mit ${emptyStatusText}.`);
      return;
    }
    if (!countryLocationsWithCoords.length) {
      const pendingCount = providerGeocodeInFlight.size;
      showDashboardMapEmpty(
        pendingCount
          ? `Koordinaten werden automatisch ermittelt (${pendingCount} offen). Bitte 5-15 Sekunden warten.`
          : "Keine Koordinaten vorhanden. Bitte Standortadressen vollständig pflegen und speichern."
      );
      return;
    }
    showDashboardMapEmpty(
      "Keine Treffer für die aktuelle Auswahl gefunden. Prüfe Themen-Zuordnung beim Anbieter."
    );
    return;
  }

  hideDashboardMapEmpty();
  const colorByGroup = getDashboardColorMap(hits);
  const bounds = new window.google.maps.LatLngBounds();
  const legendMap = new Map();

  hits.forEach((hit) => {
    const group = hit.colorGroup;
    const color = colorByGroup.get(group.id) || MAP_COLOR_PALETTE[0];
    const marker = new window.google.maps.Marker({
      map: dashboardMap,
      position: hit.coords,
      title: hit.provider.name,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 1.5,
      },
    });
    const circle = new window.google.maps.Circle({
      map: dashboardMap,
      center: hit.coords,
      radius: radiusKm * 1000,
      fillColor: color,
      fillOpacity: 0.32,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 1.8,
    });
	    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="font-family: Sora, sans-serif; min-width: 220px;">
          <strong>${escapeHtml(hit.provider.name)}</strong><br/>
          <span>${escapeHtml(hit.location.city || "")}, ${escapeHtml(hit.location.country || "")}</span><br/>
          <span>${escapeHtml(hit.location.address || "")}</span><br/>
          <span>${escapeHtml(getMapLevelLabel(mapLevelFilter))}: ${escapeHtml(
            hit.groups.map((entry) => entry.label).join(", ")
          )}</span>
        </div>
      `,
    });

    marker.addListener("click", () => {
      infoWindow.open({ anchor: marker, map: dashboardMap });
    });

    dashboardMapMarkers.push(marker);
    dashboardMapCircles.push(circle);
    dashboardMapInfoWindows.push(infoWindow);
    bounds.extend(hit.coords);
    legendMap.set(group.id, { label: group.label, color });
  });

  if (hits.length === 1) {
    dashboardMap.setCenter(hits[0].coords);
    dashboardMap.setZoom(10);
  } else {
    dashboardMap.fitBounds(bounds, 60);
  }

  renderDashboardMapLegend(Array.from(legendMap.values()));
}

function renderDashboardMapControls() {
  if (!els.mapCountrySelect || !els.mapLevelSelect || !els.mapItemSelect) {
    return;
  }

  const countries = getCountryFilterOptionsForCurrentUser();

  const countryOptions = ['<option value="all">Alle Länder</option>']
    .concat(
      countries.map(
        (country) =>
          `<option value="${escapeHtml(country)}">${escapeHtml(truncateSelectLabel(country))}</option>`
      )
    )
    .join("");
  els.mapCountrySelect.innerHTML = countryOptions;
  if (!countries.includes(platformCountryFilter) && platformCountryFilter !== "all") {
    platformCountryFilter = getDefaultDashboardCountryFilter(countries);
  }
  els.mapCountrySelect.value = platformCountryFilter;

  if (!["category", "subcategory", "topic"].includes(mapLevelFilter)) {
    mapLevelFilter = "category";
  }
  els.mapLevelSelect.value = mapLevelFilter;

  const entities = getMapEntitiesForLevel(mapLevelFilter);
  if (!entities.length) {
    mapItemFilter = "all";
    els.mapItemSelect.innerHTML = '<option value="all">Keine Einträge vorhanden</option>';
    els.mapItemSelect.value = "all";
    return;
  }
  const validEntityIds = new Set(entities.map((entry) => entry.id));
  if (mapItemFilter !== "all" && !validEntityIds.has(mapItemFilter)) {
    mapItemFilter = "all";
  }

  els.mapItemSelect.innerHTML = ['<option value="all">Alle</option>']
    .concat(
      entities.map(
        (entry) =>
          `<option value="${escapeHtml(entry.id)}">${escapeHtml(truncateSelectLabel(entry.name))}</option>`
      )
    )
    .join("");
  els.mapItemSelect.value = mapItemFilter;
}

function renderBundeslandMatrix() {
  if (!els.dashboardMatrixPanel) {
    return;
  }
  if (!isAdminDashboardMode()) {
    return;
  }
  if (!isSectionActive("dashboard-section") || !isDashboardAdminTabActive("matrix")) {
    return;
  }

  renderBundeslandMatrixControls();
  renderDashboardLiveKpis();
  const matrixData = buildBundeslandMatrixData();
  const selectedCountryLabel = platformCountryFilter === "all" ? "Alle Länder" : platformCountryFilter;
  const statusScopeLabel = getDashboardStatusFilterLabel();
  if (els.dashboardMatrixInfo) {
    els.dashboardMatrixInfo.textContent =
      `Land: ${selectedCountryLabel} · Ebene: ${getMapLevelLabel(matrixLevelFilter)} · ${statusScopeLabel}-Standorte: ${matrixData.providerCount}`;
  }
  if (els.dashboardMatrixStatusValue) {
    els.dashboardMatrixStatusValue.textContent = statusScopeLabel;
  }

  if (!matrixData.rows.length) {
    showBundeslandMatrixEmpty("Keine Bundesländer für die aktuelle Auswahl vorhanden.");
    return;
  }

  hideBundeslandMatrixEmpty();
  if (!els.dashboardMatrixHead || !els.dashboardMatrixBody) {
    return;
  }

  els.dashboardMatrixHead.innerHTML = `
    <tr>
      <th class="matrix-state-col">Bundesland</th>
      <th class="matrix-total-col">${escapeHtml(statusScopeLabel)} gesamt</th>
      ${matrixData.columnIds
        .map((columnId) => `<th>${escapeHtml(matrixData.columnLabels.get(columnId) || columnId)}</th>`)
        .join("")}
    </tr>
  `;

  els.dashboardMatrixBody.innerHTML = matrixData.rows
    .map(
      (row) => `
        <tr>
          <td class="matrix-state-col">${escapeHtml(row.stateLabel)}</td>
          <td class="matrix-total-col">${escapeHtml(String(row.total))}</td>
          ${matrixData.columnIds
            .map((columnId) => `<td>${escapeHtml(String(row.counts.get(columnId) || 0))}</td>`)
            .join("")}
        </tr>
      `
    )
    .join("");
}

function renderBundeslandMatrixControls() {
  if (!els.matrixCountrySelect || !els.matrixLevelSelect) {
    return;
  }

  const countries = getCountryFilterOptionsForCurrentUser();

  els.matrixCountrySelect.innerHTML = ['<option value="all">Alle Länder</option>']
    .concat(countries.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`))
    .join("");

  if (!countries.includes(platformCountryFilter) && platformCountryFilter !== "all") {
    platformCountryFilter = getDefaultDashboardCountryFilter(countries);
  }
  els.matrixCountrySelect.value = platformCountryFilter;

  if (!["category", "subcategory", "topic"].includes(matrixLevelFilter)) {
    matrixLevelFilter = "category";
  }
  els.matrixLevelSelect.value = matrixLevelFilter;
}

function buildBundeslandMatrixData() {
  const allTopics = getAllTopics();
  const topicLookup = new Map(allTopics.map((topic) => [topic.id, topic]));
  const scopedProviders = filterProvidersByDashboardStatusFilter(getVisibleProvidersForCurrentUser());
  const scopedLocationEntries = getProviderLocationEntries(scopedProviders, platformCountryFilter);

  const rowsByState = new Map();
  const columnLabels = new Map();
  const seenProviderStateKeys = new Set();
  let countedEntries = 0;

  scopedLocationEntries.forEach((entry) => {
    const stateLabel = String(entry.location.state || "").trim() || "Ohne Bundesland";
    const providerStateKey = `${entry.provider.id}|${normalizeText(entry.location.country || "")}|${normalizeText(stateLabel)}`;
    if (seenProviderStateKeys.has(providerStateKey)) {
      return;
    }
    seenProviderStateKeys.add(providerStateKey);
    countedEntries += 1;

    const rawGroups = getProviderGroupsForLevel(entry.provider, matrixLevelFilter, topicLookup);
    const groups = rawGroups.length ? rawGroups : [{ id: `unassigned_${matrixLevelFilter}`, label: "Ohne Zuordnung" }];

    let row = rowsByState.get(stateLabel);
    if (!row) {
      row = {
        stateLabel,
        total: 0,
        counts: new Map(),
      };
      rowsByState.set(stateLabel, row);
    }

    row.total += 1;
    groups.forEach((group) => {
      columnLabels.set(group.id, group.label);
      row.counts.set(group.id, (row.counts.get(group.id) || 0) + 1);
    });
  });

  if (platformCountryFilter !== "all") {
    getAvailableStatesForCountry(platformCountryFilter).forEach((stateLabel) => {
      const normalizedState = String(stateLabel || "").trim();
      if (!normalizedState || rowsByState.has(normalizedState)) {
        return;
      }
      rowsByState.set(normalizedState, {
        stateLabel: normalizedState,
        total: 0,
        counts: new Map(),
      });
    });
  }

  const columnIds = Array.from(columnLabels.entries())
    .sort((a, b) => a[1].localeCompare(b[1], "de"))
    .map(([columnId]) => columnId);

  const rows = Array.from(rowsByState.values()).sort((a, b) => a.stateLabel.localeCompare(b.stateLabel, "de"));

  return {
    providerCount: countedEntries,
    columnIds,
    columnLabels,
    rows,
  };
}

function showBundeslandMatrixEmpty(message) {
  if (els.dashboardMatrixEmpty) {
    els.dashboardMatrixEmpty.textContent = message;
    els.dashboardMatrixEmpty.classList.remove("hidden");
  }
  if (els.dashboardMatrixWrap) {
    els.dashboardMatrixWrap.classList.add("hidden");
  }
  if (els.dashboardMatrixHead) {
    els.dashboardMatrixHead.innerHTML = "";
  }
  if (els.dashboardMatrixBody) {
    els.dashboardMatrixBody.innerHTML = "";
  }
}

function hideBundeslandMatrixEmpty() {
  if (els.dashboardMatrixEmpty) {
    els.dashboardMatrixEmpty.textContent = "";
    els.dashboardMatrixEmpty.classList.add("hidden");
  }
  if (els.dashboardMatrixWrap) {
    els.dashboardMatrixWrap.classList.remove("hidden");
  }
}

function normalizeEmployeeRatesByUserId(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
    return {};
  }
  const normalized = {};
  Object.entries(rawMap).forEach(([userId, value]) => {
    const normalizedUserId = String(userId || "").trim();
    if (!normalizedUserId) {
      return;
    }
    normalized[normalizedUserId] = sanitizeEmployeeRateValue(value);
  });
  return normalized;
}

function normalizeEmployeeHonorariumEnabledByUserId(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
    return {};
  }
  const normalized = {};
  Object.entries(rawMap).forEach(([userId, value]) => {
    const normalizedUserId = String(userId || "").trim();
    if (!normalizedUserId) {
      return;
    }
    if (value === true || normalizeText(value) === "true" || normalizeText(value) === "1") {
      normalized[normalizedUserId] = true;
    }
  });
  return normalized;
}

function sanitizeEmployeeRateValue(value) {
  const parsed = parseOptionalNumber(value);
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.round(parsed * 100) / 100);
}

function getEmployeeRateByUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return 0;
  }
  const ratesMap = normalizeEmployeeRatesByUserId(state.settings?.employeeRatesByUserId || {});
  return sanitizeEmployeeRateValue(ratesMap[normalizedUserId] || 0);
}

function isEmployeeHonorariumEnabled(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return false;
  }
  const enabledMap = normalizeEmployeeHonorariumEnabledByUserId(
    state.settings?.employeeHonorariumEnabledByUserId || {}
  );
  return enabledMap[normalizedUserId] === true;
}

function setEmployeeRateByUserId(userId, value) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return;
  }
  const ratesMap = normalizeEmployeeRatesByUserId(state.settings?.employeeRatesByUserId || {});
  const sanitizedRate = sanitizeEmployeeRateValue(value);
  if (!sanitizedRate) {
    delete ratesMap[normalizedUserId];
  } else {
    ratesMap[normalizedUserId] = sanitizedRate;
  }
  state.settings = normalizeSettings({
    ...state.settings,
    employeeRatesByUserId: ratesMap,
  });
}

function setEmployeeHonorariumEnabledByUserId(userId, enabled) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return;
  }
  const enabledMap = normalizeEmployeeHonorariumEnabledByUserId(
    state.settings?.employeeHonorariumEnabledByUserId || {}
  );
  if (enabled) {
    enabledMap[normalizedUserId] = true;
  } else {
    delete enabledMap[normalizedUserId];
  }
  state.settings = normalizeSettings({
    ...state.settings,
    employeeHonorariumEnabledByUserId: enabledMap,
  });
}

function clearEmployeeRateByUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return;
  }
  const ratesMap = normalizeEmployeeRatesByUserId(state.settings?.employeeRatesByUserId || {});
  if (!Object.prototype.hasOwnProperty.call(ratesMap, normalizedUserId)) {
    return;
  }
  delete ratesMap[normalizedUserId];
  state.settings = normalizeSettings({
    ...state.settings,
    employeeRatesByUserId: ratesMap,
  });
}

function clearEmployeeHonorariumEnabledByUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return;
  }
  const enabledMap = normalizeEmployeeHonorariumEnabledByUserId(
    state.settings?.employeeHonorariumEnabledByUserId || {}
  );
  if (!Object.prototype.hasOwnProperty.call(enabledMap, normalizedUserId)) {
    return;
  }
  delete enabledMap[normalizedUserId];
  state.settings = normalizeSettings({
    ...state.settings,
    employeeHonorariumEnabledByUserId: enabledMap,
  });
}

function formatEuroAmount(value) {
  const numeric = sanitizeEmployeeRateValue(value);
  return `${numeric.toFixed(2)} €`;
}

function formatRateInputValue(value) {
  return sanitizeEmployeeRateValue(value).toFixed(2);
}

function isLiveStatus(status) {
  return normalizeText(status || "") === "live";
}

function normalizeUserStatus(status) {
  const normalized = normalizeText(status || "");
  if (normalized === "inactive") {
    return "inactive";
  }
  if (normalized === "pending") {
    return "pending";
  }
  return "active";
}

function isUserStatusActive(status) {
  return normalizeUserStatus(status) === "active";
}

function isUserStatusPending(status) {
  return normalizeUserStatus(status) === "pending";
}

function getUserStatusLabel(status, source = "profile") {
  if (source === "invite") {
    return "eingeladen";
  }
  const normalizedStatus = normalizeUserStatus(status);
  if (normalizedStatus === "inactive") {
    return "deaktiviert";
  }
  if (normalizedStatus === "pending") {
    return "wartet auf Freigabe";
  }
  return "aktiv";
}

function parseBooleanFlag(value) {
  const normalizedValue = normalizeText(value);
  return (
    value === true ||
    normalizedValue === "true" ||
    normalizedValue === "1" ||
    normalizedValue === "on" ||
    normalizedValue === "yes" ||
    normalizedValue === "ja"
  );
}

function isProviderAdminOnly(provider) {
  if (!provider || typeof provider !== "object") {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(provider, "adminOnly")) {
    return parseBooleanFlag(provider.adminOnly);
  }
  if (Object.prototype.hasOwnProperty.call(provider, "admin_only")) {
    return parseBooleanFlag(provider.admin_only);
  }
  return false;
}

function isProviderOnlineOnly(provider) {
  if (!provider || typeof provider !== "object") {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(provider, "onlineOnly")) {
    return parseBooleanFlag(provider.onlineOnly);
  }
  if (Object.prototype.hasOwnProperty.call(provider, "online_only")) {
    return parseBooleanFlag(provider.online_only);
  }
  return false;
}

function ensureProviderLiveActivationMetadata(provider, actor, timestampIso = "") {
  const timestamp = String(timestampIso || "").trim() || new Date().toISOString();
  if (!provider.liveAt) {
    provider.liveAt = timestamp;
  }
  if (!provider.liveByName) {
    provider.liveByName = actor?.name || provider.updatedByName || provider.createdByName || "";
  }
  if (!provider.liveByRole) {
    provider.liveByRole = actor?.role || provider.updatedByRole || provider.createdByRole || "";
  }
  if (!provider.liveByUserId) {
    provider.liveByUserId = actor?.userId || provider.updatedByUserId || provider.createdByUserId || "";
  }
}

function getProviderLiveEvent(provider) {
  const fallbackLiveAt = isLiveStatus(provider?.status) ? provider?.updatedAt || provider?.createdAt || "" : "";
  const fallbackLiveByUserId = isLiveStatus(provider?.status)
    ? provider?.updatedByUserId || provider?.createdByUserId || ""
    : "";
  const liveAt = String(provider?.liveAt || fallbackLiveAt || "").trim();
  const liveByUserId = String(provider?.liveByUserId || fallbackLiveByUserId || "").trim();
  return {
    liveAt,
    liveByUserId,
  };
}

function getProviderLiveAuditStamp(provider) {
  if (!provider || typeof provider !== "object") {
    return "–";
  }
  if (provider.liveAt) {
    return formatAuditStamp(provider.liveAt, provider.liveByRole, provider.liveByName);
  }
  if (isLiveStatus(provider.status)) {
    return formatAuditStamp(provider.updatedAt, provider.updatedByRole, provider.updatedByName);
  }
  return "–";
}

function isIsoInRange(isoValue, range) {
  if (!isoValue || !range?.start || !range?.end) {
    return false;
  }
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed >= range.start && parsed < range.end;
}

function getHonorariumPeriodRanges(selectedRange) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const weekStart = getStartOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  return [
    { id: "today", label: "Heute", start: todayStart, end: now },
    { id: "week", label: "Diese Woche", start: weekStart, end: now },
    { id: "month", label: "Dieser Monat", start: monthStart, end: now },
    { id: "year", label: "Dieses Jahr", start: yearStart, end: now },
    {
      id: "selected",
      label: "Ausgewählt",
      start: selectedRange.start,
      end: selectedRange.end,
    },
  ];
}

function calculateHonorariumForRange(range, countryFilter = "all") {
  const adminMode = isAdminDashboardMode();
  const userRates = new Map();

  if (adminMode) {
    state.users
      .filter((entry) => entry.source === "profile" && isUserStatusActive(entry.status))
      .forEach((entry) => {
        const userId = String(entry.sourceId || "").trim();
        if (!userId || !isEmployeeHonorariumEnabled(userId)) {
          return;
        }
        userRates.set(userId, getEmployeeRateByUserId(entry.sourceId));
      });
  } else if (authProfile?.user_id && isEmployeeHonorariumEnabled(authProfile.user_id)) {
    userRates.set(String(authProfile.user_id).trim(), getEmployeeRateByUserId(authProfile.user_id));
  }

  const scopedProviders = getVisibleProvidersForCurrentUser();
  let totalEur = 0;
  let liveCount = 0;
  scopedProviders.forEach((provider) => {
    if (!providerMatchesCountry(provider, countryFilter)) {
      return;
    }
    if (!isLiveStatus(provider?.status)) {
      return;
    }
    const liveEvent = getProviderLiveEvent(provider);
    if (!isIsoInRange(liveEvent.liveAt, range)) {
      return;
    }
    const ownerId = String(liveEvent.liveByUserId || "").trim();
    if (!ownerId || !userRates.has(ownerId)) {
      return;
    }
    liveCount += 1;
    totalEur += userRates.get(ownerId) || 0;
  });

  return {
    liveCount,
    totalEur: sanitizeEmployeeRateValue(totalEur),
  };
}

function renderEmployeeStatusKpis(countryFilter = "all") {
  if (!els.employeeStatusKpis) {
    return;
  }
  const totals = getVisibleProvidersForCurrentUser()
    .filter((provider) => providerMatchesCountry(provider, countryFilter))
    .reduce(
      (accumulator, provider) => {
        const bucket = getProviderStatusBucket(provider?.status);
        if (bucket === "live") {
          accumulator.live += 1;
        } else if (bucket === "inProgress") {
          accumulator.inProgress += 1;
        } else {
          accumulator.open += 1;
        }
        return accumulator;
      },
      { open: 0, inProgress: 0, live: 0 }
    );

  els.employeeStatusKpis.innerHTML = `
    <article class="employee-status-kpi employee-status-kpi-open">
      <span>Offen</span>
      <strong>${escapeHtml(String(totals.open))}</strong>
      <small>Aktueller Bestand</small>
    </article>
    <article class="employee-status-kpi employee-status-kpi-progress">
      <span>In Bearbeitung</span>
      <strong>${escapeHtml(String(totals.inProgress))}</strong>
      <small>Aktueller Bestand</small>
    </article>
    <article class="employee-status-kpi employee-status-kpi-live">
      <span>Live</span>
      <strong>${escapeHtml(String(totals.live))}</strong>
      <small>Aktueller Bestand</small>
    </article>
  `;
}

function renderEmployeeHonorariumKpis(selectedRange, countryFilter = "all") {
  if (!els.employeeHonorariumKpis) {
    return;
  }
  if (!isAdminDashboardMode() && !isEmployeeHonorariumEnabled(authProfile?.user_id || "")) {
    els.employeeHonorariumKpis.innerHTML = `
      <article class="employee-honorarium-kpi employee-honorarium-kpi-muted">
        <span>Honorar</span>
        <strong>Nicht freigeschaltet</strong>
        <small>Wird nach Prüfung durch Admin freigeschaltet.</small>
      </article>
    `;
    return;
  }
  const periods = getHonorariumPeriodRanges(selectedRange);
  els.employeeHonorariumKpis.innerHTML = periods
    .map((period) => {
      const totals = calculateHonorariumForRange(period, countryFilter);
      return `
        <article class="employee-honorarium-kpi">
          <span>${escapeHtml(period.label)}</span>
          <strong>${escapeHtml(formatEuroAmount(totals.totalEur))}</strong>
          <small>${escapeHtml(String(totals.liveCount))} Live-Schaltungen</small>
        </article>
      `;
    })
    .join("");
}

function getEmployeeRaceMetric(entry) {
  const liveCount = Number(entry?.liveCount || 0);
  if (!Number.isFinite(liveCount)) {
    return 0;
  }
  return Math.max(0, liveCount);
}

function getEmployeeRaceInitials(nameLike) {
  const name = String(nameLike || "").trim();
  if (!name) {
    return "MA";
  }
  const chunks = name
    .split(/\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (!chunks.length) {
    return "MA";
  }
  if (chunks.length === 1) {
    return chunks[0].slice(0, 2).toUpperCase();
  }
  return `${chunks[0].charAt(0)}${chunks[chunks.length - 1].charAt(0)}`.toUpperCase();
}

function rankEmployeeRaceRows(employeeRows) {
  const ranked = (employeeRows || [])
    .map((entry) => ({
      ...entry,
      raceMetric: getEmployeeRaceMetric(entry),
      tieMetric: Number(entry?.totalCount || 0) || 0,
      tieEarnings: Number(entry?.earningsEur || 0) || 0,
    }))
    .sort((a, b) => {
      if (b.raceMetric !== a.raceMetric) {
        return b.raceMetric - a.raceMetric;
      }
      if (b.tieMetric !== a.tieMetric) {
        return b.tieMetric - a.tieMetric;
      }
      if (b.tieEarnings !== a.tieEarnings) {
        return b.tieEarnings - a.tieEarnings;
      }
      return String(a.name || "").localeCompare(String(b.name || ""), "de");
    });

  const leaderMetric = ranked[0]?.raceMetric || 0;
  return ranked.map((entry, index) => {
    const progress = leaderMetric > 0 ? (entry.raceMetric / leaderMetric) * 100 : 0;
    return {
      ...entry,
      rank: index + 1,
      progressPercent: Math.max(0, Math.min(100, progress)),
      progressLabel: `${formatPercentLabel(progress)}%`,
    };
  });
}

function renderEmployeeRaceBoard(employeeRows, range, countryFilter = "all") {
  if (!els.employeeRaceWrap || !els.employeeRaceBoard) {
    return;
  }
  const adminMode = isAdminDashboardMode();
  els.employeeRaceWrap.classList.toggle("hidden", !adminMode);
  if (!adminMode) {
    els.employeeRaceBoard.innerHTML = "";
    if (els.employeeRaceInfo) {
      els.employeeRaceInfo.textContent = "";
    }
    return;
  }

  const rankedRows = rankEmployeeRaceRows(employeeRows);
  const countryLabel = countryFilter === "all" ? "Alle Länder" : countryFilter;
  const raceTarget = Math.max(0, Number(rankedRows[0]?.raceMetric || 0));
  if (els.employeeRaceInfo) {
    const targetLabel = raceTarget > 0 ? `${raceTarget} Live` : "kein Zielwert";
    els.employeeRaceInfo.textContent = `${range.label} · Land: ${countryLabel} · Zielwert: ${targetLabel}`;
  }

  if (!rankedRows.length) {
    els.employeeRaceBoard.innerHTML = '<p class="empty">Keine Mitarbeiter für das Rennen vorhanden.</p>';
    return;
  }

  els.employeeRaceBoard.innerHTML = rankedRows
    .map((entry) => {
      const progressPercent = Number.isFinite(entry.progressPercent) ? entry.progressPercent : 0;
      const detailsTitle = `Live: ${entry.liveCount} · Ziel: ${raceTarget} · Gesamt: ${entry.totalCount} · Offen: ${entry.openCount} · In Bearbeitung: ${entry.inProgressCount} · Verdienst: ${formatEuroAmount(entry.earningsEur || 0)}`;
      const rankClass = entry.rank <= 3 ? `rank-${entry.rank}` : "rank-other";
      const liveValueLabel = raceTarget > 0
        ? `${entry.liveCount} / ${raceTarget} Live`
        : `${entry.liveCount} Live`;
      return `
        <article class="employee-race-lane ${rankClass}" title="${escapeHtml(detailsTitle)}">
          <div class="employee-race-label">
            <span class="employee-race-rank">#${escapeHtml(String(entry.rank))}</span>
            <span class="employee-race-avatar">${escapeHtml(getEmployeeRaceInitials(entry.name))}</span>
            <span class="employee-race-name">${escapeHtml(entry.name || "Mitarbeiter")}</span>
            <span class="employee-race-value">${escapeHtml(liveValueLabel)}</span>
          </div>
          <div class="employee-race-track-wrap">
            <span class="employee-race-track-start">Start</span>
            <div class="employee-race-track">
              <span class="employee-race-track-progress" style="width:${progressPercent.toFixed(2)}%"></span>
              <span class="employee-race-runner" style="left:${progressPercent.toFixed(2)}%">
                <span class="employee-race-runner-icon">🏇</span>
              </span>
            </div>
            <span class="employee-race-track-finish">${
              raceTarget > 0 ? `Ziel ${escapeHtml(String(raceTarget))}` : "Ziel"
            }</span>
          </div>
          <div class="employee-race-meta">
            <span>${escapeHtml(entry.progressLabel)}</span>
            <span>${escapeHtml(String(entry.totalCount))} Gesamt</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDashboardEmployeePanel() {
  if (!els.dashboardEmployeePanel) {
    return;
  }
  if (!isAdminDashboardMode() && !canCurrentUserViewEmployeeDashboardPanel()) {
    closeEmployeeDetailsModal();
    return;
  }
  if (!isSectionActive("dashboard-section")) {
    closeEmployeeDetailsModal();
    return;
  }
  if (isAdminDashboardMode() && !isDashboardAdminTabActive("employee")) {
    closeEmployeeDetailsModal();
    return;
  }

  const extendedVisible = isAdminDashboardMode() || isEmployeeHonorariumEnabled(authProfile?.user_id || "");
  const activeCountryFilter = platformCountryFilter || "all";
  renderEmployeeStatusKpis(activeCountryFilter);
  renderDashboardStateRanking(activeCountryFilter);
  if (els.employeeExtendedWrap) {
    els.employeeExtendedWrap.classList.toggle("hidden", !extendedVisible);
  }
  if (!extendedVisible) {
    selectedEmployeeActivityUserId = "";
    closeEmployeeDetailsModal();
    return;
  }

  renderEmployeeRangeControls();
  renderDashboardLiveKpis();
  const range = getEmployeeRangeSelection();
  const employeeRows = buildEmployeeActivityRows(range, activeCountryFilter);
  renderEmployeeHonorariumKpis(range, activeCountryFilter);

  if (els.employeeRangeInfo) {
    const countryLabel = activeCountryFilter === "all" ? "Alle Länder" : activeCountryFilter;
    els.employeeRangeInfo.textContent = `${range.label} · Land: ${countryLabel}`;
  }

  if (!employeeRows.length) {
    renderEmployeeRaceBoard([], range, activeCountryFilter);
    showEmployeeActivityEmpty("Keine aktiven Mitarbeiter gefunden.");
    return;
  }

  hideEmployeeActivityEmpty();
  const availableIds = new Set(employeeRows.map((entry) => entry.id));
  if (!availableIds.has(selectedEmployeeActivityUserId)) {
    selectedEmployeeActivityUserId = "";
  }

  if (els.employeeActivityBody) {
    els.employeeActivityBody.innerHTML = employeeRows
      .map((entry) => {
        const isSelected = entry.id === selectedEmployeeActivityUserId;
        const nameLabel = isAdminDashboardMode()
          ? `${entry.name} · ${getRoleLabel(entry.role)}`
          : entry.name;
        const showHonorariumValues = isAdminDashboardMode() || entry.honorariumEnabled;
        const honorariumCell = showHonorariumValues
          ? escapeHtml(formatEuroAmount(entry.ratePerLive || 0))
          : '<span class="employee-honorarium-blocked">Nicht freigeschaltet</span>';
        const earningsCell = showHonorariumValues
          ? escapeHtml(formatEuroAmount(entry.earningsEur || 0))
          : '<span class="employee-honorarium-blocked">Nicht freigeschaltet</span>';
        const canOpenDetails = true;
        return `
          <tr class="${isSelected ? "employee-row-active" : ""}">
            <td>${escapeHtml(nameLabel)}</td>
            <td>${escapeHtml(String(entry.openCount))}</td>
            <td>${escapeHtml(String(entry.inProgressCount))}</td>
            <td>${escapeHtml(String(entry.liveCount))}</td>
            <td>${escapeHtml(String(entry.totalCount))}</td>
            <td>${honorariumCell}</td>
            <td>${earningsCell}</td>
            <td>
              <button
                type="button"
                class="table-btn"
                data-employee-details="${escapeHtml(entry.id)}"
                ${canOpenDetails && (entry.totalCount || entry.liveActivatedCount) ? "" : "disabled"}
              >
                Details
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  renderEmployeeRaceBoard(employeeRows, range, activeCountryFilter);
  renderEmployeeDetails(employeeRows, range, activeCountryFilter);
}

function renderEmployeeRangeControls() {
  if (els.employeeRangeMode) {
    els.employeeRangeMode.value = employeeRangeMode;
  }
  if (els.employeeDateInput) {
    els.employeeDateInput.value = employeeRangeDate;
  }
  if (els.employeeFromInput) {
    els.employeeFromInput.value = employeeRangeFromDate;
  }
  if (els.employeeToInput) {
    els.employeeToInput.value = employeeRangeToDate;
  }
  if (els.employeeMonthInput) {
    els.employeeMonthInput.value = employeeRangeMonth;
  }
  if (els.employeeYearInput) {
    els.employeeYearInput.value = employeeRangeYear;
  }

  if (els.employeeCountrySelect) {
    const countries = getCountryFilterOptionsForCurrentUser();
    els.employeeCountrySelect.innerHTML = ['<option value="all">Alle Länder</option>']
      .concat(countries.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`))
      .join("");
    if (!countries.includes(platformCountryFilter) && platformCountryFilter !== "all") {
      platformCountryFilter = getDefaultDashboardCountryFilter(countries);
    }
    els.employeeCountrySelect.value = platformCountryFilter;
  }

  if (els.employeeDateWrap) {
    els.employeeDateWrap.classList.toggle("hidden", employeeRangeMode !== "day");
  }
  if (els.employeeFromWrap) {
    els.employeeFromWrap.classList.toggle("hidden", employeeRangeMode !== "fromTo");
  }
  if (els.employeeToWrap) {
    els.employeeToWrap.classList.toggle("hidden", employeeRangeMode !== "fromTo");
  }
  if (els.employeeMonthWrap) {
    els.employeeMonthWrap.classList.toggle("hidden", employeeRangeMode !== "month");
  }
  if (els.employeeYearWrap) {
    els.employeeYearWrap.classList.toggle("hidden", employeeRangeMode !== "year");
  }
}

function getEmployeeRangeSelection() {
  const now = new Date();
  const mode = ["last24h", "day", "week", "fromTo", "month", "year"].includes(employeeRangeMode)
    ? employeeRangeMode
    : "last24h";

  if (mode === "day") {
    const start = parseDateInputStart(employeeRangeDate) || parseDateInputStart(getTodayDateInputValue());
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 1);
    employeeRangeDate = toDateInputValue(start);
    return {
      mode,
      start,
      end,
      label: `Zeitraum: ${formatDateRangeLabel(start)} (Tag)`,
    };
  }

  if (mode === "month") {
    const start = parseMonthInputStart(employeeRangeMonth) || parseMonthInputStart(getCurrentMonthInputValue());
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0, 0);
    employeeRangeMonth = toMonthInputValue(start);
    return {
      mode,
      start,
      end,
      label: `Zeitraum: ${new Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric" }).format(start)}`,
    };
  }

  if (mode === "week") {
    const start = getStartOfWeek(now);
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 7);
    return {
      mode,
      start,
      end,
      label: `Zeitraum: Aktuelle Woche (${formatDateRangeLabel(start)} bis ${formatDateRangeLabel(
        new Date(end.getTime() - 24 * 60 * 60 * 1000)
      )})`,
    };
  }

  if (mode === "year") {
    const numericYear = Number(employeeRangeYear);
    const safeYear = Number.isInteger(numericYear) && numericYear >= 2000 && numericYear <= 2100
      ? numericYear
      : now.getFullYear();
    employeeRangeYear = String(safeYear);
    const start = new Date(safeYear, 0, 1, 0, 0, 0, 0);
    const end = new Date(safeYear + 1, 0, 1, 0, 0, 0, 0);
    return {
      mode,
      start,
      end,
      label: `Zeitraum: Jahr ${safeYear}`,
    };
  }

  if (mode === "fromTo") {
    const fromStart = parseDateInputStart(employeeRangeFromDate) || parseDateInputStart(getTodayDateInputValue());
    const toStart = parseDateInputStart(employeeRangeToDate) || fromStart;
    const start = fromStart <= toStart ? fromStart : toStart;
    const endAnchor = fromStart <= toStart ? toStart : fromStart;
    const end = new Date(endAnchor.getTime());
    end.setDate(end.getDate() + 1);

    employeeRangeFromDate = toDateInputValue(start);
    employeeRangeToDate = toDateInputValue(endAnchor);

    return {
      mode,
      start,
      end,
      label: `Zeitraum: ${formatDateRangeLabel(start)} bis ${formatDateRangeLabel(endAnchor)}`,
    };
  }

  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return {
    mode: "last24h",
    start,
    end: now,
    label: `Zeitraum: Letzte 24 Stunden (seit ${formatDateTime(start.toISOString())})`,
  };
}

function buildEmployeeActivityRows(range, countryFilter = "all") {
  const adminDashboardMode = isAdminDashboardMode();
  const activeUser = getCurrentUser();
  const adminScopedProviders = adminDashboardMode
    ? getVisibleProvidersForCurrentUser().filter((provider) => providerMatchesCountry(provider, countryFilter))
    : [];

  if (!adminDashboardMode) {
    const ownUserId = String(authProfile?.user_id || "").trim();
    const ownHonorariumEnabled = isEmployeeHonorariumEnabled(ownUserId);
    const ownRow = {
      id: ownUserId || "__me__",
      name: activeUser?.name || activeUser?.email || "Mitarbeiter",
      role: activeUser?.role || "mitarbeiter",
      openCount: 0,
      inProgressCount: 0,
      liveCount: 0,
      totalCount: 0,
      ratePerLive: getEmployeeRateByUserId(ownUserId),
      honorariumEnabled: ownHonorariumEnabled,
      liveActivatedCount: 0,
      earningsEur: 0,
      providers: [],
    };

    state.providers.forEach((provider) => {
      const createdAt = new Date(provider.createdAt || "");
      if (Number.isNaN(createdAt.getTime())) {
        return;
      }
      if (createdAt < range.start || createdAt >= range.end) {
        return;
      }
      if (!providerBelongsToUser(provider, activeUser)) {
        return;
      }
      if (!providerVisibleForCurrentUser(provider)) {
        return;
      }
      if (!providerMatchesCountry(provider, countryFilter)) {
        return;
      }

      const statusBucket = getProviderStatusBucket(provider.status);
      if (statusBucket === "live") {
        ownRow.liveCount += 1;
      } else if (statusBucket === "inProgress") {
        ownRow.inProgressCount += 1;
      } else {
        ownRow.openCount += 1;
      }
      ownRow.totalCount += 1;
      appendProviderToEmployeeRow(ownRow, provider);
    });

    state.providers.forEach((provider) => {
      if (!providerVisibleForCurrentUser(provider)) {
        return;
      }
      if (!providerMatchesCountry(provider, countryFilter)) {
        return;
      }
      if (!isLiveStatus(provider?.status)) {
        return;
      }
      const liveEvent = getProviderLiveEvent(provider);
      if (!liveEvent.liveByUserId || liveEvent.liveByUserId !== ownUserId) {
        return;
      }
      if (!isIsoInRange(liveEvent.liveAt, range)) {
        return;
      }
      ownRow.liveActivatedCount += 1;
      if (ownRow.honorariumEnabled) {
        ownRow.earningsEur += ownRow.ratePerLive;
      }
      appendProviderToEmployeeRow(ownRow, provider);
    });

    ownRow.earningsEur = sanitizeEmployeeRateValue(ownRow.earningsEur);

    return [ownRow];
  }

  const employees = state.users
    .filter((entry) => entry.source === "profile" && isUserStatusActive(entry.status))
    .map((entry) => ({
      id: entry.sourceId || entry.id,
      name: entry.name || entry.email || "Unbekannt",
      role: entry.role || "mitarbeiter",
      openCount: 0,
      inProgressCount: 0,
      liveCount: 0,
      totalCount: 0,
      ratePerLive: getEmployeeRateByUserId(entry.sourceId),
      honorariumEnabled: isEmployeeHonorariumEnabled(entry.sourceId),
      liveActivatedCount: 0,
      earningsEur: 0,
      providers: [],
    }));

  const employeeById = new Map(employees.map((entry) => [entry.id, entry]));
  const unknownId = "__unknown_employee__";

  adminScopedProviders.forEach((provider) => {
    const createdAt = new Date(provider.createdAt || "");
    if (Number.isNaN(createdAt.getTime())) {
      return;
    }
    if (createdAt < range.start || createdAt >= range.end) {
      return;
    }

    const creatorId = String(provider.createdByUserId || "").trim();
    let target = employeeById.get(creatorId);

    if (!target) {
      target = getOrCreateUnknownEmployeeRow(employeeById, unknownId);
    }

    const statusBucket = getProviderStatusBucket(provider.status);
    if (statusBucket === "live") {
      target.liveCount += 1;
    } else if (statusBucket === "inProgress") {
      target.inProgressCount += 1;
    } else {
      target.openCount += 1;
    }
    target.totalCount += 1;
    appendProviderToEmployeeRow(target, provider);
  });

  adminScopedProviders.forEach((provider) => {
    if (!isLiveStatus(provider?.status)) {
      return;
    }
    const liveEvent = getProviderLiveEvent(provider);
    if (!isIsoInRange(liveEvent.liveAt, range)) {
      return;
    }
    const ownerId = String(liveEvent.liveByUserId || "").trim();
    let target = employeeById.get(ownerId);
    if (!target) {
      target = getOrCreateUnknownEmployeeRow(employeeById, unknownId);
    }
    target.liveActivatedCount += 1;
    if (target.honorariumEnabled) {
      target.earningsEur += target.ratePerLive;
    }
    appendProviderToEmployeeRow(target, provider);
  });

  return Array.from(employeeById.values()).sort((a, b) => {
    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount;
    }
    if (b.earningsEur !== a.earningsEur) {
      return b.earningsEur - a.earningsEur;
    }
    return a.name.localeCompare(b.name, "de");
  }).map((entry) => ({
    ...entry,
    earningsEur: sanitizeEmployeeRateValue(entry.earningsEur),
  }));
}

function getProviderStatusBucket(status) {
  const normalized = normalizeText(status || "");
  if (normalized === "live") {
    return "live";
  }
  if (normalized === "in bearbeitung") {
    return "inProgress";
  }
  return "open";
}

function normalizeProviderStatusValue(status) {
  const bucket = getProviderStatusBucket(status);
  if (bucket === "live") {
    return "live";
  }
  if (bucket === "inProgress") {
    return "in Bearbeitung";
  }
  return "offen";
}

function getProviderStatusSliderClass(status) {
  const bucket = getProviderStatusBucket(status);
  if (bucket === "live") {
    return "status-live";
  }
  if (bucket === "inProgress") {
    return "status-in-progress";
  }
  return "status-offen";
}

function getProviderStatusFromForm() {
  const statusField = els.providerForm?.elements?.status;
  const rawValue = typeof statusField?.value === "string" ? statusField.value : "";
  return normalizeProviderStatusValue(rawValue);
}

function setProviderStatusInForm(status) {
  if (!els.providerForm) {
    return;
  }
  const normalizedValue = normalizeProviderStatusValue(status);
  const radios = Array.from(els.providerForm.querySelectorAll('input[name="status"]'));
  if (!radios.length) {
    if (typeof els.providerForm.elements?.status?.value === "string") {
      els.providerForm.elements.status.value = normalizedValue;
    }
    return;
  }
  radios.forEach((radio) => {
    radio.checked = normalizeProviderStatusValue(radio.value) === normalizedValue;
  });
}

function syncProviderHeaderLiveLight() {
  if (!els.providerHeaderLiveLight) {
    return;
  }
  const showLive = providersViewMode === "form" && normalizeText(getProviderStatusFromForm()) === "live";
  els.providerHeaderLiveLight.classList.toggle("hidden", !showLive);
  els.providerHeaderLiveLight.classList.toggle("is-live", showLive);
}

function syncProviderStatusSliderUi() {
  const slider = els.providerStatusSlider;
  if (!slider) {
    providerStatusLastFormValue = normalizeProviderStatusValue(getProviderStatusFromForm());
    if (providerStatusLastFormValue !== "live") {
      providerLiveStatusConfirmedInForm = false;
    }
    syncProviderHeaderLiveLight();
    return;
  }
  const normalizedValue = getProviderStatusFromForm();
  providerStatusLastFormValue = normalizedValue;
  if (normalizedValue !== "live") {
    providerLiveStatusConfirmedInForm = false;
  }
  slider.classList.remove("status-offen", "status-in-progress", "status-live");
  slider.classList.add(getProviderStatusSliderClass(normalizedValue));

  const options = slider.querySelectorAll(".provider-status-option");
  options.forEach((option) => {
    const radio = option.querySelector('input[name="status"]');
    const isActive = normalizeProviderStatusValue(radio?.value || "") === normalizedValue;
    option.classList.toggle("active", isActive);
  });

  syncProviderHeaderLiveLight();
}

function appendProviderToEmployeeRow(row, provider) {
  if (!row || !provider) {
    return;
  }
  const providerId = String(provider.id || "").trim();
  if (!providerId) {
    row.providers.push(provider);
    return;
  }
  const alreadyIncluded = row.providers.some(
    (entry) => String(entry?.id || "").trim() === providerId
  );
  if (!alreadyIncluded) {
    row.providers.push(provider);
  }
}

function getOrCreateUnknownEmployeeRow(employeeById, unknownId) {
  if (employeeById.has(unknownId)) {
    return employeeById.get(unknownId);
  }
  const unknownEntry = {
    id: unknownId,
    name: "Unbekannt",
    role: "mitarbeiter",
    openCount: 0,
    inProgressCount: 0,
    liveCount: 0,
    totalCount: 0,
    ratePerLive: 0,
    honorariumEnabled: false,
    liveActivatedCount: 0,
    earningsEur: 0,
    providers: [],
  };
  employeeById.set(unknownId, unknownEntry);
  return unknownEntry;
}

function providerBelongsToUser(provider, user) {
  const userId = String(user?.id || "")
    .replace(/^profile_/, "")
    .trim();
  const providerCreatorId = String(provider?.createdByUserId || "").trim();
  if (userId && providerCreatorId) {
    return providerCreatorId === userId;
  }

  const normalizedUserName = normalizeText(user?.name || "");
  const normalizedUserEmail = normalizeText(user?.email || "");
  const normalizedProviderCreatorName = normalizeText(provider?.createdByName || "");

  if (!providerCreatorId && normalizedUserName && normalizedProviderCreatorName) {
    return normalizedProviderCreatorName === normalizedUserName;
  }
  if (!providerCreatorId && normalizedUserEmail && normalizedProviderCreatorName) {
    return normalizedProviderCreatorName === normalizedUserEmail;
  }
  return false;
}

function canCurrentUserDeleteProvider(provider, user = getCurrentUser()) {
  if (!provider || !user) {
    return false;
  }
  if (user.role === "admin") {
    return true;
  }
  if (!providerVisibleForCurrentUser(provider, user)) {
    return false;
  }
  return providerBelongsToUser(provider, user);
}

function syncBodyModalOpenState() {
  const employeeModalOpen = !!els.employeeDetailPanel && !els.employeeDetailPanel.classList.contains("hidden");
  const liveConfirmOpen = !!els.liveConfirmPanel && !els.liveConfirmPanel.classList.contains("hidden");
  const deleteConfirmOpen = !!els.deleteConfirmPanel && !els.deleteConfirmPanel.classList.contains("hidden");
  document.body.classList.toggle("modal-open", employeeModalOpen || liveConfirmOpen || deleteConfirmOpen);
}

async function confirmProviderLiveActivation(providerName = "") {
  const nameLabel = String(providerName || "").trim();
  const question = nameLabel
    ? `Wurde "${nameLabel}" wirklich auf der my-waycard.com Website angemeldet?`
    : "Wurde der Anbieter wirklich auf der my-waycard.com Website angemeldet?";

  if (!els.liveConfirmPanel || !els.liveConfirmText || !els.liveConfirmYes || !els.liveConfirmNo || !els.liveConfirmClose) {
    return window.confirm(`${question}\n\nNur dann auf OK klicken.`);
  }

  els.liveConfirmText.textContent = question;
  els.liveConfirmPanel.classList.remove("hidden");
  syncBodyModalOpenState();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      els.liveConfirmPanel.classList.add("hidden");
      syncBodyModalOpenState();
      els.liveConfirmYes.removeEventListener("click", onYes);
      els.liveConfirmNo.removeEventListener("click", onNo);
      els.liveConfirmClose.removeEventListener("click", onNo);
      els.liveConfirmPanel.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKeyDown);
      resolve(result);
    };
    const onYes = () => {
      finish(true);
    };
    const onNo = () => {
      finish(false);
    };
    const onBackdrop = (event) => {
      if (event.target === els.liveConfirmPanel) {
        finish(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        finish(false);
      }
    };

    els.liveConfirmYes.addEventListener("click", onYes);
    els.liveConfirmNo.addEventListener("click", onNo);
    els.liveConfirmClose.addEventListener("click", onNo);
    els.liveConfirmPanel.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeyDown);
  });
}

async function confirmDeleteAction(message, confirmLabel = "Ja, löschen") {
  const question = String(message || "").trim() || "Wirklich löschen?";

  if (
    !els.deleteConfirmPanel ||
    !els.deleteConfirmText ||
    !els.deleteConfirmYes ||
    !els.deleteConfirmNo ||
    !els.deleteConfirmClose
  ) {
    return window.confirm(question);
  }

  els.deleteConfirmText.textContent = question;
  els.deleteConfirmYes.textContent = confirmLabel;
  els.deleteConfirmPanel.classList.remove("hidden");
  syncBodyModalOpenState();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      els.deleteConfirmPanel.classList.add("hidden");
      syncBodyModalOpenState();
      els.deleteConfirmYes.removeEventListener("click", onYes);
      els.deleteConfirmNo.removeEventListener("click", onNo);
      els.deleteConfirmClose.removeEventListener("click", onNo);
      els.deleteConfirmPanel.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKeyDown);
      resolve(result);
    };
    const onYes = () => {
      finish(true);
    };
    const onNo = () => {
      finish(false);
    };
    const onBackdrop = (event) => {
      if (event.target === els.deleteConfirmPanel) {
        finish(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        finish(false);
      }
    };

    els.deleteConfirmYes.addEventListener("click", onYes);
    els.deleteConfirmNo.addEventListener("click", onNo);
    els.deleteConfirmClose.addEventListener("click", onNo);
    els.deleteConfirmPanel.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeyDown);
  });
}

function isEmployeeDetailsModalOpen() {
  return !!els.employeeDetailPanel && !els.employeeDetailPanel.classList.contains("hidden");
}

function openEmployeeDetailsModal() {
  if (!els.employeeDetailPanel) {
    return;
  }
  els.employeeDetailPanel.classList.remove("hidden");
  syncBodyModalOpenState();
}

function closeEmployeeDetailsModal() {
  if (!els.employeeDetailPanel) {
    return;
  }
  els.employeeDetailPanel.classList.add("hidden");
  syncBodyModalOpenState();
}

function clearSelectedEmployeeDetails() {
  selectedEmployeeActivityUserId = "";
  closeEmployeeDetailsModal();
  if (isSectionActive("dashboard-section")) {
    renderDashboardEmployeePanel();
  }
}

function renderEmployeeDetails(employeeRows, range, countryFilter = "all") {
  if (!els.employeeDetailPanel || !els.employeeDetailTitle || !els.employeeDetailBody) {
    return;
  }

  const selectedEntry = employeeRows.find((entry) => entry.id === selectedEmployeeActivityUserId) || null;
  if (!selectedEntry) {
    closeEmployeeDetailsModal();
    els.employeeDetailTitle.textContent = "";
    els.employeeDetailBody.innerHTML = "";
    return;
  }
  if (!isAdminDashboardMode()) {
    const ownUserId = String(authProfile?.user_id || "").trim();
    const selectedId = String(selectedEntry.id || "").trim();
    if (selectedId && selectedId !== ownUserId && selectedId !== "__me__") {
      closeEmployeeDetailsModal();
      els.employeeDetailTitle.textContent = "";
      els.employeeDetailBody.innerHTML = "";
      return;
    }
  }

  const detailProviders = selectedEntry.providers
    .filter((provider) => {
      if (!providerMatchesCountry(provider, countryFilter)) {
        return false;
      }
      const createdAt = new Date(provider.createdAt || "");
      const createdInRange =
        !Number.isNaN(createdAt.getTime()) && createdAt >= range.start && createdAt < range.end;
      if (createdInRange) {
        return true;
      }
      if (!isLiveStatus(provider?.status)) {
        return false;
      }
      const liveEvent = getProviderLiveEvent(provider);
      return (
        String(liveEvent.liveByUserId || "").trim() === String(selectedEntry.id || "").trim() &&
        isIsoInRange(liveEvent.liveAt, range)
      );
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const showHonorariumValues = isAdminDashboardMode() || selectedEntry.honorariumEnabled;
  const earningsLabel = showHonorariumValues
    ? formatEuroAmount(selectedEntry.earningsEur || 0)
    : "nicht freigeschaltet";
  els.employeeDetailTitle.textContent = `${selectedEntry.name} · ${getRoleLabel(
    selectedEntry.role
  )} · ${detailProviders.length} Anlagen · Verdienst ${earningsLabel}`;
  els.employeeDetailBody.innerHTML = detailProviders.length
    ? detailProviders
        .map(
          (provider) => {
            const liveEvent = getProviderLiveEvent(provider);
            const providerCurrentlyLive = isLiveStatus(provider?.status);
            const statusLabel = String(provider.status || "offen").trim() || "offen";
            const honorsThisProvider =
              providerCurrentlyLive &&
              selectedEntry.honorariumEnabled &&
              String(liveEvent.liveByUserId || "").trim() === String(selectedEntry.id || "").trim() &&
              isIsoInRange(liveEvent.liveAt, range)
                ? selectedEntry.ratePerLive || 0
                : 0;
            const statusCell = `
              <div class="provider-status-inline">
                <span class="provider-status-pill ${providerCurrentlyLive ? "live" : ""}">
                  <span class="provider-status-light ${providerCurrentlyLive ? "live" : ""}"></span>
                  ${escapeHtml(statusLabel)}
                </span>
                <label class="live-toggle-switch">
                  <input
                    type="checkbox"
                    data-live-toggle-provider="${escapeHtml(provider.id)}"
                    ${providerCurrentlyLive ? "checked" : ""}
                  />
                  <span class="live-toggle-track"><span class="live-toggle-thumb"></span></span>
                  <span class="live-toggle-text">Live</span>
                </label>
              </div>
            `;
            return `
            <tr>
              <td>${escapeHtml(formatDateTime(provider.createdAt))}</td>
              <td>${escapeHtml(provider.name || "")}</td>
              <td>${statusCell}</td>
              <td>${escapeHtml(providerCurrentlyLive ? formatDateTime(liveEvent.liveAt) : "–")}</td>
              <td>${escapeHtml(honorsThisProvider ? formatEuroAmount(honorsThisProvider) : "–")}</td>
              <td>${escapeHtml([provider.city, provider.country].filter(Boolean).join(", "))}</td>
            </tr>
          `;
          }
        )
        .join("")
    : '<tr><td colspan="6" class="empty">Keine Anlagen im gewählten Zeitraum.</td></tr>';
  openEmployeeDetailsModal();
}

function showEmployeeActivityEmpty(message) {
  if (els.employeeActivityEmpty) {
    els.employeeActivityEmpty.textContent = message;
    els.employeeActivityEmpty.classList.remove("hidden");
  }
  if (els.employeeActivityWrap) {
    els.employeeActivityWrap.classList.add("hidden");
  }
  closeEmployeeDetailsModal();
}

function hideEmployeeActivityEmpty() {
  if (els.employeeActivityEmpty) {
    els.employeeActivityEmpty.textContent = "";
    els.employeeActivityEmpty.classList.add("hidden");
  }
  if (els.employeeActivityWrap) {
    els.employeeActivityWrap.classList.remove("hidden");
  }
}

function parseDateInputStart(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function parseMonthInputStart(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const date = new Date(year, month, 1, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function toDateInputValue(date) {
  const target = date instanceof Date ? date : new Date();
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthInputValue(date) {
  const target = date instanceof Date ? date : new Date();
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getTodayDateInputValue() {
  return toDateInputValue(new Date());
}

function getCurrentMonthInputValue() {
  return toMonthInputValue(new Date());
}

function getStartOfWeek(date) {
  const target = date instanceof Date ? new Date(date.getTime()) : new Date();
  target.setHours(0, 0, 0, 0);
  const day = target.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + diffToMonday);
  return target;
}

function formatDateRangeLabel(date) {
  return new Intl.DateTimeFormat("de-AT", { dateStyle: "long" }).format(date);
}

function truncateSelectLabel(value, maxLength = 42) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

function getMapEntitiesForLevel(level) {
  if (level === "category") {
    return state.categories
      .map((category) => ({ id: category.id, name: category.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  if (level === "subcategory") {
    return state.categories
      .flatMap((category) =>
        category.subcategories.map((subcategory) => ({
          id: subcategory.id,
          name: `${subcategory.name} (${category.name})`,
        }))
      )
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  return getAllTopics()
    .map((topic) => ({
      id: topic.id,
      name: `${topic.name} (${topic.subcategoryName})`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function getProviderGroupsForLevel(provider, level, topicLookup) {
  const groups = new Map();
  (provider.topicIds || []).forEach((topicId) => {
    const topic = topicLookup.get(topicId);
    if (!topic) {
      return;
    }

    if (level === "topic") {
      groups.set(topic.id, { id: topic.id, label: topic.name });
      return;
    }
    if (level === "subcategory") {
      groups.set(topic.subcategoryId, { id: topic.subcategoryId, label: topic.subcategoryName });
      return;
    }
    groups.set(topic.categoryId, { id: topic.categoryId, label: topic.categoryName });
  });
  return Array.from(groups.values());
}

function locationMatchesCountry(location, country) {
  if (!country || country === "all") {
    return true;
  }
  return normalizeText(location?.country || "") === normalizeText(country);
}

function providerMatchesCountry(provider, country) {
  if (!country || country === "all") {
    return true;
  }
  return getProviderEffectiveLocations(provider).some((location) => locationMatchesCountry(location, country));
}

function getProviderCoordinates(locationLike) {
  const latitude = parseOptionalNumber(locationLike?.latitude);
  const longitude = parseOptionalNumber(locationLike?.longitude);
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { lat: latitude, lng: longitude };
}

function getProviderLocationEntries(providers, country = "all") {
  if (!Array.isArray(providers) || !providers.length) {
    return [];
  }
  return providers.flatMap((provider) =>
    getProviderEffectiveLocations(provider)
      .map((location) => ({
        provider,
        location,
        locationIndex: location.__sourceLocationIndex,
        virtualCoverage: Boolean(location.__coverageVirtual),
      }))
      .filter((entry) => locationMatchesCountry(entry.location, country))
  );
}

function getProviderLocationKey(providerId, locationIndex) {
  return `${providerId}::${String(locationIndex)}`;
}

function queueProviderGeocoding(locationEntries) {
  if (!googleGeocoder || !Array.isArray(locationEntries) || !locationEntries.length) {
    return;
  }

  const maxConcurrent = 4;
  const openSlots = Math.max(0, maxConcurrent - providerGeocodeInFlight.size);
  if (!openSlots) {
    return;
  }

  const candidates = locationEntries
    .filter((entry) => !entry.virtualCoverage)
    .filter((entry) => !getProviderCoordinates(entry.location))
    .filter(
      (entry) =>
        !!entry?.provider?.id &&
        Number.isInteger(entry.locationIndex) &&
        !providerGeocodeInFlight.has(getProviderLocationKey(entry.provider.id, entry.locationIndex))
    )
    .slice(0, openSlots);

  candidates.forEach((entry) => {
    geocodeProviderAddress(entry.provider, entry.locationIndex);
  });
}

function geocodeProviderAddress(provider, locationIndex = 0) {
  if (!googleGeocoder || !provider?.id) {
    return;
  }
  const locations = getProviderLocations(provider);
  const targetLocation = locations[locationIndex];
  if (!targetLocation) {
    return;
  }

  const query = buildProviderGeocodeQuery(targetLocation);
  if (!query) {
    return;
  }

  const locationKey = getProviderLocationKey(provider.id, locationIndex);
  providerGeocodeInFlight.add(locationKey);
  googleGeocoder.geocode(
    {
      address: query,
      language: "de",
      region: "AT",
    },
    (results, status) => {
      providerGeocodeInFlight.delete(locationKey);
      const ok = status === "OK" && Array.isArray(results) && results.length;
      if (!ok) {
        renderDashboardMap();
        return;
      }

      const location = results[0]?.geometry?.location;
      const lat = typeof location?.lat === "function" ? Number(location.lat()) : null;
      const lng = typeof location?.lng === "function" ? Number(location.lng()) : null;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        renderDashboardMap();
        return;
      }

      const target = state.providers.find((entry) => entry.id === provider.id);
      if (!target) {
        renderDashboardMap();
        return;
      }
      const targetLocations = getProviderLocations(target);
      if (!targetLocations[locationIndex]) {
        renderDashboardMap();
        return;
      }
      targetLocations[locationIndex].latitude = lat;
      targetLocations[locationIndex].longitude = lng;
      target.locations = targetLocations;
      syncProviderPrimaryLocationFields(target);
      if (!target.updatedAt) {
        target.updatedAt = new Date().toISOString();
      }
      saveState();
      renderDashboardMap();
    }
  );
}

function buildProviderGeocodeQuery(location) {
  const parts = [
    location.address,
    location.postalCode,
    location.city,
    location.state,
    location.country,
  ]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  if (!parts.length) {
    return "";
  }
  return parts.join(", ");
}

function getDashboardColorMap(hits) {
  const colorMap = new Map();
  if (mapItemFilter !== "all" && hits.length) {
    const singleColor =
      mapLevelFilter === "category"
        ? "#1d4ed8"
        : mapLevelFilter === "subcategory"
          ? "#0f766e"
          : "#b45309";
    colorMap.set(hits[0].colorGroup.id, singleColor);
    return colorMap;
  }

  const groupIds = Array.from(new Set(hits.map((entry) => entry.colorGroup.id)));
  groupIds.forEach((groupId, index) => {
    colorMap.set(groupId, MAP_COLOR_PALETTE[index % MAP_COLOR_PALETTE.length]);
  });
  return colorMap;
}

function renderDashboardMapLegend(entries) {
  if (!els.dashboardMapLegend) {
    return;
  }
  if (!entries.length) {
    els.dashboardMapLegend.innerHTML = "";
    return;
  }

  els.dashboardMapLegend.innerHTML = entries
    .map(
      (entry) => `
        <span class="map-legend-item">
          <span class="map-legend-color" style="background:${escapeHtml(entry.color)}"></span>
          ${escapeHtml(entry.label)}
        </span>
      `
    )
    .join("");
}

function clearDashboardMapOverlays() {
  dashboardMapMarkers.forEach((marker) => marker.setMap(null));
  dashboardMapCircles.forEach((circle) => circle.setMap(null));
  dashboardMapInfoWindows.forEach((infoWindow) => infoWindow.close());
  dashboardMapMarkers = [];
  dashboardMapCircles = [];
  dashboardMapInfoWindows = [];
}

function showDashboardMapEmpty(message) {
  clearDashboardMapOverlays();
  renderDashboardMapLegend([]);
  if (els.dashboardMapEmpty) {
    els.dashboardMapEmpty.textContent = message;
    els.dashboardMapEmpty.classList.remove("hidden");
  }
}

function hideDashboardMapEmpty() {
  if (els.dashboardMapEmpty) {
    els.dashboardMapEmpty.textContent = "";
    els.dashboardMapEmpty.classList.add("hidden");
  }
}

function isSectionActive(sectionId) {
  return document.getElementById(sectionId)?.classList.contains("active");
}

function renderUsersTable() {
  const admin = isAdmin();
  if (!state.users.length) {
    els.usersTableBody.innerHTML = `<tr><td colspan="5" class="empty">Noch keine Mitarbeiter angelegt.</td></tr>`;
    return;
  }

  els.usersTableBody.innerHTML = state.users
    .map((user) => {
      const territoriesLabel = formatTerritoryList(user.territories);
      const rateLabel =
        user.source === "profile"
          ? formatEuroAmount(getEmployeeRateByUserId(user.sourceId))
          : "–";
      const canActivateUser = user.source === "profile" && !isUserStatusActive(user.status);
      return `
      <tr>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.role)}${user.statusLabel ? ` · ${escapeHtml(user.statusLabel)}` : ""}</td>
        <td class="territories-cell">${territoriesLabel ? escapeHtml(territoriesLabel) : "Alle Gebiete"}</td>
        <td>${escapeHtml(rateLabel)}</td>
        <td>
          ${
            admin
              ? `<div class="table-icon-actions">
                  ${
                    canActivateUser
                      ? `<button
                          type="button"
                          class="mini-btn mini-btn-add"
                          title="Mitarbeiter freischalten"
                          aria-label="Mitarbeiter freischalten"
                          data-activate-user="${escapeHtml(user.id)}"
                        >✓</button>`
                      : ""
                  }
                  <button
                    type="button"
                    class="mini-btn"
                    title="Mitarbeiter bearbeiten"
                    aria-label="Mitarbeiter bearbeiten"
                    data-edit-user="${escapeHtml(user.id)}"
                  >✎</button>
                  <button
                    type="button"
                    class="mini-btn danger"
                    title="Mitarbeiter löschen"
                    aria-label="Mitarbeiter löschen"
                    data-delete-user="${escapeHtml(user.id)}"
                  >✕</button>
                </div>`
              : '<span class="empty">Nur Ansicht</span>'
          }
        </td>
      </tr>
    `
    })
    .join("");
}

function buildProviderSearchIndexText(provider, topicLookup) {
  const topicDetails = (provider.topicIds || [])
    .map((topicId) => topicLookup.get(topicId))
    .filter(Boolean);
  const topicNames = topicDetails.map((topic) => String(topic.name || "").trim());
  const subcategoryNames = topicDetails.map((topic) => String(topic.subcategoryName || "").trim());
  const categoryNames = topicDetails.map((topic) => String(topic.categoryName || "").trim());
  const locationEntries = getProviderEffectiveLocations(provider);
  const locationParts = locationEntries.flatMap((location) => [
    String(location?.address || "").trim(),
    String(location?.postalCode || "").trim(),
    String(location?.city || "").trim(),
    String(location?.state || "").trim(),
    String(location?.country || "").trim(),
  ]);
  const coverageParts = isBigPlayerProvider(provider)
    ? [
        String(provider.coverageCountry || "").trim(),
        ...getProviderCoverageStates(provider).map((stateLabel) => String(stateLabel || "").trim()),
      ]
    : [];
  if (isProviderOnlineOnly(provider)) {
    coverageParts.push("online");
  }

  return normalizeText(
    [
      String(provider.name || "").trim(),
      String(provider.status || "").trim(),
      String(getProviderCoverageSummary(provider) || "").trim(),
      ...locationParts,
      ...coverageParts,
      ...categoryNames,
      ...subcategoryNames,
      ...topicNames,
    ].join(" ")
  );
}

function providerMatchesListSearch(provider, normalizedSearchTerm, topicLookup) {
  if (!normalizedSearchTerm) {
    return true;
  }
  const haystack = buildProviderSearchIndexText(provider, topicLookup);
  return haystack.includes(normalizedSearchTerm);
}

function buildProviderTopicHoverText(topicEntries) {
  const categories = Array.from(
    new Set(topicEntries.map((topic) => String(topic.categoryName || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "de"));
  const subcategories = Array.from(
    new Set(topicEntries.map((topic) => String(topic.subcategoryName || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "de"));
  const topics = topicEntries
    .map((topic) => String(topic.name || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));

  if (!topics.length) {
    return "";
  }

  return [
    `Kategorien: ${categories.join(", ") || "-"}`,
    `Themenbereiche: ${subcategories.join(", ") || "-"}`,
    `Themen: ${topics.join(", ")}`,
  ].join("\n");
}

function renderProvidersTable() {
  const admin = isAdmin();
  const visibleProviders = getVisibleProvidersForCurrentUser();
  if (els.providerHeadingLabel) {
    els.providerHeadingLabel.textContent = `Anbieter (${visibleProviders.length})`;
  }
  const normalizedSearchTerm = normalizeText(providerListSearchTerm);
  const allTopics = getAllTopics();
  const topicLookup = new Map(allTopics.map((topic) => [topic.id, topic]));
  const filteredProviders = visibleProviders.filter((provider) =>
    providerMatchesListSearch(provider, normalizedSearchTerm, topicLookup)
  );
  const sortedProviders = filteredProviders
    .slice()
    .sort((left, right) => {
      const leftName = String(left?.name || "").trim();
      const rightName = String(right?.name || "").trim();
      const byName = leftName.localeCompare(rightName, "de", {
        sensitivity: "base",
        ignorePunctuation: true,
        numeric: true,
      });
      if (byName !== 0) {
        return byName;
      }
      return String(left?.id || "").localeCompare(String(right?.id || ""), "de");
    });

  if (els.providerListSearchInput && els.providerListSearchInput.value !== providerListSearchTerm) {
    els.providerListSearchInput.value = providerListSearchTerm;
  }

  if (!visibleProviders.length) {
    const restrictedByTerritory = hasCurrentUserTerritoryAssignment();
    const emptyMessage =
      restrictedByTerritory
        ? "Keine Anbieter in deinen zugewiesenen Gebieten."
        : "Noch keine Anbieter vorhanden.";
    els.providersTableBody.innerHTML =
      `<tr><td colspan="5" class="empty">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }
  if (!filteredProviders.length) {
    const emptyMessage = providerListSearchTerm
      ? `Keine Treffer für "${providerListSearchTerm}".`
      : "Keine Anbieter gefunden.";
    els.providersTableBody.innerHTML =
      `<tr><td colspan="5" class="empty">${escapeHtml(emptyMessage)}</td></tr>`;
    return;
  }

  els.providersTableBody.innerHTML = sortedProviders
    .map((provider) => {
      const topicEntries = (provider.topicIds || [])
        .map((topicId) => topicLookup.get(topicId))
        .filter(Boolean);
      const topicHoverText = buildProviderTopicHoverText(topicEntries);
      const hasTopicDetails = Boolean(topicHoverText);
      const locationLabel = getProviderCoverageSummary(provider);
      const live = normalizeText(provider.status || "") === "live";
      const adminOnly = isProviderAdminOnly(provider);
      const onlineOnly = isProviderOnlineOnly(provider);
      const statusLabel = String(provider.status || "offen").trim() || "offen";
      const canDelete = canCurrentUserDeleteProvider(provider);

      return `
        <tr>
          <td>
            <div class="provider-name-cell">
              <span>${escapeHtml(provider.name)}</span>
              ${adminOnly ? '<span class="provider-admin-badge">Nur Admin</span>' : ""}
              ${onlineOnly ? '<span class="provider-online-badge">Online</span>' : ""}
            </div>
          </td>
          <td>
            <span class="provider-status-pill ${live ? "live" : ""}">
              <span class="provider-status-light ${live ? "live" : ""}"></span>
              ${escapeHtml(statusLabel)}
            </span>
          </td>
	          <td>${escapeHtml(locationLabel)}</td>
	          <td>
	            <span class="provider-topics-hover ${hasTopicDetails ? "has-tooltip" : ""}" ${hasTopicDetails ? 'tabindex="0"' : ""}>
	              <span class="provider-topics-count">${escapeHtml(String(topicEntries.length))}</span>
	              ${
                  hasTopicDetails
                    ? `<span class="provider-topics-hint">Details</span>
                       <span class="provider-topics-tooltip" role="tooltip">${escapeHtml(topicHoverText)}</span>`
                    : ""
                }
	            </span>
	          </td>
	          <td>
	            ${
	              admin
                ? `<div class="table-icon-actions">
                    <label class="live-toggle-switch">
                      <input
                        type="checkbox"
                        data-live-toggle-provider="${escapeHtml(provider.id)}"
                        ${live ? "checked" : ""}
                      />
                      <span class="live-toggle-track"><span class="live-toggle-thumb"></span></span>
                      <span class="live-toggle-text">Live</span>
                    </label>
                    <button
                      type="button"
                      class="mini-btn"
                      title="Anbieter bearbeiten"
                      aria-label="Anbieter bearbeiten"
                      data-edit-provider="${escapeHtml(provider.id)}"
                    >✎</button>
                    <button
                      type="button"
                      class="mini-btn danger"
                      title="Anbieter löschen"
                      aria-label="Anbieter löschen"
                      data-delete-provider="${escapeHtml(provider.id)}"
                    >✕</button>
                  </div>`
                : `<div class="table-icon-actions">
                    <label class="live-toggle-switch">
                      <input
                        type="checkbox"
                        data-live-toggle-provider="${escapeHtml(provider.id)}"
                        ${live ? "checked" : ""}
                      />
                      <span class="live-toggle-track"><span class="live-toggle-thumb"></span></span>
                      <span class="live-toggle-text">Live</span>
                    </label>
                    <button
                      type="button"
                      class="mini-btn"
                      title="Anbieter bearbeiten"
                      aria-label="Anbieter bearbeiten"
                      data-edit-provider="${escapeHtml(provider.id)}"
                    >✎</button>
                    <button
                      type="button"
                      class="mini-btn danger"
                      title="${
                        canDelete
                          ? "Anbieter löschen"
                          : "Nur möglich, wenn du den Anbieter selbst angelegt hast"
                      }"
                      aria-label="Anbieter löschen"
                      data-delete-provider="${escapeHtml(provider.id)}"
                    >✕</button>
                  </div>`
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

function initGooglePlaces() {
  if (window.google?.maps?.places) {
    setupGooglePlacesServices();
    return;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    googlePlacesLoadError = "Kein Google API-Key gefunden (config.js).";
    return;
  }

  if (document.querySelector("script[data-google-places-loader='1']")) {
    return;
  }

  window.__onGooglePlacesLoaded = () => {
    setupGooglePlacesServices();
  };

  window.gm_authFailure = () => {
    googlePlacesLoadError = "Google Auth-Fehler: API-Key ungültig oder nicht erlaubt.";
  };

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
    apiKey
  )}&libraries=places&language=de&region=AT&callback=__onGooglePlacesLoaded`;
  script.async = true;
  script.defer = true;
  script.dataset.googlePlacesLoader = "1";
  script.onerror = () => {
    googlePlacesLoadError = "Google Script konnte nicht geladen werden (Netzwerk/Key/Referrer).";
  };
  document.head.appendChild(script);

  window.setTimeout(() => {
    if (!googleMapsReady && !googlePlacesLoadError) {
      googlePlacesLoadError =
        "Google Places nicht geladen. Prüfe Referrer-Regeln, APIs und Billing im Google-Projekt.";
    }
  }, 8000);
}

function setupGooglePlacesServices() {
  if (!window.google?.maps?.places) {
    return;
  }
  googleAutocompleteService = new window.google.maps.places.AutocompleteService();
  googlePlacesService = new window.google.maps.places.PlacesService(document.createElement("div"));
  googleGeocoder = new window.google.maps.Geocoder();
  googleSessionToken = new window.google.maps.places.AutocompleteSessionToken();
  googleMapsReady = true;
  googlePlacesLoadError = "";
  setupUserAddressAutocomplete();
  setupAdditionalLocationAutocompletes();
  renderDashboardMap();
}

function getGoogleMapsApiKey() {
  return (
    window.APP_CONFIG?.GOOGLE_MAPS_API_KEY ||
    window.GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
}

function queueAddressSuggestionSearch() {
  const query = els.providerAddressInput.value.trim();

  if (addressSearchDebounceId) {
    window.clearTimeout(addressSearchDebounceId);
  }

  if (query.length < 3) {
    clearAddressSuggestions();
    return;
  }

  if (!googleMapsReady || !googleAutocompleteService) {
    if (window.location.protocol === "file:") {
      showAddressSuggestionsMessage(
        "Google Places funktioniert nicht mit file://. Starte die Seite ueber http://localhost:8080."
      );
      return;
    }
    showAddressSuggestionsMessage(
      googlePlacesLoadError ||
        "Google Places ist noch nicht bereit. API-Key, Referrer, APIs und Billing pruefen."
    );
    return;
  }

  addressSearchDebounceId = window.setTimeout(() => {
    fetchGoogleAddressPredictions(query);
  }, 260);
}

function queueProviderNameSuggestionSearch() {
  if (!els.providerNameInput) {
    return;
  }
  const query = els.providerNameInput.value.trim();

  if (providerNameSearchDebounceId) {
    window.clearTimeout(providerNameSearchDebounceId);
  }

  if (query.length < 2) {
    clearProviderNameSuggestions();
    return;
  }

  if (!googleMapsReady || !googleAutocompleteService) {
    if (window.location.protocol === "file:") {
      showProviderNameSuggestionsMessage(
        "Google Places funktioniert nicht mit file://. Starte die Seite ueber http://localhost:8080."
      );
      return;
    }
    showProviderNameSuggestionsMessage(
      googlePlacesLoadError ||
        "Google Places ist noch nicht bereit. API-Key, Referrer, APIs und Billing pruefen."
    );
    return;
  }

  providerNameSearchDebounceId = window.setTimeout(() => {
    fetchProviderNamePredictions(query);
  }, 240);
}

function fetchGoogleAddressPredictions(query) {
  if (!googleAutocompleteService) {
    return;
  }

  const requestId = ++addressPredictionRequestId;
  googleAutocompleteService.getPlacePredictions(
    {
      input: query,
      sessionToken: googleSessionToken,
      types: ["address"],
      language: "de",
    },
    (predictions, status) => {
      if (requestId !== addressPredictionRequestId) {
        return;
      }

      const ok = status === window.google.maps.places.PlacesServiceStatus.OK;
      if (!ok || !predictions?.length) {
        showAddressSuggestionsMessage("Keine Adresse gefunden.");
        return;
      }

      currentAddressSuggestions = predictions.map((prediction) => ({
        placeId: prediction.place_id,
        mainText: prediction.structured_formatting?.main_text || prediction.description || "",
        secondaryText: prediction.structured_formatting?.secondary_text || "",
        description: prediction.description || "",
      }));

      renderAddressSuggestions();
    }
  );
}

function fetchProviderNamePredictions(query) {
  if (!googleAutocompleteService) {
    return;
  }

  const requestId = ++providerNamePredictionRequestId;
  googleAutocompleteService.getPlacePredictions(
    {
      input: query,
      sessionToken: googleSessionToken,
      language: "de",
    },
    (predictions, status) => {
      if (requestId !== providerNamePredictionRequestId) {
        return;
      }

      const ok = status === window.google.maps.places.PlacesServiceStatus.OK;
      if (ok && predictions?.length) {
        currentProviderNameSuggestions = predictions.map((prediction) =>
          mapGooglePredictionToSuggestion(prediction)
        );
        renderProviderNameSuggestions();
        return;
      }

      googleAutocompleteService.getQueryPredictions(
        {
          input: query,
        },
        (queryPredictions, queryStatus) => {
          if (requestId !== providerNamePredictionRequestId) {
            return;
          }
          const queryOk = queryStatus === window.google.maps.places.PlacesServiceStatus.OK;
          if (!queryOk || !queryPredictions?.length) {
            showProviderNameSuggestionsMessage("Keine Anbieter gefunden.");
            return;
          }
          currentProviderNameSuggestions = queryPredictions.map((prediction) =>
            mapGooglePredictionToSuggestion(prediction)
          );
          renderProviderNameSuggestions();
        }
      );
    }
  );
}

function mapGooglePredictionToSuggestion(prediction) {
  return {
    placeId: prediction.place_id || "",
    mainText: prediction.structured_formatting?.main_text || prediction.description || "",
    secondaryText: prediction.structured_formatting?.secondary_text || "",
    description: prediction.description || "",
  };
}

function renderAddressSuggestions() {
  if (!currentAddressSuggestions.length) {
    showAddressSuggestionsMessage("Keine Adresse gefunden.");
    return;
  }

  els.providerAddressSuggestions.innerHTML = currentAddressSuggestions
    .map(
      (entry, index) => `
        <button type="button" class="address-suggestion-item" data-address-index="${index}">
          <span class="address-suggestion-title">${escapeHtml(entry.mainText || entry.description)}</span>
          <span class="address-suggestion-meta">${escapeHtml(entry.secondaryText || "")}</span>
        </button>
      `
    )
    .join("");
  els.providerAddressSuggestions.classList.remove("hidden");
}

function renderProviderNameSuggestions() {
  if (!els.providerNameSuggestions) {
    return;
  }
  if (!currentProviderNameSuggestions.length) {
    showProviderNameSuggestionsMessage("Keine Anbieter gefunden.");
    return;
  }

  els.providerNameSuggestions.innerHTML = currentProviderNameSuggestions
    .map(
      (entry, index) => `
        <button type="button" class="address-suggestion-item" data-provider-name-index="${index}">
          <span class="address-suggestion-title">${escapeHtml(entry.mainText || entry.description)}</span>
          <span class="address-suggestion-meta">${escapeHtml(entry.secondaryText || "")}</span>
        </button>
      `
    )
    .join("");
  els.providerNameSuggestions.classList.remove("hidden");
}

function showAddressSuggestionsMessage(message) {
  currentAddressSuggestions = [];
  els.providerAddressSuggestions.innerHTML = `<p class="empty">${escapeHtml(message)}</p>`;
  els.providerAddressSuggestions.classList.remove("hidden");
}

function showProviderNameSuggestionsMessage(message) {
  if (!els.providerNameSuggestions) {
    return;
  }
  currentProviderNameSuggestions = [];
  els.providerNameSuggestions.innerHTML = `<p class="empty">${escapeHtml(message)}</p>`;
  els.providerNameSuggestions.classList.remove("hidden");
}

function applyAddressSuggestion(index) {
  const suggestion = currentAddressSuggestions[index];
  if (!suggestion || !googlePlacesService) {
    return;
  }

  googlePlacesService.getDetails(
    {
      placeId: suggestion.placeId,
      fields: ["address_components", "formatted_address", "geometry"],
      language: "de",
      sessionToken: googleSessionToken,
    },
    (place, status) => {
      const ok = status === window.google.maps.places.PlacesServiceStatus.OK;
      const mapped = ok && place ? mapGooglePlaceToAddress(place) : {};
      const fallback = mapAddressFromDescription(suggestion.description || "");
      const merged = {
        street: pickFirstNonEmpty(mapped.street, fallback.street),
        postalCode: pickFirstNonEmpty(mapped.postalCode, fallback.postalCode),
        city: pickFirstNonEmpty(mapped.city, fallback.city),
        state: pickFirstNonEmpty(mapped.state, fallback.state),
        country: pickFirstNonEmpty(mapped.country, fallback.country),
        formatted: pickFirstNonEmpty(mapped.formatted, fallback.formatted),
      };

      const formElements = els.providerForm.elements;
      formElements.address.value = merged.street || merged.formatted || "";
      formElements.postalCode.value = merged.postalCode || "";
      formElements.city.value = merged.city || "";
      formElements.country.value = merged.country || "";
      formElements.state.value = merged.state || "";
      if (
        getSelectedCoverageModeFromForm() === PROVIDER_COVERAGE_MODE_BIG_PLAYER &&
        !getCoverageCountryFromForm() &&
        merged.country
      ) {
        els.providerCoverageCountryInput.value = merged.country;
        renderProviderCoverageStateOptions();
      }
      formElements.latitude.value =
        typeof mapped.latitude === "number" && Number.isFinite(mapped.latitude)
          ? String(mapped.latitude)
          : "";
      formElements.longitude.value =
        typeof mapped.longitude === "number" && Number.isFinite(mapped.longitude)
          ? String(mapped.longitude)
          : "";

      googleSessionToken = new window.google.maps.places.AutocompleteSessionToken();
      clearAddressSuggestions();
    }
  );
}

function applyProviderNameSuggestion(index) {
  const suggestion = currentProviderNameSuggestions[index];
  if (!suggestion || !googlePlacesService) {
    return;
  }

  const formElements = els.providerForm.elements;
  const applyFallbackValues = () => {
    const fallback = mapAddressFromDescription(suggestion.description || "");
    formElements.name.value = pickFirstNonEmpty(suggestion.mainText, formElements.name.value);
    formElements.address.value = fallback.street || formElements.address.value || "";
    formElements.postalCode.value = fallback.postalCode || formElements.postalCode.value || "";
    formElements.city.value = fallback.city || formElements.city.value || "";
    formElements.state.value = fallback.state || formElements.state.value || "";
    formElements.country.value = fallback.country || formElements.country.value || "";
    if (
      getSelectedCoverageModeFromForm() === PROVIDER_COVERAGE_MODE_BIG_PLAYER &&
      !getCoverageCountryFromForm() &&
      fallback.country
    ) {
      els.providerCoverageCountryInput.value = fallback.country;
      renderProviderCoverageStateOptions();
    }
  };

  const applyPlaceValues = (place) => {
    const mapped = place ? mapGooglePlaceToAddress(place) : {};
    const fallback = mapAddressFromDescription(suggestion.description || "");
    const merged = {
      street: pickFirstNonEmpty(mapped.street, fallback.street),
      postalCode: pickFirstNonEmpty(mapped.postalCode, fallback.postalCode),
      city: pickFirstNonEmpty(mapped.city, fallback.city),
      state: pickFirstNonEmpty(mapped.state, fallback.state),
      country: pickFirstNonEmpty(mapped.country, fallback.country),
      formatted: pickFirstNonEmpty(mapped.formatted, fallback.formatted),
    };

    formElements.name.value = pickFirstNonEmpty(place?.name, suggestion.mainText, formElements.name.value);
    formElements.address.value = merged.street || merged.formatted || "";
    formElements.postalCode.value = merged.postalCode || "";
    formElements.city.value = merged.city || "";
    formElements.country.value = merged.country || "";
    formElements.state.value = merged.state || "";
    if (
      getSelectedCoverageModeFromForm() === PROVIDER_COVERAGE_MODE_BIG_PLAYER &&
      !getCoverageCountryFromForm() &&
      merged.country
    ) {
      els.providerCoverageCountryInput.value = merged.country;
      renderProviderCoverageStateOptions();
    }
    formElements.website.value = pickFirstNonEmpty(place?.website, formElements.website.value || "");
    syncProviderWebsitePreviewLink();
    formElements.phone.value = pickFirstNonEmpty(
      place?.international_phone_number,
      place?.formatted_phone_number,
      formElements.phone.value || ""
    );
    formElements.latitude.value =
      typeof mapped.latitude === "number" && Number.isFinite(mapped.latitude)
        ? String(mapped.latitude)
        : "";
    formElements.longitude.value =
      typeof mapped.longitude === "number" && Number.isFinite(mapped.longitude)
        ? String(mapped.longitude)
        : "";
  };

  const finalizeSuggestionApply = () => {
    googleSessionToken = new window.google.maps.places.AutocompleteSessionToken();
    clearProviderNameSuggestions();
    clearAddressSuggestions();
  };

  const applySuggestionByPlaceId = (placeId) => {
    googlePlacesService.getDetails(
      {
        placeId,
        fields: [
          "name",
          "address_components",
          "formatted_address",
          "geometry",
          "website",
          "formatted_phone_number",
          "international_phone_number",
        ],
        language: "de",
        sessionToken: googleSessionToken,
      },
      (place, status) => {
        const ok = status === window.google.maps.places.PlacesServiceStatus.OK;
        if (ok && place) {
          applyPlaceValues(place);
        } else {
          applyFallbackValues();
        }
        finalizeSuggestionApply();
      }
    );
  };

  if (suggestion.placeId) {
    applySuggestionByPlaceId(suggestion.placeId);
    return;
  }

  const query = pickFirstNonEmpty(suggestion.description, suggestion.mainText);
  if (!query || typeof googlePlacesService.findPlaceFromQuery !== "function") {
    applyFallbackValues();
    finalizeSuggestionApply();
    return;
  }

  googlePlacesService.findPlaceFromQuery(
    {
      query,
      fields: ["place_id"],
      language: "de",
    },
    (candidates, status) => {
      const ok = status === window.google.maps.places.PlacesServiceStatus.OK;
      const resolvedPlaceId =
        ok && Array.isArray(candidates) && candidates.length
          ? String(candidates[0]?.place_id || "").trim()
          : "";
      if (resolvedPlaceId) {
        applySuggestionByPlaceId(resolvedPlaceId);
        return;
      }
      applyFallbackValues();
      finalizeSuggestionApply();
    }
  );
}

function mapGooglePlaceToAddress(place) {
  const components = Array.isArray(place.address_components) ? place.address_components : [];
  const findByTypes = (types) => {
    for (const type of types) {
      const value =
        components.find((component) => component.types?.includes(type))?.long_name || "";
      if (value) {
        return value;
      }
    }
    return "";
  };

  const streetNumber = findByTypes(["street_number"]);
  const route = findByTypes(["route", "premise", "point_of_interest"]);
  const city = findByTypes([
    "locality",
    "postal_town",
    "administrative_area_level_3",
    "administrative_area_level_2",
    "sublocality",
    "sublocality_level_1",
  ]);

  return {
    street: [route, streetNumber].filter(Boolean).join(" ").trim(),
    postalCode: findByTypes(["postal_code"]),
    city,
    state: findByTypes(["administrative_area_level_1", "administrative_area_level_2"]),
    country: findByTypes(["country"]),
    formatted: place.formatted_address || "",
    latitude:
      typeof place.geometry?.location?.lat === "function" ? Number(place.geometry.location.lat()) : null,
    longitude:
      typeof place.geometry?.location?.lng === "function" ? Number(place.geometry.location.lng()) : null,
  };
}

function mapAddressFromDescription(description) {
  const parts = String(description)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!parts.length) {
    return {};
  }

  const street = parts[0] || "";
  const country = parts[parts.length - 1] || "";
  const middle = parts.slice(1, -1);
  let postalCode = "";
  let city = "";
  let state = "";

  for (const chunk of middle) {
    const match = chunk.match(/\b(\d{4,6})\b\s*(.*)/);
    if (match) {
      postalCode = postalCode || match[1];
      city = city || (match[2] || "").trim();
    } else if (!state) {
      state = chunk;
    } else if (!city) {
      city = chunk;
    }
  }

  return {
    street,
    postalCode,
    city,
    state,
    country,
    formatted: description || "",
  };
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (String(value || "").trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function clearAddressSuggestions() {
  currentAddressSuggestions = [];
  els.providerAddressSuggestions.innerHTML = "";
  els.providerAddressSuggestions.classList.add("hidden");
}

function clearProviderNameSuggestions() {
  if (!els.providerNameSuggestions) {
    return;
  }
  currentProviderNameSuggestions = [];
  els.providerNameSuggestions.innerHTML = "";
  els.providerNameSuggestions.classList.add("hidden");
}

function setupUserAddressAutocomplete() {
  userAddressAutocompleteBinding?.placeChangedListener?.remove?.();
  userAddressAutocompleteBinding = null;
  if (!googleMapsReady || !window.google?.maps?.places || !els.userAddressInput) {
    return;
  }

  const autocomplete = new window.google.maps.places.Autocomplete(els.userAddressInput, {
    fields: ["formatted_address", "address_components"],
    types: ["address"],
  });

  const placeChangedListener = autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    const mapped = place ? mapGooglePlaceToAddress(place) : {};
    const fallback = mapAddressFromDescription(place?.formatted_address || "");
    const value = pickFirstNonEmpty(mapped.formatted, mapped.street, fallback.formatted, fallback.street);
    if (value) {
      els.userAddressInput.value = value;
    }
  });

  userAddressAutocompleteBinding = { autocomplete, placeChangedListener };
}

function setupAdditionalLocationAutocompletes() {
  providerLocationAutocompletes.forEach((binding) => {
    binding?.placeChangedListener?.remove?.();
  });
  providerLocationAutocompletes = [];
  if (!googleMapsReady || !window.google?.maps?.places || !els.providerLocationsList) {
    return;
  }

  const rows = Array.from(els.providerLocationsList.querySelectorAll("[data-provider-location-index]"));
  rows.forEach((row) => {
    const addressInput = row.querySelector('input[data-location-field="address"]');
    if (!addressInput) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(addressInput, {
      fields: ["address_components", "formatted_address", "geometry"],
      types: ["address"],
    });

    const placeChangedListener = autocomplete.addListener("place_changed", () => {
      applyAdditionalLocationAutocomplete(row, autocomplete.getPlace());
    });

    providerLocationAutocompletes.push({ autocomplete, placeChangedListener });
  });
}

function applyAdditionalLocationAutocomplete(row, place) {
  if (!row) {
    return;
  }

  const mapped = place ? mapGooglePlaceToAddress(place) : {};
  const fallback = mapAddressFromDescription(place?.formatted_address || "");
  const merged = {
    street: pickFirstNonEmpty(mapped.street, fallback.street),
    postalCode: pickFirstNonEmpty(mapped.postalCode, fallback.postalCode),
    city: pickFirstNonEmpty(mapped.city, fallback.city),
    state: pickFirstNonEmpty(mapped.state, fallback.state),
    country: pickFirstNonEmpty(mapped.country, fallback.country),
    formatted: pickFirstNonEmpty(mapped.formatted, fallback.formatted),
  };

  const addressInput = row.querySelector('input[data-location-field="address"]');
  const postalCodeInput = row.querySelector('input[data-location-field="postalCode"]');
  const cityInput = row.querySelector('input[data-location-field="city"]');
  const stateInput = row.querySelector('input[data-location-field="state"]');
  const countryInput = row.querySelector('input[data-location-field="country"]');
  const latitudeInput = row.querySelector('input[data-location-field="latitude"]');
  const longitudeInput = row.querySelector('input[data-location-field="longitude"]');

  if (addressInput) {
    addressInput.value = merged.street || merged.formatted || "";
  }
  if (postalCodeInput) {
    postalCodeInput.value = merged.postalCode || "";
  }
  if (cityInput) {
    cityInput.value = merged.city || "";
  }
  if (stateInput) {
    stateInput.value = merged.state || "";
  }
  if (countryInput) {
    countryInput.value = merged.country || "";
  }
  if (latitudeInput) {
    latitudeInput.value =
      typeof mapped.latitude === "number" && Number.isFinite(mapped.latitude)
        ? String(mapped.latitude)
        : "";
  }
  if (longitudeInput) {
    longitudeInput.value =
      typeof mapped.longitude === "number" && Number.isFinite(mapped.longitude)
        ? String(mapped.longitude)
        : "";
  }
}

function renderProviderTemplateOptions() {
  if (!els.providerTopicTemplate) {
    return;
  }
  els.providerTopicTemplate.innerHTML = PROVIDER_TOPIC_TEMPLATES.map(
    (template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`
  ).join("");
}

function getProviderBigPlayerAssignMode() {
  const checkedInput = Array.from(els.providerBigPlayerModeInputs || []).find((input) => input.checked);
  const mode = String(checkedInput?.value || "category").trim();
  if (mode === "all" || mode === "subcategory") {
    return mode;
  }
  return "category";
}

function renderProviderBigPlayerTopicTools() {
  if (
    !els.providerBigPlayerTopicTools ||
    !els.providerBigPlayerCategorySelect ||
    !els.providerBigPlayerSubcategorySelect ||
    !els.providerBigPlayerSubcategoryCategorySelect
  ) {
    return;
  }
  const showTools = isAdmin() && getSelectedCoverageModeFromForm() === PROVIDER_COVERAGE_MODE_BIG_PLAYER;
  els.providerBigPlayerTopicTools.classList.toggle("hidden", !showTools);
  if (!showTools) {
    return;
  }

  const categories = state.categories
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"));
  const currentCategoryId = String(els.providerBigPlayerCategorySelect.value || "").trim();
  const currentSubCategoryCategoryId = String(els.providerBigPlayerSubcategoryCategorySelect.value || "").trim();
  els.providerBigPlayerCategorySelect.innerHTML = categories.length
    ? categories
        .map(
          (category) =>
            `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name || "Kategorie")}</option>`
        )
        .join("")
    : '<option value="">Keine Kategorien</option>';
  els.providerBigPlayerSubcategoryCategorySelect.innerHTML = categories.length
    ? categories
        .map(
          (category) =>
            `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name || "Kategorie")}</option>`
        )
        .join("")
    : '<option value="">Keine Kategorien</option>';

  let selectedCategoryId = currentCategoryId;
  if (!categories.some((category) => category.id === selectedCategoryId)) {
    selectedCategoryId = categories[0]?.id || "";
  }
  els.providerBigPlayerCategorySelect.value = selectedCategoryId;

  let selectedSubcategoryCategoryId = currentSubCategoryCategoryId;
  if (!categories.some((category) => category.id === selectedSubcategoryCategoryId)) {
    selectedSubcategoryCategoryId = selectedCategoryId;
  }
  els.providerBigPlayerSubcategoryCategorySelect.value = selectedSubcategoryCategoryId;

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) || null;
  const selectedSubcategoryCategory =
    categories.find((category) => category.id === selectedSubcategoryCategoryId) || null;
  const subcategories = (selectedSubcategoryCategory?.subcategories || [])
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"));
  const currentSubcategoryId = String(els.providerBigPlayerSubcategorySelect.value || "").trim();
  els.providerBigPlayerSubcategorySelect.innerHTML = subcategories.length
    ? subcategories
        .map(
          (subcategory) =>
            `<option value="${escapeHtml(subcategory.id)}">${escapeHtml(subcategory.name || "Themenbereich")}</option>`
        )
        .join("")
    : '<option value="">Keine Themenbereiche</option>';

  let selectedSubcategoryId = currentSubcategoryId;
  if (!subcategories.some((subcategory) => subcategory.id === selectedSubcategoryId)) {
    selectedSubcategoryId = subcategories[0]?.id || "";
  }
  els.providerBigPlayerSubcategorySelect.value = selectedSubcategoryId;

  if (els.providerBigPlayerAllBtn) {
    els.providerBigPlayerAllBtn.disabled = !getAllTopics().length;
  }
  if (els.providerBigPlayerCategoryBtn) {
    els.providerBigPlayerCategoryBtn.disabled = !selectedCategory;
  }
  if (els.providerBigPlayerSubcategoryBtn) {
    els.providerBigPlayerSubcategoryBtn.disabled = !selectedSubcategoryId;
  }

  const mode = getProviderBigPlayerAssignMode();
  if (els.providerBigPlayerRowAll) {
    els.providerBigPlayerRowAll.classList.toggle("hidden", mode !== "all");
  }
  if (els.providerBigPlayerRowCategory) {
    els.providerBigPlayerRowCategory.classList.toggle("hidden", mode !== "category");
  }
  if (els.providerBigPlayerRowSubcategory) {
    els.providerBigPlayerRowSubcategory.classList.toggle("hidden", mode !== "subcategory");
  }

  if (els.providerBigPlayerSelectionSummary) {
    const allTopics = getAllTopics();
    const validTopicIds = new Set(allTopics.map((topic) => topic.id));
    const selectedCount = Array.from(providerTopicSelection).filter((topicId) => validTopicIds.has(topicId)).length;
    els.providerBigPlayerSelectionSummary.textContent = `${selectedCount} von ${allTopics.length} Themen aktuell zugeordnet`;
  }
}

function renderProviderTopicPicker() {
  renderProviderBigPlayerTopicTools();
  const allTopics = getAllTopics().sort((a, b) => {
    const categoryOrder = String(a.categoryName || "").localeCompare(String(b.categoryName || ""), "de");
    if (categoryOrder !== 0) {
      return categoryOrder;
    }
    const subcategoryOrder = String(a.subcategoryName || "").localeCompare(String(b.subcategoryName || ""), "de");
    if (subcategoryOrder !== 0) {
      return subcategoryOrder;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "de");
  });
  const availableTopicIds = new Set(allTopics.map((topic) => topic.id));
  providerTopicSelection.forEach((topicId) => {
    if (!availableTopicIds.has(topicId)) {
      providerTopicSelection.delete(topicId);
    }
  });

  if (!allTopics.length) {
    els.providerTopicResults.innerHTML =
      '<p class="empty">Noch keine Themen vorhanden. Bitte zuerst unter Verwaltung anlegen.</p>';
    els.providerTopicChips.innerHTML = '<p class="empty">Noch keine Themen zugeordnet.</p>';
    return;
  }

  const query = normalizeText(els.providerTopicSearch?.value || "");
  const filteredTopics = allTopics.filter((topic) => {
    if (!query) {
      return true;
    }
    const searchText = normalizeText(`${topic.name} ${topic.subcategoryName} ${topic.categoryName}`);
    return searchText.includes(query);
  });
  const activeSearchLabel = String(els.providerTopicSearch?.value || "").trim();
  const summaryLabel = `${filteredTopics.length} von ${allTopics.length} Themen`;
  const searchMeta = activeSearchLabel ? ` · Suche: "${activeSearchLabel}"` : "";
  const summaryHtml = `<p class="topic-list-summary">${escapeHtml(summaryLabel + searchMeta)}</p>`;

  els.providerTopicResults.innerHTML = filteredTopics.length
    ? summaryHtml +
      filteredTopics
        .map((topic) => {
          const selected = providerTopicSelection.has(topic.id);
          return `
            <button
              type="button"
              class="topic-result ${selected ? "selected" : ""}"
              data-topic-id="${escapeHtml(topic.id)}"
            >
              <span class="topic-result-title">${escapeHtml(topic.name)}</span>
              <span class="topic-result-meta">${escapeHtml(topic.subcategoryName)} · ${escapeHtml(
                topic.categoryName
              )}</span>
            </button>
          `;
        })
        .join("")
    : `${summaryHtml}
       <p class="empty">Keine Treffer für die Suche.</p>
       <button type="button" class="mini-btn" data-reset-topic-search>Suche zurücksetzen</button>`;

  const selectedTopics = allTopics.filter((topic) => providerTopicSelection.has(topic.id));
  els.providerTopicChips.innerHTML = selectedTopics.length
    ? selectedTopics
        .map(
          (topic) => `
            <div class="topic-chip">
              <div class="topic-chip-text">
                <strong>${escapeHtml(topic.name)}</strong>
                <span>${escapeHtml(topic.subcategoryName)} · ${escapeHtml(topic.categoryName)}</span>
              </div>
              <button
                type="button"
                class="mini-btn danger"
                data-remove-topic="${escapeHtml(topic.id)}"
                title="Zuordnung entfernen"
                aria-label="Zuordnung entfernen"
              >✕</button>
            </div>
          `
        )
        .join("")
    : '<p class="empty">Noch keine Themen zugeordnet.</p>';
}

function createEmptyProviderLocation() {
  return {
    address: "",
    postalCode: "",
    city: "",
    state: "",
    country: "",
    latitude: null,
    longitude: null,
  };
}

function normalizeProviderCoverageMode(modeLike) {
  const normalizedMode = normalizeText(modeLike).replace(/[\s_-]+/g, "");
  const bigPlayerKey = normalizeText(PROVIDER_COVERAGE_MODE_BIG_PLAYER).replace(/[\s_-]+/g, "");
  return normalizedMode === bigPlayerKey ? PROVIDER_COVERAGE_MODE_BIG_PLAYER : PROVIDER_COVERAGE_MODE_LOCATIONS;
}

function normalizeProviderCoverageStates(statesLike) {
  if (!Array.isArray(statesLike)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  statesLike.forEach((stateLabel) => {
    const label = String(stateLabel || "").trim();
    if (!label) {
      return;
    }
    const key = normalizeText(label);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(label);
  });
  return normalized.sort((a, b) => a.localeCompare(b, "de"));
}

function getPredefinedStatesForCountry(country) {
  const countryKey = normalizeText(country);
  if (!countryKey) {
    return [];
  }
  return Array.isArray(PREDEFINED_STATES_BY_COUNTRY[countryKey]) ? PREDEFINED_STATES_BY_COUNTRY[countryKey] : [];
}

function normalizeProviderCoverageStatesForCountry(statesLike, country) {
  const normalizedStates = normalizeProviderCoverageStates(statesLike);
  const predefinedStates = getPredefinedStatesForCountry(country);
  if (!predefinedStates.length) {
    return normalizedStates;
  }

  const predefinedByKey = new Map(
    predefinedStates.map((stateLabel) => [normalizeText(stateLabel), stateLabel])
  );
  const seen = new Set();
  const sanitized = [];
  normalizedStates.forEach((stateLabel) => {
    const stateKey = normalizeText(stateLabel);
    if (!stateKey || seen.has(stateKey)) {
      return;
    }
    const canonicalStateLabel = predefinedByKey.get(stateKey);
    if (!canonicalStateLabel) {
      return;
    }
    seen.add(stateKey);
    sanitized.push(canonicalStateLabel);
  });
  return sanitized.sort((a, b) => a.localeCompare(b, "de"));
}

function getProviderCoverageMode(provider) {
  return normalizeProviderCoverageMode(provider?.coverageMode);
}

function isBigPlayerProvider(provider) {
  return getProviderCoverageMode(provider) === PROVIDER_COVERAGE_MODE_BIG_PLAYER;
}

function getProviderCoverageCountry(provider) {
  const fromCoverage = String(provider?.coverageCountry || "").trim();
  if (fromCoverage) {
    return fromCoverage;
  }
  const firstLocation = getProviderLocations(provider)[0];
  return String(firstLocation?.country || provider?.country || "").trim();
}

function getProviderCoverageStates(provider) {
  return normalizeProviderCoverageStatesForCountry(
    provider?.coverageStates || [],
    getProviderCoverageCountry(provider)
  );
}

function getStateCenterCoordinates(country, stateLabel) {
  const countryKey = normalizeText(country);
  const stateKey = normalizeText(stateLabel);
  if (!countryKey || !stateKey) {
    return null;
  }
  const countryMap = PREDEFINED_STATE_COORDINATES_BY_COUNTRY[countryKey];
  if (!countryMap) {
    return null;
  }
  return countryMap[stateKey] || null;
}

function getProviderEffectiveLocations(provider) {
  const rawLocations = getProviderLocations(provider);
  if (!isBigPlayerProvider(provider)) {
    return rawLocations.map((location, locationIndex) => ({
      ...location,
      __coverageVirtual: false,
      __sourceLocationIndex: locationIndex,
    }));
  }

  const country = getProviderCoverageCountry(provider);
  if (!country) {
    return rawLocations.map((location, locationIndex) => ({
      ...location,
      __coverageVirtual: false,
      __sourceLocationIndex: locationIndex,
    }));
  }

  const selectedStates = getProviderCoverageStates(provider);
  const predefinedStates = getPredefinedStatesForCountry(country);
  const locationStates = normalizeProviderCoverageStatesForCountry(
    rawLocations.map((location) => location.state),
    country
  );
  const states = selectedStates.length
    ? selectedStates
    : normalizeProviderCoverageStatesForCountry(predefinedStates.concat(locationStates), country);
  if (!states.length) {
    const fallbackBase = rawLocations[0] || createEmptyProviderLocation();
    return [
      {
        ...fallbackBase,
        country,
        state: "",
        latitude: parseOptionalNumber(fallbackBase.latitude),
        longitude: parseOptionalNumber(fallbackBase.longitude),
        __coverageVirtual: true,
        __sourceLocationIndex: null,
      },
    ];
  }

  const fallbackBase = rawLocations[0] || createEmptyProviderLocation();
  return states.map((stateLabel, stateIndex) => {
    const center = getStateCenterCoordinates(country, stateLabel);
    return {
      ...fallbackBase,
      country,
      state: stateLabel,
      city: fallbackBase.city || stateLabel,
      latitude: center?.lat ?? parseOptionalNumber(fallbackBase.latitude),
      longitude: center?.lng ?? parseOptionalNumber(fallbackBase.longitude),
      __coverageVirtual: true,
      __sourceLocationIndex: `coverage-${stateIndex}`,
    };
  });
}

function normalizeProviderNoteRecord(note, index = 0) {
  if (!note || typeof note !== "object") {
    return null;
  }
  const text = String(note.text || note.note_text || "").trim();
  const createdByUserId = String(note.createdByUserId || note.created_by_user_id || "").trim();
  if (!text || !createdByUserId) {
    return null;
  }
  return {
    id: String(note.id || `note_${index}_${createdByUserId || "user"}`).trim(),
    text,
    createdAt: String(note.createdAt || note.created_at || "").trim(),
    createdByUserId,
    createdByName: String(note.createdByName || note.created_by_name || "").trim(),
    createdByRole: String(note.createdByRole || note.created_by_role || "").trim() || "mitarbeiter",
  };
}

function normalizeProviderNotes(notesLike) {
  if (!Array.isArray(notesLike)) {
    return [];
  }
  return notesLike
    .map((note, index) => normalizeProviderNoteRecord(note, index))
    .filter(Boolean);
}

function normalizeProviderLocation(location) {
  return {
    address: String(location?.address || "").trim(),
    postalCode: String(location?.postalCode || "").trim(),
    city: String(location?.city || "").trim(),
    state: String(location?.state || "").trim(),
    country: String(location?.country || "").trim(),
    latitude: parseOptionalNumber(location?.latitude),
    longitude: parseOptionalNumber(location?.longitude),
  };
}

function hasProviderLocationContent(location) {
  const normalized = normalizeProviderLocation(location);
  return Boolean(
    normalized.address ||
      normalized.postalCode ||
      normalized.city ||
      normalized.state ||
      normalized.country ||
      typeof normalized.latitude === "number" ||
      typeof normalized.longitude === "number"
  );
}

function isProviderLocationComplete(location) {
  const normalized = normalizeProviderLocation(location);
  return Boolean(
    normalized.address &&
      normalized.postalCode &&
      normalized.city &&
      normalized.state &&
      normalized.country
  );
}

function normalizeProviderLocations(locations, providerFallback = null) {
  const normalized = Array.isArray(locations)
    ? locations
        .map((location) => normalizeProviderLocation(location))
        .filter((location) => hasProviderLocationContent(location))
    : [];
  if (normalized.length) {
    return normalized;
  }

  if (providerFallback && typeof providerFallback === "object") {
    const legacyLocation = normalizeProviderLocation({
      address: providerFallback.address,
      postalCode: providerFallback.postalCode,
      city: providerFallback.city,
      state: providerFallback.state,
      country: providerFallback.country,
      latitude: providerFallback.latitude,
      longitude: providerFallback.longitude,
    });
    if (hasProviderLocationContent(legacyLocation)) {
      return [legacyLocation];
    }
  }
  return [];
}

function getProviderLocations(provider) {
  return normalizeProviderLocations(provider?.locations, provider);
}

function syncProviderPrimaryLocationFields(provider) {
  const primaryLocation = getProviderLocations(provider)[0] || createEmptyProviderLocation();
  provider.address = primaryLocation.address;
  provider.postalCode = primaryLocation.postalCode;
  provider.city = primaryLocation.city;
  provider.state = primaryLocation.state;
  provider.country = primaryLocation.country;
  provider.latitude = primaryLocation.latitude;
  provider.longitude = primaryLocation.longitude;
}

function syncProviderCoverageStatesDraftFromDom() {
  if (!els.providerCoverageStateList) {
    return;
  }
  providerCoverageStatesDraft = Array.from(
    els.providerCoverageStateList.querySelectorAll('input[data-provider-coverage-state]:checked')
  ).map((checkbox) => String(checkbox.dataset.providerCoverageState || "").trim());
  providerCoverageStatesDraft = normalizeProviderCoverageStatesForCountry(
    providerCoverageStatesDraft,
    getCoverageCountryFromForm()
  );
}

function getSelectedCoverageModeFromForm() {
  const checked = els.providerForm.querySelector('input[name="coverageMode"]:checked');
  return normalizeProviderCoverageMode(checked?.value);
}

function setCoverageModeInForm(mode) {
  const normalizedMode = normalizeProviderCoverageMode(mode);
  els.providerForm.querySelectorAll('input[name="coverageMode"]').forEach((input) => {
    input.checked = normalizeProviderCoverageMode(input.value) === normalizedMode;
  });
}

function getCoverageCountryFromForm() {
  return String(els.providerCoverageCountryInput?.value || "").trim();
}

function normalizeProviderWebsiteUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return "";
  }
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawValue);
  const candidate = hasScheme ? rawValue : `https://${rawValue}`;
  try {
    const parsed = new URL(candidate);
    const protocol = String(parsed.protocol || "").toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return "";
    }
    return parsed.href;
  } catch (_error) {
    return "";
  }
}

function syncProviderWebsitePreviewLink() {
  if (!els.providerWebsitePreviewLink) {
    return;
  }
  const rawValue = String(
    els.providerWebsiteInput?.value || els.providerForm?.elements?.website?.value || ""
  ).trim();
  const websiteUrl = normalizeProviderWebsiteUrl(rawValue);
  if (!websiteUrl) {
    els.providerWebsitePreviewLink.classList.add("hidden");
    els.providerWebsitePreviewLink.removeAttribute("href");
    els.providerWebsitePreviewLink.textContent = "";
    return;
  }
  els.providerWebsitePreviewLink.href = websiteUrl;
  els.providerWebsitePreviewLink.textContent = "Website öffnen";
  els.providerWebsitePreviewLink.classList.remove("hidden");
}

function renderProviderCoverageCountryDatalist() {
  if (!els.providerCoverageCountryDatalist) {
    return;
  }
  const countries = getAvailableCountriesFromProviders();
  els.providerCoverageCountryDatalist.innerHTML = countries
    .map((country) => `<option value="${escapeHtml(country)}"></option>`)
    .join("");
}

function renderProviderCoverageStateOptions() {
  if (!els.providerCoverageStateList || !els.providerCoverageStateWrap) {
    return;
  }
  const country = getCoverageCountryFromForm();
  if (!country) {
    els.providerCoverageStateList.innerHTML = "";
    els.providerCoverageStateWrap.classList.add("hidden");
    return;
  }

  const states = getAvailableStatesForCountry(country);
  providerCoverageStatesDraft = normalizeProviderCoverageStatesForCountry(providerCoverageStatesDraft, country);
  const selectedStates = new Set(
    providerCoverageStatesDraft.map((stateLabel) => normalizeText(stateLabel))
  );

  if (!states.length) {
    els.providerCoverageStateWrap.classList.remove("hidden");
    els.providerCoverageStateList.innerHTML =
      '<p class="provider-coverage-empty">Keine Bundesländer für dieses Land hinterlegt. Ohne Auswahl gilt das gesamte Land.</p>';
    return;
  }

  els.providerCoverageStateWrap.classList.remove("hidden");
  els.providerCoverageStateList.innerHTML = states
    .map(
      (stateLabel) => `
        <label class="provider-coverage-state-item">
          <input
            type="checkbox"
            data-provider-coverage-state="${escapeHtml(stateLabel)}"
            ${selectedStates.has(normalizeText(stateLabel)) ? "checked" : ""}
          />
          <span>${escapeHtml(stateLabel)}</span>
        </label>
      `
    )
    .join("");
}

function syncProviderCoverageFormState() {
  const mode = getSelectedCoverageModeFromForm();
  const isBigPlayer = mode === PROVIDER_COVERAGE_MODE_BIG_PLAYER;
  if (els.providerCoverageConfig) {
    els.providerCoverageConfig.classList.toggle("hidden", !isBigPlayer);
  }
  if (els.providerLocationsList?.closest(".provider-locations-panel")) {
    els.providerLocationsList.closest(".provider-locations-panel").classList.toggle("hidden", isBigPlayer);
  }

  const requiredInLocationMode = [
    els.providerAddressInput,
    els.providerForm.elements.postalCode,
    els.providerForm.elements.city,
    els.providerForm.elements.country,
    els.providerForm.elements.state,
  ];
  requiredInLocationMode.forEach((field) => {
    if (!field) {
      return;
    }
    field.required = !isBigPlayer;
  });

  if (!isBigPlayer) {
    providerCoverageStatesDraft = [];
  }
  renderProviderCoverageStateOptions();
  renderProviderBigPlayerTopicTools();
}

function getProviderCoverageSummary(provider) {
  if (!isBigPlayerProvider(provider)) {
    const locations = getProviderLocations(provider);
    const firstLocationLabel = locations[0]?.city || provider.city || "–";
    const baseLabel = locations.length > 1 ? `${firstLocationLabel} (+${locations.length - 1})` : firstLocationLabel;
    if (isProviderOnlineOnly(provider)) {
      return `Online · ${baseLabel}`;
    }
    return baseLabel;
  }

  const country = getProviderCoverageCountry(provider);
  const selectedStates = getProviderCoverageStates(provider);
  const stateCount = selectedStates.length || getAvailableStatesForCountry(country).length;
  const onlinePrefix = isProviderOnlineOnly(provider) ? "Online · " : "";
  if (!country) {
    return `${onlinePrefix}Big Player`;
  }
  if (!stateCount) {
    return `${onlinePrefix}Big Player · ${country}`;
  }
  if (!selectedStates.length) {
    return `${onlinePrefix}Big Player · ${country} (alle ${stateCount})`;
  }
  return `${onlinePrefix}Big Player · ${country} (${stateCount})`;
}

function syncProviderAdditionalLocationsDraftFromDom() {
  if (!els.providerLocationsList) {
    return;
  }
  const rows = Array.from(els.providerLocationsList.querySelectorAll("[data-provider-location-index]"));
  providerAdditionalLocationsDraft = rows.map((row) =>
    normalizeProviderLocation({
      address: row.querySelector('input[data-location-field="address"]')?.value || "",
      postalCode: row.querySelector('input[data-location-field="postalCode"]')?.value || "",
      city: row.querySelector('input[data-location-field="city"]')?.value || "",
      state: row.querySelector('input[data-location-field="state"]')?.value || "",
      country: row.querySelector('input[data-location-field="country"]')?.value || "",
      latitude: row.querySelector('input[data-location-field="latitude"]')?.value || "",
      longitude: row.querySelector('input[data-location-field="longitude"]')?.value || "",
    })
  );
}

function renderProviderAdditionalLocations() {
  if (!els.providerLocationsList) {
    return;
  }
  if (!providerAdditionalLocationsDraft.length) {
    els.providerLocationsList.innerHTML = '<p class="empty">Keine weiteren Standorte.</p>';
    return;
  }

  els.providerLocationsList.innerHTML = providerAdditionalLocationsDraft
    .map((location, index) => {
      const normalized = normalizeProviderLocation(location);
      return `
        <div class="provider-location-row" data-provider-location-index="${index}">
          <div class="provider-location-row-head">
            <strong>Standort ${index + 2}</strong>
            <button
              type="button"
              class="mini-btn danger"
              title="Standort entfernen"
              aria-label="Standort entfernen"
              data-remove-provider-location="${index}"
            >✕</button>
          </div>
          <div class="provider-location-row-grid">
            <label>
              Adresse
              <input type="text" data-location-field="address" value="${escapeHtml(normalized.address)}" autocomplete="off" />
            </label>
            <label>
              PLZ
              <input type="text" data-location-field="postalCode" value="${escapeHtml(normalized.postalCode)}" />
            </label>
            <label>
              Ort
              <input type="text" data-location-field="city" value="${escapeHtml(normalized.city)}" />
            </label>
            <label>
              Bundesland
              <input type="text" data-location-field="state" value="${escapeHtml(normalized.state)}" />
            </label>
            <label>
              Land
              <input type="text" data-location-field="country" value="${escapeHtml(normalized.country)}" />
            </label>
            <input type="hidden" data-location-field="latitude" value="${escapeHtml(String(normalized.latitude ?? ""))}" />
            <input type="hidden" data-location-field="longitude" value="${escapeHtml(String(normalized.longitude ?? ""))}" />
          </div>
        </div>
      `;
    })
    .join("");
  setupAdditionalLocationAutocompletes();
}

function fillProviderForm(provider) {
  const locations = getProviderLocations(provider);
  const primaryLocation = locations[0] || createEmptyProviderLocation();
  const coverageMode = getProviderCoverageMode(provider);
  const coverageCountry = getProviderCoverageCountry(provider);
  const coverageStates = getProviderCoverageStates(provider);
  const formElements = els.providerForm.elements;
  formElements.name.value = provider.name;
  formElements.address.value = primaryLocation.address;
  formElements.postalCode.value = primaryLocation.postalCode;
  formElements.city.value = primaryLocation.city;
  formElements.country.value = primaryLocation.country;
  formElements.state.value = primaryLocation.state;
  formElements.website.value = provider.website;
  syncProviderWebsitePreviewLink();
  formElements.email.value = provider.email;
  formElements.phone.value = provider.phone;
  setProviderStatusInForm(provider.status);
  if (formElements.adminOnly) {
    formElements.adminOnly.checked = isProviderAdminOnly(provider);
  }
  if (formElements.onlineOnly) {
    formElements.onlineOnly.checked = isProviderOnlineOnly(provider);
  }
  formElements.latitude.value =
    typeof primaryLocation.latitude === "number" && Number.isFinite(primaryLocation.latitude)
      ? String(primaryLocation.latitude)
      : "";
  formElements.longitude.value =
    typeof primaryLocation.longitude === "number" && Number.isFinite(primaryLocation.longitude)
      ? String(primaryLocation.longitude)
      : "";
  setCoverageModeInForm(coverageMode);
  if (els.providerCoverageCountryInput) {
    els.providerCoverageCountryInput.value = coverageCountry;
  }
  providerCoverageStatesDraft = normalizeProviderCoverageStatesForCountry(
    coverageStates,
    coverageCountry
  );
  syncProviderCoverageFormState();
  if (els.providerCreatedMeta) {
    els.providerCreatedMeta.textContent = formatAuditStamp(
      provider.createdAt,
      provider.createdByRole,
      provider.createdByName
    );
  }
  if (els.providerUpdatedMeta) {
    els.providerUpdatedMeta.textContent = formatAuditStamp(
      provider.updatedAt,
      provider.updatedByRole,
      provider.updatedByName
    );
  }
  if (els.providerLiveMeta) {
    els.providerLiveMeta.textContent = getProviderLiveAuditStamp(provider);
  }

  clearProviderNameSuggestions();
  clearAddressSuggestions();
  resetProviderNoteEditorState();
  providerAdditionalLocationsDraft = locations.slice(1).map((location) => ({ ...location }));
  renderProviderAdditionalLocations();
  providerTopicSelection = new Set(provider.topicIds || []);
  if (els.providerTopicSearch) {
    els.providerTopicSearch.value = "";
  }
  providerLiveStatusConfirmedInForm = isLiveStatus(provider.status);
  renderProviderTopicPicker();
  renderProviderNotes();
  syncProviderStatusSliderUi();
  setProviderDetailTab("master");
  void fetchProviderNotesForProvider(provider.id, { force: true });
}

function fillUserForm(user) {
  const formElements = els.userForm.elements;
  formElements.name.value = user.name;
  formElements.address.value = user.address;
  formElements.email.value = user.email;
  formElements.phone.value = user.phone;
  formElements.role.value = user.role;
  renderUserTerritoryOptions(user.territories);
  formElements.email.disabled = user.source === "profile";
  const isProfileUser = user.source === "profile";
  if (els.userHonorariumEnabled) {
    els.userHonorariumEnabled.checked = isProfileUser ? isEmployeeHonorariumEnabled(user.sourceId) : false;
    els.userHonorariumEnabled.disabled = !isProfileUser;
  }
  if (els.userHonorariumRate) {
    els.userHonorariumRate.value = isProfileUser ? formatRateInputValue(getEmployeeRateByUserId(user.sourceId)) : "0.00";
  }
  if (els.userHonorariumHint) {
    els.userHonorariumHint.textContent = isProfileUser
      ? "Honorar und Freischaltung werden nur hier in der Detailansicht gepflegt."
      : "Honorar kann erst nach der ersten Anmeldung (aktives Profil) freigeschaltet werden.";
  }
  if (els.userHonorariumField) {
    els.userHonorariumField.classList.remove("hidden");
  }
  syncUserHonorariumFieldState();
  els.userSaveBtn.textContent = "Aktualisieren";
}

function clearUserForm() {
  editingUserId = null;
  els.userForm.reset();
  renderUserTerritoryOptions([]);
  els.userForm.elements.email.disabled = false;
  if (els.userHonorariumEnabled) {
    els.userHonorariumEnabled.checked = false;
    els.userHonorariumEnabled.disabled = true;
  }
  if (els.userHonorariumRate) {
    els.userHonorariumRate.value = "0.00";
  }
  if (els.userHonorariumHint) {
    els.userHonorariumHint.textContent =
      "Honorar kann erst nach der ersten Anmeldung (aktives Profil) freigeschaltet werden.";
  }
  if (els.userHonorariumField) {
    els.userHonorariumField.classList.remove("hidden");
  }
  syncUserHonorariumFieldState();
  els.userSaveBtn.textContent = "Speichern";
}

function syncUserHonorariumFieldState() {
  if (!els.userHonorariumRate) {
    return;
  }
  const canUseHonorarium = !!els.userHonorariumEnabled && !els.userHonorariumEnabled.disabled;
  const enabled = canUseHonorarium && els.userHonorariumEnabled.checked;
  els.userHonorariumRate.disabled = !enabled;
}

function normalizeProviderDetailTab(tab) {
  return tab === "notes" ? "notes" : "master";
}

function setProviderDetailTab(tab) {
  providerDetailTab = normalizeProviderDetailTab(tab);
  els.providerDetailTabButtons.forEach((button) => {
    const tabId = normalizeProviderDetailTab(button.dataset.providerDetailTabBtn || "master");
    button.classList.toggle("active", tabId === providerDetailTab);
  });
  if (els.providerMasterTabPanel) {
    els.providerMasterTabPanel.classList.toggle("hidden", providerDetailTab !== "master");
  }
  if (els.providerNotesTabPanel) {
    els.providerNotesTabPanel.classList.toggle("hidden", providerDetailTab !== "notes");
  }
  if (els.providerSaveBtn) {
    els.providerSaveBtn.classList.toggle("hidden", providerDetailTab !== "master");
  }
  if (providerDetailTab === "notes") {
    renderProviderNotes();
    if (editingProviderId) {
      void fetchProviderNotesForProvider(editingProviderId);
    }
  }
}

function getCurrentUserId() {
  const currentUser = getCurrentUser();
  return String(authProfile?.user_id || currentUser?.sourceId || "").trim();
}

function getProviderNotesSource(provider) {
  const providerId = String(provider?.id || "").trim();
  if (!providerId) {
    return [];
  }
  const hasLoadedRemoteNotes = providerNotesLoadedProviderIds.has(providerId);
  return normalizeProviderNotes(
    hasLoadedRemoteNotes
      ? providerNotesCacheByProviderId[providerId] || []
      : provider?.notes || []
  );
}

function setProviderNotesSource(providerId, notes) {
  const normalizedProviderId = String(providerId || "").trim();
  if (!normalizedProviderId) {
    return;
  }
  const normalizedNotes = normalizeProviderNotes(notes || []);
  providerNotesCacheByProviderId[normalizedProviderId] = normalizedNotes;
  providerNotesLoadedProviderIds.add(normalizedProviderId);
  const provider = state.providers.find((entry) => entry.id === normalizedProviderId);
  if (provider) {
    provider.notes = normalizedNotes;
  }
}

function resetProviderNoteEditorState() {
  editingProviderNoteId = "";
  if (els.providerNoteInput) {
    els.providerNoteInput.value = "";
  }
  if (els.providerNoteAddBtn) {
    els.providerNoteAddBtn.textContent = "Notiz speichern";
  }
}

function syncProviderNoteEditorForEdit(note) {
  if (!note || !els.providerNoteInput) {
    resetProviderNoteEditorState();
    return;
  }
  editingProviderNoteId = String(note.id || "").trim();
  els.providerNoteInput.value = note.text || "";
  if (els.providerNoteAddBtn) {
    els.providerNoteAddBtn.textContent = "Notiz aktualisieren";
  }
}

function getProviderNotesVisibleForCurrentUser(provider) {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    return [];
  }
  const sourceNotes = getProviderNotesSource(provider);
  return sourceNotes
    .filter((note) => note.createdByUserId === currentUserId)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function renderProviderNotes() {
  if (!els.providerNotesList) {
    return;
  }
  if (!editingProviderId) {
    els.providerNotesList.innerHTML =
      '<p class="empty">Notizen können nach dem ersten Speichern des Anbieters erstellt werden.</p>';
    return;
  }
  const provider = state.providers.find((entry) => entry.id === editingProviderId);
  if (!provider) {
    els.providerNotesList.innerHTML = '<p class="empty">Anbieter nicht gefunden.</p>';
    return;
  }
  const providerId = String(provider.id || "").trim();
  const loading = providerNotesLoadingProviderIds.has(providerId);
  const errorMessage = String(providerNotesErrorByProviderId[providerId] || "").trim();
  const visibleNotes = getProviderNotesVisibleForCurrentUser(provider);
  const infoPrefix = errorMessage ? `<p class="empty">${escapeHtml(errorMessage)}</p>` : "";
  if (loading && !visibleNotes.length) {
    els.providerNotesList.innerHTML = `${infoPrefix}<p class="empty">Notizen werden geladen...</p>`;
    return;
  }
  if (!visibleNotes.length) {
    els.providerNotesList.innerHTML = `${infoPrefix}<p class="empty">Noch keine eigenen Notizen vorhanden.</p>`;
    return;
  }

  if (editingProviderNoteId) {
    const editingVisible = visibleNotes.some((note) => String(note.id || "").trim() === editingProviderNoteId);
    if (!editingVisible) {
      resetProviderNoteEditorState();
    }
  }

  els.providerNotesList.innerHTML =
    infoPrefix +
    visibleNotes
      .map(
        (note) => `
          <article class="provider-note-item ${editingProviderNoteId === String(note.id || "").trim() ? "editing" : ""}">
            <div class="provider-note-head">
              <p class="provider-note-meta">
                ${escapeHtml(formatDateTime(note.createdAt))} · ${escapeHtml(getRoleLabel(note.createdByRole))} (${escapeHtml(
            note.createdByName || "Unbekannt"
          )})
              </p>
              <div class="provider-note-actions">
                <button
                  type="button"
                  class="mini-btn"
                  title="Notiz bearbeiten"
                  aria-label="Notiz bearbeiten"
                  data-edit-provider-note="${escapeHtml(note.id)}"
                  data-admin-lock-exempt="true"
                >✎</button>
                <button
                  type="button"
                  class="mini-btn danger"
                  title="Notiz löschen"
                  aria-label="Notiz löschen"
                  data-delete-provider-note="${escapeHtml(note.id)}"
                  data-admin-lock-exempt="true"
                >✕</button>
              </div>
            </div>
            <p class="provider-note-text">${escapeHtml(note.text).replace(/\n/g, "<br/>")}</p>
          </article>
        `
      )
      .join("");
}

async function fetchProviderNotesForProvider(providerId, options = {}) {
  const normalizedProviderId = String(providerId || "").trim();
  if (!normalizedProviderId) {
    return [];
  }
  const forceReload = options?.force === true;
  if (!forceReload && providerNotesLoadedProviderIds.has(normalizedProviderId)) {
    return normalizeProviderNotes(providerNotesCacheByProviderId[normalizedProviderId] || []);
  }
  if (providerNotesLoadingProviderIds.has(normalizedProviderId)) {
    return normalizeProviderNotes(providerNotesCacheByProviderId[normalizedProviderId] || []);
  }

  const provider = state.providers.find((entry) => entry.id === normalizedProviderId) || null;
  const fallbackNotes = normalizeProviderNotes(provider?.notes || []);
  providerNotesLoadingProviderIds.add(normalizedProviderId);
  providerNotesErrorByProviderId[normalizedProviderId] = "";
  if (editingProviderId === normalizedProviderId && providerDetailTab === "notes") {
    renderProviderNotes();
  }

  const client = getSupabaseClient();
  if (!client) {
    providerNotesCacheByProviderId[normalizedProviderId] = fallbackNotes;
    providerNotesLoadedProviderIds.add(normalizedProviderId);
    providerNotesLoadingProviderIds.delete(normalizedProviderId);
    if (editingProviderId === normalizedProviderId && providerDetailTab === "notes") {
      renderProviderNotes();
    }
    return fallbackNotes;
  }

  try {
    const { data, error } = await client
      .from("provider_notes")
      .select("id, provider_id, note_text, created_by_user_id, created_by_name, created_by_role, created_at")
      .eq("provider_id", normalizedProviderId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const remoteNotes = normalizeProviderNotes(Array.isArray(data) ? data : []);
    providerNotesCacheByProviderId[normalizedProviderId] = remoteNotes;
    providerNotesLoadedProviderIds.add(normalizedProviderId);
    providerNotesErrorByProviderId[normalizedProviderId] = "";
    return remoteNotes;
  } catch (error) {
    const message = String(error?.message || "").trim();
    const tableMissing =
      message.includes("relation") && message.includes("provider_notes") && message.includes("does not exist");
    providerNotesCacheByProviderId[normalizedProviderId] = fallbackNotes;
    providerNotesLoadedProviderIds.add(normalizedProviderId);
    providerNotesErrorByProviderId[normalizedProviderId] = tableMissing
      ? 'SQL fehlt: Tabelle "provider_notes" bitte in Supabase anlegen.'
      : "Notizen konnten nicht geladen werden.";
    return fallbackNotes;
  } finally {
    providerNotesLoadingProviderIds.delete(normalizedProviderId);
    if (editingProviderId === normalizedProviderId && providerDetailTab === "notes") {
      renderProviderNotes();
    }
  }
}

async function handleStartProviderNoteEdit(noteId) {
  const normalizedNoteId = String(noteId || "").trim();
  if (!normalizedNoteId || !editingProviderId) {
    return;
  }
  const provider = state.providers.find((entry) => entry.id === editingProviderId);
  if (!provider) {
    return;
  }
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    return;
  }
  const sourceNotes = getProviderNotesSource(provider);
  const note = sourceNotes.find(
    (entry) =>
      String(entry.id || "").trim() === normalizedNoteId &&
      String(entry.createdByUserId || "").trim() === currentUserId
  );
  if (!note) {
    return;
  }
  syncProviderNoteEditorForEdit(note);
  renderProviderNotes();
  els.providerNoteInput?.focus();
}

async function handleDeleteProviderNote(noteId) {
  const normalizedNoteId = String(noteId || "").trim();
  if (!normalizedNoteId || !editingProviderId) {
    return;
  }
  const normalizedProviderId = String(editingProviderId || "").trim();
  const provider = state.providers.find((entry) => entry.id === normalizedProviderId) || null;
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    return;
  }

  const confirmed = window.confirm("Notiz wirklich löschen?");
  if (!confirmed) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    if (!provider) {
      return;
    }
    const nextNotes = normalizeProviderNotes(provider.notes || []).filter(
      (entry) =>
        !(
          String(entry.id || "").trim() === normalizedNoteId &&
          String(entry.createdByUserId || "").trim() === currentUserId
        )
    );
    provider.notes = nextNotes;
    setProviderNotesSource(normalizedProviderId, nextNotes);
    saveState();
    if (editingProviderNoteId === normalizedNoteId) {
      resetProviderNoteEditorState();
    }
    renderProviderNotes();
    return;
  }

  const { error } = await client
    .from("provider_notes")
    .delete()
    .eq("id", normalizedNoteId)
    .eq("provider_id", normalizedProviderId)
    .eq("created_by_user_id", currentUserId);

  if (error) {
    window.alert("Notiz konnte nicht gelöscht werden.");
    return;
  }

  if (editingProviderNoteId === normalizedNoteId) {
    resetProviderNoteEditorState();
  }
  await fetchProviderNotesForProvider(normalizedProviderId, { force: true });
  renderProviderNotes();
}

async function handleAddProviderNote() {
  if (!editingProviderId) {
    window.alert("Notizen können erst nach dem Speichern des Anbieters erstellt werden.");
    return;
  }
  const normalizedProviderId = String(editingProviderId || "").trim();
  const provider = state.providers.find((entry) => entry.id === normalizedProviderId) || null;
  const text = String(els.providerNoteInput?.value || "").trim();
  if (!text) {
    return;
  }
  const normalizedEditNoteId = String(editingProviderNoteId || "").trim();
  const actor = getCurrentActorInfo();
  const currentUserId = String(actor.userId || "").trim();
  if (!currentUserId) {
    window.alert("Benutzer konnte nicht ermittelt werden.");
    return;
  }
  const nowIso = new Date().toISOString();
  const note = {
    id: createId("note"),
    text,
    createdAt: nowIso,
    createdByUserId: currentUserId,
    createdByName: actor.name,
    createdByRole: actor.role,
  };
  const client = getSupabaseClient();

  if (!client) {
    if (!provider) {
      return;
    }
    const currentNotes = normalizeProviderNotes(provider.notes || []);
    const nextNotes = normalizedEditNoteId
      ? currentNotes.map((entry) =>
          String(entry.id || "").trim() === normalizedEditNoteId &&
          String(entry.createdByUserId || "").trim() === currentUserId
            ? { ...entry, text }
            : entry
        )
      : currentNotes.concat(note);
    provider.notes = normalizeProviderNotes(nextNotes);
    saveState();
    resetProviderNoteEditorState();
    setProviderNotesSource(normalizedProviderId, provider.notes || []);
    providerNotesErrorByProviderId[normalizedProviderId] = "";
    renderProviderNotes();
    return;
  }

  let error = null;
  if (normalizedEditNoteId) {
    const updateResult = await client
      .from("provider_notes")
      .update({ note_text: text })
      .eq("id", normalizedEditNoteId)
      .eq("provider_id", normalizedProviderId)
      .eq("created_by_user_id", currentUserId);
    error = updateResult.error;
  } else {
    const insertResult = await client.from("provider_notes").insert({
      provider_id: normalizedProviderId,
      note_text: note.text,
      created_by_user_id: note.createdByUserId,
      created_by_name: note.createdByName,
      created_by_role: note.createdByRole,
    });
    error = insertResult.error;
  }

  if (error) {
    const message = String(error.message || "").trim();
    const tableMissing =
      message.includes("relation") && message.includes("provider_notes") && message.includes("does not exist");
    window.alert(
      tableMissing
        ? 'SQL fehlt: Tabelle "provider_notes" bitte in Supabase anlegen.'
        : normalizedEditNoteId
          ? "Notiz konnte nicht aktualisiert werden."
          : "Notiz konnte nicht gespeichert werden."
    );
    return;
  }

  resetProviderNoteEditorState();
  await fetchProviderNotesForProvider(normalizedProviderId, { force: true });
  renderProviderNotes();
}

function clearProviderForm() {
  editingProviderId = null;
  els.providerForm.reset();
  syncProviderWebsitePreviewLink();
  setProviderStatusInForm("offen");
  syncProviderStatusSliderUi();
  clearProviderCoordinates();
  providerAdditionalLocationsDraft = [];
  providerCoverageStatesDraft = [];
  setCoverageModeInForm(PROVIDER_COVERAGE_MODE_LOCATIONS);
  if (els.providerCoverageCountryInput) {
    els.providerCoverageCountryInput.value = "";
  }
  syncProviderCoverageFormState();
  renderProviderAdditionalLocations();
  if (els.providerCreatedMeta) {
    els.providerCreatedMeta.textContent = "-";
  }
  if (els.providerUpdatedMeta) {
    els.providerUpdatedMeta.textContent = "-";
  }
  if (els.providerLiveMeta) {
    els.providerLiveMeta.textContent = "-";
  }
  providerTopicSelection.clear();
  providerLiveStatusConfirmedInForm = false;
  providerStatusLastFormValue = "offen";
  if (els.providerTopicSearch) {
    els.providerTopicSearch.value = "";
  }
  renderProviderTopicPicker();
  clearProviderNameSuggestions();
  clearAddressSuggestions();
  resetProviderNoteEditorState();
  if (els.providerNotesList) {
    els.providerNotesList.innerHTML = "";
  }
  setProviderDetailTab("master");
  els.providerSaveBtn.textContent = "Speichern";
}

function clearProviderCoordinates() {
  if (els.providerLatitudeInput) {
    els.providerLatitudeInput.value = "";
  }
  if (els.providerLongitudeInput) {
    els.providerLongitudeInput.value = "";
  }
}

async function handleActivateUser(userId) {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) {
    return;
  }
  if (user.source !== "profile") {
    window.alert("Freischaltung ist erst möglich, sobald der Mitarbeiter ein Konto erstellt hat.");
    return;
  }
  if (isUserStatusActive(user.status)) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    window.alert("Supabase Verbindung fehlt.");
    return;
  }

  const { error } = await client
    .from("profiles")
    .update({ status: "active" })
    .eq("user_id", user.sourceId);
  if (error) {
    window.alert("Mitarbeiter konnte nicht freigeschaltet werden.");
    return;
  }

  await syncUsersFromSupabase();
  renderAll();
}

async function handleDeleteUser(userId) {
  const userIndex = state.users.findIndex((entry) => entry.id === userId);
  if (userIndex < 0) {
    return;
  }

  const user = state.users[userIndex];
  const activeProfiles = state.users.filter(
    (entry) => entry.source === "profile" && isUserStatusActive(entry.status)
  );
  if (user.source === "profile" && isUserStatusActive(user.status) && activeProfiles.length <= 1) {
    window.alert("Mindestens ein aktiver Mitarbeiter muss bestehen bleiben.");
    return;
  }

  const adminCount = state.users.filter(
    (entry) => entry.source === "profile" && entry.role === "admin" && isUserStatusActive(entry.status)
  ).length;
  if (user.role === "admin" && isUserStatusActive(user.status) && adminCount <= 1) {
    window.alert("Der letzte Admin kann nicht gelöscht werden.");
    return;
  }

  if (user.source === "profile" && user.sourceId === authProfile?.user_id) {
    window.alert("Du kannst deinen eigenen Zugang nicht löschen.");
    return;
  }

  const confirmed = await confirmDeleteAction(`Mitarbeiter "${user.name}" wirklich löschen?`);
  if (!confirmed) {
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    window.alert("Supabase Verbindung fehlt.");
    return;
  }

  if (user.source === "invite") {
    const { error } = await client.from("employee_invites").delete().eq("id", user.sourceId);
    if (error) {
      window.alert("Einladung konnte nicht gelöscht werden.");
      return;
    }
  } else if (user.source === "profile") {
    const { error } = await client.from("profiles").delete().eq("user_id", user.sourceId);
    if (error) {
      window.alert("Mitarbeiter konnte nicht gelöscht werden.");
      return;
    }
  }

  if (editingUserId === userId) {
    clearUserForm();
  }
  if (user.source === "profile") {
    clearUserTerritoriesForUserId(user.sourceId);
    clearEmployeeRateByUserId(user.sourceId);
    clearEmployeeHonorariumEnabledByUserId(user.sourceId);
  }
  clearUserTerritoriesForEmail(user.email);
  saveState();
  await syncUsersFromSupabase();
  ensureSessionUser();
  renderAll();
}

async function handleDeleteProvider(providerId) {
  const providerIndex = state.providers.findIndex((entry) => entry.id === providerId);
  if (providerIndex < 0) {
    return;
  }

  const provider = state.providers[providerIndex];
  if (!canCurrentUserDeleteProvider(provider)) {
    window.alert("Du kannst nur Anbieter löschen, die du selbst angelegt hast.");
    return;
  }
  const confirmed = await confirmDeleteAction(`Anbieter "${provider.name}" wirklich löschen?`);
  if (!confirmed) {
    return;
  }

  await releaseProviderRegistryKey(provider.id);
  state.providers.splice(providerIndex, 1);
  if (editingProviderId === providerId) {
    clearProviderForm();
    setProvidersView("list");
  }

  saveState();
  renderAll();
}

function renderManagementSummary() {
  const categoryCount = state.categories.length;
  const subcategoryCount = getTotalSubcategoryCount();
  const topicCount = getAllTopics().length;

  els.managementCatCount.textContent = String(categoryCount);
  els.managementSubcatCount.textContent = String(subcategoryCount);
  els.managementTopicCount.textContent = String(topicCount);
}

function renderCategoryList() {
  const admin = isAdmin();
  if (!state.categories.length) {
    els.categoriesList.innerHTML =
      '<li class="lane-empty">Noch keine Kategorien vorhanden.</li>';
    return;
  }

  els.categoriesList.innerHTML = state.categories
    .map((category) => {
      const topicCount = category.subcategories.reduce((count, sub) => count + sub.topics.length, 0);
      const activeClass = category.id === selectedCategoryId ? "active" : "";

      return `
        <li>
          <div class="lane-row">
            <button type="button" class="lane-item ${activeClass}" data-select-category="${escapeHtml(
              category.id
            )}">
              <span class="row-handle">≡</span>
              <span class="lane-item-text">
                <span class="lane-item-title">${escapeHtml(category.name)}</span>
                <span class="lane-item-meta">${escapeHtml(
                  String(category.subcategories.length)
                )} Bereiche · ${escapeHtml(String(topicCount))} Themen</span>
              </span>
            </button>
            ${
              admin
                ? `<div class="lane-actions">
                    <button type="button" class="mini-btn" title="Kategorie bearbeiten" aria-label="Kategorie bearbeiten" data-edit-category="${escapeHtml(
                      category.id
                    )}">✎</button>
                    <button type="button" class="mini-btn danger" title="Kategorie löschen" aria-label="Kategorie löschen" data-delete-category="${escapeHtml(
                      category.id
                    )}">✕</button>
                  </div>`
                : ""
            }
          </div>
        </li>
      `;
    })
    .join("");
}

function renderSubcategoriesList() {
  const admin = isAdmin();
  const category = getSelectedCategory();
  const subcategoryInput = els.subcategoryForm.querySelector("input[name='name']");

  setFormControlsDisabled(els.subcategoryForm, !isAdmin() || !category);

  if (!category) {
    subcategoryInput.placeholder = "Zuerst links eine Kategorie auswählen";
    els.subcategoryContext.textContent = "Bitte links eine Kategorie auswählen.";
    els.subcategoriesList.innerHTML =
      '<li class="lane-empty">Bitte zuerst eine Kategorie anlegen.</li>';
    return;
  }

  subcategoryInput.placeholder = `Neue Unterkategorie in "${category.name}"`;
  els.subcategoryContext.textContent = `Kategorie: ${category.name}`;

  if (!category.subcategories.length) {
    els.subcategoriesList.innerHTML =
      '<li class="lane-empty">Noch keine Unterkategorien in dieser Kategorie.</li>';
    return;
  }

  els.subcategoriesList.innerHTML = category.subcategories
    .map((subcategory) => {
      const activeClass = subcategory.id === selectedSubcategoryId ? "active" : "";
      return `
        <li>
          <div class="lane-row">
            <button type="button" class="lane-item ${activeClass}" data-select-subcategory="${escapeHtml(
              subcategory.id
            )}">
              <span class="row-handle">≡</span>
              <span class="lane-item-text">
                <span class="lane-item-title">${escapeHtml(subcategory.name)}</span>
                <span class="lane-item-meta">${escapeHtml(
                  String(subcategory.topics.length)
                )} Themen · ${escapeHtml(category.name)}</span>
              </span>
            </button>
            ${
              admin
                ? `<div class="lane-actions">
                    <button type="button" class="mini-btn" title="Unterkategorie bearbeiten" aria-label="Unterkategorie bearbeiten" data-edit-subcategory="${escapeHtml(
                      subcategory.id
                    )}">✎</button>
                    <button type="button" class="mini-btn danger" title="Unterkategorie löschen" aria-label="Unterkategorie löschen" data-delete-subcategory="${escapeHtml(
                      subcategory.id
                    )}">✕</button>
                  </div>`
                : ""
            }
          </div>
        </li>
      `;
    })
    .join("");
}

function renderTopicsList() {
  const admin = isAdmin();
  const category = getSelectedCategory();
  const subcategory = getSelectedSubcategory();
  const topicInput = els.topicForm.querySelector("input[name='name']");

  setFormControlsDisabled(els.topicForm, !isAdmin() || !category || !subcategory);

  if (!category || !subcategory) {
    topicInput.placeholder = "Zuerst Kategorie und Unterkategorie auswählen";
    els.topicContext.textContent = "Bitte Kategorie und Unterkategorie auswählen.";
    els.topicsList.innerHTML =
      '<li class="lane-empty">Bitte zuerst Kategorie und Unterkategorie anlegen.</li>';
    return;
  }

  topicInput.placeholder = `Neues Thema in "${subcategory.name}"`;
  els.topicContext.textContent = `${category.name} > ${subcategory.name}`;

  if (!subcategory.topics.length) {
    els.topicsList.innerHTML = '<li class="lane-empty">Noch keine Themen vorhanden.</li>';
    return;
  }

  els.topicsList.innerHTML = subcategory.topics
    .map(
      (topic) => `
        <li>
          <div class="lane-row">
            <div class="lane-item topic-item">
              <span class="row-handle">≡</span>
              <span class="lane-item-text">
                <span class="lane-item-title">${escapeHtml(topic.name)}</span>
                <span class="lane-item-meta">${escapeHtml(category.name)} · ${escapeHtml(
                  subcategory.name
                )}</span>
              </span>
            </div>
            ${
              admin
                ? `<div class="lane-actions">
                    <button type="button" class="mini-btn" title="Thema bearbeiten" aria-label="Thema bearbeiten" data-edit-topic="${escapeHtml(
                      topic.id
                    )}">✎</button>
                    <button type="button" class="mini-btn danger" title="Thema löschen" aria-label="Thema löschen" data-delete-topic="${escapeHtml(
                      topic.id
                    )}">✕</button>
                  </div>`
                : ""
            }
          </div>
        </li>
      `
    )
    .join("");
}

function applyProviderTopicTemplate(templateId) {
  if (!templateId) {
    return;
  }
  const topics = getAllTopics();
  if (!topics.length) {
    return;
  }

  const template = PROVIDER_TOPIC_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) {
    return;
  }

  if (template.id === "all") {
    topics.forEach((topic) => providerTopicSelection.add(topic.id));
    return;
  }

  const keywords = template.keywords.map((entry) => normalizeText(entry));
  topics.forEach((topic) => {
    const haystack = normalizeText(`${topic.name} ${topic.subcategoryName} ${topic.categoryName}`);
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      providerTopicSelection.add(topic.id);
    }
  });
}

function handleEditCategory(categoryId) {
  const category = state.categories.find((entry) => entry.id === categoryId);
  if (!category) {
    return;
  }

  const nextName = window.prompt("Kategorie bearbeiten", category.name);
  if (nextName === null) {
    return;
  }

  const name = nextName.trim();
  if (!name) {
    return;
  }

  category.name = name;
  saveState();
  renderAll();
}

async function handleDeleteCategory(categoryId) {
  const categoryIndex = state.categories.findIndex((entry) => entry.id === categoryId);
  if (categoryIndex < 0) {
    return;
  }

  const category = state.categories[categoryIndex];
  const topicIds = collectTopicIdsFromCategory(category);
  const confirmed = await confirmDeleteAction(
    `Kategorie "${category.name}" wirklich löschen? Unterkategorien und Themen werden mitgelöscht.`
  );
  if (!confirmed) {
    return;
  }

  state.categories.splice(categoryIndex, 1);
  removeTopicIdsFromProviders(topicIds);

  if (selectedCategoryId === categoryId) {
    selectedCategoryId = null;
    selectedSubcategoryId = null;
  }

  saveState();
  renderAll();
}

function handleEditSubcategory(subcategoryId) {
  const subcategory = getSelectedCategory()?.subcategories.find((entry) => entry.id === subcategoryId);
  if (!subcategory) {
    return;
  }

  const nextName = window.prompt("Unterkategorie bearbeiten", subcategory.name);
  if (nextName === null) {
    return;
  }

  const name = nextName.trim();
  if (!name) {
    return;
  }

  subcategory.name = name;
  saveState();
  renderAll();
}

async function handleDeleteSubcategory(subcategoryId) {
  const category = getSelectedCategory();
  if (!category) {
    return;
  }

  const subcategoryIndex = category.subcategories.findIndex((entry) => entry.id === subcategoryId);
  if (subcategoryIndex < 0) {
    return;
  }

  const subcategory = category.subcategories[subcategoryIndex];
  const confirmed = await confirmDeleteAction(
    `Unterkategorie "${subcategory.name}" wirklich löschen? Alle Themen darin werden mitgelöscht.`
  );
  if (!confirmed) {
    return;
  }

  const topicIds = subcategory.topics.map((topic) => topic.id);
  category.subcategories.splice(subcategoryIndex, 1);
  removeTopicIdsFromProviders(topicIds);

  if (selectedSubcategoryId === subcategoryId) {
    selectedSubcategoryId = null;
  }

  saveState();
  renderAll();
}

function handleEditTopic(topicId) {
  const subcategory = getSelectedSubcategory();
  if (!subcategory) {
    return;
  }

  const topic = subcategory.topics.find((entry) => entry.id === topicId);
  if (!topic) {
    return;
  }

  const nextName = window.prompt("Thema bearbeiten", topic.name);
  if (nextName === null) {
    return;
  }

  const name = nextName.trim();
  if (!name) {
    return;
  }

  topic.name = name;
  saveState();
  renderAll();
}

async function handleDeleteTopic(topicId) {
  const subcategory = getSelectedSubcategory();
  if (!subcategory) {
    return;
  }

  const topicIndex = subcategory.topics.findIndex((entry) => entry.id === topicId);
  if (topicIndex < 0) {
    return;
  }

  const topic = subcategory.topics[topicIndex];
  const confirmed = await confirmDeleteAction(`Thema "${topic.name}" wirklich löschen?`);
  if (!confirmed) {
    return;
  }

  subcategory.topics.splice(topicIndex, 1);
  removeTopicIdsFromProviders([topicId]);
  saveState();
  renderAll();
}

function setActiveSection(targetId) {
  if (targetId === "parameters-section" && !isAdmin()) {
    targetId = "dashboard-section";
  }
  if (targetId === "users-section") {
    clearUserForm();
    setUsersView("list");
  }
  if (targetId === "providers-section") {
    clearProviderForm();
    setProvidersView("list");
  }
  if (targetId !== "dashboard-section") {
    selectedEmployeeActivityUserId = "";
    closeEmployeeDetailsModal();
  }

  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === targetId);
  });

  els.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetId);
  });

  if (targetId === "dashboard-section") {
    window.setTimeout(() => {
      renderDashboardAdminTabs();
      renderActiveDashboardAdminPanel();
    }, 0);
  }
  if (targetId === "parameters-section") {
    renderMapParameterForm();
  }
}

function setUsersView(mode) {
  usersViewMode = mode === "form" ? "form" : "list";
  const showForm = usersViewMode === "form";
  els.usersListView.classList.toggle("hidden", showForm);
  els.usersFormView.classList.toggle("hidden", !showForm);
  if (els.userCreateBtn) {
    els.userCreateBtn.classList.toggle("hidden", !isAdmin() || showForm);
  }
}

function setProvidersView(mode) {
  providersViewMode = mode === "form" ? "form" : "list";
  const showForm = providersViewMode === "form";
  els.providersListView.classList.toggle("hidden", showForm);
  els.providersFormView.classList.toggle("hidden", !showForm);
  syncProviderHeaderLiveLight();
  if (els.providerCreateBtn) {
    els.providerCreateBtn.classList.toggle("hidden", showForm);
  }
  if (els.providerListSearchField) {
    els.providerListSearchField.classList.toggle("hidden", showForm);
  }
  if (showForm) {
    renderProviderTopicPicker();
    if (els.providerNameInput) {
      window.setTimeout(() => {
        els.providerNameInput.focus({ preventScroll: true });
        els.providerNameInput.select();
      }, 0);
    }
  }
}

function getCurrentUser() {
  if (!authProfile) {
    return null;
  }
  const userId = `profile_${authProfile.user_id}`;
  const normalizedEmail = normalizeUserEmail(authProfile.email || "");
  const userEntry = state.users.find((entry) => entry.id === userId) || null;
  return {
    id: userId,
    name: authProfile.full_name || authProfile.email || "Benutzer",
    email: authProfile.email || "",
    role: authProfile.role || "mitarbeiter",
    territories: getEffectiveUserTerritories(authProfile.user_id, normalizedEmail, userEntry?.territories),
    honorariumRate: getEmployeeRateByUserId(authProfile.user_id),
  };
}

function isAdmin() {
  return getCurrentUser()?.role === "admin";
}

function getCurrentActorInfo() {
  const currentUser = getCurrentUser();
  return {
    userId: authProfile?.user_id || "",
    name: (currentUser?.name || authProfile?.full_name || authProfile?.email || "Unbekannt").trim(),
    role: currentUser?.role === "admin" ? "admin" : "mitarbeiter",
  };
}

async function updateProviderLiveStatus(providerId, shouldBeLive) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return false;
  }
  const normalizedProviderId = String(providerId || "").trim();
  if (!normalizedProviderId) {
    return false;
  }
  const provider = state.providers.find((entry) => entry.id === normalizedProviderId);
  if (!provider) {
    return false;
  }
  if (currentUser.role !== "admin" && !providerVisibleForCurrentUser(provider, currentUser)) {
    return false;
  }

  const nextStatus = shouldBeLive ? "live" : "offen";
  const currentStatus = normalizeProviderStatusValue(provider.status);
  if (currentStatus === nextStatus) {
    return false;
  }

  const wasLive = isLiveStatus(provider.status);
  if (!wasLive && shouldBeLive) {
    const confirmed = await confirmProviderLiveActivation(provider.name || "");
    if (!confirmed) {
      return false;
    }
  }
  const actor = getCurrentActorInfo();
  const nowIso = new Date().toISOString();
  provider.status = nextStatus;
  provider.updatedAt = nowIso;
  provider.updatedByName = actor.name;
  provider.updatedByRole = actor.role;
  provider.updatedByUserId = actor.userId;
  if (!wasLive && shouldBeLive) {
    ensureProviderLiveActivationMetadata(provider, actor, nowIso);
  }
  saveState();
  return true;
}

function getRoleLabel(role) {
  return role === "admin" ? "Admin" : "Mitarbeiter";
}

function getMapLevelLabel(level) {
  if (level === "subcategory") {
    return "Themenbereich";
  }
  if (level === "topic") {
    return "Thema";
  }
  return "Kategorie";
}

function getMapParameters() {
  return normalizeMapParameters(state.settings?.mapParameters || {});
}

function getRadiusKmForLevel(level) {
  const params = getMapParameters();
  if (level === "subcategory") {
    return params.subcategoryRadiusKm;
  }
  if (level === "topic") {
    return params.topicRadiusKm;
  }
  return params.categoryRadiusKm;
}

function normalizeUserEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeTerritoryRecord(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const country = String(entry.country || "").trim();
  const stateLabel = String(entry.state || "").trim();
  if (!country) {
    return null;
  }
  return {
    country,
    state: stateLabel,
  };
}

function normalizeTerritoryList(input) {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set();
  const territories = [];
  input.forEach((entry) => {
    const normalized = normalizeTerritoryRecord(entry);
    if (!normalized) {
      return;
    }
    const key = `${normalizeText(normalized.country)}|${normalizeText(normalized.state)}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    territories.push(normalized);
  });
  return territories;
}

function normalizeUserTerritoriesByEmail(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
    return {};
  }
  const normalized = {};
  Object.entries(rawMap).forEach(([email, territories]) => {
    const normalizedEmail = normalizeUserEmail(email);
    if (!normalizedEmail) {
      return;
    }
    normalized[normalizedEmail] = normalizeTerritoryList(territories);
  });
  return normalized;
}

function normalizeUserTerritoriesByUserId(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
    return {};
  }
  const normalized = {};
  Object.entries(rawMap).forEach(([userId, territories]) => {
    const normalizedUserId = String(userId || "").trim();
    if (!normalizedUserId) {
      return;
    }
    normalized[normalizedUserId] = normalizeTerritoryList(territories);
  });
  return normalized;
}

function getTerritoryLabel(territory) {
  if (!territory) {
    return "";
  }
  return territory.state ? `${territory.country} / ${territory.state}` : `${territory.country} / Ohne Bundesland`;
}

function formatTerritoryList(territories) {
  const list = normalizeTerritoryList(territories);
  if (!list.length) {
    return "";
  }
  const byCountry = new Map();
  list.forEach((entry) => {
    const countryKey = normalizeText(entry.country);
    if (!countryKey) {
      return;
    }
    if (!byCountry.has(countryKey)) {
      byCountry.set(countryKey, {
        country: entry.country,
        allStates: false,
        states: [],
      });
    }
    const target = byCountry.get(countryKey);
    if (!entry.state) {
      target.allStates = true;
      target.states = [];
      return;
    }
    if (target.allStates) {
      return;
    }
    if (!target.states.some((stateEntry) => normalizeText(stateEntry) === normalizeText(entry.state))) {
      target.states.push(entry.state);
    }
  });

  return Array.from(byCountry.values())
    .sort((a, b) => a.country.localeCompare(b.country, "de"))
    .map((entry) => {
      if (entry.allStates || !entry.states.length) {
        return `${entry.country} (alle Bundesländer)`;
      }
      return `${entry.country} (${entry.states.sort((a, b) => a.localeCompare(b, "de")).join(", ")})`;
    })
    .join(" · ");
}

function getAvailableTerritoriesFromProviders() {
  const map = new Map();
  state.providers.forEach((provider) => {
    getProviderEffectiveLocations(provider).forEach((location) => {
      const normalized = normalizeTerritoryRecord({
        country: location.country || "",
        state: location.state || "",
      });
      if (!normalized) {
        return;
      }
      const key = `${normalizeText(normalized.country)}|${normalizeText(normalized.state)}`;
      if (!map.has(key)) {
        map.set(key, normalized);
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => getTerritoryLabel(a).localeCompare(getTerritoryLabel(b), "de"));
}

function getUserTerritoriesByEmail(email) {
  const normalizedEmail = normalizeUserEmail(email);
  const territoryMap = normalizeUserTerritoriesByEmail(state.settings?.userTerritoriesByEmail || {});
  return territoryMap[normalizedEmail] || [];
}

function getUserTerritoriesByUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  const territoryMap = normalizeUserTerritoriesByUserId(state.settings?.userTerritoriesByUserId || {});
  if (!normalizedUserId) {
    return [];
  }
  return territoryMap[normalizedUserId] || [];
}

function getEffectiveUserTerritories(userId, email, fallbackTerritories = []) {
  const fromFallback = normalizeTerritoryList(fallbackTerritories || []);
  if (fromFallback.length) {
    return fromFallback;
  }
  const fromUserId = normalizeTerritoryList(getUserTerritoriesByUserId(userId));
  if (fromUserId.length) {
    return fromUserId;
  }
  return normalizeTerritoryList(getUserTerritoriesByEmail(email));
}

function hasTerritoryAssignmentForUser(userId, email) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedEmail = normalizeUserEmail(email);
  const byUserId = normalizeUserTerritoriesByUserId(state.settings?.userTerritoriesByUserId || {});
  const byEmail = normalizeUserTerritoriesByEmail(state.settings?.userTerritoriesByEmail || {});
  if (normalizedUserId && Object.prototype.hasOwnProperty.call(byUserId, normalizedUserId)) {
    return true;
  }
  if (normalizedEmail && Object.prototype.hasOwnProperty.call(byEmail, normalizedEmail)) {
    return true;
  }
  return false;
}

function hasCurrentUserTerritoryAssignment() {
  if (!authProfile) {
    return false;
  }
  return hasTerritoryAssignmentForUser(authProfile.user_id, authProfile.email);
}

function getAvailableCountriesFromProviders() {
  const providerCountries = getAvailableTerritoriesFromProviders()
    .map((entry) => String(entry.country || "").trim())
    .filter(Boolean);
  return Array.from(new Set(PREDEFINED_TERRITORY_COUNTRIES.concat(providerCountries))).sort((a, b) =>
    a.localeCompare(b, "de")
  );
}

function getAvailableStatesForCountry(country) {
  const normalizedCountry = normalizeText(country);
  if (!normalizedCountry) {
    return [];
  }
  const predefinedStates = getPredefinedStatesForCountry(country);
  const predefinedByKey = new Map(
    predefinedStates.map((stateLabel) => [normalizeText(stateLabel), stateLabel])
  );
  const providerStates = getAvailableTerritoriesFromProviders()
    .filter((entry) => normalizeText(entry.country) === normalizedCountry)
    .map((entry) => String(entry.state || "").trim())
    .filter(Boolean)
    .map((stateLabel) => {
      if (!predefinedStates.length) {
        return stateLabel;
      }
      return predefinedByKey.get(normalizeText(stateLabel)) || "";
    })
    .filter(Boolean);
  return Array.from(new Set(predefinedStates.concat(providerStates))).sort((a, b) => a.localeCompare(b, "de"));
}

function sanitizeUserTerritoryDraft(input) {
  if (!Array.isArray(input)) {
    return [];
  }
  const seenCountries = new Set();
  const sanitized = [];
  input.forEach((entry) => {
    const country = String(entry?.country || "").trim();
    if (!country) {
      return;
    }
    const countryKey = normalizeText(country);
    if (!countryKey || seenCountries.has(countryKey)) {
      return;
    }
    seenCountries.add(countryKey);

    const allStates = Boolean(entry?.allStates);
    const seenStates = new Set();
    const states = Array.isArray(entry?.states)
      ? entry.states
          .map((stateLabel) => String(stateLabel || "").trim())
          .filter(Boolean)
          .filter((stateLabel) => {
            const stateKey = normalizeText(stateLabel);
            if (!stateKey || seenStates.has(stateKey)) {
              return false;
            }
            seenStates.add(stateKey);
            return true;
          })
          .sort((a, b) => a.localeCompare(b, "de"))
      : [];

    sanitized.push({
      country,
      allStates,
      states: allStates ? [] : states,
    });
  });

  return sanitized.sort((a, b) => a.country.localeCompare(b.country, "de"));
}

function buildUserTerritoryDraftFromTerritories(territories) {
  const byCountry = new Map();
  normalizeTerritoryList(territories).forEach((entry) => {
    const country = String(entry.country || "").trim();
    if (!country) {
      return;
    }
    const countryKey = normalizeText(country);
    if (!countryKey) {
      return;
    }
    if (!byCountry.has(countryKey)) {
      byCountry.set(countryKey, {
        country,
        allStates: false,
        states: [],
      });
    }
    const target = byCountry.get(countryKey);
    if (!entry.state) {
      target.allStates = true;
      target.states = [];
      return;
    }
    if (target.allStates) {
      return;
    }
    if (!target.states.some((stateLabel) => normalizeText(stateLabel) === normalizeText(entry.state))) {
      target.states.push(entry.state);
    }
  });

  return sanitizeUserTerritoryDraft(Array.from(byCountry.values()));
}

function addUserTerritoryCountry(countryLabel) {
  const country = String(countryLabel || "").trim();
  if (!country) {
    return;
  }
  const countryKey = normalizeText(country);
  if (!countryKey) {
    return;
  }
  if (userTerritoryDraft.some((entry) => normalizeText(entry.country) === countryKey)) {
    return;
  }
  userTerritoryDraft.push({
    country,
    allStates: true,
    states: [],
  });
  userTerritoryDraft = sanitizeUserTerritoryDraft(userTerritoryDraft);
}

function removeUserTerritoryCountryByIndex(countryIndex) {
  if (!Number.isInteger(countryIndex) || countryIndex < 0 || countryIndex >= userTerritoryDraft.length) {
    return;
  }
  userTerritoryDraft.splice(countryIndex, 1);
  userTerritoryDraft = sanitizeUserTerritoryDraft(userTerritoryDraft);
}

function setUserTerritoryCountryAllState(countryIndex, checked) {
  if (!Number.isInteger(countryIndex) || countryIndex < 0 || countryIndex >= userTerritoryDraft.length) {
    return;
  }
  userTerritoryDraft[countryIndex].allStates = Boolean(checked);
  if (checked) {
    userTerritoryDraft[countryIndex].states = [];
  }
  userTerritoryDraft = sanitizeUserTerritoryDraft(userTerritoryDraft);
}

function setUserTerritoryStateSelection(countryIndex, stateLabel, checked) {
  if (!Number.isInteger(countryIndex) || countryIndex < 0 || countryIndex >= userTerritoryDraft.length) {
    return;
  }
  const stateValue = String(stateLabel || "").trim();
  if (!stateValue) {
    return;
  }
  const target = userTerritoryDraft[countryIndex];
  target.allStates = false;
  target.states = Array.isArray(target.states) ? target.states : [];
  const existingIndex = target.states.findIndex((entry) => normalizeText(entry) === normalizeText(stateValue));
  if (checked) {
    if (existingIndex < 0) {
      target.states.push(stateValue);
    }
  } else if (existingIndex >= 0) {
    target.states.splice(existingIndex, 1);
  }
  target.states.sort((a, b) => a.localeCompare(b, "de"));
  userTerritoryDraft = sanitizeUserTerritoryDraft(userTerritoryDraft);
}

function validateUserTerritoryDraft() {
  const invalidEntry = userTerritoryDraft.find((entry) => !entry.allStates && (!entry.states || !entry.states.length));
  if (!invalidEntry) {
    return { valid: true, message: "" };
  }
  return {
    valid: false,
    message: `Bitte beim Land "${invalidEntry.country}" entweder "Ganzes Land" aktivieren oder mindestens ein Bundesland auswählen.`,
  };
}

function setUserTerritoriesForEmail(email, territories) {
  const normalizedEmail = normalizeUserEmail(email);
  if (!normalizedEmail) {
    return;
  }
  const normalizedTerritories = normalizeTerritoryList(territories);
  const territoryMap = normalizeUserTerritoriesByEmail(state.settings?.userTerritoriesByEmail || {});
  if (!normalizedTerritories.length) {
    delete territoryMap[normalizedEmail];
  } else {
    territoryMap[normalizedEmail] = normalizedTerritories;
  }
  state.settings = normalizeSettings({
    ...state.settings,
    userTerritoriesByEmail: territoryMap,
  });
}

function setUserTerritoriesForUserId(userId, territories) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return;
  }
  const normalizedTerritories = normalizeTerritoryList(territories);
  const territoryMap = normalizeUserTerritoriesByUserId(state.settings?.userTerritoriesByUserId || {});
  if (!normalizedTerritories.length) {
    delete territoryMap[normalizedUserId];
  } else {
    territoryMap[normalizedUserId] = normalizedTerritories;
  }
  state.settings = normalizeSettings({
    ...state.settings,
    userTerritoriesByUserId: territoryMap,
  });
}

function clearUserTerritoriesForEmail(email) {
  const normalizedEmail = normalizeUserEmail(email);
  if (!normalizedEmail) {
    return;
  }
  const territoryMap = normalizeUserTerritoriesByEmail(state.settings?.userTerritoriesByEmail || {});
  if (!Object.prototype.hasOwnProperty.call(territoryMap, normalizedEmail)) {
    return;
  }
  delete territoryMap[normalizedEmail];
  state.settings = normalizeSettings({
    ...state.settings,
    userTerritoriesByEmail: territoryMap,
  });
}

function clearUserTerritoriesForUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return;
  }
  const territoryMap = normalizeUserTerritoriesByUserId(state.settings?.userTerritoriesByUserId || {});
  if (!Object.prototype.hasOwnProperty.call(territoryMap, normalizedUserId)) {
    return;
  }
  delete territoryMap[normalizedUserId];
  state.settings = normalizeSettings({
    ...state.settings,
    userTerritoriesByUserId: territoryMap,
  });
}

function renderUserTerritoryOptions(selectedTerritories = null) {
  if (
    !els.userCountryInput ||
    !els.userCountryDatalist ||
    !els.userSelectedCountries ||
    !els.userCountryStatePanels
  ) {
    return;
  }

  if (selectedTerritories !== null) {
    userTerritoryDraft = buildUserTerritoryDraftFromTerritories(selectedTerritories);
  } else {
    userTerritoryDraft = sanitizeUserTerritoryDraft(userTerritoryDraft);
  }

  const datalistCountries = Array.from(
    new Set(getAvailableCountriesFromProviders().concat(userTerritoryDraft.map((entry) => entry.country)))
  ).sort((a, b) => a.localeCompare(b, "de"));
  els.userCountryDatalist.innerHTML = datalistCountries
    .map((country) => `<option value="${escapeHtml(country)}"></option>`)
    .join("");

  if (!userTerritoryDraft.length) {
    els.userSelectedCountries.innerHTML = '<p class="user-territory-empty">Keine Länder zugeordnet.</p>';
    els.userCountryStatePanels.innerHTML = "";
    return;
  }

  els.userSelectedCountries.innerHTML = userTerritoryDraft
    .map(
      (entry, index) => `
        <span class="user-country-chip">
          <span>${escapeHtml(entry.country)}</span>
          <button
            type="button"
            class="mini-btn danger"
            title="Land entfernen"
            aria-label="Land entfernen"
            data-remove-country-index="${index}"
          >✕</button>
        </span>
      `
    )
    .join("");

  els.userCountryStatePanels.innerHTML = userTerritoryDraft
    .map((entry, countryIndex) => {
      const availableStates = getAvailableStatesForCountry(entry.country);
      const combinedStates = Array.from(new Set(availableStates.concat(entry.states || []))).sort((a, b) =>
        a.localeCompare(b, "de")
      );
      const selectedStateSet = new Set((entry.states || []).map((stateLabel) => normalizeText(stateLabel)));

      return `
        <article class="user-country-state-card">
          <div class="user-country-state-head">
            <h4>${escapeHtml(entry.country)}</h4>
          </div>
          <label class="user-territory-check user-territory-check-all">
            <input
              type="checkbox"
              data-country-all-index="${countryIndex}"
              ${entry.allStates ? "checked" : ""}
            />
            Ganzes Land (alle Bundesländer)
          </label>
          ${
            combinedStates.length
              ? `<div class="user-country-state-list">
                  ${combinedStates
                    .map(
                      (stateLabel) => `
                        <label class="user-territory-check">
                          <input
                            type="checkbox"
                            data-country-state-index="${countryIndex}"
                            data-country-state-label="${escapeHtml(stateLabel)}"
                            ${!entry.allStates && selectedStateSet.has(normalizeText(stateLabel)) ? "checked" : ""}
                            ${entry.allStates ? "disabled" : ""}
                          />
                          ${escapeHtml(stateLabel)}
                        </label>
                      `
                    )
                    .join("")}
                </div>`
              : '<p class="user-territory-empty">Für dieses Land sind derzeit keine Bundesländer hinterlegt.</p>'
          }
        </article>
      `;
    })
    .join("");
}

function getSelectedTerritoriesFromForm() {
  const flattened = [];
  sanitizeUserTerritoryDraft(userTerritoryDraft).forEach((entry) => {
    if (entry.allStates) {
      flattened.push({
        country: entry.country,
        state: "",
      });
      return;
    }
    (entry.states || []).forEach((stateLabel) => {
      flattened.push({
        country: entry.country,
        state: stateLabel,
      });
    });
  });
  return normalizeTerritoryList(flattened);
}

function providerMatchesTerritory(provider, territory) {
  const normalizedTerritory = normalizeTerritoryRecord(territory);
  if (!normalizedTerritory) {
    return false;
  }
  const territoryCountry = normalizeText(normalizedTerritory.country);
  const territoryState = normalizeText(normalizedTerritory.state || "");
  return getProviderEffectiveLocations(provider).some((location) => {
    const locationCountry = normalizeText(location.country || "");
    const locationState = normalizeText(location.state || "");
    if (!locationCountry || locationCountry !== territoryCountry) {
      return false;
    }
    if (!territoryState) {
      return true;
    }
    return locationState === territoryState;
  });
}

function providerMatchesTerritoryList(provider, territories) {
  const normalizedTerritories = normalizeTerritoryList(territories);
  if (!normalizedTerritories.length) {
    return true;
  }
  return normalizedTerritories.some((territory) => providerMatchesTerritory(provider, territory));
}

function getCurrentUserTerritories() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return [];
  }
  return normalizeTerritoryList(currentUser.territories || []);
}

function providerVisibleForCurrentUser(
  provider,
  currentUser = getCurrentUser(),
  countryFilter = platformCountryFilter
) {
  if (!currentUser) {
    return false;
  }
  const isAdminOnlyProvider = isProviderAdminOnly(provider);
  if (currentUser.role !== "admin" && isAdminOnlyProvider) {
    return false;
  }
  if (!hasCurrentUserTerritoryAssignment()) {
    return providerMatchesCountry(provider, countryFilter);
  }
  const territories = normalizeTerritoryList(currentUser.territories || []);
  if (!territories.length) {
    return false;
  }
  if (!providerMatchesTerritoryList(provider, territories)) {
    return false;
  }
  return providerMatchesCountry(provider, countryFilter);
}

function getVisibleProvidersForCurrentUser(countryFilter = platformCountryFilter) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return [];
  }
  return state.providers.filter((provider) => providerVisibleForCurrentUser(provider, currentUser, countryFilter));
}

function sanitizePlatformCountryFilter(value) {
  const normalized = normalizeCountryFilterSelection(value);
  return normalized === "all" ? "all" : normalized || DASHBOARD_DEFAULT_COUNTRY;
}

function normalizeSettings(settings) {
  return {
    platformCountryFilter: sanitizePlatformCountryFilter(
      settings?.platformCountryFilter || DASHBOARD_DEFAULT_COUNTRY
    ),
    dashboardStatusFilter: normalizeDashboardStatusFilter(settings?.dashboardStatusFilter),
    mapParameters: normalizeMapParameters(settings?.mapParameters || {}),
    userTerritoriesByEmail: normalizeUserTerritoriesByEmail(settings?.userTerritoriesByEmail || {}),
    userTerritoriesByUserId: normalizeUserTerritoriesByUserId(settings?.userTerritoriesByUserId || {}),
    employeeRatesByUserId: normalizeEmployeeRatesByUserId(settings?.employeeRatesByUserId || {}),
    employeeHonorariumEnabledByUserId: normalizeEmployeeHonorariumEnabledByUserId(
      settings?.employeeHonorariumEnabledByUserId || {}
    ),
    providerTargetsByCountry: normalizeProviderTargetsByCountry(settings?.providerTargetsByCountry || {}),
  };
}

function normalizeMapParameters(mapParameters) {
  return {
    categoryRadiusKm: sanitizeRadiusValue(mapParameters?.categoryRadiusKm, DEFAULT_MAP_PARAMETERS.categoryRadiusKm),
    subcategoryRadiusKm: sanitizeRadiusValue(
      mapParameters?.subcategoryRadiusKm,
      DEFAULT_MAP_PARAMETERS.subcategoryRadiusKm
    ),
    topicRadiusKm: sanitizeRadiusValue(mapParameters?.topicRadiusKm, DEFAULT_MAP_PARAMETERS.topicRadiusKm),
    stateTopThreshold: sanitizeStateRankingThreshold(
      mapParameters?.stateTopThreshold,
      DEFAULT_MAP_PARAMETERS.stateTopThreshold
    ),
    stateFlopThreshold: sanitizeStateRankingThreshold(
      mapParameters?.stateFlopThreshold,
      DEFAULT_MAP_PARAMETERS.stateFlopThreshold
    ),
  };
}

function sanitizeRadiusValue(value, fallback) {
  const numeric = parseOptionalNumber(value);
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(1, Math.min(500, Math.round(numeric)));
}

function sanitizeStateRankingThreshold(value, fallback) {
  const numeric = parseOptionalNumber(value);
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1000000, Math.round(numeric)));
}

function parseOptionalNumber(value) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) {
    return null;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
}

function formatDateTime(value) {
  if (!value) {
    return "–";
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "–";
  }
  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatAuditStamp(timestamp, role, name) {
  const dateLabel = formatDateTime(timestamp);
  if (dateLabel === "–") {
    return "–";
  }
  return `${dateLabel} · ${getRoleLabel(role)} (${(name || "Unbekannt").trim()})`;
}

function ensureSessionUser() {
  if (authProfile?.user_id) {
    const authUserEntry = state.users.find((entry) => entry.source === "profile" && entry.sourceId === authProfile.user_id);
    if (authUserEntry) {
      state.sessionUserId = authUserEntry.id;
      return;
    }
  }
  if (state.users.length) {
    state.sessionUserId = state.users[0].id;
  } else {
    state.sessionUserId = "";
  }
}

function ensureManagementSelection() {
  if (!state.categories.length) {
    selectedCategoryId = null;
    selectedSubcategoryId = null;
    return;
  }

  const categoryExists = state.categories.some((category) => category.id === selectedCategoryId);
  if (!categoryExists) {
    selectedCategoryId = state.categories[0].id;
  }

  const category = getSelectedCategory();
  if (!category || !category.subcategories.length) {
    selectedSubcategoryId = null;
    return;
  }

  const subcategoryExists = category.subcategories.some(
    (subcategory) => subcategory.id === selectedSubcategoryId
  );
  if (!subcategoryExists) {
    selectedSubcategoryId = category.subcategories[0].id;
  }
}

function getSelectedCategory() {
  if (!selectedCategoryId) {
    return null;
  }
  return state.categories.find((category) => category.id === selectedCategoryId) || null;
}

function getSelectedSubcategory() {
  const category = getSelectedCategory();
  if (!category || !selectedSubcategoryId) {
    return null;
  }
  return category.subcategories.find((subcategory) => subcategory.id === selectedSubcategoryId) || null;
}

function getTotalSubcategoryCount() {
  return state.categories.reduce((count, category) => count + category.subcategories.length, 0);
}

function setFormControlsDisabled(formElement, disabled) {
  formElement.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = disabled;
  });
}

function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getDefaultDashboardCountryFilter(countries = []) {
  const list = Array.isArray(countries) ? countries : [];
  const defaultCountry = list.find(
    (country) => normalizeText(country) === normalizeText(DASHBOARD_DEFAULT_COUNTRY)
  );
  return defaultCountry || "all";
}

function collectTopicIdsFromCategory(category) {
  return category.subcategories.flatMap((subcategory) => subcategory.topics.map((topic) => topic.id));
}

function removeTopicIdsFromProviders(topicIds) {
  if (!topicIds.length) {
    return;
  }

  const idsToRemove = new Set(topicIds);
  state.providers.forEach((provider) => {
    provider.topicIds = (provider.topicIds || []).filter((topicId) => !idsToRemove.has(topicId));
  });
}

function getAllTopics() {
  return state.categories.flatMap((category) =>
    category.subcategories.flatMap((subcategory) =>
      subcategory.topics.map((topic) => ({
        ...topic,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        categoryName: category.name,
        subcategoryName: subcategory.name,
      }))
    )
  );
}

function getTopicById(topicId) {
  return getAllTopics().find((topic) => topic.id === topicId) || null;
}

function normalizeProviderDedupPart(value) {
  return normalizeText(value || "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getProviderRegistryTable() {
  return window.APP_CONFIG?.SUPABASE_PROVIDER_REGISTRY_TABLE || "provider_registry";
}

function buildProviderDedupSignatureFromPayload(providerPayload) {
  if (!providerPayload || typeof providerPayload !== "object") {
    return null;
  }
  const mode = normalizeProviderCoverageMode(providerPayload.coverageMode);
  const normalizedName = normalizeProviderDedupPart(providerPayload.name);
  if (!normalizedName) {
    return null;
  }
  if (mode === PROVIDER_COVERAGE_MODE_BIG_PLAYER) {
    const countryRaw = String(providerPayload.coverageCountry || providerPayload.country || "").trim();
    const country = normalizeProviderDedupPart(countryRaw);
    const strictCountry = country || "__all__";
    return {
      mode,
      normalizedName,
      country,
      key: `name|${normalizedName}|${strictCountry}`,
      locationKey: `big|${normalizedName}|${country}`,
      locationLabel: countryRaw || "ohne Land",
    };
  }

  const primaryLocation = Array.isArray(providerPayload.locations) && providerPayload.locations.length
    ? providerPayload.locations[0]
    : providerPayload;
  const countryRaw = String(primaryLocation?.country || providerPayload.country || "").trim();
  const stateRaw = String(primaryLocation?.state || providerPayload.state || "").trim();
  const cityRaw = String(primaryLocation?.city || providerPayload.city || "").trim();
  const postalRaw = String(primaryLocation?.postalCode || providerPayload.postalCode || "").trim();
  const addressRaw = String(primaryLocation?.address || providerPayload.address || "").trim();
  const country = normalizeProviderDedupPart(countryRaw);
  const state = normalizeProviderDedupPart(stateRaw);
  const city = normalizeProviderDedupPart(cityRaw);
  const postalCode = normalizeProviderDedupPart(postalRaw);
  const address = normalizeProviderDedupPart(addressRaw);
  const strictCountry = country || "__all__";
  return {
    mode,
    normalizedName,
    country,
    key: `name|${normalizedName}|${strictCountry}`,
    locationKey: `loc|${normalizedName}|${country}|${state}|${city}|${postalCode}|${address}`,
    locationLabel: [addressRaw, postalRaw, cityRaw, stateRaw, countryRaw].filter(Boolean).join(", "),
  };
}

function buildProviderDedupSignatureFromProvider(provider) {
  if (!provider || typeof provider !== "object") {
    return null;
  }
  const mode = getProviderCoverageMode(provider);
  const normalizedName = normalizeProviderDedupPart(provider.name);
  if (!normalizedName) {
    return null;
  }
  if (mode === PROVIDER_COVERAGE_MODE_BIG_PLAYER) {
    const countryRaw = String(getProviderCoverageCountry(provider) || "").trim();
    const country = normalizeProviderDedupPart(countryRaw);
    const strictCountry = country || "__all__";
    return {
      mode,
      normalizedName,
      country,
      key: `name|${normalizedName}|${strictCountry}`,
      locationKey: `big|${normalizedName}|${country}`,
      locationLabel: countryRaw || "ohne Land",
    };
  }

  const primaryLocation = getProviderLocations(provider)[0] || provider;
  const countryRaw = String(primaryLocation?.country || "").trim();
  const stateRaw = String(primaryLocation?.state || "").trim();
  const cityRaw = String(primaryLocation?.city || "").trim();
  const postalRaw = String(primaryLocation?.postalCode || "").trim();
  const addressRaw = String(primaryLocation?.address || "").trim();
  const country = normalizeProviderDedupPart(countryRaw);
  const state = normalizeProviderDedupPart(stateRaw);
  const city = normalizeProviderDedupPart(cityRaw);
  const postalCode = normalizeProviderDedupPart(postalRaw);
  const address = normalizeProviderDedupPart(addressRaw);
  const strictCountry = country || "__all__";
  return {
    mode,
    normalizedName,
    country,
    key: `name|${normalizedName}|${strictCountry}`,
    locationKey: `loc|${normalizedName}|${country}|${state}|${city}|${postalCode}|${address}`,
    locationLabel: [addressRaw, postalRaw, cityRaw, stateRaw, countryRaw].filter(Boolean).join(", "),
  };
}

async function fetchLatestProvidersSnapshotFromSupabase() {
  const client = getSupabaseClient();
  if (!client || storageMode !== "supabase") {
    return state.providers.slice();
  }
  try {
    const table = getSupabaseStateTable();
    const { data, error } = await client
      .from(table)
      .select("payload")
      .eq("id", REMOTE_STATE_ROW_ID)
      .maybeSingle();
    if (error || !data?.payload || typeof data.payload !== "object") {
      return state.providers.slice();
    }
    const providers = Array.isArray(data.payload.providers) ? data.payload.providers : [];
    return providers.map((entry) => normalizeProviderRecord(entry)).filter(Boolean);
  } catch (error) {
    return state.providers.slice();
  }
}

function mergeProviderPools(primaryProviders = [], secondaryProviders = []) {
  const merged = new Map();
  [...primaryProviders, ...secondaryProviders].forEach((provider) => {
    const providerId = String(provider?.id || "").trim();
    if (!providerId) {
      return;
    }
    if (!merged.has(providerId)) {
      merged.set(providerId, provider);
    }
  });
  return Array.from(merged.values());
}

function namesLookSimilar(nameA, nameB) {
  const left = String(nameA || "").trim();
  const right = String(nameB || "").trim();
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  if (left.length >= 4 && right.includes(left)) {
    return true;
  }
  if (right.length >= 4 && left.includes(right)) {
    return true;
  }
  return false;
}

async function validateProviderDuplicationBeforeSave(providerPayload, providerId) {
  const currentProviderId = String(providerId || "").trim();
  const targetSignature = buildProviderDedupSignatureFromPayload(providerPayload);
  if (!targetSignature?.key) {
    return { ok: true, signature: targetSignature };
  }

  const remoteProviders = await fetchLatestProvidersSnapshotFromSupabase();
  const providerPool = mergeProviderPools(remoteProviders, state.providers);
  const otherProviders = providerPool.filter((provider) => String(provider?.id || "").trim() !== currentProviderId);
  const strictDuplicate = otherProviders.find((provider) => {
    const signature = buildProviderDedupSignatureFromProvider(provider);
    return signature?.key && signature.key === targetSignature.key;
  });
  if (strictDuplicate) {
    const duplicateName = String(strictDuplicate.name || "Anbieter").trim();
    const duplicateSignature = buildProviderDedupSignatureFromProvider(strictDuplicate);
    const duplicateLocation = duplicateSignature?.locationLabel || getProviderCoverageSummary(strictDuplicate);
    window.alert(
      `Doppelter Anbieter erkannt (Name + Land): "${duplicateName}" (${duplicateLocation || "ohne Standort"}). Speichern wurde gestoppt.`
    );
    return { ok: false, signature: targetSignature };
  }

  const exactLocationDuplicate = otherProviders.find((provider) => {
    const signature = buildProviderDedupSignatureFromProvider(provider);
    return (
      signature?.locationKey &&
      targetSignature.locationKey &&
      signature.locationKey === targetSignature.locationKey
    );
  });
  if (exactLocationDuplicate) {
    const duplicateName = String(exactLocationDuplicate.name || "Anbieter").trim();
    const duplicateSignature = buildProviderDedupSignatureFromProvider(exactLocationDuplicate);
    const duplicateLocation = duplicateSignature?.locationLabel || getProviderCoverageSummary(exactLocationDuplicate);
    window.alert(
      `Doppelter Anbieter erkannt: "${duplicateName}" (${duplicateLocation || "ohne Standort"}). Speichern wurde gestoppt.`
    );
    return { ok: false, signature: targetSignature };
  }

  const similarProviders = otherProviders
    .map((provider) => ({
      provider,
      signature: buildProviderDedupSignatureFromProvider(provider),
    }))
    .filter((entry) => entry.signature?.normalizedName)
    .filter((entry) => namesLookSimilar(targetSignature.normalizedName, entry.signature.normalizedName))
    .filter((entry) => !targetSignature.country || !entry.signature.country || targetSignature.country === entry.signature.country)
    .slice(0, 5);

  if (similarProviders.length) {
    const similarList = similarProviders
      .map((entry) => {
        const nameLabel = String(entry.provider?.name || "Anbieter").trim();
        const locationLabel = entry.signature?.locationLabel || getProviderCoverageSummary(entry.provider);
        return `- ${nameLabel} (${locationLabel || "ohne Standort"})`;
      })
      .join("\n");
    const proceed = window.confirm(
      `Möglicher Doppelanbieter gefunden:\n${similarList}\n\nTrotzdem speichern?`
    );
    if (!proceed) {
      return { ok: false, signature: targetSignature };
    }
  }

  return { ok: true, signature: targetSignature };
}

async function claimProviderRegistryKey(providerId, signature, providerName = "") {
  const normalizedProviderId = String(providerId || "").trim();
  const dedupKey = String(signature?.key || "").trim();
  if (!normalizedProviderId || !dedupKey) {
    return { ok: true };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { ok: true };
  }

  try {
    const table = getProviderRegistryTable();
    const { error } = await client.from(table).upsert(
      {
        provider_id: normalizedProviderId,
        unique_key: dedupKey,
        provider_name: String(providerName || "").trim(),
        coverage_mode: String(signature?.mode || PROVIDER_COVERAGE_MODE_LOCATIONS),
        country: String(signature?.country || ""),
        claimed_by_user_id: authProfile?.user_id || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_id" }
    );
    if (!error) {
      return { ok: true };
    }

    const errorMessage = String(error.message || "").toLowerCase();
    const isMissingTable =
      errorMessage.includes("relation") && errorMessage.includes("provider_registry") && errorMessage.includes("does not exist");
    if (isMissingTable) {
      if (!providerRegistryMissingWarned) {
        providerRegistryMissingWarned = true;
        window.alert(
          'Hinweis: SQL für harte Duplikat-Sperre fehlt noch (Tabelle "provider_registry"). Soft-Prüfung bleibt aktiv.'
        );
      }
      return { ok: true, missingTable: true };
    }

    const isUniqueViolation =
      String(error.code || "") === "23505" || errorMessage.includes("duplicate key value");
    if (isUniqueViolation) {
      return { ok: false, duplicate: true };
    }

    return { ok: false, error };
  } catch (error) {
    return { ok: false, error };
  }
}

async function releaseProviderRegistryKey(providerId) {
  const normalizedProviderId = String(providerId || "").trim();
  if (!normalizedProviderId) {
    return;
  }
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  try {
    const table = getProviderRegistryTable();
    await client.from(table).delete().eq("provider_id", normalizedProviderId);
  } catch (error) {
    // bewusst still: lokale Löschung soll nicht blockiert werden
  }
}

async function initializeAuth() {
  const client = getSupabaseClient();
  if (!client) {
    showAuthGate("Supabase ist nicht konfiguriert. Bitte config.js prüfen.");
    return false;
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      stopRemoteStateSync();
      authSession = null;
      authProfile = null;
      setAppLoadingState(true);
      if (suppressNextSignedOutAuthMessage) {
        suppressNextSignedOutAuthMessage = false;
        return;
      }
      showAuthGate("Bitte melde dich erneut an.");
      return;
    }
    if (event === "SIGNED_IN") {
      authSession = session || null;
    }
  });

  const { data, error } = await client.auth.getSession();
  if (error || !data?.session) {
    return false;
  }

  authSession = data.session;
  await ensureAuthProfile(data.session.user);
  if (!authProfile) {
    return false;
  }
  if (isUserStatusPending(authProfile.status)) {
    suppressNextSignedOutAuthMessage = true;
    showAuthGate("Dein Konto wird gerade geprüft und nach Freigabe durch Admin aktiviert.");
    await client.auth.signOut();
    return false;
  }
  if (!isUserStatusActive(authProfile.status)) {
    showAuthGate("Dein Zugang ist deaktiviert. Bitte Admin kontaktieren.");
    return false;
  }
  return true;
}

function clearLegacyAuthErrorParams() {
  const url = new URL(window.location.href);
  const hadAuthErrorParams =
    url.searchParams.has("error") ||
    url.searchParams.has("error_code") ||
    url.searchParams.has("error_description");

  if (!hadAuthErrorParams) {
    return;
  }

  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  url.searchParams.delete("code");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

async function ensureAuthProfile(user) {
  const client = getSupabaseClient();
  if (!client || !user?.id) {
    return;
  }

  const email = String(user.email || "").trim().toLowerCase();
  const { data: existingProfile, error: fetchError } = await client
    .from("profiles")
    .select("user_id, email, full_name, role, phone, address, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    console.warn("Profil konnte nicht geladen werden.", fetchError);
    return;
  }

  if (existingProfile) {
    authProfile = existingProfile;
    return;
  }

  const fallbackName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (email.includes("@") ? email.split("@")[0] : "Neuer Benutzer");

  const { error: insertError } = await client.from("profiles").insert({
    user_id: user.id,
    email,
    full_name: fallbackName,
    role: "mitarbeiter",
    status: "pending",
  });

  if (insertError) {
    console.warn("Profil konnte nicht erstellt werden.", insertError);
    return;
  }

  const { data: createdProfile } = await client
    .from("profiles")
    .select("user_id, email, full_name, role, phone, address, status")
    .eq("user_id", user.id)
    .maybeSingle();

  authProfile = createdProfile || null;
}

function showAuthGate(message = "") {
  setAppLoadingState(true);
  els.authGate.classList.remove("hidden");
  if (message) {
    els.authMessage.textContent = message;
  }
}

function hideAuthGate() {
  els.authGate.classList.add("hidden");
  els.authMessage.textContent = "";
}

function getFriendlyAuthErrorMessage(error, mode = "signin") {
  const rawMessage = String(error?.message || "").trim();
  const normalizedMessage = normalizeText(rawMessage);

  if (normalizedMessage.includes("invalid login credentials")) {
    return "E-Mail oder Passwort falsch oder Konto noch nicht registriert.";
  }

  if (
    normalizedMessage.includes("database error saving new user") ||
    normalizedMessage.includes("nur eingeladene mitarbeiter durfen sich registrieren")
  ) {
    return "Registrierung serverseitig blockiert. Bitte Admin: Supabase-SQL für offene Registrierung ausführen.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "E-Mail ist noch nicht bestätigt. Bitte Posteingang prüfen.";
  }

  if (!rawMessage) {
    return mode === "signup"
      ? "Konto konnte nicht erstellt werden. Bitte erneut versuchen."
      : "Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
  }

  return rawMessage;
}

async function handleAuthFormSubmit(event) {
  event.preventDefault();
  if (authMode === "signup") {
    await handleSignUp();
    return;
  }
  await handleAuthSubmit();
}

async function handleAuthSubmit() {
  const client = getSupabaseClient();
  if (!client) {
    showAuthGate("Supabase ist nicht erreichbar. Konfiguration prüfen.");
    return;
  }

  const credentials = getAuthCredentials("signin");
  if (!credentials) {
    return;
  }
  const { email, password } = credentials;

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showAuthGate(`Anmeldung fehlgeschlagen: ${getFriendlyAuthErrorMessage(error, "signin")}`);
    return;
  }

  showAuthGate("Anmeldung erfolgreich. Seite wird geladen...");
  await activateSignedInSession(data?.session || null);
}

async function handleSignUp() {
  const client = getSupabaseClient();
  if (!client) {
    showAuthGate("Supabase ist nicht erreichbar. Konfiguration prüfen.");
    return;
  }

  const credentials = getAuthCredentials("signup");
  if (!credentials) {
    return;
  }
  const { fullName, email, password } = credentials;

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        name: fullName,
      },
    },
  });

  if (error) {
    showAuthGate(`Konto konnte nicht erstellt werden: ${getFriendlyAuthErrorMessage(error, "signup")}`);
    return;
  }

  if (data.session) {
    await ensureAuthProfile(data.session.user || data.user);
    if (authProfile && isUserStatusPending(authProfile.status)) {
      suppressNextSignedOutAuthMessage = true;
      await client.auth.signOut();
      setAuthMode("signin", { preserveMessage: true });
      showAuthGate("Konto erstellt. Dein Zugang wird nach Prüfung durch Admin freigeschaltet.");
      return;
    }
    if (authProfile && !isUserStatusActive(authProfile.status)) {
      suppressNextSignedOutAuthMessage = true;
      await client.auth.signOut();
      setAuthMode("signin", { preserveMessage: true });
      showAuthGate("Konto erstellt, aber noch nicht aktiv. Bitte Admin kontaktieren.");
      return;
    }
    showAuthGate("Konto erstellt und angemeldet. Seite wird geladen...");
    await activateSignedInSession(data.session);
    return;
  }

  setAuthMode("signin", { preserveMessage: true });
  showAuthGate("Konto erstellt. Dein Zugang wird nach Prüfung durch Admin freigeschaltet.");
}

function getAuthCredentials(mode = "signin") {
  const signInMode = mode !== "signup";
  const fullName = String(els.authSignUpFullName?.value || "").trim();
  const email = String(
    signInMode ? els.authSignInEmail?.value || "" : els.authSignUpEmail?.value || ""
  )
    .trim()
    .toLowerCase();
  const password = String(
    signInMode ? els.authSignInPassword?.value || "" : els.authSignUpPassword?.value || ""
  );
  if (mode === "signup" && fullName.length < 2) {
    showAuthGate("Bitte Name eingeben.");
    return null;
  }
  if (!email || !email.includes("@")) {
    showAuthGate("Bitte eine gültige E-Mail eingeben.");
    return null;
  }
  if (password.length < 8) {
    showAuthGate("Bitte ein Passwort mit mindestens 8 Zeichen verwenden.");
    return null;
  }
  return { fullName, email, password };
}

async function handleSignOut() {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  stopRemoteStateSync();
  setAppLoadingState(true);
  await client.auth.signOut();
  authSession = null;
  authProfile = null;
  setAuthMode("signin", { preserveMessage: true });
  showAuthGate("Bitte melde dich an.");
}

async function activateSignedInSession(session) {
  setAppLoadingState(true);
  authSession = session || authSession;
  const client = getSupabaseClient();
  if (!client) {
    showAuthGate("Supabase ist nicht erreichbar. Konfiguration prüfen.");
    return;
  }

  if (!authSession) {
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session) {
      showAuthGate("Session konnte nicht geladen werden. Bitte erneut anmelden.");
      return;
    }
    authSession = data.session;
  }

  await ensureAuthProfile(authSession.user);
  if (!authProfile) {
    showAuthGate("Benutzerprofil fehlt oder konnte nicht geladen werden.");
    return;
  }

  if (isUserStatusPending(authProfile.status)) {
    suppressNextSignedOutAuthMessage = true;
    await client.auth.signOut();
    showAuthGate("Dein Konto wird gerade geprüft und nach Freigabe durch Admin aktiviert.");
    return;
  }

  if (!isUserStatusActive(authProfile.status)) {
    showAuthGate("Dein Zugang ist deaktiviert. Bitte Admin kontaktieren.");
    return;
  }

  await bootstrapAfterAuth();
  hideAuthGate();
}

async function syncUsersFromSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    state.users = [];
    return;
  }

  const shouldLoadInvites = authProfile?.role === "admin";
  const inviteQuery = shouldLoadInvites
    ? client
        .from("employee_invites")
        .select("id, email, full_name, role, phone, address, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const [profilesResult, invitesResult] = await Promise.all([
    client
      .from("profiles")
      .select("user_id, email, full_name, role, phone, address, status, created_at")
      .order("created_at", { ascending: true }),
    inviteQuery,
  ]);

  if (profilesResult.error) {
    console.warn("Profiles konnten nicht geladen werden.", profilesResult.error);
  }
  if (invitesResult.error) {
    console.warn("Invites konnten nicht geladen werden.", invitesResult.error);
  }

  const profileRows = profilesResult.data || [];
  if (authProfile?.user_id) {
    const freshAuthProfile = profileRows.find((entry) => entry.user_id === authProfile.user_id);
    if (freshAuthProfile) {
      authProfile = freshAuthProfile;
    }
  }

  const profileUsers = profileRows.map((profile) => ({
    id: `profile_${profile.user_id}`,
    source: "profile",
    sourceId: profile.user_id,
    name: profile.full_name || profile.email || "Benutzer",
    address: profile.address || "",
    email: profile.email || "",
    phone: profile.phone || "",
    role: profile.role || "mitarbeiter",
    status: normalizeUserStatus(profile.status),
    statusLabel: getUserStatusLabel(profile.status, "profile"),
    territories: getEffectiveUserTerritories(profile.user_id, profile.email),
    honorariumRate: getEmployeeRateByUserId(profile.user_id),
  }));

  const inviteUsers = (invitesResult.data || []).map((invite) => ({
    id: `invite_${invite.id}`,
    source: "invite",
    sourceId: invite.id,
    name: invite.full_name || invite.email || "Einladung",
    address: invite.address || "",
    email: invite.email || "",
    phone: invite.phone || "",
    role: invite.role || "mitarbeiter",
    status: invite.status || "pending",
    statusLabel: getUserStatusLabel(invite.status || "pending", "invite"),
    territories: getEffectiveUserTerritories("", invite.email),
    honorariumRate: 0,
  }));

  state.users = [...profileUsers, ...inviteUsers];
}

function applyEmployeeHonorariumFromPayload(userId, userPayload) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return;
  }
  const enabled = !!userPayload?.honorariumEnabled;
  setEmployeeHonorariumEnabledByUserId(normalizedUserId, enabled);
  if (enabled) {
    setEmployeeRateByUserId(normalizedUserId, userPayload?.honorariumRate);
  }
}

async function saveEmployeeRecord(userPayload, selectedUser) {
  const client = getSupabaseClient();
  if (!client) {
    window.alert("Supabase Verbindung fehlt.");
    return false;
  }

  const normalizedEmail = String(userPayload.email || "").trim().toLowerCase();
  const normalizedTerritories = normalizeTerritoryList(userPayload.territories || []);
  const previousEmail = normalizeUserEmail(selectedUser?.email || "");
  const selectedUserId =
    selectedUser?.source === "profile"
      ? String(selectedUser?.sourceId || "").trim()
      : "";
  const persistTerritories = (email, userIdOverride = "") => {
    const targetEmail = normalizeUserEmail(email);
    if (!targetEmail) {
      return;
    }
    setUserTerritoriesForEmail(targetEmail, normalizedTerritories);
    const targetUserId = String(userIdOverride || selectedUserId).trim();
    if (targetUserId) {
      setUserTerritoriesForUserId(targetUserId, normalizedTerritories);
    }
    if (previousEmail && previousEmail !== targetEmail) {
      clearUserTerritoriesForEmail(previousEmail);
    }
    saveState();
  };
  const basePayload = {
    full_name: userPayload.name,
    address: userPayload.address,
    phone: userPayload.phone,
    role: userPayload.role,
  };

  if (selectedUser?.source === "profile") {
    const { error } = await client.from("profiles").update(basePayload).eq("user_id", selectedUser.sourceId);
    if (error) {
      window.alert("Mitarbeiter konnte nicht aktualisiert werden.");
      return false;
    }
    applyEmployeeHonorariumFromPayload(selectedUser.sourceId, userPayload);
    persistTerritories(normalizedEmail);
    return true;
  }

  if (selectedUser?.source === "invite") {
    const { error } = await client
      .from("employee_invites")
      .update({ ...basePayload, email: normalizedEmail })
      .eq("id", selectedUser.sourceId);
    if (error) {
      window.alert("Einladung konnte nicht aktualisiert werden.");
      return false;
    }
    persistTerritories(normalizedEmail);
    return true;
  }

  const { data: existingProfile } = await client
    .from("profiles")
    .select("user_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile?.user_id) {
    const { error } = await client
      .from("profiles")
      .update(basePayload)
      .eq("user_id", existingProfile.user_id);
    if (error) {
      window.alert("Bestehender Mitarbeiter konnte nicht aktualisiert werden.");
      return false;
    }
    applyEmployeeHonorariumFromPayload(existingProfile.user_id, userPayload);
    persistTerritories(normalizedEmail, existingProfile.user_id);
    return true;
  }

  const invitePayload = {
    email: normalizedEmail,
    ...basePayload,
    status: "pending",
    invited_by: authProfile?.user_id || null,
  };

  const { error: inviteError } = await client
    .from("employee_invites")
    .upsert(invitePayload, { onConflict: "email" });

  if (inviteError) {
    window.alert("Einladung konnte nicht gespeichert werden.");
    return false;
  }
  persistTerritories(normalizedEmail);
  window.alert("Einladung gespeichert. Mitarbeiter kann jetzt mit E-Mail + Passwort ein Konto erstellen.");
  return true;
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function normalizePersistedState(parsed) {
  const normalizedProviders = Array.isArray(parsed.providers)
    ? parsed.providers
        .map((provider) => normalizeProviderRecord(provider))
        .filter(Boolean)
    : [];

  return {
    sessionUserId: parsed.sessionUserId || defaultState.sessionUserId,
    users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : defaultState.users,
    providers: normalizedProviders,
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    settings: normalizeSettings(parsed.settings || {}),
  };
}

function normalizeProviderRecord(provider) {
  if (!provider || typeof provider !== "object") {
    return null;
  }
  const normalizedAdminOnly = isProviderAdminOnly(provider);
  const normalizedOnlineOnly = isProviderOnlineOnly(provider);

  const normalizedProvider = {
    ...provider,
    topicIds: Array.isArray(provider.topicIds) ? provider.topicIds.filter(Boolean) : [],
    locations: normalizeProviderLocations(provider.locations, provider),
    coverageMode: normalizeProviderCoverageMode(provider.coverageMode || provider.coverage_mode),
    coverageCountry: String(provider.coverageCountry || provider.coverage_country || "").trim(),
    coverageStates: normalizeProviderCoverageStates(provider.coverageStates || provider.coverage_states || []),
    adminOnly: normalizedAdminOnly,
    admin_only: normalizedAdminOnly,
    onlineOnly: normalizedOnlineOnly,
    online_only: normalizedOnlineOnly,
    notes: normalizeProviderNotes(provider.notes || []),
    latitude: parseOptionalNumber(provider.latitude),
    longitude: parseOptionalNumber(provider.longitude),
    createdAt: provider.createdAt || "",
    createdByName: provider.createdByName || "",
    createdByRole: provider.createdByRole || "",
    createdByUserId: provider.createdByUserId || "",
    updatedAt: provider.updatedAt || "",
    updatedByName: provider.updatedByName || "",
    updatedByRole: provider.updatedByRole || "",
    updatedByUserId: provider.updatedByUserId || "",
    liveAt: provider.liveAt || "",
    liveByName: provider.liveByName || "",
    liveByRole: provider.liveByRole || "",
    liveByUserId: provider.liveByUserId || "",
  };
  if (isLiveStatus(normalizedProvider.status)) {
    if (!normalizedProvider.liveAt) {
      normalizedProvider.liveAt = normalizedProvider.updatedAt || normalizedProvider.createdAt || "";
    }
    if (!normalizedProvider.liveByUserId) {
      normalizedProvider.liveByUserId =
        normalizedProvider.updatedByUserId || normalizedProvider.createdByUserId || "";
    }
    if (!normalizedProvider.liveByName) {
      normalizedProvider.liveByName = normalizedProvider.updatedByName || normalizedProvider.createdByName || "";
    }
    if (!normalizedProvider.liveByRole) {
      normalizedProvider.liveByRole = normalizedProvider.updatedByRole || normalizedProvider.createdByRole || "";
    }
  }
  if (isBigPlayerProvider(normalizedProvider) && !normalizedProvider.coverageCountry) {
    normalizedProvider.coverageCountry = String(normalizedProvider.country || "").trim();
  }
  normalizedProvider.coverageStates = normalizeProviderCoverageStatesForCountry(
    normalizedProvider.coverageStates || [],
    normalizedProvider.coverageCountry
  );
  syncProviderPrimaryLocationFields(normalizedProvider);
  return normalizedProvider;
}

function loadLocalStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneDefaultState();
    }
    return normalizePersistedState(JSON.parse(raw));
  } catch (error) {
    return cloneDefaultState();
  }
}

async function hydrateState() {
  state = loadLocalStateFromStorage();

  const client = getSupabaseClient();
  if (!client) {
    storageMode = "local";
    return;
  }

  try {
    const table = getSupabaseStateTable();
    const { data, error } = await client
      .from(table)
      .select("payload")
      .eq("id", REMOTE_STATE_ROW_ID)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.payload && typeof data.payload === "object") {
      state = normalizePersistedState(data.payload);
      storageMode = "supabase";
      persistLocalBackup();
      lastRemotePayloadFingerprint = JSON.stringify(state);
      return;
    }

    storageMode = "supabase";
    await persistStateToSupabase(state);
  } catch (error) {
    storageMode = "local";
    console.warn("Supabase nicht erreichbar, nutze lokalen Speicher.", error);
  }
}

function startRemoteStateSync() {
  stopRemoteStateSync();
  if (storageMode !== "supabase") {
    return;
  }
  pullRemoteStateIfChanged();
  remoteSyncIntervalId = window.setInterval(() => {
    pullRemoteStateIfChanged();
  }, REMOTE_SYNC_INTERVAL_MS);
}

function stopRemoteStateSync() {
  if (!remoteSyncIntervalId) {
    return;
  }
  window.clearInterval(remoteSyncIntervalId);
  remoteSyncIntervalId = null;
}

async function pullRemoteStateIfChanged() {
  if (storageMode !== "supabase") {
    return;
  }
  if (remoteStatePullInFlight || remoteStatePushInFlight || remoteSaveTimeoutId) {
    return;
  }
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  remoteStatePullInFlight = true;
  try {
    const table = getSupabaseStateTable();
    const { data, error } = await client
      .from(table)
      .select("payload")
      .eq("id", REMOTE_STATE_ROW_ID)
      .maybeSingle();

    if (error || !data?.payload || typeof data.payload !== "object") {
      return;
    }

    const normalizedRemoteState = normalizePersistedState(data.payload);
    const remoteFingerprint = JSON.stringify(normalizedRemoteState);
    if (remoteFingerprint === lastRemotePayloadFingerprint) {
      return;
    }

    state = normalizedRemoteState;
    lastRemotePayloadFingerprint = remoteFingerprint;
    persistLocalBackup();
    ensureSessionUser();
    ensureManagementSelection();
    renderAll();
  } catch (error) {
    console.warn("Supabase Sync fehlgeschlagen, lokale Daten bleiben aktiv.", error);
  } finally {
    remoteStatePullInFlight = false;
  }
}

function getSupabaseStateTable() {
  return window.APP_CONFIG?.SUPABASE_STATE_TABLE || "app_state";
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || "";
  const supabaseAnonKey = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey || !window.supabase?.createClient) {
    return null;
  }

  try {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "vertriebsmanager_auth",
      },
    });
    return supabaseClient;
  } catch (error) {
    console.warn("Supabase Client konnte nicht erstellt werden.", error);
    return null;
  }
}

function persistLocalBackup() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function queueRemoteStateSave() {
  const payloadFingerprint = JSON.stringify(state);
  if (payloadFingerprint === lastRemotePayloadFingerprint) {
    return;
  }

  if (remoteSaveTimeoutId) {
    window.clearTimeout(remoteSaveTimeoutId);
  }

  remoteSaveTimeoutId = window.setTimeout(() => {
    remoteSaveTimeoutId = null;
    persistStateToSupabase(JSON.parse(payloadFingerprint), payloadFingerprint);
  }, REMOTE_SAVE_DEBOUNCE_MS);
}

async function persistStateToSupabase(snapshot, payloadFingerprint = "") {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  remoteStatePushInFlight = true;
  try {
    const table = getSupabaseStateTable();
    const currentUser = getCurrentUser();
    let snapshotForSave = normalizePersistedState(snapshot || {});

    if (currentUser && currentUser.role !== "admin") {
      const { data: remoteData, error: remoteReadError } = await client
        .from(table)
        .select("payload")
        .eq("id", REMOTE_STATE_ROW_ID)
        .maybeSingle();
      if (!remoteReadError && remoteData?.payload && typeof remoteData.payload === "object") {
        const remoteState = normalizePersistedState(remoteData.payload);
        snapshotForSave = normalizePersistedState({
          ...snapshotForSave,
          users: remoteState.users,
          categories: remoteState.categories,
          settings: remoteState.settings,
        });
      }
    }

    const { error } = await client.from(table).upsert(
      {
        id: REMOTE_STATE_ROW_ID,
        payload: snapshotForSave,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.warn("Supabase Save fehlgeschlagen, lokale Daten bleiben erhalten.", error);
      return;
    }

    lastRemotePayloadFingerprint = payloadFingerprint || JSON.stringify(snapshotForSave);
  } catch (error) {
    console.warn("Supabase Save Ausnahme, lokale Daten bleiben erhalten.", error);
  } finally {
    remoteStatePushInFlight = false;
  }
}

function saveState() {
  persistLocalBackup();
  if (storageMode === "supabase") {
    queueRemoteStateSave();
  }
}

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
