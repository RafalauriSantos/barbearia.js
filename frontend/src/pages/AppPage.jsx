import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DaySummaryCard } from "@/components/DaySummaryCard";
import { AppointmentRow } from "@/components/AppointmentRow";
import { SmartInput } from "@/components/SmartInput";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { BottomNav } from "@/components/BottomNav";
import {
	getAppointmentsForDay,
	getDaySummary,
	formatDayKey,
} from "@/lib/store";
import { useNavigate } from "react-router-dom";

// Tela principal da agenda do dia.
export default function AppPage() {
	// Estado principal da tela.
	const [currentDate, setCurrentDate] = useState(new Date());
	const [, setRefresh] = useState(0);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingAppt, setEditingAppt] = useState();
	const navigate = useNavigate();
	// Busca os dados do dia selecionado.
	const dayKey = formatDayKey(currentDate);
	const appointments = getAppointmentsForDay(dayKey);
	const summary = getDaySummary(dayKey);
	// Força a tela a atualizar depois de salvar/editar/excluir.
	const reload = () => setRefresh((value) => value + 1);
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
	const openNew = () => {
		// Abre o modal para criar um novo agendamento.
		setEditingAppt(undefined);
		setDialogOpen(true);
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

			<DaySummaryCard summary={summary} />

			<div className="flex-1 overflow-y-auto pb-32">
				{appointments.length === 0 ?
					<div className="flex flex-col items-center justify-center py-16 gap-2">
						<span className="font-mono-ui text-[10px] text-foreground-faint tracking-widest">
							NENHUM ATENDIMENTO
						</span>
						<span className="font-client text-sm text-foreground-faint/60">
							Use o input abaixo ou o botão + para adicionar
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
			<div className="sticky bottom-[52px] bg-background border-t border-border px-3 py-2 flex items-center gap-2">
				<SmartInput dayKey={dayKey} onAdd={reload} />
				<button
					onClick={openNew}
					className="w-9 h-9 rounded-full bg-paid text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0 hover:opacity-90 transition-opacity active:scale-95">
					+
				</button>
			</div>

			<BottomNav />

			{dialogOpen && (
				<AppointmentDialog
					dayKey={dayKey}
					appointment={editingAppt}
					onClose={() => setDialogOpen(false)}
					onSave={reload}
				/>
			)}
		</div>
	);
}
