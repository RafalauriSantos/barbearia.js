import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

// Chaves usadas para salvar dados no navegador.
const APPT_KEY = "kurt_appointments";
const SVC_KEY = "kurt_services";
const PROD_KEY = "kurt_products";
const EXP_KEY = "kurt_expenses";
const PROFILE_KEY = "kurt_profile";

// Lê uma lista do localStorage pela chave.
function readList(key) {
	try {
		// Lê uma lista salva no localStorage.
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

// Salva uma lista no localStorage.
function saveList(key, list) {
	localStorage.setItem(key, JSON.stringify(list));
}

// Adiciona um item na lista e cria um id simples.
function addItem(key, item) {
	const all = readList(key);
	const newItem = { ...item, id: generateId() };
	all.push(newItem);
	saveList(key, all);
	return newItem;
}

// Atualiza um item ja existente na lista.
function updateItem(key, id, updates) {
	const all = readList(key);
	const idx = all.findIndex((item) => item.id === id);
	if (idx >= 0) {
		all[idx] = { ...all[idx], ...updates };
		saveList(key, all);
	}
	return all;
}

// Remove um item da lista pelo id.
function deleteItem(key, id) {
	const all = readList(key).filter((item) => item.id !== id);
	saveList(key, all);
}

// Carrega os dados basicos de perfil.
export function loadProfile() {
	try {
		const raw = localStorage.getItem(PROFILE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

// Salva os dados basicos de perfil.
export function saveProfile(profile) {
	localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// Gera um id simples para itens locais.
function generateId() {
	return Math.random().toString(36).substring(2, 10);
}
// ── Appointments ──

function normalizeAppointment(raw) {
	return {
		id: raw.id,
		client_name: raw.client_name || raw.cliente_nome || "",
		day_key: raw.day_key || raw.data || "",
		time_slot: raw.time_slot || raw.hora || "09:00",
		value: Number(raw.value || 0),
		status: raw.status || "normal",
		service_id: raw.service_id,
		service_name: raw.service_name,
		prazo_date: raw.prazo_date,
		barber_name: raw.barber_name,
		barbearia_id: raw.barbearia_id || 1,
	};
}

// Carrega todos os agendamentos salvos localmente.
export function loadAppointments() {
	return readList(APPT_KEY);
}

// Salva a lista completa de agendamentos localmente.
export function saveAppointments(appointments) {
	saveList(APPT_KEY, appointments);
}

// Envia um novo agendamento para o backend.
export async function addAppointment(appt) {
	// Converte os nomes do front para os nomes esperados pela API.
	const payload = {
		cliente_nome: appt.client_name,
		data: appt.day_key,
		hora: appt.time_slot,
		barbearia_id: appt.barbearia_id || 1,
		client_name: appt.client_name,
		day_key: appt.day_key,
		time_slot: appt.time_slot,
		value: appt.value || 0,
		status: appt.status || "normal",
		service_id: appt.service_id,
		service_name: appt.service_name,
		prazo_date: appt.prazo_date,
		barber_name: appt.barber_name,
	};

	// Envia o novo agendamento para o backend.
	const response = await axios.post(`${API_BASE_URL}/agendamentos`, payload);
	return normalizeAppointment(response.data);
}

// Atualiza um agendamento local pelo id.
export async function updateAppointment(id, updates) {
	const response = await axios.put(
		`${API_BASE_URL}/agendamentos/${id}`,
		updates,
	);
	return normalizeAppointment(response.data);
}

// Exclui um agendamento local pelo id.
export async function deleteAppointment(id) {
	await axios.delete(`${API_BASE_URL}/agendamentos/${id}`);
}

// Filtra os agendamentos de um dia e ordena por horario.
export async function getAppointmentsForDay(dayKey) {
	const response = await axios.get(`${API_BASE_URL}/agendamentos`, {
		params: { data: dayKey },
	});

	return response.data
		.map(normalizeAppointment)
		.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
}
// ── Services ──

// Carrega os servicos cadastrados.
export function loadServices() {
	return readList(SVC_KEY);
}

// Salva a lista completa de servicos.
function saveServices(services) {
	saveList(SVC_KEY, services);
}

// Adiciona um novo servico.
export function addService(svc) {
	return addItem(SVC_KEY, svc);
}

// Atualiza um servico existente.
export function updateService(id, updates) {
	updateItem(SVC_KEY, id, updates);
}

// Exclui um servico existente.
export function deleteService(id) {
	deleteItem(SVC_KEY, id);
}
// ── Products ──

// Carrega os produtos cadastrados.
export function loadProducts() {
	return readList(PROD_KEY);
}

// Salva a lista completa de produtos.
function saveProducts(products) {
	saveList(PROD_KEY, products);
}

// Adiciona um novo produto.
export function addProduct(prod) {
	return addItem(PROD_KEY, prod);
}

// Atualiza um produto existente.
export function updateProduct(id, updates) {
	updateItem(PROD_KEY, id, updates);
}

// Exclui um produto existente.
export function deleteProduct(id) {
	deleteItem(PROD_KEY, id);
}
// ── Expenses ──

// Carrega as despesas cadastradas.
export function loadExpenses() {
	return readList(EXP_KEY);
}

// Salva a lista completa de despesas.
function saveExpenses(expenses) {
	saveList(EXP_KEY, expenses);
}

// Adiciona uma nova despesa.
export function addExpense(exp) {
	return addItem(EXP_KEY, exp);
}

// Atualiza uma despesa existente.
export function updateExpense(id, updates) {
	updateItem(EXP_KEY, id, updates);
}

// Exclui uma despesa existente.
export function deleteExpense(id) {
	deleteItem(EXP_KEY, id);
}

// Filtra as despesas de um dia especifico.
export function getExpensesForDay(dayKey) {
	return loadExpenses().filter((e) => e.date === dayKey);
}
// ── Summaries ──

// Monta os totais do dia para mostrar no resumo.
export function getDaySummary(dayKey) {
	// Junta agendamentos e despesas para montar o resumo do dia.
	const appts = loadAppointments().filter((a) => a.day_key === dayKey);
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

// Monta os totais do dia com a lista de agendamentos recebida da API.
export function getDaySummaryFromAppointments(dayKey, appointments) {
	const expenses = getExpensesForDay(dayKey);
	const today = new Date().toISOString().slice(0, 10);
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
// ── Formatting ──

// Formata numero para moeda em real.
export function formatCurrency(value) {
	return value.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});
}

// Converte data para formato YYYY-MM-DD.
export function formatDayKey(date) {
	return date.toISOString().slice(0, 10);
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
export function clearAllData() {
	localStorage.removeItem(APPT_KEY);
	localStorage.removeItem(SVC_KEY);
	localStorage.removeItem(PROD_KEY);
	localStorage.removeItem(EXP_KEY);
	localStorage.removeItem(PROFILE_KEY);
}
