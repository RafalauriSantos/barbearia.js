// Tela mostrada quando a rota digitada nao existe.
const NotFound = () => {
	// Mostra o caminho que nao foi encontrado.
	const path = window.location.pathname;
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="text-center border border-border rounded p-6 bg-card max-w-md w-full">
				<h1 className="mb-3 text-3xl font-bold">404</h1>
				<p className="mb-4 text-sm text-muted-foreground">
					Pagina nao encontrada: {path}
				</p>
				<a href="/" className="text-primary underline">
					Voltar para o inicio
				</a>
			</div>
		</div>
	);
};
export default NotFound;
