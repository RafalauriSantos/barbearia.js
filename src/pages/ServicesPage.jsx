import { useState } from "react";
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

// Tela para cadastrar servicos e produtos.
export default function ServicesPage() {
	// Controla aba ativa e listas exibidas.
	const [tab, setTab] = useState("services");
	const [services, setServices] = useState(loadServices());
	const [products, setProducts] = useState(loadProducts());
	const [editingId, setEditingId] = useState(null);
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [showForm, setShowForm] = useState(false);
	// Recarrega a lista de servicos da memoria local.
	const reloadServices = () => setServices(loadServices());
	// Recarrega a lista de produtos da memoria local.
	const reloadProducts = () => setProducts(loadProducts());
	// Limpa o formulario e sai do modo edicao.
	const cancelEdit = () => {
		setEditingId(null);
		setName("");
		setPrice("");
		setShowForm(false);
	};
	const handleAdd = (e) => {
		e.preventDefault();
		if (!name.trim()) return;
		// Cria novo servico ou produto.
		const data = { name: name.trim(), price: parseFloat(price) || 0 };
		if (tab === "services") {
			addService(data);
			reloadServices();
		} else {
			addProduct(data);
			reloadProducts();
		}
		setName("");
		setPrice("");
		setShowForm(false);
	};
	// Coloca um item no formulario para editar.
	const handleEditItem = (item) => {
		setEditingId(item.id);
		setName(item.name);
		setPrice(item.price.toString());
	};
	const handleUpdate = (e) => {
		e.preventDefault();
		if (!editingId || !name.trim()) return;
		// Salva alteracoes do item em edicao.
		const data = { name: name.trim(), price: parseFloat(price) || 0 };
		if (tab === "services") {
			updateService(editingId, data);
			reloadServices();
		} else {
			updateProduct(editingId, data);
			reloadProducts();
		}
		setEditingId(null);
		setName("");
		setPrice("");
	};
	const handleDelete = (id) => {
		// Remove item da aba atual.
		if (tab === "services") {
			deleteService(id);
			reloadServices();
		} else {
			deleteProduct(id);
			reloadProducts();
		}
	};
	// Troca entre aba de servicos e aba de produtos.
	const switchTab = (t) => {
		setTab(t);
		cancelEdit();
	};
	const items = tab === "services" ? services : products;
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
				{(showForm || editingId) && (
					<form
						onSubmit={editingId ? handleUpdate : handleAdd}
						className="px-4 py-4 border-b border-border space-y-3 bg-background-deep">
						<div>
							<label className="font-mono-ui text-xs text-foreground-faint block mb-1">
								{formLabel}
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
								placeholder={formPlaceholder}
								autoFocus
							/>
						</div>
						<div>
							<label className="font-mono-ui text-xs text-foreground-faint block mb-1">
								PRECO (R$)
							</label>
							<input
								type="text"
								value={price}
								onChange={(e) => setPrice(e.target.value)}
								className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
								placeholder="40,00"
								inputMode="decimal"
							/>
						</div>
						<div className="flex gap-2">
							<button
								type="submit"
								className="flex-1 bg-foreground text-primary-foreground font-mono-ui text-sm py-2 rounded">
								{editingId ? "SALVAR" : "ADICIONAR"}
							</button>
							<button
								type="button"
								onClick={cancelEdit}
								className="font-mono-ui text-sm text-foreground-faint px-4 py-2 rounded border border-border">
								CANCELAR
							</button>
						</div>
					</form>
				)}

				{items.length === 0 && !showForm ?
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
									className="font-mono-ui text-xs text-foreground-faint">
									EDITAR
								</button>
								<button
									onClick={() => handleDelete(item.id)}
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
