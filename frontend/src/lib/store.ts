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
	removeBarber,
} from "@/lib/api/barbers.api";
import { getFinancialSummary } from "@/lib/api/financial.api";
import {
	listReceivables,
	createReceivable,
	updateReceivableById,
	receiveReceivableById,
	cancelReceivableById,
} from "@/lib/api/receivables.api";
import {
	listPaymentMethods,
	updatePaymentMethodById,
} from "@/lib/api/paymentMethods.api";
import {
	listSupplierPayables,
	paySupplierPayableById,
	createSupplierPurchase,
} from "@/lib/api/supplierPayables.api";
import { AppApiError } from "@/lib/api/client";

const DEFAULT_TTL_MS = 60000;
const PERSISTED_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_STORAGE_KEY = "gestor_barbearia_data_cache_v1";

const cache = new Map();
let activeCacheScope = "anonymous";
let hydratedCacheScope: string | null = null;
let cacheGeneration = 0;

class StaleCacheRequestError extends Error {
	code: string;
	constructor() {
		super("A resposta pertence a uma sessao anterior.");
		this.name = "StaleCacheRequestError";
		this.code = "STALE_CACHE_REQUEST";
	}
}

function getStorage() {
	if (typeof window === "undefined") return null;
	return window.localStorage;
}

function readPersistedCache(): { version: number; scopes: Record<string, any> } {
	const storage = getStorage();
	if (!storage) return { version: 1, scopes: {} };

	try {
		const parsed = JSON.parse(storage.getItem(CACHE_STORAGE_KEY) || "");
		if (!parsed || typeof parsed !== "object")
			return { version: 1, scopes: {} };
		return {
			version: 1,
			scopes:
				parsed.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
		};
	} catch {
		return { version: 1, scopes: {} };
	}
}

function writePersistedCache(payload: any) {
	const storage = getStorage();
	if (!storage) return;

	try {
		storage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
	} catch {
		// Se o navegador negar quota, o cache em memoria continua funcionando.
	}
}

function getCacheScopeFromUser(user?: any): string {
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

function pruneScopeEntries(scopeEntries: Record<string, any> = {}) {
	const now = Date.now();
	return Object.fromEntries(
		Object.entries(scopeEntries).filter(([, entry]: [string, any]) => {
			return (
				entry &&
				entry.data !== undefined &&
				Number.isFinite(entry.updatedAt) &&
				now - entry.updatedAt <= PERSISTED_CACHE_MAX_AGE_MS
			);
		}),
	);
}

function persistCacheEntry(key: string, data: any, updatedAt: number) {
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

function removePersistedCacheEntry(match: string | ((key: string) => boolean)) {
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
			data: normalizeCacheValue((entry as any).data),
			updatedAt: (entry as any).updatedAt,
			promise: null,
		});
	}

	if (persisted.scopes[activeCacheScope]) {
		persisted.scopes[activeCacheScope] = currentScope;
		writePersistedCache(persisted);
	}
}

export function configureAppDataCache(user?: any) {
	const nextScope = getCacheScopeFromUser(user);
	if (
		nextScope === activeCacheScope &&
		hydratedCacheScope === activeCacheScope
	) {
		return;
	}

	activeCacheScope = nextScope;
	cacheGeneration += 1;
	cache.clear();
	hydratePersistentCache();
}

function normalizeCacheValue(value: any): any {
	if (Array.isArray(value)) return [...value];
	if (value && typeof value === "object") return { ...value };
	return value;
}

function makeStableKey(prefix: string, params: Record<string, any> = {}) {
	const entries = Object.entries(params)
		.filter(
			([, value]) => value !== undefined && value !== null && value !== "",
		)
		.sort(([first], [second]) => first.localeCompare(second));

	if (entries.length === 0) return prefix;
	return `${prefix}:${entries
		.map(([key, value]) => `${key}=${String(value)}`)
		.join("&")}`;
}

function readCache(key: string) {
	hydratePersistentCache();
	const entry = cache.get(key);
	return entry?.data === undefined ?
			undefined
		:	normalizeCacheValue(entry.data);
}

function hasFreshCache(key: string, ttlMs = DEFAULT_TTL_MS) {
	hydratePersistentCache();
	const entry = cache.get(key);
	return Boolean(
		entry?.data !== undefined && Date.now() - entry.updatedAt < ttlMs,
	);
}

function writeCache(key: string, data: any) {
	const updatedAt = Date.now();
	cache.set(key, {
		data: normalizeCacheValue(data),
		updatedAt,
		promise: null,
	});
	persistCacheEntry(key, data, updatedAt);
	return readCache(key);
}

function invalidateCache(match: string | ((key: string) => boolean)) {
	for (const key of cache.keys()) {
		if (typeof match === "string" ? key.startsWith(match) : match(key)) {
			cache.delete(key);
		}
	}
	removePersistedCacheEntry(match);
}

export function clearAppDataCache() {
	cacheGeneration += 1;
	cache.clear();
	clearPersistedScope();
	hydratedCacheScope = null;
}

async function loadCached(key: string, fetcher: () => Promise<any>, options: any = {}) {
	hydratePersistentCache();
	const { force = false, ttlMs = DEFAULT_TTL_MS } = options;
	const entry = cache.get(key);
	const requestScope = activeCacheScope;
	const requestGeneration = cacheGeneration;

	if (!force && hasFreshCache(key, ttlMs)) {
		return readCache(key);
	}

	if (entry?.promise) {
		return entry.promise;
	}

	const request = fetcher()
		.then((data) => {
			if (
				activeCacheScope !== requestScope ||
				cacheGeneration !== requestGeneration
			) {
				throw new StaleCacheRequestError();
			}
			return writeCache(key, data);
		})
		.catch((error: any) => {
			if (
				activeCacheScope === requestScope &&
				cacheGeneration === requestGeneration
			) {
				const current = cache.get(key);
				if (current) current.promise = null;
			}
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
	expenses: (params?: any) => makeStableKey("expenses", params || {}),
	appointments: (dayKey: string, filters: any = {}) =>
		makeStableKey(`appointments:${dayKey}`, filters),
	financialSummary: (params: any = {}) => makeStableKey("financial:summary", params),
	receivables: (params: any = {}) => makeStableKey("receivables", params),
	supplierPayables: (params: any = {}) => makeStableKey("supplierPayables", params),
};

// Chaves usadas para salvar dados no navegador.
const APPT_KEY = "gestor_barbearia_appointments";
const SVC_KEY = "gestor_barbearia_services";
const PROD_KEY = "gestor_barbearia_products";
const EXP_KEY = "gestor_barbearia_expenses";
const PROFILE_KEY = "gestor_barbearia_profile";
const OFFLINE_APPOINTMENT_QUEUE_KEY =
	"gestor_barbearia_offline_appointment_queue_v1";
const OFFLINE_APPOINTMENT_ID_PREFIX = "offline-appt";
let offlineSyncPromise: Promise<number> | null = null;
let offlineSyncListenersRegistered = false;

function isNetworkFailure(error: any) {
	return error instanceof AppApiError && error.kind === "network";
}

function isBrowserOnline() {
	if (typeof navigator === "undefined") return true;
	return navigator.onLine !== false;
}

function readOfflineAppointmentQueue() {
	const storage = getStorage();
	if (!storage) return [];

	try {
		const parsed = JSON.parse(
			storage.getItem(OFFLINE_APPOINTMENT_QUEUE_KEY) || "[]",
		);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((item: any) => {
			return (
				item &&
				typeof item === "object" &&
				item.type === "create" &&
				typeof item.scope === "string" &&
				item.payload &&
				typeof item.payload === "object"
			);
		});
	} catch {
		return [];
	}
}

function readScopedOfflineAppointmentQueue() {
	return readOfflineAppointmentQueue().filter(
		(item: any) => item.scope === activeCacheScope,
	);
}

function writeOfflineAppointmentQueue(queue: any[]) {
	const storage = getStorage();
	if (!storage) return;

	try {
		storage.setItem(OFFLINE_APPOINTMENT_QUEUE_KEY, JSON.stringify(queue));
	} catch {
		// Mantem a fila em memoria durante a sessao caso a quota falhe.
	}
}

function sanitizeOfflineAppointmentPayload(payload: any = {}) {
	return {
		client_name: String(payload.client_name || "").trim(),
		cliente_id: payload.cliente_id || null,
		day_key: payload.day_key || "",
		time_slot: payload.time_slot || "09:00",
		value: Number(payload.value || 0),
		status: payload.status || "normal",
		service_id: payload.service_id,
		service_name: payload.service_name || "",
		services: Array.isArray(payload.services) ? payload.services : [],
		products: Array.isArray(payload.products) ? payload.products : [],
		prazo_date: payload.prazo_date || null,
		barber_name: payload.barber_name,
		barbeiro_id: payload.barbeiro_id || "",
		payment_method_id: payload.payment_method_id,
		payment_date: payload.payment_date || null,
	};
}

function queueOfflineAppointment(payload: any) {
	const queue = readOfflineAppointmentQueue();
	const queued = {
		id: `${OFFLINE_APPOINTMENT_ID_PREFIX}-${Date.now()}-${Math.random()
			.toString(16)
			.slice(2, 8)}`,
		type: "create",
		scope: activeCacheScope,
		createdAt: Date.now(),
		payload: sanitizeOfflineAppointmentPayload(payload),
	};
	queue.push(queued);
	writeOfflineAppointmentQueue(queue);
	return queued;
}

function toQueuedAppointment(queued: any) {
	const payload = queued?.payload || {};
	return {
		id: queued.id,
		client_name: payload.client_name || "",
		cliente_id: payload.cliente_id || null,
		day_key: payload.day_key || "",
		time_slot: payload.time_slot || "09:00",
		value: Number(payload.value || 0),
		status: payload.status || "normal",
		service_id: payload.service_id,
		service_name: payload.service_name || "",
		services: Array.isArray(payload.services) ? payload.services : [],
		products: Array.isArray(payload.products) ? payload.products : [],
		prazo_date: payload.prazo_date || null,
		barber_name: payload.barber_name,
		barbeiro_id: payload.barbeiro_id || "",
		payment_method_id: payload.payment_method_id,
		payment_date: payload.payment_date || null,
		offline_pending: true,
		offline_created_at: queued.createdAt,
	};
}

function matchesAppointmentDayAndFilters(appointment: any, dayKey: string, filters: any = {}) {
	if (!appointment || appointment.day_key !== dayKey) return false;
	if (filters.barbeiro_id && appointment.barbeiro_id !== filters.barbeiro_id) {
		return false;
	}
	return true;
}

function mergeAppointmentsWithOfflineQueue(appointments: any, dayKey: string, filters: any = {}) {
	const queue = readScopedOfflineAppointmentQueue();
	const queuedAppointments = queue
		.map(toQueuedAppointment)
		.filter((appointment: any) =>
			matchesAppointmentDayAndFilters(appointment, dayKey, filters),
		);

	const hasRemoteList = Array.isArray(appointments);
	if (!hasRemoteList && queuedAppointments.length === 0) {
		return appointments;
	}

	const remoteList = hasRemoteList ? appointments : [];
	const remoteIds = new Set(remoteList.map((item: any) => item.id));
	const merged = [
		...queuedAppointments.filter((item: any) => !remoteIds.has(item.id)),
		...remoteList,
	];

	return merged.sort((first: any, second: any) =>
		String(first.time_slot || "").localeCompare(String(second.time_slot || "")),
	);
}

function updateAppointmentCacheWithQueuedItem(queued: any) {
	const queuedAppointment = toQueuedAppointment(queued);
	const dayKey = queuedAppointment.day_key;
	if (!dayKey) return;

	const keyWithoutFilters = cacheKeys.appointments(dayKey);
	const cachedDefault = readCache(keyWithoutFilters);
	writeCache(
		keyWithoutFilters,
		mergeAppointmentsWithOfflineQueue(cachedDefault, dayKey, {}),
	);

	if (queuedAppointment.barbeiro_id) {
		const keyWithBarber = cacheKeys.appointments(dayKey, {
			barbeiro_id: queuedAppointment.barbeiro_id,
		});
		const cachedByBarber = readCache(keyWithBarber);
		writeCache(
			keyWithBarber,
			mergeAppointmentsWithOfflineQueue(cachedByBarber, dayKey, {
				barbeiro_id: queuedAppointment.barbeiro_id,
			}),
		);
	}
}

function invalidateAppointmentRelations() {
	invalidateCache("appointments:");
	invalidateCache("financial:");
	invalidateCache("receivables:");
	invalidateCache("supplierPayables:");
}

export async function syncOfflineAppointments() {
	if (!isBrowserOnline()) return 0;
	if (offlineSyncPromise) return offlineSyncPromise;

	offlineSyncPromise = (async () => {
		const queue = readOfflineAppointmentQueue();
		const scopedQueue = queue.filter((item) => item.scope === activeCacheScope);
		const otherScopesQueue = queue.filter(
			(item) => item.scope !== activeCacheScope,
		);
		if (scopedQueue.length === 0) return 0;

		const remaining = [];
		let syncedCount = 0;

		for (const queued of scopedQueue) {
			try {
				await createAppointment(queued.payload);
				syncedCount += 1;
			} catch (error) {
				remaining.push(queued);
				if (isNetworkFailure(error)) {
					break;
				}
			}
		}

		writeOfflineAppointmentQueue([...otherScopesQueue, ...remaining]);
		if (syncedCount > 0) {
			invalidateAppointmentRelations();
		}

		return syncedCount;
	})().finally(() => {
		offlineSyncPromise = null;
	});

	return offlineSyncPromise;
}

function registerOfflineSyncListeners() {
	if (offlineSyncListenersRegistered || typeof window === "undefined") return;
	offlineSyncListenersRegistered = true;

	window.addEventListener("online", () => {
		void syncOfflineAppointments();
	});

	if (typeof document !== "undefined") {
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				void syncOfflineAppointments();
			}
		});
	}
}

registerOfflineSyncListeners();

// Carrega os dados basicos de perfil.
export function getCachedProfile() {
	return readCache(cacheKeys.profile);
}

export async function loadProfile(options = {}) {
	return loadCached(cacheKeys.profile, getProfile, options);
}

// Salva os dados basicos de perfil.
export async function saveProfile(profile: any) {
	const savedProfile = await updateProfile(profile);
	writeCache(cacheKeys.profile, savedProfile);
	invalidateCache(cacheKeys.barbers);
	return savedProfile;
}
// ── Appointments ──

// Envia um novo agendamento para o backend.
export async function addAppointment(appt: any) {
	try {
		const created = await createAppointment(appt);
		invalidateAppointmentRelations();
		return created;
	} catch (error) {
		if (!isNetworkFailure(error)) throw error;

		const queued = queueOfflineAppointment(appt);
		updateAppointmentCacheWithQueuedItem(queued);
		return toQueuedAppointment(queued);
	}
}

// Atualiza um agendamento local pelo id.
export async function updateAppointment(id: string, updates: any) {
	const updated = await updateAppointmentById(id, updates);
	invalidateAppointmentRelations();
	return updated;
}

// Exclui um agendamento local pelo id.
export async function deleteAppointment(id: string) {
	await deleteAppointmentById(id);
	invalidateAppointmentRelations();
}

// Filtra os agendamentos de um dia e ordena por horario.
export function getCachedAppointmentsForDay(dayKey: string, filters: any = {}) {
	const cached = readCache(cacheKeys.appointments(dayKey, filters));
	return mergeAppointmentsWithOfflineQueue(cached, dayKey, filters);
}

export async function getAppointmentsForDay(dayKey: string, options: any = {}) {
	void syncOfflineAppointments();
	try {
		const appointments = await loadCached(
			cacheKeys.appointments(dayKey),
			() => listAppointmentsByDay(dayKey),
			options,
		);
		return mergeAppointmentsWithOfflineQueue(appointments, dayKey, {});
	} catch (error) {
		if (!isNetworkFailure(error)) throw error;
		const cached = readCache(cacheKeys.appointments(dayKey));
		return mergeAppointmentsWithOfflineQueue(cached, dayKey, {});
	}
}

export async function getAppointmentsForDayWithFilters(
	dayKey: string,
	filters: any = {},
	options: any = {},
) {
	void syncOfflineAppointments();
	try {
		const appointments = await loadCached(
			cacheKeys.appointments(dayKey, filters),
			() => listAppointmentsByDay(dayKey, filters),
			options,
		);
		return mergeAppointmentsWithOfflineQueue(appointments, dayKey, filters);
	} catch (error) {
		if (!isNetworkFailure(error)) throw error;
		const cached = readCache(cacheKeys.appointments(dayKey, filters));
		return mergeAppointmentsWithOfflineQueue(cached, dayKey, filters);
	}
}

export function getCachedBarbers() {
	return readCache(cacheKeys.barbers);
}

export async function loadBarbers(options: any = {}) {
	return loadCached(cacheKeys.barbers, listBarbers, options);
}

export async function addBarber(payload: any) {
	const barber = await createBarber(payload);
	invalidateCache(cacheKeys.barbers);
	return barber;
}

export async function saveBarber(id: string, payload: any) {
	const barber = await updateBarber(id, payload);
	invalidateCache(cacheKeys.barbers);
	invalidateCache("appointments:");
	return barber;
}

export async function sendBarberInvite(id: string, payload: any) {
	return inviteBarber(id, payload);
}

export async function deleteBarber(id: string) {
	const res = await removeBarber(id);
	invalidateCache(cacheKeys.barbers);
	invalidateCache("appointments:");
	return res;
}

export function getCachedPaymentMethods() {
	return readCache(cacheKeys.paymentMethods);
}

export async function loadPaymentMethods(options: any = {}) {
	return loadCached(cacheKeys.paymentMethods, listPaymentMethods, options);
}

export async function savePaymentMethod(id: string, updates: any) {
	const method = await updatePaymentMethodById(id, updates);
	const cached = readCache(cacheKeys.paymentMethods);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.paymentMethods,
			cached.map((item: any) => (item.id === id ? method : item)),
		);
	} else {
		invalidateCache(cacheKeys.paymentMethods);
	}
	invalidateCache("appointments:");
	invalidateCache("financial:");
	return method;
}

export function getCachedFinancialSummary(params: any = {}) {
	return readCache(cacheKeys.financialSummary(params));
}

export async function loadFinancialSummary(params: any = {}, options: any = {}) {
	return loadCached(
		cacheKeys.financialSummary(params),
		() => getFinancialSummary(params),
		options,
	);
}

export function getCachedReceivables(params: any = {}) {
	return readCache(cacheKeys.receivables(params));
}

export async function loadReceivables(params: any = {}, options: any = {}) {
	return loadCached(
		cacheKeys.receivables(params),
		() => listReceivables(params),
		options,
	);
}

function invalidateReceivables() {
	invalidateCache("receivables:");
	invalidateCache("financial:");
	invalidateCache("appointments:");
}

export async function addReceivable(payload: any) {
	const receivable = await createReceivable(payload);
	invalidateReceivables();
	return receivable;
}

export async function saveReceivable(id: string, payload: any) {
	const receivable = await updateReceivableById(id, payload);
	invalidateReceivables();
	return receivable;
}

export async function receiveReceivable(id: string, payload: any) {
	const receivable = await receiveReceivableById(id, payload);
	invalidateReceivables();
	return receivable;
}

export async function cancelReceivable(id: string) {
	const receivable = await cancelReceivableById(id);
	invalidateReceivables();
	return receivable;
}

export async function loadSupplierPayables(params: any = {}, options: any = {}) {
	return loadCached(
		cacheKeys.supplierPayables(params),
		() => listSupplierPayables(params),
		options,
	);
}

export async function paySupplierPayable(id: string, payload: any) {
	const payable = await paySupplierPayableById(id, payload);
	invalidateCache("supplierPayables:");
	invalidateCache("expenses:");
	invalidateCache("financial:");
	return payable;
}

export async function addSupplierPurchase(payload: any) {
	const purchase = await createSupplierPurchase(payload);
	invalidateCache("supplierPayables:");
	invalidateCache("products");
	return purchase;
}
// ── Services ──

// Carrega os servicos cadastrados.
export function getCachedServices() {
	return readCache(cacheKeys.services);
}

export async function loadServices(options: any = {}) {
	return loadCached(cacheKeys.services, listServices, options);
}

// Adiciona um novo servico.
export async function addService(svc: any) {
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
export async function updateService(id: string, updates: any) {
	const service = await updateServiceById(id, updates);
	const cached = readCache(cacheKeys.services);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.services,
			cached.map((item: any) => (item.id === id ? service : item)),
		);
	} else {
		invalidateCache(cacheKeys.services);
	}
	return service;
}

// Exclui um servico existente.
export async function deleteService(id: string) {
	await deleteServiceById(id);
	const cached = readCache(cacheKeys.services);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.services,
			cached.filter((item: any) => item.id !== id),
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

export async function loadProducts(options: any = {}) {
	return loadCached(cacheKeys.products, listProducts, options);
}

// Adiciona um novo produto.
export async function addProduct(prod: any) {
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
export async function updateProduct(id: string, updates: any) {
	const product = await updateProductById(id, updates);
	const cached = readCache(cacheKeys.products);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.products,
			cached.map((item: any) => (item.id === id ? product : item)),
		);
	} else {
		invalidateCache(cacheKeys.products);
	}
	return product;
}

// Exclui um produto existente.
export async function deleteProduct(id: string) {
	await deleteProductById(id);
	const cached = readCache(cacheKeys.products);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.products,
			cached.filter((item: any) => item.id !== id),
		);
	} else {
		invalidateCache(cacheKeys.products);
	}
}
// ── Clients ──

export function getCachedFixedClients() {
	return readCache(cacheKeys.fixedClients);
}

export async function loadFixedClients(options: any = {}) {
	return loadCached(cacheKeys.fixedClients, listFixedClients, options);
}

export async function addFixedClient(payload: any) {
	const client = await createFixedClient(payload);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(cacheKeys.fixedClients, [...cached, client]);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	return client;
}

export async function saveFixedClient(id: string, payload: any) {
	const client = await updateFixedClientById(id, payload);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.map((item: any) => (item.id === id ? client : item)),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	return client;
}

export async function deleteFixedClient(id: string) {
	await deleteFixedClientById(id);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.filter((item: any) => item.id !== id),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
}

function invalidateClientCutRelations() {
	invalidateCache("appointments:");
	invalidateCache("financial:");
	invalidateCache("receivables:");
	invalidateCache("supplierPayables:");
}

export async function addFixedClientCut(clientId: string, payload: any) {
	const client = await createClientCut(clientId, payload);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.map((item: any) => (item.id === clientId ? client : item)),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	invalidateClientCutRelations();
	return client;
}

export async function saveFixedClientCut(clientId: string, cutId: string, payload: any) {
	const client = await updateClientCutById(clientId, cutId, payload);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.map((item: any) => (item.id === clientId ? client : item)),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	invalidateClientCutRelations();
	return client;
}

export async function deleteFixedClientCut(clientId: string, cutId: string) {
	const client = await deleteClientCutById(clientId, cutId);
	const cached = readCache(cacheKeys.fixedClients);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.fixedClients,
			cached.map((item: any) => (item.id === clientId ? client : item)),
		);
	} else {
		invalidateCache(cacheKeys.fixedClients);
	}
	invalidateClientCutRelations();
	return client;
}

export function getCachedWaitlist() {
	return readCache(cacheKeys.waitlist);
}

export async function loadWaitlist(options: any = {}) {
	return loadCached(cacheKeys.waitlist, listWaitlist, options);
}

export async function addWaitlistEntry(payload: any) {
	const entry = await createWaitlistEntry(payload);
	const cached = readCache(cacheKeys.waitlist);
	if (Array.isArray(cached)) {
		writeCache(cacheKeys.waitlist, [...cached, entry]);
	} else {
		invalidateCache(cacheKeys.waitlist);
	}
	return entry;
}

export async function saveWaitlistEntry(id: string, payload: any) {
	const entry = await updateWaitlistEntryById(id, payload);
	const cached = readCache(cacheKeys.waitlist);
	if (Array.isArray(cached)) {
		const next =
			entry.status === "aguardando" ?
				cached.map((item: any) => (item.id === id ? entry : item))
			:	cached.filter((item: any) => item.id !== id);
		writeCache(cacheKeys.waitlist, next);
	} else {
		invalidateCache(cacheKeys.waitlist);
	}
	return entry;
}

export async function deleteWaitlistEntry(id: string) {
	await deleteWaitlistEntryById(id);
	const cached = readCache(cacheKeys.waitlist);
	if (Array.isArray(cached)) {
		writeCache(
			cacheKeys.waitlist,
			cached.filter((item: any) => item.id !== id),
		);
	} else {
		invalidateCache(cacheKeys.waitlist);
	}
}
// ── Expenses ──

// Carrega as despesas cadastradas.
export function getCachedExpenses(params?: any) {
	if (typeof params === "string") {
		return readCache(cacheKeys.expenses({ date: params }));
	}
	return readCache(cacheKeys.expenses(params || {}));
}

export async function loadExpenses(params?: any, options: any = {}) {
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
	return loadCached(cacheKeys.expenses({}), listExpenses, options);
}

// Adiciona uma nova despesa.
export async function addExpense(exp: any) {
	const expense = await createExpense(exp);
	invalidateCache("expenses:");
	invalidateCache("financial:");
	return expense;
}

// Atualiza uma despesa existente.
export async function updateExpense(id: string, updates: any) {
	const expense = await updateExpenseById(id, updates);
	invalidateCache("expenses:");
	invalidateCache("financial:");
	return expense;
}

// Exclui uma despesa existente.
export async function deleteExpense(id: string) {
	await deleteExpenseById(id);
	invalidateCache("expenses:");
	invalidateCache("financial:");
}

// Filtra as despesas de um dia especifico.
export async function getExpensesForDay(dayKey: string, options: any = {}) {
	return loadExpenses(dayKey, options);
}
// ── Summaries ──

export function getCachedDaySummaryFromAppointments(dayKey: string, appointments: any[]) {
	const expenses = getCachedExpenses(dayKey);
	if (!expenses) return null;
	return buildDaySummary(appointments, expenses);
}

function buildDaySummary(appointments: any[], expenses: any[]) {
	const today = formatDayKey(new Date());
	let totalReceived = 0;
	let paid = 0;
	let pending = 0;
	let toCollect = 0;
	let overdue = 0;
	let totalIncome = 0;

	appointments.forEach((a: any) => {
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

	const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.value || 0), 0);
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
	dayKey: string,
	appointments: any[],
	options: any = {},
) {
	const expenses = await getExpensesForDay(dayKey, options);
	return buildDaySummary(appointments, expenses);
}

export function prefetchAppData() {
	return Promise.allSettled([]);
}
// ── Formatting ──

// Formata numero para moeda em real.
export function formatCurrency(value: any) {
	const numericValue = Number(value);
	const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
	return safeValue.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});
}

// Converte data para formato YYYY-MM-DD.
export function formatDayKey(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Converte data para um texto amigavel por extenso (ex: "Quarta-feira, 22 de julho").
export function formatDateDisplay(date: any) {
	if (!date) return "";
	const dateObj = date instanceof Date ? date : new Date(date);
	if (isNaN(dateObj.getTime())) return "";

	const formatted = new Intl.DateTimeFormat("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(dateObj);

	return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Diz se a data recebida e hoje.
export function isToday(date: Date) {
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
	storage.removeItem(OFFLINE_APPOINTMENT_QUEUE_KEY);
}
