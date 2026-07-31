import { BrandName } from "@/components/BrandName";

// Tela mostrada quando a rota digitada nao existe.
const NotFound = () => {
	// Mostra o caminho que nao foi encontrado.
	const path = window.location.pathname;
	return (
		<div className="flex min-h-[var(--app-height)] items-center justify-center bg-background px-4">
			<div className="text-center border border-border rounded p-6 bg-card max-w-md w-full">
				<BrandName size="sm" className="text-foreground-faint" />
				<h1 className="mb-3 mt-2 text-3xl font-bold">404</h1>
				<p className="mb-4 text-sm text-muted-foreground">
					Pagina nao encontrada: {path}
				</p>
				<a
					href="/"
					className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 font-mono-ui text-xs text-primary-foreground">
					Voltar para o inicio
				</a>
			</div>
		</div>
	);
};
export default NotFound;
