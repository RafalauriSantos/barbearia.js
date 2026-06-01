import { useEffect, useRef, useState } from "react";
import {
	formatCurrency,
	formatDayKey,
	getCachedProducts,
	getCachedServices,
	updateAppointment,
	deleteAppointment,
	loadServices,
	loadProducts,
} from "@/lib/store";

function statusDotClass(statusColor) {
	if (statusColor === "paid") return "bg-paid";
	if (statusColor === "fiado") return "bg-fiado";
	if (statusColor === "overdue") return "bg-overdue";
	return "bg-foreground-faint";
}

function statusLabel(status) {
	if (status === "paid") return "Pago";
	if (status === "fiado") return "Fiado";
	return "Pendente";
}

// Mostra uma linha do atendimento com botoes de acao.
export function AppointmentRow({ appointment, onUpdate, onEdit }) {
	const [expanded, setExpanded] = useState(false);
	const [showServicePicker, setShowServicePicker] = useState(false);
	// Regras visuais para destacar prazo e status.
	const today = formatDayKey(new Date());
	const isOverdue =
		appointment.status === "fiado" &&
		appointment.prazo_date &&
		appointment.prazo_date < today;
	const statusColor =
		appointment.status === "paid" ? "paid"
		: isOverdue ? "overdue"
		: appointment.status === "fiado" ? "fiado"
		: "normal";
	const prazoLabel = (() => {
		if (!appointment.prazo_date) return null;
		const prazo = new Date(appointment.prazo_date + "T12:00:00");
		const diff = Math.ceil(
			(prazo.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
		);
		if (diff < 0) return `${Math.abs(diff)}d atraso`;
		if (diff === 0) return "hoje";
		const d = prazo.getDate();
		const m = prazo.getMonth() + 1;
		return `${d}/${m}`;
	})();
	const serviceNames =
		Array.isArray(appointment.services) ?
			appointment.services.map((item) => item.name).filter(Boolean)
		:	[];
	const productNames =
		Array.isArray(appointment.products) ?
			appointment.products
				.map((item) =>
					item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name,
				)
				.filter(Boolean)
		:	[];
	const hasTags =
		serviceNames.length > 0 ||
		productNames.length > 0 ||
		Boolean(appointment.barber_name) ||
		Boolean(prazoLabel);
	const metaLine =
		hasTags ?
			[
				serviceNames.length > 0 ? serviceNames.join(", ") : null,
				productNames.length > 0 ? productNames.join(", ") : null,
				appointment.barber_name,
				prazoLabel ? `Fiado ate ${prazoLabel}` : null,
			]
				.filter(Boolean)
				.join(" • ")
		:	"";
	return (
		<div className="animate-row-in px-4 py-2">
			<div className="rounded-lg border border-border bg-card p-3">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<span
							className={`h-2 w-2 rounded-full ${statusDotClass(statusColor)}`}></span>
						<span className="rounded-md bg-background-deep px-2.5 py-1.5 font-mono-ui text-xs text-foreground">
							{appointment.time_slot}
						</span>
					</div>

					<div className="text-right">
						<p
							className={`font-value text-base ${appointment.status === "paid" ? "text-paid" : "text-foreground"}`}>
							{appointment.value > 0 ?
								formatCurrency(appointment.value)
							:	"R$ ·"}
						</p>
						<p className="mt-1 font-mono-ui text-[10px] uppercase text-foreground-faint">
							{statusLabel(appointment.status)}
						</p>
					</div>
				</div>

				<div className="mt-3 min-w-0">
					<p className="truncate font-client text-base text-foreground">
						{appointment.client_name}
					</p>
					{hasTags && (
						<p className="mt-2 font-mono-ui text-[10px] text-foreground-faint">
							{metaLine}
						</p>
					)}
				</div>

				<button
					onClick={() => setExpanded((prev) => !prev)}
					className="mt-3 w-full rounded-md border border-border bg-background-deep px-3 py-2 font-mono-ui text-[10px] text-foreground">
					{expanded ? "Fechar" : "Ações"}
				</button>

				{expanded && (
					<>
						<button
							onClick={() => setShowServicePicker((prev) => !prev)}
							className="mt-3 w-full rounded-md border border-border bg-background-deep px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							Serviço/Produto
						</button>
						{showServicePicker && (
							<ServicePicker
								appointment={appointment}
								onUpdate={onUpdate}
								onClose={() => setShowServicePicker(false)}
							/>
						)}
						<InlineEditor
							appointment={appointment}
							onUpdate={onUpdate}
							onClose={() => setExpanded(false)}
							onEdit={onEdit}
						/>
					</>
				)}
			</div>
		</div>
	);
}

// Editor rapido para mudar valor/status ou excluir.
function InlineEditor({ appointment, onUpdate, onClose, onEdit }) {
	const [value, setValue] = useState(appointment.value.toString());
	const [status, setStatus] = useState(appointment.status);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const save = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage("");
		// Salva edicao rapida de valor e status.
		try {
			await updateAppointment(appointment.id, {
				value: parseFloat(value) || 0,
				status,
			});
			await onUpdate();
			onClose();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao atualizar atendimento.");
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleDelete = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage("");
		// Remove o agendamento da lista.
		try {
			await deleteAppointment(appointment.id);
			await onUpdate();
			onClose();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao excluir atendimento.");
		} finally {
			setIsSubmitting(false);
		}
	};
	return (
		<div className="animate-slide-down mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-background-deep p-3">
			{errorMessage && (
				<p className="w-full font-mono-ui text-[10px] text-overdue">
					{errorMessage}
				</p>
			)}

			<input
				className="w-24 rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-xs text-foreground"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				inputMode="decimal"
				placeholder="Valor"
				disabled={isSubmitting}
			/>
			<select
				className="rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-[10px] text-foreground"
				value={status}
				onChange={(e) => setStatus(e.target.value)}
				disabled={isSubmitting}>
				<option value="normal">Normal</option>
				<option value="paid">Pago</option>
				<option value="fiado">Fiado</option>
			</select>
			<button
				onClick={save}
				disabled={isSubmitting}
				className="rounded-md border border-paid/30 bg-paid/10 px-3 py-2 font-mono-ui text-[10px] text-paid">
				{isSubmitting ? "..." : "OK"}
			</button>
			{onEdit && (
				<button
					onClick={onEdit}
					className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
					Editar
				</button>
			)}
			<button
				onClick={handleDelete}
				disabled={isSubmitting}
				className="ml-auto rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2 font-mono-ui text-[10px] text-overdue">
				Excluir
			</button>
		</div>
	);
}

// Lista de servicos para adicionar ao atendimento.
function ServicePicker({ appointment, onUpdate, onClose }) {
	const initialCatalogRef = useRef(null);
	if (!initialCatalogRef.current) {
		initialCatalogRef.current = {
			services: getCachedServices(),
			products: getCachedProducts(),
		};
	}
	const initialCatalog = initialCatalogRef.current;
	const [services, setServices] = useState(initialCatalog.services || []);
	const [isLoadingServices, setIsLoadingServices] = useState(
		!initialCatalog.services,
	);
	const [products, setProducts] = useState(initialCatalog.products || []);
	const [isLoadingProducts, setIsLoadingProducts] = useState(
		!initialCatalog.products,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		let mounted = true;

		async function fetchCatalog() {
			try {
				const [serviceList, productList] = await Promise.all([
					loadServices({ force: Boolean(initialCatalog.services) }),
					loadProducts({ force: Boolean(initialCatalog.products) }),
				]);
				if (mounted) {
					setServices(serviceList);
					setProducts(productList);
				}
			} catch {
				if (
					mounted &&
					!(initialCatalog.services && initialCatalog.products)
				) {
					setServices([]);
					setProducts([]);
				}
			} finally {
				if (mounted) {
					setIsLoadingServices(false);
					setIsLoadingProducts(false);
				}
			}
		}

		fetchCatalog();

		return () => {
			mounted = false;
		};
	}, [initialCatalog.products, initialCatalog.services]);
	const handleSelect = async (svc) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage("");
		// Vincula o servico ao atendimento e soma o valor.
		try {
			const current =
				Array.isArray(appointment.services) ? appointment.services : [];
			const nextServices = (() => {
				const existing = current.find((item) => item.id === svc.id);
				if (!existing) {
					return [
						...current,
						{
							id: svc.id,
							name: svc.name,
							price: svc.price,
							quantity: 1,
						},
					];
				}
				return current.map((item) =>
					item.id === svc.id ?
						{ ...item, quantity: Number(item.quantity || 1) + 1 }
					:	item,
				);
			})();
			await updateAppointment(appointment.id, {
				services: nextServices,
				value: (appointment.value || 0) + svc.price,
			});
			await onUpdate();
			onClose();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao vincular servico.");
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleSelectProduct = async (prod) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage("");
		try {
			const current =
				Array.isArray(appointment.products) ? appointment.products : [];
			const nextProducts = (() => {
				const existing = current.find((item) => item.id === prod.id);
				if (!existing) {
					return [
						...current,
						{
							id: prod.id,
							name: prod.name,
							price: prod.price,
							quantity: 1,
						},
					];
				}
				return current.map((item) =>
					item.id === prod.id ?
						{ ...item, quantity: Number(item.quantity || 1) + 1 }
					:	item,
				);
			})();
			await updateAppointment(appointment.id, {
				products: nextProducts,
				value: (appointment.value || 0) + prod.price,
			});
			await onUpdate();
			onClose();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao vincular produto.");
		} finally {
			setIsSubmitting(false);
		}
	};
	if (isLoadingServices && isLoadingProducts) {
		return (
			<div className="animate-slide-down mt-3 rounded-md border border-border bg-background-deep px-3 py-3">
				<span className="font-mono-ui text-[10px] text-foreground-faint">
					Carregando servicos e produtos...
				</span>
			</div>
		);
	}

	if (services.length === 0 && products.length === 0) {
		return (
			<div className="animate-slide-down mt-3 rounded-md border border-border bg-background-deep px-3 py-3">
				<span className="font-mono-ui text-[10px] text-foreground-faint">
					Nenhum serviço ou produto cadastrado.
				</span>
			</div>
		);
	}
	return (
		<div className="animate-slide-down mt-3 flex flex-wrap gap-2 rounded-md border border-border bg-background-deep p-3">
			{errorMessage && (
				<p className="w-full font-mono-ui text-[10px] text-overdue">
					{errorMessage}
				</p>
			)}
			{services.map((svc) => (
				<button
					key={svc.id}
					onClick={() => handleSelect(svc)}
					disabled={isSubmitting}
					className="rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-[10px] text-foreground">
					{svc.name} · R$ {svc.price.toFixed(2)}
				</button>
			))}
			{products.map((prod) => (
				<button
					key={prod.id}
					onClick={() => handleSelectProduct(prod)}
					disabled={isSubmitting}
					className="rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-[10px] text-foreground">
					{prod.name} · R$ {prod.price.toFixed(2)}
				</button>
			))}
		</div>
	);
}
