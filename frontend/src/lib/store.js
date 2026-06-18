import {
	createAppointment,
	updateAppointmentById,
	deleteAppointmentById,
	listAppointmentsByDay,
} from "@/lib/api/appointments.api";
import {
	listServices,
	createService,
	updateServiceById,
	deleteServiceById,
} from "@/lib/api/services.api";
import {
	listProducts,
	createProduct,
	updateProductById,
	deleteProductById,
} from "@/lib/api/products.api";
import {
	listFixedClients,
	createFixedClient,
	updateFixedClientById,
	deleteFixedClientById,
	createClientCut,
	updateClientCutById,
	deleteClientCutById,
	listWaitlist,
	createWaitlistEntry,
	updateWaitlistEntryById,
	deleteWaitlistEntryById,
} from "@/lib/api/clients.api";
import {
	listExpenses,
	listExpensesByDay,
	listExpensesByPeriod,
	createExpense,
	updateExpenseById,
	deleteExpenseById,
} from "@/lib/api/expenses.api";
import { getProfile, updateProfile, resetAllData } from "@/lib/api/profile.api";
import {
	listBarbers,
	createBarber,
	inviteBarber,
	updateBarber,
} from "@/lib/api/barbers.api";
import { getFinancialSummary } from "@/lib/api/financial.api";
import {
	listPaymentMethods,
	updatePaymentMethodById,
} from "@/lib/api/paymentMethods.api";

const DEFAULT_TTL_MS = 60000;
const PERSISTED_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_STORAGE_KEY = "gestor_barbearia_data_cache_v1";

const cache = new Map();
let activeCacheScope = "anonymous";
let hydratedCacheScope = null;

function getStorage() {
	if (typeof window === "undefined") return null;
	return window.localStorage;
}

function readPersistedCache() {
	const storage = getStorage();
	if (!storage) return { version: 1, scopes: {} };

	try {
		const parsed = JSON.parse(storage.getItem(CACHE_STORAGE_KEY) || "");
		if (!parsed || typeof parsed !== "object") return { version: 1, scopes: {} };
		return {
			version: 1,
			scopes:
				parsed.scopes && typeof parsed.scopes === "object" ?
					parsed.scopes
				:	{},
		};
	} catch {
		return { version: 1, scopes: {} };
	}
}

function writePersistedCache(payload) {
	const storage = getStorage();
	if (!storage) return;

	try {
		storage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
	} catch {
		// Se o navegador negar quota, o cache em memoria continua funcionando.
	}
}

function getCacheScopeFromUser(user) {
	if (!user?.id) return "anonymous";
	return [
		"user",
		user.id,
		"shop",
		user.barbearia_id || "none",
		"barber",
		user.barbeiro_id || "none",
	].join(":");
}

function pruneScopeEntries(scopeEntries = {}) {
	const now = Date.now();
	return Object.fromEntries(
		Object.entries(scopeEntries).filter(([, entry]) => {
			return (
				entry &&
				entry.data !== undefined &&
				Number.isFinite(entry.updatedAt) &&
				now - entry.updatedAt <= PERSISTED_CACHE_MAX_AGE_MS
			);
		}),
	);
}

function persistCacheEntry(key, data, updatedAt) {
	const persisted = readPersistedCache();
	const currentScope = pruneScopeEntries(persisted.scopes[activeCacheScope]);
	persisted.scopes[activeCacheScope] = {
		...currentScope,
		[key]: {
			data: normalizeCacheValue(data),
			updatedAt,
		},
	};
	writePersistedCache(persisted);
}

function removePersistedCacheEntry(match) {
	const persisted = readPersistedCache();
	const currentScope = persisted.scopes[activeCacheScope];
	if (!currentScope) return;

	for (const key of Object.keys(currentScope)) {
		if (typeof match === "string" ? key.startsWith(match) : match(key)) {
			delete currentScope[key];
		}
	}

	persisted.scopes[activeCacheScope] = pruneScopeEntries(currentScope);
	writePersistedCache(persisted);
}

function clearPersistedScope(scope = activeCacheScope) {
	const persisted = readPersistedCache();
	if (!persisted.scopes[scope]) return;
	delete persisted.scopes[scope];
	writePersistedCache(persisted);
}

function hydratePersistentCache() {
	if (hydratedCacheScope === activeCacheScope) return;
	hydratedCacheScope = activeCacheScope;

	const persisted = readPersistedCache();
	const currentScope = pruneScopeEntries(persisted.scopes[activeCacheScope]);
	for (const [key, entry] of Object.entries(currentScope)) {
		cache.set(key, {
			data: normalizeCacheValue(entry.data),
			updatedAt: entry.updatedAt,
			promise: null,
		});
	}

	if (persisted.scopes[activeCacheScope]) {
		persisted.scopes[activeCacheScope] = currentScope;
		writePersistedCache(persisted);
	}
}

export function configureAppDataCache(user) {
	const nextScope = getCacheScopeFromUser(user);
	if (nextScope === activeCacheScope && hydratedCacheScope === activeCacheScope) {
		return;
	}

	activeCacheScope = nextScope;
	cache.clear();
	hydratePersistentCache();
}

function normalizeCacheValue(value) {
	if (Array.isArray(value)) return [...value];
	if (value && typeof value === "object") return { ...value };
	return value;
}

function makeStableKey(prefix, params = {}) {
	const entries = Object.entries(params)
		.filter(([, value]) => value !== undefined && value !== null && value !== "")
		.sort(([first], [second]) => first.localeCompare(second));

	if (entries.length === 0) return prefix;
	return `${prefix}:${entries
		.map(([key, value]) => `${key}=${String(value)}`)
		.join("&")}`;
}

function readCache(key) {
	hydratePersistentCache();
	const entry = cache.get(key);
	return entry?.data === undefined ? undefined : normalizeCacheValue(entry.data);
}

function hasFreshCache(key, ttlMs = DEFAULT_TTL_MS) {
	hydratePersistentCache();
	const entry = cache.get(key);
	return Boolean(
		entry?.data !== undefined && Date.now() - entry.updatedAt < ttlMs,
	);
}

function writeCache(key, data) {
	const updatedAt = Date.now();
	cache.set(key, {
		data: normalizeCacheValue(data),
		updatedAt,
		promise: null,
	});
	persistCacheEntry(key, data, updatedAt);
	return readCache(key);
}

function invalidateCache(match) {
	for (const key of cache.keys()) {
		if (typeof match === "string" ? key.startsWith(match) : match(key)) {
			cache.delete(key);
		}
	}
	removePersistedCacheEntry(match);
}

export function clearAppDataCache() {
	cache.clear();
	clearPersistedScope();
	hydratedCacheScope = null;
}

async function loadCached(key, fetcher, options = {}) {
	hydratePersistentCache();
	const { force = false, ttlMs = DEFAULT_TTL_MS } = options;
	const entry = cache.get(key);

	if (!force && hasFreshCache(key, ttlMs)) {
		return readCache(key);
	}

	if (entry?.promise) {
		return entry.promise;
	}

	const request = fetcher()
		.then((data) => writeCache(key, data))
		.catch((error) => {
			const current = cache.get(key);
			if (current) current.promise = null;
			throw error;
		});

	cache.set(key, {
		data: entry?.data,
		updatedAt: entry?.updatedAt || 0,
		promise: request,
	});

	return request;
}

const cacheKeys = {
	profile: "profile",
	services: "services",
	products: "products",
	fixedClients: "clients:fixed",
	waitlist: "clients:waitlist",
	barbers: "barbers",
	paymentMethods: "paymentMethods",
	expenses: (params) => makeStableKey("expenses", params || {}),
	appointments: (dayKey, filters = {}) =>
		makeStableKey(`appointments:${dayKey}`, filters),
	financialSummary: (params = {}) => makeStableKey("financial:summary", params),
};

// Chaves usadas para salvar dados no navegador.
const APPT_KEY = "gestor_barbearia_appointments";
const SVC_KEY = "gestor_barbearia_services";
const PROD_KEY = "gestor_barbearia_products";
const EXP_KEY = "gestor_barbearia_expenses";
const PROFILE_KEY = "gestor_barbearia_profile";

// Carrega os dados basicos de perfil.
export function getCachedProfile() {
	return readCache(cacheKeys.profile);
}

export async function loadProfile(options = {}) {
	return loadCached(cacheKeys.profile, getProfile, options);
}

// Salva os dados basicos de perfil.
export async function saveProfile(profile) {
	const savedProfile = await updateProfile(profile);
	writeCache(cacheKeys.profile, savedProfile);
	invalidateCache(cacheKeys.barbers);
	return savedProfile;
}
// ── Appointments ──

// Envia um novo agendamento para o backend.
export async function addAppointment(appt) {
	const created = await createAppointment(appt);
	invalidateCache("appointments:");
	invalidateCache("financial:");
	return created;
}

// Atualiza um agendamento local pelo id.
export async function updateAppointment(id, updates) {
	const updated = await updateAppointmentById(id, updates);
	invalidateCache("appointments:");
	invalidateCache("financial:");
	return updated;
}

// Exclui um agendamento local pelo id.
export async function deleteAppointment(id) {
	await deleteAppointmentById(id);
	invalidateCache("appointments:");
	invalidateCache("financial:");
}

// Filtra os agendamentos de um dia e ordena por horario.
export function getCachedAppointmentsForDay(dayKey, filters = {}) {
	return readCache(cacheKeys.appointments(dayKey, filters));
}

export async function getAppointmentsForDay(dayKey, options = {}) {
	return loadCached(
		cacheKeys.appointments(dayKey),
		() => listAppointmentsByDay(dayKey),
		options,
	);
}

export async function getAppointmentsForDayWithFilters(
	dayKey,
	filters = {},
	options = {},
) {
	return loadCached(
		cacheKeys.appointments(dayKey, filters),
		() => listAppointmentsByDay(dayKey, filters),
		options,
	);
}

export function getCachedBarbers() {
	return readCache(cacheKeys.barbers);
}

export async function loadBarbers(options = {}) {
	return loadCached(cacheKeys.barbers, listBarbers, options);
}

export async function addBarber(payload) {
	const barber = await createBarber(payload);
	invalidateCache(cacheKeys.barbers);
	return barber;
}

export async function saveBarber(id, payload) {
	const barber = await updateBarber(id, payload);
	invalidateCache(cacheKeys.barbers);
	invalidateCache("appointments:");
	return barber;
}

export async function sendBarberInvite(id, payload) {
	return inviteBarber(id, payload);
}

export function getCachedPaymentMethods() {
	return readCache(cacheKeys.paymentMethods);
}

export async function loadPaymentMethods(options = {}) {
	return loadCached(cacheKeys.paymentMethods, listPaymentMethods, options);
}

export async function savePaymentMethod(id, updates) {
	const method = await updatePaymentMethodById(id, updates);
	const cached = readCache(cacheKeys.paymentMethods);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.paymentMethods,
			cached.map((item) => (item.id === id ? method : item)),
		);
	} else {
		invalidateCache(cacheKeys.paymentMethods);
	}
	invalidateCache("appointments:");
	invalidateCache("financial:");
	return method;
}

export function getCachedFinancialSummary(params = {}) {
	return readCache(cacheKeys.financialSummary(params));
}

export async function loadFinancialSummary(params = {}, options = {}) {
	return loadCached(
		cacheKeys.financialSummary(params),
		() => getFinancialSummary(params),
		options,
	);
}
// ── Services ──

// Carrega os servicos cadastrados.
export function getCachedServices() {
	return readCache(cacheKeys.services);
}

export async function loadServices(options = {}) {
	return loadCached(cacheKeys.services, listServices, options);
}

// Adiciona um novo servico.
export async function addService(svc) {
	const service = await createService(svc);
	const cached = readCache(cacheKeys.services);
	if (Array.isArray(cached)) {
		writeCache(cacheKeys.services, [...cached, service]);
	} else {
		invalidateCache(cacheKeys.services);
	}
	return service;
}

// Atualiza um servico existente.
export async function updateService(id, updates) {
	const service = await updateServiceById(id, updates);
	const cached = readCache(cacheKeys.services);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.services,
			cached.map((item) => (item.id === id ? service : item)),
		);
	} else {
		invalidateCache(cacheKeys.services);
	}
	return service;
}

// Exclui um servico existente.
export async function deleteService(id) {
	await deleteServiceById(id);
	const cached = readCache(cacheKeys.services);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.services,
			cached.filter((item) => item.id !== id),
		);
	} else {
		invalidateCache(cacheKeys.services);
	}
}
// ── Products ──

// Carrega os produtos cadastrados.
export function getCachedProducts() {
	return readCache(cacheKeys.products);
}

export async function loadProducts(options = {}) {
	return loadCached(cacheKeys.products, listProducts, options);
}

// Adiciona um novo produto.
export async function addProduct(prod) {
	const product = await createProduct(prod);
	const cached = readCache(cacheKeys.products);
	if (Array.isArray(cached)) {
		writeCache(cacheKeys.products, [...cached, product]);
	} else {
		invalidateCache(cacheKeys.products);
	}
	return product;
}

// Atualiza um produto existente.
export async function updateProduct(id, updates) {
	const product = await updateProductById(id, updates);
	const cached = readCache(cacheKeys.products);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.products,
			cached.map((item) => (item.id === id ? product : item)),
		);
	} else {
		invalidateCache(cacheKeys.products);
	}
	return product;
}

// Exclui um produto existente.
export async function deleteProduct(id) {
	await deleteProductById(id);
	const cached = readCache(cacheKeys.products);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.products,
			cached.filter((item) => item.id !== id),
		);
	} else {
		invalidateCache(cacheKeys.products);
	}
}
// ── Clients ──

export function getCachedFixedClients() {
	return readCache(cacheKeys.fixedClients);
}

export async function loadFixedClients(options = {}) {
	return loadCached(cacheKeys.fixedClients, listFixedClients, options);
}

export async function addFixedClient(payload) {
	const client = await createFixedClient(payload);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(cacheKeys.fixedClients, [...cached, client]);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	return client;
}

export async function saveFixedClient(id, payload) {
	const client = await updateFixedClientById(id, payload);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.map((item) => (item.id === id ? client : item)),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	return client;
}

export async function deleteFixedClient(id) {
	await deleteFixedClientById(id);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.filter((item) => item.id !== id),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
}

export async function addFixedClientCut(clientId, payload) {
	const client = await createClientCut(clientId, payload);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.map((item) => (item.id === clientId ? client : item)),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	return client;
}

export async function saveFixedClientCut(clientId, cutId, payload) {
	const client = await updateClientCutById(clientId, cutId, payload);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.map((item) => (item.id === clientId ? client : item)),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	return client;
}

export async function deleteFixedClientCut(clientId, cutId) {
	const client = await deleteClientCutById(clientId, cutId);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.map((item) => (item.id === clientId ? client : item)),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	return client;
}

export function getCachedWaitlist() {
	return readCache(cacheKeys.waitlist);
}

export async function loadWaitlist(options = {}) {
	return loadCached(cacheKeys.waitlist, listWaitlist, options);
}

export async function addWaitlistEntry(payload) {
	const entry = await createWaitlistEntry(payload);
	const cached = readCache(cacheKeys.waitlist);
	if (Array.isArray(cached)) {
		writeCache(cacheKeys.waitlist, [...cached, entry]);
	} else {
		invalidateCache(cacheKeys.waitlist);
	}
	return entry;
}

export async function saveWaitlistEntry(id, payload) {
	const entry = await updateWaitlistEntryById(id, payload);
	const cached = readCache(cacheKeys.waitlist);
	if (Array.isArray(cached)) {
		const next =
			entry.status === "aguardando" ?
				cached.map((item) => (item.id === id ? entry : item))
			:	cached.filter((item) => item.id !== id);
		writeCache(cacheKeys.waitlist, next);
	} else {
		invalidateCache(cacheKeys.waitlist);
	}
	return entry;
}

export async function deleteWaitlistEntry(id) {
	await deleteWaitlistEntryById(id);
	const cached = readCache(cacheKeys.waitlist);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.waitlist,
			cached.filter((item) => item.id !== id),
		);
	} else {
		invalidateCache(cacheKeys.waitlist);
	}
}
// ── Expenses ──

// Carrega as despesas cadastradas.
export function getCachedExpenses(params) {
	if (typeof params === "string") {
		return readCache(cacheKeys.expenses({ date: params }));
	}
	return readCache(cacheKeys.expenses(params));
}

export async function loadExpenses(params, options = {}) {
	if (typeof params === "string") {
		return loadCached(
			cacheKeys.expenses({ date: params }),
			() => listExpensesByDay(params),
			options,
		);
	}
	if (params?.date || params?.start_date || params?.end_date) {
		return loadCached(
			cacheKeys.expenses(params),
			() => listExpensesByPeriod(params),
			options,
		);
	}
	return loadCached(cacheKeys.expenses(), listExpenses, options);
}

// Adiciona uma nova despesa.
export async function addExpense(exp) {
	const expense = await createExpense(exp);
	invalidateCache("expenses:");
	invalidateCache("financial:");
	return expense;
}

// Atualiza uma despesa existente.
export async function updateExpense(id, updates) {
	const expense = await updateExpenseById(id, updates);
	invalidateCache("expenses:");
	invalidateCache("financial:");
	return expense;
}

// Exclui uma despesa existente.
export async function deleteExpense(id) {
	await deleteExpenseById(id);
	invalidateCache("expenses:");
	invalidateCache("financial:");
}

// Filtra as despesas de um dia especifico.
export async function getExpensesForDay(dayKey, options = {}) {
	return loadExpenses(dayKey, options);
}
// ── Summaries ──

export function getCachedDaySummaryFromAppointments(dayKey, appointments) {
	const expenses = getCachedExpenses(dayKey);
	if (!expenses) return null;
	return buildDaySummary(appointments, expenses);
}

function buildDaySummary(appointments, expenses) {
	const today = formatDayKey(new Date());
	let totalReceived = 0;
	let paid = 0;
	let pending = 0;
	let toCollect = 0;
	let overdue = 0;
	let totalIncome = 0;

	appointments.forEach((a) => {
		totalIncome += Number(a.value || 0);
		if (a.status === "paid") {
			totalReceived += Number(a.value || 0);
			paid++;
		} else if (a.status === "fiado") {
			toCollect += Number(a.value || 0);
			if (a.prazo_date && a.prazo_date < today) {
				overdue++;
			} else {
				pending++;
			}
		} else {
			pending++;
		}
	});

	const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
	return {
		totalReceived,
		totalClients: appointments.length,
		totalIncome,
		totalExpenses,
		paid,
		pending,
		toCollect,
		overdue,
	};
}

// Monta os totais do dia com a lista de agendamentos recebida da API.
export async function getDaySummaryFromAppointments(
	dayKey,
	appointments,
	options = {},
) {
	const expenses = await getExpensesForDay(dayKey, options);
	return buildDaySummary(appointments, expenses);
}

export function prefetchAppData(user, options = {}) {
	const dayKey = options.dayKey || formatDayKey(new Date());
	const ownBarberId = user?.barbeiro_id || "";
	const appointmentFilters = ownBarberId ? { barbeiro_id: ownBarberId } : {};

	return Promise.allSettled([
		loadProfile(),
		loadServices(),
		loadProducts(),
		loadFixedClients(),
		loadWaitlist(),
		loadExpenses(dayKey),
		loadFinancialSummary({ start_date: dayKey, end_date: dayKey }),
		getAppointmentsForDayWithFilters(dayKey, appointmentFilters),
		user?.role === "admin" ? loadBarbers() : Promise.resolve([]),
	]);
}
// ── Formatting ──

// Formata numero para moeda em real.
export function formatCurrency(value) {
	const numericValue = Number(value);
	const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
	return safeValue.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});
}

// Converte data para formato YYYY-MM-DD.
export function formatDayKey(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Converte data para um texto curto amigavel.
export function formatDateDisplay(date) {
	const months = [
		"jan",
		"fev",
		"mar",
		"abr",
		"mai",
		"jun",
		"jul",
		"ago",
		"set",
		"out",
		"nov",
		"dez",
	];
	const day = date.getDate();
	return `${day} ${months[date.getMonth()]}`;
}

// Diz se a data recebida e hoje.
export function isToday(date) {
	const today = new Date();
	return date.toDateString() === today.toDateString();
}

// Limpa todos os dados salvos localmente no navegador.
export async function clearAllData() {
	await resetAllData();
	clearAppDataCache();
	const storage = getStorage();
	if (!storage) return;
	storage.removeItem(APPT_KEY);
	storage.removeItem(SVC_KEY);
	storage.removeItem(PROD_KEY);
	storage.removeItem(EXP_KEY);
	storage.removeItem(PROFILE_KEY);
	storage.removeItem(CACHE_STORAGE_KEY);
}
