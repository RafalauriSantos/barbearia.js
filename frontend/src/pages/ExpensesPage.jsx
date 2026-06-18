import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
	EmptyState,
	IconButton,
	Notice,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import {
	formatCurrency,
	formatDayKey,
	addExpense,
	updateExpense,
	deleteExpense,
	getCachedExpenses,
	loadExpenses,
} from "@/lib/store";
import {
	parseMoneyInput,
	validateMoney,
	validateRequiredText,
} from "@/lib/validation";

const initialForm = {
	name: "",
	value: "",
	date: "",
};

function addDays(date, amount) {
	const next = new Date(date);
	next.setDate(next.getDate() + amount);
	return next;
}

function getMonthStart(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatShortDate(dayKey) {
	if (!dayKey) return "";
	return dayKey.split("-").reverse().join("/");
}

export default function ExpensesPage() {
	const initialDate = new Date();
	const initialDayKey = formatDayKey(initialDate);
	const initialParams = { start_date: initialDayKey, end_date: initialDayKey };
	const initialExpenses = getCachedExpenses(initialParams);
	const [startDate, setStartDate] = useState(initialDayKey);
	const [endDate, setEndDate] = useState(initialDayKey);
	const [expenses, setExpenses] = useState(initialExpenses || []);
	const [form, setForm] = useState(initialForm);
	const [isLoading, setIsLoading] = useState(!initialExpenses);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const hasLoadedRef = useRef(Boolean(initialExpenses));
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [formError, setFormError] = useState("");
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState(null);

	const filterParams = useMemo(() => (
		startDate <= endDate ?
			{ start_date: startDate, end_date: endDate }
		:	{ start_date: endDate, end_date: startDate }
	), [endDate, startDate]);

	const reload = useCallback(async () => {
		const hasLoaded = hasLoadedRef.current;
		setIsLoading(!hasLoaded);
		setIsRefreshing(hasLoaded);
		setErrorMessage("");
		try {
			const list = await loadExpenses(filterParams, { force: true });
			setExpenses(list);
		} catch (error) {
			setErrorMessage(error.message || "Falha ao carregar custos.");
			if (!hasLoaded) {
				setExpenses([]);
			}
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
			hasLoadedRef.current = true;
		}
	}, [filterParams]);

	useEffect(() => {
		reload();
	}, [reload]);

	const total = expenses.reduce(
		(sum, item) => sum + Number(item.value || 0),
		0,
	);

	const setSingleDay = (date) => {
		const key = formatDayKey(date);
		setStartDate(key);
		setEndDate(key);
	};

	const setLastSevenDays = () => {
		const today = new Date();
		setStartDate(formatDayKey(addDays(today, -6)));
		setEndDate(formatDayKey(today));
	};

	const setCurrentMonth = () => {
		const today = new Date();
		setStartDate(getMonthStart(today));
		setEndDate(formatDayKey(today));
	};

	const resetForm = () => {
		setForm({ ...initialForm, date: endDate });
		setFormError("");
		setEditingId(null);
		setShowForm(false);
	};

	const openCreateForm = () => {
		resetForm();
		setForm({ ...initialForm, date: endDate });
		setShowForm(true);
	};

	const handleEditItem = (item) => {
		setEditingId(item.id);
		setForm({
			name: item.name || "",
			value: String(item.value ?? ""),
			date: item.date || endDate,
		});
		setFormError("");
		setShowForm(true);
	};

	const handleSaveExpense = async (e) => {
		e.preventDefault();
		if (isSubmitting) return;

		const validationMessage =
			validateRequiredText(form.name, "Nome do custo", {
				minLength: 3,
				maxLength: 80,
			}) ||
			validateMoney(form.value, "Valor", { max: 99999.99 }) ||
			validateRequiredText(form.date, "Data", { minLength: 10, maxLength: 10 });
		if (validationMessage) {
			setFormError(validationMessage);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		setFormError("");
		try {
			const payload = {
				name: form.name.trim(),
				value: parseMoneyInput(form.value),
				date: form.date,
			};
			if (editingId) {
				await updateExpense(editingId, payload);
			} else {
				await addExpense(payload);
			}
			resetForm();
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar custo.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id) => {
		if (isSubmitting) return;
		if (!window.confirm("Excluir este custo?")) return;

		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await deleteExpense(id);
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao excluir custo.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<ScreenHeader
				eyebrow="Saídas"
				title="Custos"
				action={
					<IconButton
						label="Adicionar custo"
						onClick={openCreateForm}
						tone="primary">
						+
					</IconButton>
				}>
				<div className="mt-4 space-y-3 rounded-lg border border-border bg-background-deep p-3">
					<div className="grid grid-cols-2 gap-2">
						<label className="block">
							<span className="mb-1 block font-mono-ui text-[10px] uppercase text-foreground-faint">
								De
							</span>
							<input
								type="date"
								value={startDate}
								onChange={(event) => setStartDate(event.target.value)}
								className="h-10 w-full rounded-md border border-border bg-secondary px-2 font-mono-ui text-xs text-foreground"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-mono-ui text-[10px] uppercase text-foreground-faint">
								Ate
							</span>
							<input
								type="date"
								value={endDate}
								onChange={(event) => setEndDate(event.target.value)}
								className="h-10 w-full rounded-md border border-border bg-secondary px-2 font-mono-ui text-xs text-foreground"
							/>
						</label>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<button
							type="button"
							onClick={() => setSingleDay(new Date())}
							className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							Hoje
						</button>
						<button
							type="button"
							onClick={setLastSevenDays}
							className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							7 dias
						</button>
						<button
							type="button"
							onClick={setCurrentMonth}
							className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							Mês
						</button>
					</div>
				</div>
			</ScreenHeader>

			<div className="shrink-0 px-4 pt-4">
				<div className="rounded-lg border border-border bg-card p-4">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Total do período
					</p>
					<p className="mt-1 font-value text-3xl leading-none text-overdue">
						{formatCurrency(total)}
					</p>
					<p className="mt-2 font-mono-ui text-[10px] text-foreground-faint">
						{expenses.length} custos de {formatShortDate(filterParams.start_date)} a{" "}
						{formatShortDate(filterParams.end_date)}
					</p>
				</div>
			</div>

			{showForm && (
				<div
					className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-0 backdrop-blur-sm"
					onClick={resetForm}>
					<form
						onSubmit={handleSaveExpense}
						className="max-h-[92dvh] w-full max-w-[480px] space-y-3 overflow-y-auto rounded-t-lg border-x border-t border-border bg-background px-4 pb-6 pt-4"
						onClick={(event) => event.stopPropagation()}>
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
									Saída do caixa
								</p>
								<h2 className="mt-1 font-logo text-lg text-foreground">
									{editingId ? "Editar custo" : "Novo custo"}
								</h2>
							</div>
							<IconButton label="Fechar" onClick={resetForm}>
								×
							</IconButton>
						</div>
						{errorMessage && (
							<Notice tone="error" title="Erro">
								{errorMessage}
							</Notice>
						)}
						{formError && (
							<Notice tone="error" title="Erro">
								{formError}
							</Notice>
						)}
						<div className="rounded-lg border border-border bg-card p-4">
							<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Nome do custo
							</label>
							<input
								type="text"
								value={form.name}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, name: e.target.value }))
								}
								onInput={() => setFormError("")}
								placeholder="Aluguel, compra, manutenção"
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								disabled={isSubmitting}
							/>
						</div>
						<div className="rounded-lg border border-border bg-card p-4">
							<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Valor
							</label>
							<input
								type="text"
								inputMode="decimal"
								value={form.value}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, value: e.target.value }))
								}
								onInput={() => setFormError("")}
								placeholder="120,00"
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								disabled={isSubmitting}
							/>
						</div>
						<div className="rounded-lg border border-border bg-card p-4">
							<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Data
							</label>
							<input
								type="date"
								value={form.date}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, date: e.target.value }))
								}
								onInput={() => setFormError("")}
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								disabled={isSubmitting}
							/>
						</div>
						<div className="flex gap-2">
							<button
								type="submit"
								disabled={isSubmitting}
								className="flex-1 rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
								{isSubmitting ?
									"Salvando..."
								: editingId ?
									"Salvar"
								:	"Adicionar custo"}
							</button>
							<button
								type="button"
								onClick={resetForm}
								disabled={isSubmitting}
								className="rounded-md border border-border px-4 py-3 font-mono-ui text-sm text-foreground-faint">
								Cancelar
							</button>
						</div>
					</form>
				</div>
			)}

			<div className="min-h-0 flex-1 overflow-y-auto safe-bottom">
				{isLoading && expenses.length === 0 && (
					<p className="mx-4 mt-4 rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase text-foreground-faint">
						Atualizando custos...
					</p>
				)}

				{expenses.length === 0 ?
					<div className="mx-4 mt-4">
						<EmptyState
							title="Nenhum custo no período"
							hint="Registre apenas saídas que afetam o caixa do período."
						/>
					</div>
				:	<div className="grid gap-2 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
						{expenses.map((item) => (
							<div
								key={item.id}
								className="rounded-lg border border-border bg-card p-4">
								<div className="flex items-center justify-between gap-3">
									<div className="min-w-0 flex-1">
										<p className="truncate font-client text-base text-foreground">
											{item.name}
										</p>
										<p className="mt-1 font-value text-lg text-overdue">
											{formatCurrency(Number(item.value || 0))}
										</p>
										<p className="mt-1 font-mono-ui text-[10px] text-foreground-faint">
											{formatShortDate(item.date)}
										</p>
									</div>
									<div className="flex shrink-0 gap-2">
										<button
											onClick={() => handleEditItem(item)}
											disabled={isSubmitting}
											className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
											Editar
										</button>
										<button
											onClick={() => handleDelete(item.id)}
											disabled={isSubmitting}
											className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2 font-mono-ui text-[10px] text-overdue">
											Excluir
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				}
			</div>

			<BottomNav />
		</div>
	);
}
