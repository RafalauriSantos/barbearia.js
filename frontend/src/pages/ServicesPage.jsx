import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	getCachedProducts,
	getCachedServices,
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
	EmptyState,
	IconButton,
	Notice,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import {
	parseMoneyInput,
	validateMoney,
	validateRequiredText,
} from "@/lib/validation";

// Tela para cadastrar servicos e produtos.
export default function ServicesPage() {
	const initialCacheRef = useRef(null);
	if (!initialCacheRef.current) {
		initialCacheRef.current = {
			services: getCachedServices(),
			products: getCachedProducts(),
		};
	}
	const initialCache = initialCacheRef.current;
	// Controla aba ativa e listas exibidas.
	const [tab, setTab] = useState("services");
	const [services, setServices] = useState(initialCache.services || []);
	const [products, setProducts] = useState(initialCache.products || []);
	const [isLoading, setIsLoading] = useState(
		!(initialCache.services && initialCache.products),
	);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const hasLoadedRef = useRef(
		Boolean(initialCache.services && initialCache.products),
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [formError, setFormError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [purchaseType, setPurchaseType] = useState("avista");
	const [costPrice, setCostPrice] = useState("");
	const [supplierName, setSupplierName] = useState("");
	const [sellerCommissionPercent, setSellerCommissionPercent] = useState("");
	const [showForm, setShowForm] = useState(false);

	const reloadData = useCallback(async () => {
		const hasLoaded = hasLoadedRef.current;
		setIsLoading(!hasLoaded);
		setIsRefreshing(hasLoaded);
		setErrorMessage("");
		try {
			const [nextServices, nextProducts] = await Promise.all([
				loadServices({ force: true }),
				loadProducts({ force: true }),
			]);
			setServices(nextServices);
			setProducts(nextProducts);
		} catch (error) {
			setErrorMessage(error.message || "Falha ao carregar catalogo.");
			if (!hasLoaded) {
				setServices([]);
				setProducts([]);
			}
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
			hasLoadedRef.current = true;
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
		setPurchaseType("avista");
		setCostPrice("");
		setSupplierName("");
		setSellerCommissionPercent("");
		setFormError("");
		setShowForm(false);
	};
	const validateForm = () => {
		const itemLabel =
			tab === "services" ? "Nome do servico" : "Nome do produto";
		const productValidation =
			tab === "products" ?
				validateMoney(costPrice || "0", "Custo", {
					min: 0,
					max: 9999.99,
				}) ||
				validateMoney(sellerCommissionPercent || "0", "Comissao", {
					min: 0,
					max: 100,
				})
			:	"";
		return (
			validateRequiredText(name, itemLabel, { minLength: 3, maxLength: 60 }) ||
			validateMoney(price, "Preco", { max: 9999.99 }) ||
			productValidation
		);
	};

	const buildPayload = () => {
		const data = { name: name.trim(), price: parseMoneyInput(price) };
		if (tab === "products") {
			data.purchase_type = purchaseType;
			data.cost_price = parseMoneyInput(costPrice || "0");
			data.supplier_name = supplierName.trim();
			data.seller_commission_percent = parseMoneyInput(
				sellerCommissionPercent || "0",
			);
		}
		return data;
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
		const data = buildPayload();
		try {
			if (tab === "services") {
				await addService(data);
			} else {
				await addProduct(data);
			}
			await reloadData();
			setName("");
			setPrice("");
			setPurchaseType("avista");
			setCostPrice("");
			setSupplierName("");
			setSellerCommissionPercent("");
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
		setPurchaseType(item.purchase_type || "avista");
		setCostPrice(Number(item.cost_price || 0).toString());
		setSupplierName(item.supplier_name || "");
		setSellerCommissionPercent(
			Number(item.seller_commission_percent || 0).toString(),
		);
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
		const data = buildPayload();
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
			setPurchaseType("avista");
			setCostPrice("");
			setSupplierName("");
			setSellerCommissionPercent("");
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
	const isProductsTab = tab === "products";
	return (
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<ScreenHeader
				eyebrow="Serviços e produtos"
				title="Catálogo"
				action={
					<IconButton
						label="Novo item"
						onClick={() => {
							cancelEdit();
							setShowForm(true);
						}}
						tone="primary">
						+
					</IconButton>
				}>
				<div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-background-deep p-1">
					<button
						onClick={() => switchTab("services")}
						className={`rounded-md py-2.5 font-mono-ui text-xs ${
							tab === "services" ?
								"bg-secondary text-foreground"
							:	"text-foreground-faint"
						}`}>
						Serviços
					</button>
					<button
						onClick={() => switchTab("products")}
						className={`rounded-md py-2.5 font-mono-ui text-xs ${
							tab === "products" ?
								"bg-secondary text-foreground"
							:	"text-foreground-faint"
						}`}>
						Produtos
					</button>
				</div>
			</ScreenHeader>

			{(showForm || editingId) && (
				<div
					className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-0 backdrop-blur-sm"
					onClick={cancelEdit}>
					<div
						className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-lg border-x border-t border-border bg-background"
						onClick={(event) => event.stopPropagation()}>
						<div className="flex items-center justify-between px-4 pb-3 pt-4">
							<div>
								<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
									{tab === "services" ? "Serviços" : "Produtos"}
								</p>
								<h2 className="mt-1 font-logo text-lg text-foreground">
									{editingId ? "Editar item" : "Novo item"}
								</h2>
							</div>
							<IconButton label="Fechar" onClick={cancelEdit}>
								×
							</IconButton>
						</div>

						<form
							onSubmit={editingId ? handleUpdate : handleAdd}
							className="space-y-3 px-4 pb-6">
							{formError && (
								<p className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2 font-mono-ui text-[10px] text-overdue">
									{formError}
								</p>
							)}
							<div className="rounded-lg border border-border bg-card p-4">
								<label className="block mb-1 font-mono-ui text-[10px] text-foreground-faint">
									{formLabel}
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => {
										setName(e.target.value);
										setFormError("");
									}}
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
									placeholder={formPlaceholder}
									autoFocus
									disabled={isSubmitting}
								/>
							</div>
							<div className="rounded-lg border border-border bg-card p-4">
								<label className="block mb-1 font-mono-ui text-[10px] text-foreground-faint">
									Preço (R$)
								</label>
								<input
									type="text"
									value={price}
									onChange={(e) => {
										setPrice(e.target.value);
										setFormError("");
									}}
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
									placeholder="40,00"
									inputMode="decimal"
									disabled={isSubmitting}
								/>
							</div>
							{isProductsTab && (
								<div className="space-y-3 rounded-lg border border-border bg-card p-4">
									<div>
										<label className="block mb-2 font-mono-ui text-[10px] text-foreground-faint">
											Compra
										</label>
										<div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background-deep p-1">
											<button
												type="button"
												onClick={() => setPurchaseType("avista")}
												className={`rounded-md py-2.5 font-mono-ui text-xs ${
													purchaseType === "avista" ?
														"bg-secondary text-foreground"
													:	"text-foreground-faint"
												}`}>
												À vista
											</button>
											<button
												type="button"
												onClick={() => setPurchaseType("consignado")}
												className={`rounded-md py-2.5 font-mono-ui text-xs ${
													purchaseType === "consignado" ?
														"bg-secondary text-foreground"
													:	"text-foreground-faint"
												}`}>
												Consignado
											</button>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<label className="block">
											<span className="block mb-1 font-mono-ui text-[10px] text-foreground-faint">
												Custo (R$)
											</span>
											<input
												type="text"
												value={costPrice}
												onChange={(e) => {
													setCostPrice(e.target.value);
													setFormError("");
												}}
												className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
												placeholder="20,00"
												inputMode="decimal"
												disabled={isSubmitting}
											/>
										</label>
										<label className="block">
											<span className="block mb-1 font-mono-ui text-[10px] text-foreground-faint">
												Comissão lucro (%)
											</span>
											<input
												type="text"
												value={sellerCommissionPercent}
												onChange={(e) => {
													setSellerCommissionPercent(e.target.value);
													setFormError("");
												}}
												className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
												placeholder="50"
												inputMode="decimal"
												disabled={isSubmitting}
											/>
										</label>
									</div>
									<label className="block">
										<span className="block mb-1 font-mono-ui text-[10px] text-foreground-faint">
											Fornecedor
										</span>
										<input
											type="text"
											value={supplierName}
											onChange={(e) => {
												setSupplierName(e.target.value);
												setFormError("");
											}}
											className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
											placeholder="Fornecedor principal"
											disabled={isSubmitting}
										/>
									</label>
								</div>
							)}
							<div className="flex gap-2">
								<button
									type="submit"
									disabled={isSubmitting}
									className="flex-1 rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
									{isSubmitting ?
										"Salvando..."
									: editingId ?
										"Salvar"
									:	"Adicionar"}
								</button>
								<button
									type="button"
									onClick={cancelEdit}
									disabled={isSubmitting}
									className="rounded-md border border-border px-4 py-3 font-mono-ui text-sm text-foreground-faint">
									Cancelar
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			<div className="min-h-0 flex-1 overflow-y-auto safe-bottom">
				{errorMessage && (
					<div className="mx-4 mt-4">
						<Notice tone="error" title="Erro">
							{errorMessage}
						</Notice>
					</div>
				)}

				{isLoading && items.length === 0 && (
					<p className="mx-4 mt-4 rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase text-foreground-faint">
						Atualizando catálogo...
					</p>
				)}

				{items.length === 0 && !showForm ?
					<div className="mx-4 mt-4">
						<EmptyState title={emptyLabel} hint={emptyHint} />
					</div>
				:	<div className="grid gap-2 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
						{items.map((item) => (
							<div
								key={item.id}
								className="rounded-lg border border-border bg-card p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<p className="truncate font-client text-base text-foreground">
											{item.name}
										</p>
										<p className="mt-1 font-value text-lg text-paid">
											{formatCurrency(item.price)}
										</p>
										{tab === "products" && (
											<div className="mt-3 flex flex-wrap gap-2">
												<span className="rounded-md border border-border bg-background-deep px-2 py-1 font-mono-ui text-[10px] text-foreground-faint">
													{item.purchase_type === "consignado" ?
														"Consignado"
													:	"À vista"}
												</span>
												<span className="rounded-md border border-border bg-background-deep px-2 py-1 font-mono-ui text-[10px] text-foreground-faint">
													Custo {formatCurrency(item.cost_price || 0)}
												</span>
												<span className="rounded-md border border-border bg-background-deep px-2 py-1 font-mono-ui text-[10px] text-foreground-faint">
													Lucro {formatCurrency(item.estimated_profit || 0)}
												</span>
												{item.supplier_name && (
													<span className="rounded-md border border-border bg-background-deep px-2 py-1 font-mono-ui text-[10px] text-foreground-faint">
														{item.supplier_name}
													</span>
												)}
											</div>
										)}
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
