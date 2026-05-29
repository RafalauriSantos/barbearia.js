import { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
	DateStepper,
	EmptyState,
	IconButton,
	Notice,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import {
	formatCurrency,
	formatDayKey,
	formatDateDisplay,
	addExpense,
	updateExpense,
	deleteExpense,
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
};

export default function ExpensesPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [expenses, setExpenses] = useState([]);
	const [form, setForm] = useState(initialForm);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const hasLoadedRef = useRef(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [formError, setFormError] = useState("");
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState(null);

	const dayKey = formatDayKey(currentDate);

	const reload = useCallback(async () => {
		const hasLoaded = hasLoadedRef.current;
		setIsLoading(!hasLoaded);
		setIsRefreshing(hasLoaded);
		setErrorMessage("");
		try {
			const list = await loadExpenses(dayKey);
			setExpenses(list);
		} catch (error) {
			setErrorMessage(error.message || "Falha ao carregar despesas.");
			setExpenses([]);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
			hasLoadedRef.current = true;
		}
	}, [dayKey]);

	useEffect(() => {
		reload();
	}, [reload]);

	const total = expenses.reduce(
		(sum, item) => sum + Number(item.value || 0),
		0,
	);

	const prevDay = () => {
		const d = new Date(currentDate);
		d.setDate(d.getDate() - 1);
		setCurrentDate(d);
	};

	const nextDay = () => {
		const d = new Date(currentDate);
		d.setDate(d.getDate() + 1);
		setCurrentDate(d);
	};

	const resetForm = () => {
		setForm(initialForm);
		setFormError("");
		setEditingId(null);
		setShowForm(false);
	};

	const openCreateForm = () => {
		resetForm();
		setShowForm(true);
	};

	const handleEditItem = (item) => {
		setEditingId(item.id);
		setForm({
			name: item.name || "",
			value: String(item.value ?? ""),
		});
		setFormError("");
		setShowForm(true);
	};

	const handleSaveExpense = async (e) => {
		e.preventDefault();
		if (isSubmitting) return;

		const validationMessage =
			validateRequiredText(form.name, "Nome da despesa", {
				minLength: 3,
				maxLength: 80,
			}) || validateMoney(form.value, "Valor", { max: 99999.99 });
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
				date: dayKey,
			};
			if (editingId) {
				await updateExpense(editingId, payload);
			} else {
				await addExpense(payload);
			}
			resetForm();
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar despesa.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id) => {
		if (isSubmitting) return;
		if (!window.confirm("Excluir esta despesa?")) return;

		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await deleteExpense(id);
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao excluir despesa.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<ScreenHeader
				eyebrow="Saídas"
				title="Despesas"
				action={
					<IconButton
						label="Adicionar despesa"
						onClick={openCreateForm}
						tone="primary">
						+
					</IconButton>
				}>
				<DateStepper
					label={formatDateDisplay(currentDate)}
					onPrev={prevDay}
					onNext={nextDay}
				/>
			</ScreenHeader>

			<div className="shrink-0 px-4 pt-4">
				<div className="rounded-lg border border-border bg-card p-4">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Total do dia
					</p>
					<p className="mt-1 font-value text-3xl leading-none text-overdue">
						{formatCurrency(total)}
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
									Saída do dia
								</p>
								<h2 className="mt-1 font-logo text-lg text-foreground">
									{editingId ? "Editar despesa" : "Nova despesa"}
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
								Nome da despesa
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
						<div className="flex gap-2">
							<button
								type="submit"
								disabled={isSubmitting}
								className="flex-1 rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
								{isSubmitting ?
									"Salvando..."
								: editingId ?
									"Salvar"
								:	"Adicionar despesa"}
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

			<div className="min-h-0 flex-1 overflow-y-auto pb-4">
				{isLoading && expenses.length === 0 && (
					<p className="mx-4 mt-4 rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase text-foreground-faint">
						Atualizando despesas...
					</p>
				)}

				{expenses.length === 0 ?
					<div className="mx-4 mt-4">
						<EmptyState
							title="Nenhuma despesa neste dia"
							hint="Registre apenas saídas que afetam o caixa do dia."
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
