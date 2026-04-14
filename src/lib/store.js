const APPT_KEY = "kurt_appointments";
const SVC_KEY = "kurt_services";
const PROD_KEY = "kurt_products";
const EXP_KEY = "kurt_expenses";
const PROFILE_KEY = "kurt_profile";

function readList(key) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveList(key, list) {
	localStorage.setItem(key, JSON.stringify(list));
}

function addItem(key, item) {
	const all = readList(key);
	const newItem = { ...item, id: generateId() };
	all.push(newItem);
	saveList(key, all);
	return newItem;
}

function updateItem(key, id, updates) {
	const all = readList(key);
	const idx = all.findIndex((item) => item.id === id);
	if (idx >= 0) {
		all[idx] = { ...all[idx], ...updates };
		saveList(key, all);
	}
	return all;
}

function deleteItem(key, id) {
	const all = readList(key).filter((item) => item.id !== id);
	saveList(key, all);
}

export function loadProfile() {
	try {
		const raw = localStorage.getItem(PROFILE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
export function saveProfile(profile) {
	localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
function generateId() {
	return Math.random().toString(36).substring(2, 10);
}
// ── Appointments ──
export function loadAppointments() {
	return readList(APPT_KEY);
}
export function saveAppointments(appointments) {
	saveList(APPT_KEY, appointments);
}
export function addAppointment(appt) {
	return addItem(APPT_KEY, appt);
}
export function updateAppointment(id, updates) {
	return updateItem(APPT_KEY, id, updates);
}
export function deleteAppointment(id) {
	deleteItem(APPT_KEY, id);
}
export function getAppointmentsForDay(dayKey) {
	return loadAppointments()
		.filter((a) => a.day_key === dayKey)
		.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
}
// ── Services ──
export function loadServices() {
	return readList(SVC_KEY);
}
function saveServices(services) {
	saveList(SVC_KEY, services);
}
export function addService(svc) {
	return addItem(SVC_KEY, svc);
}
export function updateService(id, updates) {
	updateItem(SVC_KEY, id, updates);
}
export function deleteService(id) {
	deleteItem(SVC_KEY, id);
}
// ── Products ──
export function loadProducts() {
	return readList(PROD_KEY);
}
function saveProducts(products) {
	saveList(PROD_KEY, products);
}
export function addProduct(prod) {
	return addItem(PROD_KEY, prod);
}
export function updateProduct(id, updates) {
	updateItem(PROD_KEY, id, updates);
}
export function deleteProduct(id) {
	deleteItem(PROD_KEY, id);
}
// ── Expenses ──
export function loadExpenses() {
	return readList(EXP_KEY);
}
function saveExpenses(expenses) {
	saveList(EXP_KEY, expenses);
}
export function addExpense(exp) {
	return addItem(EXP_KEY, exp);
}
export function updateExpense(id, updates) {
	updateItem(EXP_KEY, id, updates);
}
export function deleteExpense(id) {
	deleteItem(EXP_KEY, id);
}
export function getExpensesForDay(dayKey) {
	return loadExpenses().filter((e) => e.date === dayKey);
}
// ── Summaries ──
export function getDaySummary(dayKey) {
	const appts = getAppointmentsForDay(dayKey);
	const expenses = getExpensesForDay(dayKey);
	const today = new Date().toISOString().slice(0, 10);
	let totalReceived = 0;
	let paid = 0;
	let pending = 0;
	let toCollect = 0;
	let overdue = 0;
	let totalIncome = 0;
	appts.forEach((a) => {
		totalIncome += a.value;
		if (a.status === "paid") {
			totalReceived += a.value;
			paid++;
		} else if (a.status === "fiado") {
			toCollect += a.value;
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
		totalClients: appts.length,
		totalIncome,
		totalExpenses,
		paid,
		pending,
		toCollect,
		overdue,
	};
}
// ── Formatting ──
export function formatCurrency(value) {
	return value.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});
}
export function formatDayKey(date) {
	return date.toISOString().slice(0, 10);
}
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
export function isToday(date) {
	const today = new Date();
	return date.toDateString() === today.toDateString();
}

export function clearAllData() {
	localStorage.removeItem(APPT_KEY);
	localStorage.removeItem(SVC_KEY);
	localStorage.removeItem(PROD_KEY);
	localStorage.removeItem(EXP_KEY);
	localStorage.removeItem(PROFILE_KEY);
}
