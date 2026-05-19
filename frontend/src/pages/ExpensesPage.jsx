import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
	formatCurrency,
	formatDayKey,
	formatDateDisplay,
	addExpense,
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
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [formError, setFormError] = useState("");
	const [showForm, setShowForm] = useState(false);

	const dayKey = formatDayKey(currentDate);

	const reload = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			const list = await loadExpenses(dayKey);
			setExpenses(list);
		} catch (error) {
			setErrorMessage(error.message || "Falha ao carregar despesas.");
			setExpenses([]);
		} finally {
			setIsLoading(false);
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

	const handleCreateExpense = async (e) => {
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
			await addExpense({
				name: form.name.trim(),
				value: parseMoneyInput(form.value),
				date: dayKey,
			});
			setForm(initialForm);
			setShowForm(false);
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
		<div className="app-shell flex flex-col min-h-[100dvh] bg-background">
			<header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Saídas
						</p>
						<h1 className="mt-1 font-logo text-xl leading-tight text-foreground">
							Despesas
						</h1>
					</div>
					<span className="rounded-md border border-border bg-card px-2.5 py-1.5 font-mono-ui text-[10px] text-foreground-faint">
						{formatDateDisplay(currentDate)}
					</span>
				</div>
				<div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-background-deep p-1.5">
					<button
						onClick={prevDay}
						className="flex h-9 w-10 items-center justify-center rounded-md text-xl text-foreground-faint hover:bg-secondary hover:text-foreground">
						‹
					</button>
					<span className="min-w-0 flex-1 truncate px-2 text-center font-mono-ui text-xs text-foreground">
						{formatDateDisplay(currentDate)}
					</span>
					<button
						onClick={nextDay}
						className="flex h-9 w-10 items-center justify-center rounded-md text-xl text-foreground-faint hover:bg-secondary hover:text-foreground">
						›
					</button>
				</div>
			</header>

			<div className="px-4 pt-4">
				<div className="rounded-lg border border-border bg-card p-4">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Total do dia
					</p>
					<p className="mt-1 font-value text-3xl leading-none text-overdue">
						{formatCurrency(total)}
					</p>
				</div>
			</div>

			<div className="px-4 pt-3">
				<button
					onClick={() => setShowForm((prev) => !prev)}
					className="rounded-md bg-foreground px-3 py-2 font-mono-ui text-[10px] text-primary-foreground">
					{showForm ? "Fechar" : "Adicionar despesa"}
				</button>
			</div>

			{showForm && (
				<form
					onSubmit={handleCreateExpense}
					className="mx-4 mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
					{errorMessage && (
						<p className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2 font-mono-ui text-[10px] text-overdue">
							{errorMessage}
						</p>
					)}
					{formError && (
						<p className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2 font-mono-ui text-[10px] text-overdue">
							{formError}
						</p>
					)}
					<input
						type="text"
						value={form.name}
						onChange={(e) =>
							setForm((prev) => ({ ...prev, name: e.target.value }))
						}
						onInput={() => setFormError("")}
						placeholder="Nome da despesa"
						className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
						disabled={isSubmitting}
					/>
					<input
						type="text"
						inputMode="decimal"
						value={form.value}
						onChange={(e) =>
							setForm((prev) => ({ ...prev, value: e.target.value }))
						}
						onInput={() => setFormError("")}
						placeholder="Valor"
						className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
						disabled={isSubmitting}
					/>
					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
						{isSubmitting ? "Salvando..." : "Adicionar despesa"}
					</button>
				</form>
			)}

			<div className="flex-1 overflow-y-auto pb-24">
				{isLoading ?
					<div className="mx-4 mt-4 rounded-lg border border-border bg-card px-4 py-12 text-center font-mono-ui text-xs text-foreground-faint">
						Carregando despesas
					</div>
				: expenses.length === 0 ?
					<div className="mx-4 mt-4 rounded-lg border border-border bg-card px-4 py-12 text-center font-mono-ui text-xs text-foreground-faint">
						Nenhuma despesa neste dia
					</div>
				:	<div className="space-y-2 px-4 py-4">
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
									<button
										onClick={() => handleDelete(item.id)}
										disabled={isSubmitting}
										className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2 font-mono-ui text-[10px] text-overdue">
										Excluir
									</button>
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
