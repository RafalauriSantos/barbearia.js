import { Link } from "react-router-dom";

const focusClass =
	"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6ee7b7]";

const metrics = [
	["1", "Agenda diária"],
	["3", "Status de caixa"],
	["24h", "Controle online"],
];

const journey = [
	{
		step: "Abrir o dia",
		text: "Veja horários, barbeiros e pendências antes do primeiro cliente sentar.",
	},
	{
		step: "Atender",
		text: "Atualize status de pagamento, fiado e observações sem sair da agenda.",
	},
	{
		step: "Fechar caixa",
		text: "Receitas, produtos e despesas ficam prontos para conferir no fim do expediente.",
	},
];

const timeline = [
	["09:00", "Corte executivo", "Pago"],
	["10:30", "Barba completa", "Aberto"],
	["14:00", "Corte + barba", "Fiado"],
];

const highlights = [
	["Agenda", "Dia organizado por horário, barbeiro e status."],
	["Caixa", "Entradas, produtos e despesas no mesmo fluxo."],
	["Equipe", "Acesso separado para dono e barbeiros."],
];

function PrimaryLink({ to, children, className = "" }) {
	return (
		<Link
			to={to}
			className={`inline-flex min-h-12 items-center justify-center rounded-md px-6 py-3 text-center font-mono-ui text-sm transition-[background-color,border-color,color,box-shadow,transform] active:scale-[0.99] ${focusClass} ${className}`}>
			{children}
		</Link>
	);
}

export default function LandingPage() {
	return (
		<main className="h-[var(--app-height)] overflow-y-auto overflow-x-hidden bg-[#060d0b] text-white">
			<section className="relative min-h-[88svh] overflow-hidden">
				<picture className="absolute inset-0 block h-full w-full">
					<source
						srcSet="/images/landing-hero-barbershop.webp"
						type="image/webp"
					/>
					<img
						src="/images/landing-hero-barbershop.png"
						alt="Balcão de barbearia com tablet exibindo agenda e indicadores financeiros"
						width="1400"
						height="788"
						fetchpriority="high"
						className="h-full w-full object-cover object-[61%_center] sm:object-center"
					/>
				</picture>
				<div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,8,7,0.98)_0%,rgba(3,8,7,0.88)_38%,rgba(3,8,7,0.48)_68%,rgba(3,8,7,0.18)_100%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_36%,rgba(246,190,116,0.16),transparent_32%),linear-gradient(180deg,rgba(6,13,11,0)_68%,rgba(6,13,11,0.94)_100%)]" />

				<div className="absolute inset-x-0 top-0 z-20">
					<nav
						aria-label="Navegação principal"
						className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-7">
						<Link
							to="/"
							className={`flex min-w-0 items-center gap-3 rounded-md ${focusClass}`}>
							<span
								aria-hidden="true"
								className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[#6ee7b7]/35 bg-[#6ee7b7]/10">
								<span className="absolute h-[3px] w-5 rotate-[-34deg] rounded-full bg-[#6ee7b7]" />
								<span className="absolute mt-1 h-[3px] w-4 rounded-full bg-[#f0c987]" />
							</span>
							<span className="min-w-0">
								<span className="block truncate font-logo text-lg leading-none">
									Gestor Barbearia
								</span>
								<span className="block truncate font-mono-ui text-[10px] uppercase text-[#98f5cf]/75">
									Operação em tempo real
								</span>
							</span>
						</Link>
						<Link
							to="/login"
							className={`hidden rounded-md border border-white/[0.16] bg-white/[0.08] px-4 py-2 font-mono-ui text-xs text-white/82 backdrop-blur transition-[background-color,border-color,color] hover:border-[#f0c987]/45 hover:bg-white/[0.12] hover:text-white sm:inline-flex ${focusClass}`}>
							Entrar
						</Link>
					</nav>
				</div>

				<div className="relative z-10 mx-auto flex min-h-[88svh] w-full max-w-6xl items-center px-5 pb-16 pt-28 sm:px-7 lg:pt-32">
					<div className="max-w-[690px]">
						<p className="font-mono-ui text-[11px] uppercase text-[#98f5cf]">
							Agenda, caixa e equipe no mesmo ritmo
						</p>
						<h1 className="mt-4 max-w-[760px] text-balance font-logo text-[clamp(3rem,9vw,6.4rem)] leading-[0.86] text-white">
							Gestor Barbearia
						</h1>
						<p className="mt-5 max-w-[34rem] text-pretty font-client text-base leading-relaxed text-white/[0.78] sm:text-lg">
							Um painel operacional para abrir o dia, atender, receber e
							fechar o caixa sem depender de caderno, WhatsApp e planilha.
						</p>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<PrimaryLink
								to="/login?mode=signup"
								className="bg-[#6ee7b7] text-[#04100d] shadow-[0_18px_46px_rgba(110,231,183,0.2)] hover:bg-[#a7f3d0]">
								Criar acesso
							</PrimaryLink>
							<PrimaryLink
								to="/login"
								className="border border-white/[0.18] bg-white/[0.08] text-white/[0.9] backdrop-blur hover:border-white/[0.36] hover:bg-white/[0.12] hover:text-white">
								Entrar na conta
							</PrimaryLink>
						</div>

						<div className="mt-9 grid w-full max-w-xl grid-cols-3 gap-2 border-y border-white/[0.12] py-4">
							{metrics.map(([value, label]) => (
								<div key={label} className="min-w-0">
									<p className="font-value text-2xl text-white">{value}</p>
									<p className="mt-1 break-words font-mono-ui text-[9px] uppercase leading-tight text-white/[0.54] sm:text-[10px]">
										{label}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="border-t border-white/10 bg-[#060d0b] px-5 py-12 sm:px-7 lg:py-16">
				<div className="mx-auto grid w-full max-w-6xl gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-[#98f5cf]/75">
							Feito para o balcão
						</p>
						<h2 className="mt-3 max-w-md text-balance font-logo text-3xl leading-none text-white sm:text-5xl">
							A rotina da barbearia em três momentos.
						</h2>
						<p className="mt-4 max-w-md text-pretty font-client text-sm leading-relaxed text-white/62">
							O produto não tenta virar um ERP. Ele organiza o que acontece no
							dia: cliente chegando, horário mudando, pagamento entrando e
							despesa aparecendo.
						</p>
					</div>

					<div className="grid gap-0 border-y border-white/10 lg:grid-cols-3 lg:border-y-0">
						{journey.map((item, index) => (
							<div
								key={item.step}
								className="border-b border-white/10 py-5 last:border-b-0 lg:border-b-0 lg:border-l lg:px-6 lg:first:border-l-0">
								<p className="font-value text-3xl text-[#f0c987]">
									0{index + 1}
								</p>
								<h3 className="mt-4 font-logo text-2xl leading-tight text-white">
									{item.step}
								</h3>
								<p className="mt-3 text-pretty font-client text-sm leading-relaxed text-white/[0.58]">
									{item.text}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="bg-[#091512] px-5 py-12 sm:px-7 lg:py-16">
				<div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
					<div className="rounded-md border border-white/10 bg-[#0d1b17] p-4 shadow-2xl shadow-black/25">
						<div className="flex items-center justify-between border-b border-white/10 pb-4">
							<div className="min-w-0">
								<p className="font-mono-ui text-[10px] uppercase text-white/[0.45]">
									Hoje
								</p>
								<p className="mt-1 truncate font-logo text-2xl text-white">
									Agenda viva
								</p>
							</div>
							<p className="font-value text-3xl text-[#98f5cf]">R$ 420</p>
						</div>

						<div className="mt-4 space-y-2">
							{timeline.map(([time, service, status]) => (
								<div
									key={time}
									className="grid min-h-[54px] grid-cols-[64px_1fr_auto] items-center gap-3 rounded-md border border-white/[0.07] bg-black/[0.16] px-3 py-3">
									<span className="font-mono-ui text-xs text-white">
										{time}
									</span>
									<span className="min-w-0 truncate font-client text-sm text-white/[0.68]">
										{service}
									</span>
									<span
										className={`rounded-md border px-2 py-1 font-mono-ui text-[9px] ${
											status === "Pago" ?
												"border-[#98f5cf]/25 bg-[#98f5cf]/10 text-[#98f5cf]"
											: status === "Fiado" ?
												"border-[#f0c987]/25 bg-[#f0c987]/10 text-[#f0c987]"
											:	"border-white/[0.12] text-white/[0.6]"
										}`}>
										{status}
									</span>
								</div>
							))}
						</div>
					</div>

					<div>
						<p className="font-mono-ui text-[10px] uppercase text-[#98f5cf]/75">
							Simples que funciona
						</p>
						<h2 className="mt-3 text-balance font-logo text-3xl leading-none text-white sm:text-5xl">
							Do primeiro corte ao fechamento do caixa.
						</h2>
						<p className="mt-4 text-pretty font-client text-sm leading-relaxed text-white/[0.64]">
							Cadastre serviços, acompanhe produtos, lance despesas e veja o
							resumo financeiro sem interromper o atendimento.
						</p>

						<div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
							{highlights.map(([title, text]) => (
								<div
									key={title}
									className="border-l border-white/[0.12] pl-4">
									<p className="font-mono-ui text-[10px] uppercase text-[#f0c987]">
										{title}
									</p>
									<p className="mt-1 font-client text-sm leading-relaxed text-white/[0.62]">
										{text}
									</p>
								</div>
							))}
						</div>

						<PrimaryLink
							to="/login?mode=signup"
							className="mt-7 bg-white text-[#07110f] hover:bg-[#f0c987]">
							Começar agora
						</PrimaryLink>
					</div>
				</div>
			</section>
		</main>
	);
}
