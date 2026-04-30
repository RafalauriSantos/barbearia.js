import { useCallback, useEffect, useMemo, useState } from "react";
import {
	loadServices,
	addService,
	updateService,
	deleteService,
	loadProducts,
	addProduct,
	updateProduct,
	deleteProduct,
	formatCurrency,
} from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import {
	parseMoneyInput,
	validateMoney,
	validateRequiredText,
} from "@/lib/validation";

// Tela para cadastrar servicos e produtos.
export default function ServicesPage() {
	// Controla aba ativa e listas exibidas.
	const [tab, setTab] = useState("services");
	const [services, setServices] = useState([]);
	const [products, setProducts] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [formError, setFormError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [showForm, setShowForm] = useState(false);

	const reloadData = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			const [nextServices, nextProducts] = await Promise.all([
				loadServices(),
				loadProducts(),
			]);
			setServices(nextServices);
			setProducts(nextProducts);
		} catch (error) {
			setErrorMessage(error.message || "Falha ao carregar catalogo.");
			setServices([]);
			setProducts([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		reloadData();
	}, [reloadData]);

	// Limpa o formulario e sai do modo edicao.
	const cancelEdit = () => {
		setEditingId(null);
		setName("");
		setPrice("");
		setFormError("");
		setShowForm(false);
	};
	const validateForm = () => {
		const itemLabel = tab === "services" ? "Nome do servico" : "Nome do produto";
		return (
			validateRequiredText(name, itemLabel, { minLength: 3, maxLength: 60 }) ||
			validateMoney(price, "Preco", { max: 9999.99 })
		);
	};
	const handleAdd = async (e) => {
		e.preventDefault();
		if (isSubmitting) return;

		const validationMessage = validateForm();
		if (validationMessage) {
			setFormError(validationMessage);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		setFormError("");

		// Cria novo servico ou produto.
		const data = { name: name.trim(), price: parseMoneyInput(price) };
		try {
			if (tab === "services") {
				await addService(data);
			} else {
				await addProduct(data);
			}
			await reloadData();
			setName("");
			setPrice("");
			setFormError("");
			setShowForm(false);
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar item.");
		} finally {
			setIsSubmitting(false);
		}
	};
	// Coloca um item no formulario para editar.
	const handleEditItem = (item) => {
		setEditingId(item.id);
		setName(item.name);
		setPrice(item.price.toString());
		setFormError("");
		setShowForm(true);
	};
	const handleUpdate = async (e) => {
		e.preventDefault();
		if (!editingId || isSubmitting) return;

		const validationMessage = validateForm();
		if (validationMessage) {
			setFormError(validationMessage);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		setFormError("");

		// Salva alteracoes do item em edicao.
		const data = { name: name.trim(), price: parseMoneyInput(price) };
		try {
			if (tab === "services") {
				await updateService(editingId, data);
			} else {
				await updateProduct(editingId, data);
			}
			await reloadData();
			setEditingId(null);
			setName("");
			setPrice("");
			setFormError("");
			setShowForm(false);
		} catch (error) {
			setErrorMessage(error.message || "Falha ao atualizar item.");
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleDelete = async (id) => {
		if (isSubmitting) return;
		const currentLabel = tab === "services" ? "servico" : "produto";
		if (!window.confirm(`Excluir este ${currentLabel}?`)) return;

		setIsSubmitting(true);
		setErrorMessage("");
		// Remove item da aba atual.
		try {
			if (tab === "services") {
				await deleteService(id);
			} else {
				await deleteProduct(id);
			}
			await reloadData();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao excluir item.");
		} finally {
			setIsSubmitting(false);
		}
	};
	// Troca entre aba de servicos e aba de produtos.
	const switchTab = (t) => {
		setTab(t);
		cancelEdit();
	};
	const items = useMemo(
		() => (tab === "services" ? services : products),
		[tab, services, products],
	);
	const emptyLabel =
		tab === "services" ?
			"NENHUM SERVIÇO CADASTRADO"
		:	"NENHUM PRODUTO CADASTRADO";
	const emptyHint =
		tab === "services" ?
			"Adicione serviços para usar nos agendamentos"
		:	"Adicione produtos para usar nos agendamentos";
	const formLabel = tab === "services" ? "NOME DO SERVIÇO" : "NOME DO PRODUTO";
	const formPlaceholder =
		tab === "services" ? "Ex: Corte + Barba" : "Ex: Pomada, Shampoo";
	return (
		<div className="app-shell flex flex-col min-h-[100dvh] bg-background">
			<header className="sticky top-0 z-50 bg-background border-b border-border">
				<div className="px-4 py-3 flex items-center justify-between">
					<h1 className="font-logo text-foreground text-base">CATALOGO</h1>
					<button
						onClick={() => {
							cancelEdit();
							setShowForm(true);
						}}
						className="font-mono-ui text-xs border border-border px-3 py-1.5 rounded">
						+ NOVO
					</button>
				</div>

				<div className="flex border-t border-border">
					<button
						onClick={() => switchTab("services")}
						className={`flex-1 py-2.5 font-mono-ui text-xs ${
							tab === "services" ?
								"text-foreground border-b-2 border-foreground"
							:	"text-foreground-faint"
						}`}>
						SERVICOS
					</button>
					<button
						onClick={() => switchTab("products")}
						className={`flex-1 py-2.5 font-mono-ui text-xs ${
							tab === "products" ?
								"text-foreground border-b-2 border-foreground"
							:	"text-foreground-faint"
						}`}>
						PRODUTOS
					</button>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto pb-20">
				{errorMessage && (
					<div className="mx-4 mt-4 rounded border border-overdue/30 bg-overdue/10 px-3 py-2">
						<p className="font-mono-ui text-[10px] text-overdue">ERRO</p>
						<p className="font-client text-sm text-overdue mt-1">
							{errorMessage}
						</p>
					</div>
				)}

				{(showForm || editingId) && (
					<form
						onSubmit={editingId ? handleUpdate : handleAdd}
						className="px-4 py-4 border-b border-border space-y-3 bg-background-deep">
						{formError && (
							<p className="font-mono-ui text-[10px] text-overdue">
								{formError}
							</p>
						)}
						<div>
							<label className="font-mono-ui text-xs text-foreground-faint block mb-1">
								{formLabel}
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									setFormError("");
								}}
								className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
								placeholder={formPlaceholder}
								autoFocus
								disabled={isSubmitting}
							/>
						</div>
						<div>
							<label className="font-mono-ui text-xs text-foreground-faint block mb-1">
								PRECO (R$)
							</label>
							<input
								type="text"
								value={price}
								onChange={(e) => {
									setPrice(e.target.value);
									setFormError("");
								}}
								className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
								placeholder="40,00"
								inputMode="decimal"
								disabled={isSubmitting}
							/>
						</div>
						<div className="flex gap-2">
							<button
								type="submit"
								disabled={isSubmitting}
								className="flex-1 bg-foreground text-primary-foreground font-mono-ui text-sm py-2 rounded">
								{isSubmitting ?
									"SALVANDO..."
								: editingId ?
									"SALVAR"
								:	"ADICIONAR"}
							</button>
							<button
								type="button"
								onClick={cancelEdit}
								disabled={isSubmitting}
								className="font-mono-ui text-sm text-foreground-faint px-4 py-2 rounded border border-border">
								CANCELAR
							</button>
						</div>
					</form>
				)}

				{isLoading ?
					<div className="flex flex-col items-center justify-center py-16 gap-3">
						<span className="font-mono-ui text-xs text-foreground-faint">
							CARREGANDO CATALOGO
						</span>
					</div>
				: items.length === 0 && !showForm ?
					<div className="flex flex-col items-center justify-center py-16 gap-3">
						<span className="font-mono-ui text-xs text-foreground-faint">
							{emptyLabel}
						</span>
						<span className="font-client text-sm text-foreground-faint/60">
							{emptyHint}
						</span>
					</div>
				:	items.map((item) => (
						<div
							key={item.id}
							className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
							<div className="flex-1 min-w-0">
								<span className="font-client text-base text-foreground">
									{item.name}
								</span>
							</div>
							<div className="flex items-center gap-3">
								<span className="font-client text-sm text-paid">
									{formatCurrency(item.price)}
								</span>
								<button
									onClick={() => handleEditItem(item)}
									disabled={isSubmitting}
									className="font-mono-ui text-xs text-foreground-faint">
									EDITAR
								</button>
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
