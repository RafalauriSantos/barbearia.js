import { useEffect } from "react";
import { Link } from "react-router-dom";
import { warmUpApi } from "@/lib/api/client";

const benefits = [
	{
		kicker: "Agenda",
		title: "Horarios, barbeiros e status em uma tela.",
		text: "Veja o dia por ordem de atendimento e acompanhe quem esta pago, aberto ou fiado.",
	},
	{
		kicker: "Caixa",
		title: "Receita do dia sem planilha solta.",
		text: "Registre pagamentos, produtos e despesas sem perder o controle do movimento.",
	},
	{
		kicker: "Equipe",
		title: "Operacao pronta para crescer.",
		text: "Separe agenda propria, equipe e resumo financeiro por permissao de acesso.",
	},
];

const timeline = [
	["09:00", "Corte executivo", "Pago"],
	["10:30", "Barba completa", "Aberto"],
	["14:00", "Corte + barba", "Fiado"],
];

export default function LandingPage() {
	useEffect(() => {
		warmUpApi();
	}, []);

	return (
		<div className="min-h-[var(--app-height)] overflow-x-hidden bg-[#07110f] text-white">
			<section className="relative min-h-[88svh] overflow-hidden">
				<img
					src="/images/landing-hero-barbershop.png"
					alt="Balcao de barbearia com tablet exibindo agenda e indicadores financeiros"
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,10,9,0.96)_0%,rgba(4,10,9,0.82)_34%,rgba(4,10,9,0.32)_68%,rgba(4,10,9,0.18)_100%)]" />
				<div className="absolute inset-x-0 top-0 z-10">
					<nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-7">
						<Link to="/" className="flex min-w-0 items-center gap-3">
							<span className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-300/30 bg-emerald-300/10 font-value text-lg text-emerald-200">
								GB
							</span>
							<span>
								<span className="block font-logo text-lg leading-none">
									Gestor Barbearia
								</span>
								<span className="block font-mono-ui text-[10px] uppercase text-emerald-200/70">
									Operacao em tempo real
								</span>
							</span>
						</Link>
						<Link
							to="/login"
							className="hidden rounded-md border border-white/[0.15] bg-white/[0.08] px-4 py-2 font-mono-ui text-xs text-white/80 backdrop-blur transition hover:border-emerald-200/50 hover:text-white sm:inline-flex">
							Entrar
						</Link>
					</nav>
				</div>

				<div className="relative z-10 mx-auto flex min-h-[88svh] w-full max-w-6xl items-center px-5 pb-14 pt-24 sm:px-7 lg:pt-28">
					<div className="max-w-[680px]">
						<p className="font-mono-ui text-[11px] uppercase tracking-normal text-emerald-200">
							Agenda, caixa e equipe no mesmo ritmo
						</p>
						<h1 className="mt-4 max-w-[760px] font-logo text-[clamp(2.9rem,10vw,6.8rem)] leading-[0.86] text-white">
							Gestor Barbearia
						</h1>
						<p className="mt-5 max-w-md font-client text-base leading-relaxed text-white/[0.74] sm:max-w-[34rem] sm:text-lg">
							Um painel operacional para barbearias que precisam abrir o dia,
							atender, receber e entender o caixa sem depender de caderno,
							WhatsApp e planilha.
						</p>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<Link
								to="/login?mode=signup"
								className="rounded-md bg-emerald-300 px-6 py-3 text-center font-mono-ui text-sm text-[#04100d] shadow-[0_18px_48px_rgba(110,231,183,0.22)] transition hover:bg-emerald-200">
								Criar acesso
							</Link>
							<Link
								to="/login"
								className="rounded-md border border-white/[0.18] bg-white/[0.08] px-6 py-3 text-center font-mono-ui text-sm text-white/[0.88] backdrop-blur transition hover:border-white/[0.34] hover:text-white">
								Entrar na conta
							</Link>
						</div>

						<div className="mt-9 grid w-full max-w-[350px] grid-cols-3 gap-2 border-y border-white/[0.12] py-4 sm:max-w-xl">
							<div className="min-w-0">
								<p className="font-value text-2xl text-white">1</p>
								<p className="mt-1 font-mono-ui text-[9px] uppercase leading-tight text-white/[0.52] sm:text-[10px]">
									Agenda diaria
								</p>
							</div>
							<div className="min-w-0">
								<p className="font-value text-2xl text-white">3</p>
								<p className="mt-1 font-mono-ui text-[9px] uppercase leading-tight text-white/[0.52] sm:text-[10px]">
									Status de caixa
								</p>
							</div>
							<div className="min-w-0">
								<p className="font-value text-2xl text-white">24h</p>
								<p className="mt-1 font-mono-ui text-[9px] uppercase leading-tight text-white/[0.52] sm:text-[10px]">
									Controle online
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="border-t border-white/10 bg-[#07110f] px-5 py-10 sm:px-7">
				<div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-emerald-200/70">
							Feito para o balcão
						</p>
						<h2 className="mt-3 max-w-md font-logo text-3xl leading-none text-white sm:text-5xl">
							A rotina da barbearia sem tela de sistema pesado.
						</h2>
						<p className="mt-4 max-w-md font-client text-sm leading-relaxed text-white/60">
							O Gestor Barbearia coloca primeiro o que realmente acontece no dia:
							cliente chegando, horario mudando, pagamento entrando e despesa
							aparecendo.
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-3">
						{benefits.map((item) => (
							<article
								key={item.kicker}
								className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
								<p className="font-mono-ui text-[10px] uppercase text-emerald-200">
									{item.kicker}
								</p>
								<h3 className="mt-3 font-logo text-xl leading-tight text-white">
									{item.title}
								</h3>
								<p className="mt-3 font-client text-sm leading-relaxed text-white/[0.56]">
									{item.text}
								</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="bg-[#0a1714] px-5 py-10 sm:px-7">
				<div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1fr_0.86fr] lg:items-center">
					<div className="rounded-lg border border-white/10 bg-[#0d1d19] p-4 shadow-2xl shadow-black/25">
						<div className="flex items-center justify-between border-b border-white/10 pb-4">
							<div>
								<p className="font-mono-ui text-[10px] uppercase text-white/[0.45]">
									Hoje
								</p>
								<p className="mt-1 font-logo text-2xl text-white">
									Agenda viva
								</p>
							</div>
							<p className="font-value text-3xl text-emerald-200">R$ 420</p>
						</div>

						<div className="mt-4 space-y-2">
							{timeline.map(([time, service, status]) => (
								<div
									key={time}
									className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-md border border-white/[0.07] bg-black/[0.18] px-3 py-3">
									<span className="font-mono-ui text-xs text-white">
										{time}
									</span>
									<span className="truncate font-client text-sm text-white/[0.65]">
										{service}
									</span>
									<span
										className={`rounded-md border px-2 py-1 font-mono-ui text-[9px] ${
											status === "Pago" ?
												"border-emerald-200/25 bg-emerald-200/10 text-emerald-200"
											: status === "Fiado" ?
												"border-amber-300/25 bg-amber-300/10 text-amber-200"
											:	"border-white/[0.12] text-white/[0.58]"
										}`}>
										{status}
									</span>
								</div>
							))}
						</div>
					</div>

					<div>
						<p className="font-mono-ui text-[10px] uppercase text-emerald-200/70">
							Menos improviso
						</p>
						<h2 className="mt-3 font-logo text-3xl leading-none text-white sm:text-5xl">
							Do primeiro corte ao fechamento do caixa.
						</h2>
						<p className="mt-4 font-client text-sm leading-relaxed text-white/[0.62]">
							Cadastre servicos, acompanhe produtos, lance despesas e veja o
							resumo financeiro sem sair do fluxo de atendimento.
						</p>
						<Link
							to="/login?mode=signup"
							className="mt-6 inline-flex rounded-md bg-white px-5 py-3 font-mono-ui text-sm text-[#07110f] transition hover:bg-emerald-100">
							Comecar agora
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
