import { BottomNav } from "@/components/BottomNav";

export default function InDevelopmentPage({ title = "Tela" }) {
	return (
		<div className="app-shell flex flex-col min-h-[100dvh] bg-background">
			<header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
				<h1 className="font-logo text-foreground text-base tracking-wider">
					{title.toUpperCase()}
				</h1>
			</header>

			<div className="flex-1 flex items-center justify-center px-6 pb-20">
				<div className="text-center max-w-sm">
					<p className="font-mono-ui text-[10px] text-foreground-faint tracking-widest mb-2">
						EM DESENVOLVIMENTO
					</p>
					<h2 className="font-client text-xl text-foreground mb-3">
						Tela ainda nao finalizada
					</h2>
					<p className="font-client text-sm text-foreground-faint/70">
						Estamos priorizando agenda e cadastro basico nesta entrega.
					</p>
				</div>
			</div>

			<BottomNav />
		</div>
	);
}
