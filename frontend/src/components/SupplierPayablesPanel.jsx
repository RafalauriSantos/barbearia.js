import { useCallback, useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/ScreenPrimitives";
import {
	formatCurrency,
	formatDayKey,
	loadSupplierPayables,
	paySupplierPayable,
	getCachedProducts,
	loadProducts,
	addSupplierPurchase,
} from "@/lib/store";
import { AppApiError } from "@/lib/api/client";

const OFFLINE_ERROR_MESSAGE =
	"Sem conexao com a internet ou a API esta indisponivel. Tente novamente.";

function formatDate(value) {
	return value ? value.split("-").reverse().join("/") : "Sem data";
}

export function SupplierPayablesPanel({ startDate, endDate, onChanged }) {
	const [status, setStatus] = useState("aberto");
	const [rows, setRows] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [selected, setSelected] = useState(null);
	const [paymentDate, setPaymentDate] = useState(formatDayKey(new Date()));

	// Purchase form state
	const [showPurchaseForm, setShowPurchaseForm] = useState(false);
	const [products, setProducts] = useState(() => getCachedProducts() || []);
	const [purchaseSupplier, setPurchaseSupplier] = useState("");
	const [purchaseProduct, setPurchaseProduct] = useState("");
	const [purchaseQuantity, setPurchaseQuantity] = useState("1");
	const [purchasePaid, setPurchasePaid] = useState(false);
	const selectedProduct = useMemo(
		() => products.find((product) => product.id === purchaseProduct) || null,
		[products, purchaseProduct],
	);

	const query = useMemo(
		() => ({ status, start_date: startDate, end_date: endDate }),
		[endDate, startDate, status],
	);

	const reload = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			setRows(await loadSupplierPayables(query, { force: true }));
		} catch (error) {
			setErrorMessage(
				error instanceof AppApiError && error.kind === "network" ?
					OFFLINE_ERROR_MESSAGE
				:	error.message || "Falha ao carregar fornecedores.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [query]);

	useEffect(() => {
		reload();
	}, [reload]);

	useEffect(() => {
		if (showPurchaseForm) {
			loadProducts().then(setProducts).catch(console.error);
		}
	}, [showPurchaseForm]);

	const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);

	const handlePay = async (event) => {
		event.preventDefault();
		if (!selected || isSaving) return;
		setIsSaving(true);
		setErrorMessage("");
		try {
			await paySupplierPayable(selected.id, { payment_date: paymentDate });
			setSelected(null);
			await reload();
			onChanged?.();
		} catch (error) {
			setErrorMessage(
				error instanceof AppApiError && error.kind === "network" ?
					OFFLINE_ERROR_MESSAGE
				:	error.message || "Falha ao baixar fornecedor.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleProductChange = (e) => {
		const id = e.target.value;
		setPurchaseProduct(id);
		const prod = products.find((product) => product.id === id);
		if (prod?.supplier_name && !purchaseSupplier) {
			setPurchaseSupplier(prod.supplier_name);
		}
	};

	const handlePurchase = async (event) => {
		event.preventDefault();
		if (!purchaseProduct || !purchaseSupplier || isSaving) return;
		setIsSaving(true);
		setErrorMessage("");

		const quantity = parseInt(purchaseQuantity, 10);
		const cost = Number(selectedProduct?.cost_price || 0);

		try {
			await addSupplierPurchase({
				produto_id: purchaseProduct,
				fornecedor: purchaseSupplier,
				quantidade: quantity,
				custo_unitario: cost,
				foi_pago_a_vista: purchasePaid,
			});
			setShowPurchaseForm(false);
			setPurchaseSupplier("");
			setPurchaseProduct("");
			setPurchaseQuantity("1");
			setPurchasePaid(false);
			await reload();
			onChanged?.();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao registrar compra.");
		} finally {
			setIsSaving(false);
		}
	};

	const purchaseUnitCost = Number(selectedProduct?.cost_price || 0);
	const purchaseTotal = (
		parseInt(purchaseQuantity || "0", 10) * purchaseUnitCost
	).toFixed(2);

	return (
		<div className="space-y-3 px-4 pb-6 pt-4">
			{errorMessage && (
				<Notice tone="error" title="Erro">
					{errorMessage}
				</Notice>
			)}

			<div className="flex justify-end">
				<button
					type="button"
					onClick={() => setShowPurchaseForm(true)}
					className="rounded-md bg-foreground px-4 py-2 font-mono-ui text-[10px] text-primary-foreground uppercase shadow-sm">
					+ Nova Compra
				</button>
			</div>

			<div className="grid grid-cols-2 rounded-lg border border-border bg-background-deep p-1">
				{[
					["aberto", "A pagar"],
					["pago", "Pagos"],
				].map(([value, label]) => (
					<button
						key={value}
						type="button"
						onClick={() => setStatus(value)}
						className={`rounded-md px-3 py-2 font-mono-ui text-[10px] ${status === value ? "bg-card text-foreground" : "text-foreground-faint"}`}>
						{label}
					</button>
				))}
			</div>
			<div className="flex items-center justify-between border-y border-border py-3">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
					{status === "aberto" ? "Total a pagar" : "Total pago"}
				</p>
				<p
					className={`font-value text-xl ${status === "aberto" ? "text-fiado" : "text-paid"}`}>
					{formatCurrency(total)}
				</p>
			</div>
			{isLoading ?
				<p className="rounded-md border border-border bg-card px-3 py-4 font-mono-ui text-[10px] text-foreground-faint">
					Carregando fornecedores...
				</p>
			: rows.length === 0 ?
				<p className="rounded-md border border-dashed border-border px-3 py-6 text-center font-client text-sm text-foreground-faint">
					Nenhuma conta de fornecedor no período.
				</p>
			:	rows.map((row) => (
					<div
						key={row.id}
						className="rounded-lg border border-border bg-card p-4">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="truncate font-client text-base font-semibold text-foreground">
									{row.supplier_name}
								</p>
								<p className="mt-1 font-client text-sm text-foreground-faint">
									{row.description}
								</p>
							</div>
							<p className="shrink-0 font-value text-lg text-fiado">
								{formatCurrency(row.value)}
							</p>
						</div>
						<p className="mt-3 font-mono-ui text-[10px] text-foreground-faint">
							Origem {formatDate(row.origin_date)}
							{row.payment_date ?
								` · Pago ${formatDate(row.payment_date)}`
							:	""}
							{row.barber_name ? ` · ${row.barber_name}` : ""}
						</p>
						{row.status === "aberto" && (
							<button
								type="button"
								onClick={() => {
									setSelected(row);
									setPaymentDate(formatDayKey(new Date()));
								}}
								className="mt-4 w-full rounded-md bg-paid px-3 py-2 font-mono-ui text-[10px] text-primary-foreground">
								Dar baixa
							</button>
						)}
					</div>
				))
			}

			{/* Modal para Baixa de Fornecedor */}
			{selected && (
				<div
					className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70"
					onClick={() => setSelected(null)}>
					<form
						onSubmit={handlePay}
						className="w-full max-w-[520px] rounded-t-lg border-x border-t border-border bg-background p-4 pb-6"
						onClick={(event) => event.stopPropagation()}>
						<p className="font-mono-ui text-[10px] uppercase text-paid">
							Baixa de fornecedor
						</p>
						<h2 className="mt-1 font-logo text-lg text-foreground">
							{selected.supplier_name}
						</h2>
						<p className="mt-2 font-value text-xl text-fiado">
							{formatCurrency(selected.value)}
						</p>
						<label className="mt-4 block">
							<span className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Data do pagamento
							</span>
							<input
								required
								type="date"
								value={paymentDate}
								onChange={(event) => setPaymentDate(event.target.value)}
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
							/>
						</label>
						<button
							type="submit"
							disabled={isSaving}
							className="mt-4 w-full rounded-md bg-paid py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
							{isSaving ? "Salvando..." : "Confirmar baixa"}
						</button>
					</form>
				</div>
			)}

			{/* Modal para Nova Compra de Estoque */}
			{showPurchaseForm && (
				<div
					className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70"
					onClick={() => setShowPurchaseForm(false)}>
					<form
						onSubmit={handlePurchase}
						className="max-h-[90dvh] overflow-y-auto w-full max-w-[520px] rounded-t-lg border-x border-t border-border bg-background p-4 pb-6"
						onClick={(event) => event.stopPropagation()}>
						<div className="flex items-center justify-between">
							<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
								Nova entrada de estoque
							</p>
							<button
								type="button"
								onClick={() => setShowPurchaseForm(false)}
								className="text-xl leading-none text-foreground-faint">
								&times;
							</button>
						</div>
						<h2 className="mt-1 font-logo text-lg text-foreground">
							Registrar compra
						</h2>
						<p className="mt-2 font-client text-sm leading-relaxed text-foreground-faint">
							Escolha o produto, informe o fornecedor e o sistema já soma isso
							ao estoque e ao financeiro.
						</p>

						<div className="mt-4 space-y-3">
							<label className="block">
								<span className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Produto do catálogo
								</span>
								<select
									required
									value={purchaseProduct}
									onChange={handleProductChange}
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground">
									<option value="" disabled>
										Selecione um produto...
									</option>
									{products.map((product) => (
										<option key={product.id} value={product.id}>
											{product.name} (Estoque: {product.stock_quantity})
										</option>
									))}
								</select>
							</label>

							<label className="block">
								<span className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Fornecedor
								</span>
								<input
									required
									type="text"
									value={purchaseSupplier}
									onChange={(e) => setPurchaseSupplier(e.target.value)}
									placeholder="Nome do fornecedor"
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								/>
							</label>

							<div className="grid grid-cols-2 gap-3">
								<label className="block">
									<span className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
										Quantidade comprada
									</span>
									<input
										required
										type="number"
										min="1"
										step="1"
										value={purchaseQuantity}
										onChange={(e) => setPurchaseQuantity(e.target.value)}
										className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
									/>
								</label>
							</div>

							<div className="rounded-md border border-border bg-card p-3">
								<div className="flex items-center justify-between">
									<span className="font-mono-ui text-[10px] uppercase text-foreground-faint">
										Valor total
									</span>
									<span className="font-value text-lg text-foreground">
										R$ {purchaseTotal}
									</span>
								</div>
								<p className="mt-2 font-client text-xs text-foreground-faint">
									Calculado com o custo do produto no catálogo.
								</p>
								<label className="mt-3 flex items-center gap-3 rounded-md border border-border bg-background-deep px-3 py-3">
									<input
										type="checkbox"
										checked={purchasePaid}
										onChange={(event) => setPurchasePaid(event.target.checked)}
										className="h-4 w-4 rounded border-border"
									/>
									<div>
										<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
											Compra paga agora
										</p>
										<p className="font-client text-xs text-foreground-faint">
											Marque só se já foi quitada.
										</p>
									</div>
								</label>
							</div>
						</div>

						<div className="mt-4 grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => setShowPurchaseForm(false)}
								className="w-full rounded-md border border-border py-3 font-mono-ui text-sm text-foreground-faint">
								Cancelar
							</button>
							<button
								type="submit"
								disabled={isSaving || !purchaseProduct || !purchaseSupplier}
								className="w-full rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
								{isSaving ? "Salvando..." : "Confirmar compra"}
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
