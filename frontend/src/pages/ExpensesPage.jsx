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
		if (!form.name.trim() || isSubmitting) return;

		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await addExpense({
				name: form.name.trim(),
				value: Number(form.value || 0),
				date: dayKey,
			});
			setForm(initialForm);
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar despesa.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id) => {
		if (isSubmitting) return;

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
			<header className="sticky top-0 z-50 bg-background border-b border-border">
				<div className="px-4 py-3 flex items-center justify-between">
					<h1 className="font-logo text-foreground text-base">DESPESAS</h1>
					<span className="font-mono-ui text-xs text-foreground-faint">
						{formatDateDisplay(currentDate)}
					</span>
				</div>
				<div className="px-4 pb-3 flex items-center justify-center gap-3">
					<button
						onClick={prevDay}
						className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors">
						‹
					</button>
					<span className="font-mono-ui text-xs text-foreground-faint">
						{formatDateDisplay(currentDate)}
					</span>
					<button
						onClick={nextDay}
						className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors">
						›
					</button>
				</div>
			</header>

			<div className="px-4 py-3 border-b border-border bg-card">
				<p className="font-mono-ui text-xs text-foreground-faint">
					TOTAL DO DIA
				</p>
				<p className="font-value text-2xl text-overdue">
					{formatCurrency(total)}
				</p>
			</div>

			<form
				onSubmit={handleCreateExpense}
				className="px-4 py-4 border-b border-border bg-background-deep space-y-3">
				{errorMessage && (
					<p className="font-mono-ui text-[10px] text-overdue">
						{errorMessage}
					</p>
				)}
				<input
					type="text"
					value={form.name}
					onChange={(e) =>
						setForm((prev) => ({ ...prev, name: e.target.value }))
					}
					placeholder="Nome da despesa"
					className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
					disabled={isSubmitting}
				/>
				<input
					type="number"
					step="0.01"
					value={form.value}
					onChange={(e) =>
						setForm((prev) => ({ ...prev, value: e.target.value }))
					}
					placeholder="Valor"
					className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
					disabled={isSubmitting}
				/>
				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full bg-foreground text-primary-foreground font-mono-ui text-sm py-2 rounded">
					{isSubmitting ? "SALVANDO..." : "ADICIONAR DESPESA"}
				</button>
			</form>

			<div className="flex-1 overflow-y-auto pb-20">
				{isLoading ?
					<div className="py-12 text-center font-mono-ui text-xs text-foreground-faint">
						CARREGANDO DESPESAS
					</div>
				: expenses.length === 0 ?
					<div className="py-12 text-center font-mono-ui text-xs text-foreground-faint">
						NENHUMA DESPESA NESTE DIA
					</div>
				:	expenses.map((item) => (
						<div
							key={item.id}
							className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
							<div className="min-w-0 flex-1">
								<p className="font-client text-base text-foreground truncate">
									{item.name}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<span className="font-client text-sm text-overdue">
									{formatCurrency(Number(item.value || 0))}
								</span>
								<button
									onClick={() => handleDelete(item.id)}
									disabled={isSubmitting}
									className="font-mono-ui text-xs text-overdue">
									EXCLUIR
								</button>
							</div>
						</div>
					))
				}
			</div>

			<BottomNav />
		</div>
	);
}
