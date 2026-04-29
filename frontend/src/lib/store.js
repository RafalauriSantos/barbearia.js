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
	listExpenses,
	listExpensesByDay,
	createExpense,
	updateExpenseById,
	deleteExpenseById,
} from "@/lib/api/expenses.api";
import { getProfile, updateProfile, resetAllData } from "@/lib/api/profile.api";

// Chaves usadas para salvar dados no navegador.
const APPT_KEY = "kurt_appointments";
const SVC_KEY = "kurt_services";
const PROD_KEY = "kurt_products";
const EXP_KEY = "kurt_expenses";
const PROFILE_KEY = "kurt_profile";

// Carrega os dados basicos de perfil.
export async function loadProfile() {
	return getProfile();
}

// Salva os dados basicos de perfil.
export async function saveProfile(profile) {
	return updateProfile(profile);
}
// ── Appointments ──

// Envia um novo agendamento para o backend.
export async function addAppointment(appt) {
	return createAppointment(appt);
}

// Atualiza um agendamento local pelo id.
export async function updateAppointment(id, updates) {
	return updateAppointmentById(id, updates);
}

// Exclui um agendamento local pelo id.
export async function deleteAppointment(id) {
	await deleteAppointmentById(id);
}

// Filtra os agendamentos de um dia e ordena por horario.
export async function getAppointmentsForDay(dayKey) {
	return listAppointmentsByDay(dayKey);
}
// ── Services ──

// Carrega os servicos cadastrados.
export async function loadServices() {
	return listServices();
}

// Adiciona um novo servico.
export async function addService(svc) {
	return createService(svc);
}

// Atualiza um servico existente.
export async function updateService(id, updates) {
	return updateServiceById(id, updates);
}

// Exclui um servico existente.
export async function deleteService(id) {
	await deleteServiceById(id);
}
// ── Products ──

// Carrega os produtos cadastrados.
export async function loadProducts() {
	return listProducts();
}

// Adiciona um novo produto.
export async function addProduct(prod) {
	return createProduct(prod);
}

// Atualiza um produto existente.
export async function updateProduct(id, updates) {
	return updateProductById(id, updates);
}

// Exclui um produto existente.
export async function deleteProduct(id) {
	await deleteProductById(id);
}
// ── Expenses ──

// Carrega as despesas cadastradas.
export async function loadExpenses(dayKey) {
	if (dayKey) {
		return listExpensesByDay(dayKey);
	}
	return listExpenses();
}

// Adiciona uma nova despesa.
export async function addExpense(exp) {
	return createExpense(exp);
}

// Atualiza uma despesa existente.
export async function updateExpense(id, updates) {
	return updateExpenseById(id, updates);
}

// Exclui uma despesa existente.
export async function deleteExpense(id) {
	await deleteExpenseById(id);
}

// Filtra as despesas de um dia especifico.
export async function getExpensesForDay(dayKey) {
	return listExpensesByDay(dayKey);
}
// ── Summaries ──

// Monta os totais do dia com a lista de agendamentos recebida da API.
export async function getDaySummaryFromAppointments(dayKey, appointments) {
	const expenses = await getExpensesForDay(dayKey);
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
	localStorage.removeItem(APPT_KEY);
	localStorage.removeItem(SVC_KEY);
	localStorage.removeItem(PROD_KEY);
	localStorage.removeItem(EXP_KEY);
	localStorage.removeItem(PROFILE_KEY);
}
