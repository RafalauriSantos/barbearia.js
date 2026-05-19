import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DaySummaryCard } from "@/components/DaySummaryCard";
import { AppointmentRow } from "@/components/AppointmentRow";
import { SmartInput } from "@/components/SmartInput";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { BottomNav } from "@/components/BottomNav";
import { FinancialSummaryCompact } from "@/components/FinancialSummaryCompact";
import {
	getAppointmentsForDayWithFilters,
	getDaySummaryFromAppointments,
	formatDayKey,
	loadBarbers,
	loadFinancialSummary,
} from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

// Tela principal da agenda do dia.
export default function AppPage() {
	// Estado principal da tela.
	const [currentDate, setCurrentDate] = useState(new Date());
	const [appointments, setAppointments] = useState([]);
	const [summary, setSummary] = useState({
		totalReceived: 0,
		totalClients: 0,
		totalIncome: 0,
		totalExpenses: 0,
		paid: 0,
		pending: 0,
		toCollect: 0,
		overdue: 0,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingAppt, setEditingAppt] = useState();
	const [financialSummary, setFinancialSummary] = useState(null);
	const [showFinancial, setShowFinancial] = useState(false);
	const [barbers, setBarbers] = useState([]);
	const [agendaKey, setAgendaKey] = useState("mine");
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
	// Busca os dados do dia selecionado.
	const dayKey = formatDayKey(currentDate);
	const ownBarberId = user?.barbeiro_id || "";
	const selectedBarberId = agendaKey === "mine" ? ownBarberId : agendaKey;
	const shouldSelectAgenda = isAdmin && !selectedBarberId;
	const selectedBarberName =
		agendaKey === "mine" ?
			user?.nome || user?.email || "Minha agenda"
		:	barbers.find((barber) => barber.id === agendaKey)?.name || "Agenda";

	useEffect(() => {
		if (!isAdmin) return;
		if (!ownBarberId && agendaKey === "mine") {
			setAgendaKey("");
		}
	}, [agendaKey, isAdmin, ownBarberId]);

	useEffect(() => {
		if (!isAdmin) return;
		loadBarbers()
			.then((list) => setBarbers(list))
			.catch((error) => {
				setBarbers([]);
				setErrorMessage(error.message || "Falha ao carregar barbeiros.");
			});
	}, [isAdmin]);

	// Força a tela a atualizar depois de salvar/editar/excluir.
	const reload = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		if (!selectedBarberId) {
			setAppointments([]);
			setFinancialSummary(null);
			setSummary({
				totalReceived: 0,
				totalClients: 0,
				totalIncome: 0,
				totalExpenses: 0,
				paid: 0,
				pending: 0,
				toCollect: 0,
				overdue: 0,
			});
			setIsLoading(false);
			return;
		}
		try {
			const list = await getAppointmentsForDayWithFilters(dayKey, {
				barbeiro_id: selectedBarberId,
			});
			setAppointments(list);
			const nextSummary = await getDaySummaryFromAppointments(dayKey, list);
			setSummary(nextSummary);
			const nextFinancialSummary = await loadFinancialSummary({
				start_date: dayKey,
				end_date: dayKey,
				barbeiro_id: selectedBarberId,
			});
			setFinancialSummary(nextFinancialSummary);
		} catch (error) {
			setAppointments([]);
			setFinancialSummary(null);
			setSummary({
				totalReceived: 0,
				totalClients: 0,
				totalIncome: 0,
				totalExpenses: 0,
				paid: 0,
				pending: 0,
				toCollect: 0,
				overdue: 0,
			});
			setErrorMessage(
				error.message || "Falha ao carregar os agendamentos do dia.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [dayKey, selectedBarberId]);

	useEffect(() => {
		reload();
	}, [reload]);
	// Volta um dia na agenda.
	const prevDay = () => {
		const d = new Date(currentDate);
		d.setDate(d.getDate() - 1);
		setCurrentDate(d);
	};
	// Avanca um dia na agenda.
	const nextDay = () => {
		const d = new Date(currentDate);
		d.setDate(d.getDate() + 1);
		setCurrentDate(d);
	};
	const openEdit = (appt) => {
		// Abre o modal com os dados já preenchidos.
		setEditingAppt(appt);
		setDialogOpen(true);
	};

	return (
		<div className="app-shell flex flex-col min-h-[100dvh] bg-background">
			<AppHeader
				currentDate={currentDate}
				onPrevDay={prevDay}
				onNextDay={nextDay}
				onSettings={() => navigate("/settings")}
			/>

			{isAdmin && (
				<div className="px-4 pt-3">
					<div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Agenda: {selectedBarberName}
						</p>
						<select
							value={agendaKey}
							onChange={(e) => {
								setAgendaKey(e.target.value);
								setErrorMessage("");
							}}
							className="rounded-md border border-border bg-background-deep px-3 py-2 font-mono-ui text-[10px] text-foreground">
							<option value="mine">Minha agenda</option>
							{barbers.map((barber) => (
								<option key={barber.id} value={barber.id}>
									{barber.name}
								</option>
							))}
						</select>
					</div>
				</div>
			)}

			<DaySummaryCard summary={summary} />
			<div className="px-4 pt-2">
				<button
					onClick={() => setShowFinancial((prev) => !prev)}
					className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
					{showFinancial ? "Fechar financeiro" : "Ver financeiro"}
				</button>
			</div>
			{showFinancial && (
				<FinancialSummaryCompact
					summary={financialSummary}
					isLoading={isLoading}
				/>
			)}

			<div className="flex-1 overflow-y-auto pb-32">
				{errorMessage && (
					<div className="mx-4 mt-4 rounded-lg border border-overdue/30 bg-overdue/10 px-4 py-3">
						<p className="font-mono-ui text-[10px] text-overdue">Erro</p>
						<p className="mt-1 font-client text-sm text-overdue">
							{errorMessage}
						</p>
						<button
							onClick={reload}
							className="mt-3 rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground">
							Tentar novamente
						</button>
					</div>
				)}

				{isLoading ?
					<div className="mx-4 mt-4 rounded-lg border border-border bg-card px-4 py-12 text-center">
						<span className="font-mono-ui text-xs text-foreground-faint">
							Carregando agenda
						</span>
					</div>
				: appointments.length === 0 ?
					<div className="mx-4 mt-4 rounded-lg border border-border bg-card px-4 py-6 text-center">
						<span className="font-mono-ui text-xs text-foreground-faint">
							{shouldSelectAgenda ?
								"Selecione uma agenda"
							:	"Nenhum atendimento hoje"}
						</span>
						<span className="mt-2 block font-client text-sm text-foreground-faint">
							{shouldSelectAgenda ?
								"Escolha um barbeiro para ver a agenda."
							:	"Adicione o primeiro cliente abaixo."}
						</span>
					</div>
				:	appointments.map((appt) => (
						<AppointmentRow
							key={appt.id}
							appointment={appt}
							onUpdate={reload}
							onEdit={() => openEdit(appt)}
						/>
					))
				}
			</div>

			{/* Smart input + add button */}
			<div className="sticky bottom-[76px] border-t border-border bg-background/95 px-3 py-3 backdrop-blur">
				<SmartInput
					dayKey={dayKey}
					barbeiroId={selectedBarberId}
					onAdd={reload}
					onError={setErrorMessage}
					requireBarberSelection={isAdmin}
				/>
			</div>

			<BottomNav />

			{dialogOpen && (
				<AppointmentDialog
					dayKey={dayKey}
					appointment={editingAppt}
					barbers={[]}
					canChooseBarber={false}
					defaultBarberId={selectedBarberId}
					forcedBarberId={selectedBarberId}
					onClose={() => setDialogOpen(false)}
					onSave={reload}
					onError={setErrorMessage}
				/>
			)}
		</div>
	);
}
