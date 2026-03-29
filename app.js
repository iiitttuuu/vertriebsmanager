const STORAGE_KEY = "vertriebsmanager_state_v1";
const REMOTE_STATE_ROW_ID = "main";
const REMOTE_SAVE_DEBOUNCE_MS = 450;
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
const DEFAULT_MAP_PARAMETERS = {
  categoryRadiusKm: 20,
  subcategoryRadiusKm: 20,
  topicRadiusKm: 20,
};
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
    mapParameters: { ...DEFAULT_MAP_PARAMETERS },
  },
};

let state = cloneDefaultState();
let editingUserId = null;
let editingProviderId = null;
let usersViewMode = "list";
let providersViewMode = "list";
let selectedCategoryId = null;
let selectedSubcategoryId = null;
let providerTopicSelection = new Set();
let addressSearchDebounceId = null;
let currentAddressSuggestions = [];
let googleMapsReady = false;
let googleAutocompleteService = null;
let googlePlacesService = null;
let googleGeocoder = null;
let googleSessionToken = null;
let addressPredictionRequestId = 0;
let googlePlacesLoadError = "";
let dashboardMap = null;
let dashboardMapMarkers = [];
let dashboardMapCircles = [];
let dashboardMapInfoWindows = [];
let providerGeocodeInFlight = new Set();
let mapCountryFilter = "all";
let mapLevelFilter = "category";
let mapItemFilter = "all";
let supabaseClient = null;
let storageMode = "local";
let remoteSaveTimeoutId = null;
let lastRemotePayloadFingerprint = "";
let authSession = null;
let authProfile = null;
let boundEvents = false;

const els = {
  authGate: document.getElementById("auth-gate"),
  authForm: document.getElementById("auth-form"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authSignInBtn: document.getElementById("auth-signin-btn"),
  authSignUpBtn: document.getElementById("auth-signup-btn"),
  authMessage: document.getElementById("auth-message"),
  currentUserLabel: document.getElementById("current-user-label"),
  signOutBtn: document.getElementById("sign-out-btn"),
  roleBadge: document.getElementById("role-badge"),
  navButtons: document.querySelectorAll(".nav-btn"),
  panels: document.querySelectorAll(".panel"),
  adminOnlyNav: document.querySelectorAll(".admin-only"),
  userCreateBtn: document.getElementById("user-create-btn"),
  userCancelBtn: document.getElementById("user-cancel-btn"),
  usersListView: document.getElementById("users-list-view"),
  usersFormView: document.getElementById("users-form-view"),
  userForm: document.getElementById("user-form"),
  usersTableBody: document.getElementById("users-table-body"),
  userSaveBtn: document.getElementById("user-save-btn"),
  providerCreateBtn: document.getElementById("provider-create-btn"),
  providersListView: document.getElementById("providers-list-view"),
  providersFormView: document.getElementById("providers-form-view"),
  providerForm: document.getElementById("provider-form"),
  providerAddressInput: document.getElementById("provider-address-input"),
  providerAddressSuggestions: document.getElementById("provider-address-suggestions"),
  providerLatitudeInput: document.getElementById("provider-latitude-input"),
  providerLongitudeInput: document.getElementById("provider-longitude-input"),
  providerTopicTemplate: document.getElementById("provider-topic-template"),
  providerTemplateApply: document.getElementById("provider-template-apply"),
  providerTopicClear: document.getElementById("provider-topic-clear"),
  providerTopicSearch: document.getElementById("provider-topic-search"),
  providerTopicResults: document.getElementById("provider-topic-results"),
  providerTopicChips: document.getElementById("provider-topic-chips"),
  providersTableBody: document.getElementById("providers-table-body"),
  providerSaveBtn: document.getElementById("provider-save-btn"),
  providerResetBtn: document.getElementById("provider-reset-btn"),
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
  mapParamsForm: document.getElementById("map-params-form"),
  paramRadiusCategory: document.getElementById("param-radius-category"),
  paramRadiusSubcategory: document.getElementById("param-radius-subcategory"),
  paramRadiusTopic: document.getElementById("param-radius-topic"),
};

initialize();

async function initialize() {
  clearLegacyAuthErrorParams();
  const authReady = await initializeAuth();
  bindEvents();
  if (!authReady) {
    showAuthGate("Bitte melde dich an.");
    return;
  }
  hideAuthGate();
  await bootstrapAfterAuth();
}

async function bootstrapAfterAuth() {
  await hydrateState();
  await syncUsersFromSupabase();
  ensureSessionUser();
  ensureManagementSelection();
  initGooglePlaces();
  setUsersView("list");
  setProvidersView("list");
  renderAll();
}

function bindEvents() {
  if (boundEvents) {
    return;
  }
  boundEvents = true;

  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.authSignUpBtn.addEventListener("click", handleSignUp);
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

  els.userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isAdmin()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const userPayload = {
      name: formData.get("name").toString().trim(),
      address: formData.get("address").toString().trim(),
      email: (formData.get("email") ?? els.userForm.elements.email.value).toString().trim(),
      phone: formData.get("phone").toString().trim(),
      role: formData.get("role").toString(),
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

  els.providerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isAdmin()) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const selectedTopics = Array.from(providerTopicSelection);

    const providerPayload = {
      name: formData.get("name").toString().trim(),
      address: formData.get("address").toString().trim(),
      postalCode: formData.get("postalCode").toString().trim(),
      city: formData.get("city").toString().trim(),
      country: formData.get("country").toString().trim(),
      state: formData.get("state").toString().trim(),
      website: formData.get("website").toString().trim(),
      email: formData.get("email").toString().trim(),
      phone: formData.get("phone").toString().trim(),
      status: formData.get("status").toString(),
      topicIds: selectedTopics,
      latitude: parseOptionalNumber(formData.get("latitude")),
      longitude: parseOptionalNumber(formData.get("longitude")),
    };

    if (
      !providerPayload.name ||
      !providerPayload.address ||
      !providerPayload.postalCode ||
      !providerPayload.city ||
      !providerPayload.country ||
      !providerPayload.state ||
      !providerPayload.email ||
      !providerPayload.phone
    ) {
      return;
    }

    const actor = getCurrentActorInfo();
    const nowIso = new Date().toISOString();

    if (editingProviderId) {
      const provider = state.providers.find((entry) => entry.id === editingProviderId);
      if (provider) {
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
      }
    } else {
      state.providers.push({
        id: createId("p"),
        ...providerPayload,
        createdAt: nowIso,
        createdByName: actor.name,
        createdByRole: actor.role,
        createdByUserId: actor.userId,
        updatedAt: nowIso,
        updatedByName: actor.name,
        updatedByRole: actor.role,
        updatedByUserId: actor.userId,
      });
    }

    saveState();
    clearProviderForm();
    setProvidersView("list");
    clearAddressSuggestions();
    renderAll();
  });

  els.providerCreateBtn.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    clearProviderForm();
    setProvidersView("form");
  });

  els.providerResetBtn.addEventListener("click", () => {
    clearProviderForm();
    setProvidersView("list");
  });

  els.providerAddressInput.addEventListener("input", () => {
    clearProviderCoordinates();
    queueAddressSuggestionSearch();
  });

  els.providerAddressInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      clearAddressSuggestions();
    }, 150);
  });

  els.providerAddressSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-address-index]");
    if (!button || !isAdmin()) {
      return;
    }
    const index = Number(button.dataset.addressIndex);
    applyAddressSuggestion(index);
  });

  els.providerTopicSearch.addEventListener("input", () => {
    renderProviderTopicPicker();
  });

  els.providerTopicResults.addEventListener("click", (event) => {
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

  els.providerTemplateApply.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    applyProviderTopicTemplate(els.providerTopicTemplate.value);
    renderProviderTopicPicker();
  });

  els.providerTopicClear.addEventListener("click", () => {
    if (!isAdmin()) {
      return;
    }
    providerTopicSelection.clear();
    renderProviderTopicPicker();
  });

  els.mapCountrySelect?.addEventListener("change", () => {
    mapCountryFilter = els.mapCountrySelect.value || "all";
    renderDashboardMap();
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
      },
    });

    saveState();
    renderMapParameterForm();
    renderDashboardMap();
    window.alert("Parameter gespeichert.");
  });

  els.providersTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-edit-provider]");
    if (!button || !isAdmin()) {
      return;
    }

    const providerId = button.dataset.editProvider;
    const provider = state.providers.find((entry) => entry.id === providerId);
    if (!provider) {
      return;
    }

    editingProviderId = provider.id;
    fillProviderForm(provider);
    els.providerSaveBtn.textContent = "Aktualisieren";
    setProvidersView("form");
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
      handleDeleteCategory(deleteButton.dataset.deleteCategory);
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
      handleDeleteSubcategory(deleteButton.dataset.deleteSubcategory);
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
      handleDeleteTopic(deleteButton.dataset.deleteTopic);
    }
  });
}

function renderAll() {
  ensureManagementSelection();
  renderUserSwitch();
  renderRoleState();
  renderDashboardStats();
  renderMapParameterForm();
  renderDashboardMap();
  renderUsersTable();
  renderManagementSummary();
  renderCategoryList();
  renderSubcategoriesList();
  renderTopicsList();
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

  els.currentUserLabel.textContent = `${activeUser.name} (${activeUser.email})`;
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
    els.providerCreateBtn.classList.toggle("hidden", !admin || providersViewMode === "form");
  }

  document.querySelectorAll(".admin-lock").forEach((container) => {
    const controls = container.querySelectorAll("input, select, button");
    controls.forEach((control) => {
      control.disabled = !admin;
    });
  });

  if (!admin) {
    setUsersView("list");
    setProvidersView("list");
    const currentPanel = document.querySelector(".panel.active");
    if (
      currentPanel?.id === "users-section" ||
      currentPanel?.id === "management-section" ||
      currentPanel?.id === "parameters-section"
    ) {
      setActiveSection("dashboard-section");
    }
  }
}

function renderDashboardStats() {
  const activeUsers = state.users.filter((entry) => entry.source === "profile" && entry.status !== "inactive").length;
  els.statUsers.textContent = String(activeUsers);
  els.statProviders.textContent = String(state.providers.length);
  els.statTopics.textContent = String(getAllTopics().length);
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
}

function renderDashboardMap() {
  if (!els.dashboardMapPanel || !els.dashboardMapCanvas) {
    return;
  }
  if (!isAdmin()) {
    els.dashboardMapPanel.classList.add("hidden");
    return;
  }
  els.dashboardMapPanel.classList.remove("hidden");

  renderDashboardMapControls();
  const radiusKm = getRadiusKmForLevel(mapLevelFilter);
  if (els.mapRadiusInfo) {
    els.mapRadiusInfo.textContent = `Treffer-Umkreis: ${radiusKm} km (${getMapLevelLabel(mapLevelFilter)})`;
  }

  if (!isSectionActive("dashboard-section")) {
    return;
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
  const countryProviders = state.providers.filter((provider) =>
    providerMatchesCountry(provider, mapCountryFilter)
  );
  queueProviderGeocoding(countryProviders);
  const countryProvidersWithCoords = countryProviders.filter((provider) => !!getProviderCoordinates(provider));

  const hits = countryProvidersWithCoords
    .map((provider) => {
      const coords = getProviderCoordinates(provider);
      if (!coords) {
        return null;
      }
      const groups = getProviderGroupsForLevel(provider, mapLevelFilter, topicLookup);
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
        provider,
        coords,
        groups: relevantGroups,
        colorGroup: mapItemFilter === "all" ? relevantGroups[0] : relevantGroups[0],
      };
    })
    .filter(Boolean);

  if (!hits.length) {
    if (!countryProviders.length) {
      showDashboardMapEmpty("Für das gewählte Land gibt es noch keine Anbieter.");
      return;
    }
    if (!countryProvidersWithCoords.length) {
      const pendingCount = providerGeocodeInFlight.size;
      showDashboardMapEmpty(
        pendingCount
          ? `Koordinaten werden automatisch ermittelt (${pendingCount} offen). Bitte 5-15 Sekunden warten.`
          : "Keine Koordinaten vorhanden. Bitte Anbieteradresse über Google-Vorschlag auswählen und speichern."
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
          <span>${escapeHtml(hit.provider.city || "")}, ${escapeHtml(hit.provider.country || "")}</span><br/>
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

  const countries = Array.from(
    new Set(
      state.providers
        .map((provider) => String(provider.country || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "de"));

  const countryOptions = ['<option value="all">Alle Länder</option>']
    .concat(
      countries.map(
        (country) =>
          `<option value="${escapeHtml(country)}">${escapeHtml(truncateSelectLabel(country))}</option>`
      )
    )
    .join("");
  els.mapCountrySelect.innerHTML = countryOptions;
  if (!countries.includes(mapCountryFilter)) {
    mapCountryFilter = "all";
  }
  els.mapCountrySelect.value = mapCountryFilter;

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

function providerMatchesCountry(provider, country) {
  if (!country || country === "all") {
    return true;
  }
  return normalizeText(provider.country || "") === normalizeText(country);
}

function getProviderCoordinates(provider) {
  const latitude = parseOptionalNumber(provider.latitude);
  const longitude = parseOptionalNumber(provider.longitude);
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { lat: latitude, lng: longitude };
}

function queueProviderGeocoding(providers) {
  if (!googleGeocoder || !Array.isArray(providers) || !providers.length) {
    return;
  }

  const maxConcurrent = 4;
  const openSlots = Math.max(0, maxConcurrent - providerGeocodeInFlight.size);
  if (!openSlots) {
    return;
  }

  const candidates = providers
    .filter((provider) => !getProviderCoordinates(provider))
    .filter((provider) => !!provider?.id && !providerGeocodeInFlight.has(provider.id))
    .slice(0, openSlots);

  candidates.forEach((provider) => {
    geocodeProviderAddress(provider);
  });
}

function geocodeProviderAddress(provider) {
  if (!googleGeocoder || !provider?.id) {
    return;
  }

  const query = buildProviderGeocodeQuery(provider);
  if (!query) {
    return;
  }

  providerGeocodeInFlight.add(provider.id);
  googleGeocoder.geocode(
    {
      address: query,
      language: "de",
      region: "AT",
    },
    (results, status) => {
      providerGeocodeInFlight.delete(provider.id);
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
      target.latitude = lat;
      target.longitude = lng;
      if (!target.updatedAt) {
        target.updatedAt = new Date().toISOString();
      }
      saveState();
      renderDashboardMap();
    }
  );
}

function buildProviderGeocodeQuery(provider) {
  const parts = [
    provider.address,
    provider.postalCode,
    provider.city,
    provider.state,
    provider.country,
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
    els.usersTableBody.innerHTML = `<tr><td colspan="6" class="empty">Noch keine Mitarbeiter angelegt.</td></tr>`;
    return;
  }

  els.usersTableBody.innerHTML = state.users
    .map(
      (user) => `
      <tr>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.role)}${user.statusLabel ? ` · ${escapeHtml(user.statusLabel)}` : ""}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.phone)}</td>
        <td>${escapeHtml(user.address)}</td>
        <td>
          ${
            admin
              ? `<div class="table-icon-actions">
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
    )
    .join("");
}

function renderProvidersTable() {
  const admin = isAdmin();
  if (!state.providers.length) {
    els.providersTableBody.innerHTML =
      '<tr><td colspan="7" class="empty">Noch keine Anbieter vorhanden.</td></tr>';
    return;
  }

  els.providersTableBody.innerHTML = state.providers
    .map((provider) => {
      const topicNames = provider.topicIds
        .map((topicId) => getTopicById(topicId)?.name)
        .filter(Boolean);
      const createdLabel = formatAuditStamp(
        provider.createdAt,
        provider.createdByRole,
        provider.createdByName
      );
      const updatedLabel = formatAuditStamp(
        provider.updatedAt,
        provider.updatedByRole,
        provider.updatedByName
      );

      return `
        <tr>
          <td>${escapeHtml(provider.name)}</td>
          <td>${escapeHtml(provider.status)}</td>
          <td>${escapeHtml(provider.city)}</td>
          <td>${escapeHtml(String(topicNames.length))}</td>
          <td class="audit-cell">${escapeHtml(createdLabel)}</td>
          <td class="audit-cell">${escapeHtml(updatedLabel)}</td>
          <td>
            ${
              admin
                ? `<button class="table-btn" data-edit-provider="${escapeHtml(
                    provider.id
                  )}">Bearbeiten</button>`
                : '<span class="empty">Nur Ansicht</span>'
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

function showAddressSuggestionsMessage(message) {
  currentAddressSuggestions = [];
  els.providerAddressSuggestions.innerHTML = `<p class="empty">${escapeHtml(message)}</p>`;
  els.providerAddressSuggestions.classList.remove("hidden");
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

function renderProviderTemplateOptions() {
  els.providerTopicTemplate.innerHTML = PROVIDER_TOPIC_TEMPLATES.map(
    (template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`
  ).join("");
}

function renderProviderTopicPicker() {
  const allTopics = getAllTopics();
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

  const query = normalizeText(els.providerTopicSearch.value || "");
  const filteredTopics = allTopics.filter((topic) => {
    if (!query) {
      return true;
    }
    const searchText = normalizeText(`${topic.name} ${topic.subcategoryName} ${topic.categoryName}`);
    return searchText.includes(query);
  });

  els.providerTopicResults.innerHTML = filteredTopics.length
    ? filteredTopics
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
    : '<p class="empty">Keine Treffer für die Suche.</p>';

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

function fillProviderForm(provider) {
  const formElements = els.providerForm.elements;
  formElements.name.value = provider.name;
  formElements.address.value = provider.address;
  formElements.postalCode.value = provider.postalCode;
  formElements.city.value = provider.city;
  formElements.country.value = provider.country;
  formElements.state.value = provider.state;
  formElements.website.value = provider.website;
  formElements.email.value = provider.email;
  formElements.phone.value = provider.phone;
  formElements.status.value = provider.status;
  formElements.latitude.value =
    typeof provider.latitude === "number" && Number.isFinite(provider.latitude)
      ? String(provider.latitude)
      : "";
  formElements.longitude.value =
    typeof provider.longitude === "number" && Number.isFinite(provider.longitude)
      ? String(provider.longitude)
      : "";

  clearAddressSuggestions();
  providerTopicSelection = new Set(provider.topicIds || []);
  renderProviderTopicPicker();
}

function fillUserForm(user) {
  const formElements = els.userForm.elements;
  formElements.name.value = user.name;
  formElements.address.value = user.address;
  formElements.email.value = user.email;
  formElements.phone.value = user.phone;
  formElements.role.value = user.role;
  formElements.email.disabled = user.source === "profile";
  els.userSaveBtn.textContent = "Aktualisieren";
}

function clearUserForm() {
  editingUserId = null;
  els.userForm.reset();
  els.userForm.elements.email.disabled = false;
  els.userSaveBtn.textContent = "Speichern";
}

function clearProviderForm() {
  editingProviderId = null;
  els.providerForm.reset();
  clearProviderCoordinates();
  providerTopicSelection.clear();
  if (els.providerTopicSearch) {
    els.providerTopicSearch.value = "";
  }
  clearAddressSuggestions();
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

async function handleDeleteUser(userId) {
  const userIndex = state.users.findIndex((entry) => entry.id === userId);
  if (userIndex < 0) {
    return;
  }

  const user = state.users[userIndex];
  const activeProfiles = state.users.filter((entry) => entry.source === "profile" && entry.status !== "inactive");
  if (activeProfiles.length <= 1 && user.source === "profile") {
    window.alert("Mindestens ein aktiver Mitarbeiter muss bestehen bleiben.");
    return;
  }

  const adminCount = state.users.filter(
    (entry) => entry.source === "profile" && entry.role === "admin" && entry.status !== "inactive"
  ).length;
  if (user.role === "admin" && adminCount <= 1) {
    window.alert("Der letzte Admin kann nicht gelöscht werden.");
    return;
  }

  if (user.source === "profile" && user.sourceId === authProfile?.user_id) {
    window.alert("Du kannst deinen eigenen Zugang nicht löschen.");
    return;
  }

  const confirmed = window.confirm(`Mitarbeiter "${user.name}" wirklich löschen?`);
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
    const { error } = await client
      .from("profiles")
      .update({ status: "inactive" })
      .eq("user_id", user.sourceId);
    if (error) {
      window.alert("Mitarbeiter konnte nicht deaktiviert werden.");
      return;
    }
  }

  if (editingUserId === userId) {
    clearUserForm();
  }
  await syncUsersFromSupabase();
  ensureSessionUser();
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

function handleDeleteCategory(categoryId) {
  const categoryIndex = state.categories.findIndex((entry) => entry.id === categoryId);
  if (categoryIndex < 0) {
    return;
  }

  const category = state.categories[categoryIndex];
  const topicIds = collectTopicIdsFromCategory(category);
  const confirmed = window.confirm(
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

function handleDeleteSubcategory(subcategoryId) {
  const category = getSelectedCategory();
  if (!category) {
    return;
  }

  const subcategoryIndex = category.subcategories.findIndex((entry) => entry.id === subcategoryId);
  if (subcategoryIndex < 0) {
    return;
  }

  const subcategory = category.subcategories[subcategoryIndex];
  const confirmed = window.confirm(
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

function handleDeleteTopic(topicId) {
  const subcategory = getSelectedSubcategory();
  if (!subcategory) {
    return;
  }

  const topicIndex = subcategory.topics.findIndex((entry) => entry.id === topicId);
  if (topicIndex < 0) {
    return;
  }

  const topic = subcategory.topics[topicIndex];
  const confirmed = window.confirm(`Thema "${topic.name}" wirklich löschen?`);
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

  els.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === targetId);
  });

  els.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === targetId);
  });

  if (targetId === "dashboard-section") {
    window.setTimeout(() => {
      renderDashboardMap();
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
  if (els.providerCreateBtn) {
    els.providerCreateBtn.classList.toggle("hidden", !isAdmin() || showForm);
  }
}

function getCurrentUser() {
  if (!authProfile) {
    return null;
  }
  return {
    id: `profile_${authProfile.user_id}`,
    name: authProfile.full_name || authProfile.email || "Benutzer",
    email: authProfile.email || "",
    role: authProfile.role || "mitarbeiter",
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

function normalizeSettings(settings) {
  return {
    mapParameters: normalizeMapParameters(settings?.mapParameters || {}),
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
  };
}

function sanitizeRadiusValue(value, fallback) {
  const numeric = parseOptionalNumber(value);
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(1, Math.min(500, Math.round(numeric)));
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

async function initializeAuth() {
  const client = getSupabaseClient();
  if (!client) {
    showAuthGate("Supabase ist nicht konfiguriert. Bitte config.js prüfen.");
    return false;
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      authSession = null;
      authProfile = null;
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
  if (authProfile.status === "inactive") {
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
    status: "active",
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
  els.authGate.classList.remove("hidden");
  if (message) {
    els.authMessage.textContent = message;
  }
}

function hideAuthGate() {
  els.authGate.classList.add("hidden");
  els.authMessage.textContent = "";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  if (!client) {
    showAuthGate("Supabase ist nicht erreichbar. Konfiguration prüfen.");
    return;
  }

  const credentials = getAuthCredentials();
  if (!credentials) {
    return;
  }
  const { email, password } = credentials;

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showAuthGate(`Anmeldung fehlgeschlagen: ${error.message}`);
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

  const credentials = getAuthCredentials();
  if (!credentials) {
    return;
  }
  const { email, password } = credentials;

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) {
    showAuthGate(`Konto konnte nicht erstellt werden: ${error.message}`);
    return;
  }

  if (data.session) {
    showAuthGate("Konto erstellt und angemeldet. Seite wird geladen...");
    await activateSignedInSession(data.session);
    return;
  }

  showAuthGate(
    "Konto erstellt. Wenn Email-Confirm aktiv ist, bitte Email bestätigen oder in Supabase deaktivieren."
  );
}

function getAuthCredentials() {
  const email = String(els.authEmail.value || "").trim().toLowerCase();
  const password = String(els.authPassword.value || "");
  if (!email || !email.includes("@")) {
    showAuthGate("Bitte eine gültige E-Mail eingeben.");
    return null;
  }
  if (password.length < 8) {
    showAuthGate("Bitte ein Passwort mit mindestens 8 Zeichen verwenden.");
    return null;
  }
  return { email, password };
}

async function handleSignOut() {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.auth.signOut();
  authSession = null;
  authProfile = null;
  showAuthGate("Bitte melde dich an.");
}

async function activateSignedInSession(session) {
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

  if (authProfile.status === "inactive") {
    showAuthGate("Dein Zugang ist deaktiviert. Bitte Admin kontaktieren.");
    return;
  }

  hideAuthGate();
  await bootstrapAfterAuth();
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
    status: profile.status || "active",
    statusLabel: profile.status === "inactive" ? "deaktiviert" : "aktiv",
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
    statusLabel: "eingeladen",
  }));

  state.users = [...profileUsers, ...inviteUsers];
}

async function saveEmployeeRecord(userPayload, selectedUser) {
  const client = getSupabaseClient();
  if (!client) {
    window.alert("Supabase Verbindung fehlt.");
    return false;
  }

  const normalizedEmail = String(userPayload.email || "").trim().toLowerCase();
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

  return {
    ...provider,
    topicIds: Array.isArray(provider.topicIds) ? provider.topicIds.filter(Boolean) : [],
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
  };
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

  try {
    const table = getSupabaseStateTable();
    const { error } = await client.from(table).upsert(
      {
        id: REMOTE_STATE_ROW_ID,
        payload: snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.warn("Supabase Save fehlgeschlagen, lokale Daten bleiben erhalten.", error);
      return;
    }

    lastRemotePayloadFingerprint = payloadFingerprint || JSON.stringify(snapshot);
  } catch (error) {
    console.warn("Supabase Save Ausnahme, lokale Daten bleiben erhalten.", error);
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
