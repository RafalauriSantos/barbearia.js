import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface BaseModalProps {
	isOpen?: boolean;
	onClose?: () => void;
	title?: React.ReactNode;
	eyebrow?: React.ReactNode;
	children?: React.ReactNode;
	maxWidthClass?: string;
	variant?: "bottom-sheet" | "centered";
}

export function BaseModal({
	isOpen = true,
	onClose,
	title,
	eyebrow,
	children,
	maxWidthClass = "max-w-[520px]",
	variant = "bottom-sheet",
}: BaseModalProps) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<Element | null>(null);
	const savedScrollYRef = useRef<number>(0);
	const savedVisualViewportHeightRef = useRef<number | null>(null);
	const originalOverflowRef = useRef<string>("");
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	// Função centralizada para fechar com desalocacao limpa de foco e viewport
	const executeClose = () => {
		// 1. Desfoca ativamente qualquer campo focado para recolher o teclado
		if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === "function") {
			(document.activeElement as HTMLElement).blur();
		}

		// 2. Notifica o manipulador de fechamento pai
		onCloseRef.current?.();
	};

	// 1. Guardar estado da viewport/scroll & Bloquear scroll do body
	useEffect(() => {
		previousFocusRef.current = document.activeElement;
		savedScrollYRef.current = window.scrollY;
		savedVisualViewportHeightRef.current = window.visualViewport?.height || null;
		originalOverflowRef.current = document.body.style.overflow;

		document.body.style.overflow = "hidden";

		return () => {
			// Ao desmontar: Desfocar ativamente qualquer input dentro do modal
			if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === "function") {
				(document.activeElement as HTMLElement).blur();
			}

			// Função de restauração sincronizada de viewport e scroll
			const restorePosition = () => {
				const currentY = window.scrollY;
				// Restaura o scroll APENAS se a posição tiver sido alterada
				if (currentY !== savedScrollYRef.current) {
					window.scrollTo({
						top: savedScrollYRef.current,
						behavior: "instant",
					});
				}

				// Restaura overflow do body
				document.body.style.overflow = originalOverflowRef.current;

				// Restaura o foco para o elemento anterior
				if (previousFocusRef.current && typeof (previousFocusRef.current as HTMLElement).focus === "function") {
					(previousFocusRef.current as HTMLElement).focus();
				}
			};

			if (window.visualViewport) {
				const handleViewportChange = () => {
					window.visualViewport?.removeEventListener("resize", handleViewportChange);
					window.visualViewport?.removeEventListener("scroll", handleViewportChange);
					requestAnimationFrame(restorePosition);
				};
				window.visualViewport.addEventListener("resize", handleViewportChange, { once: true });
				window.visualViewport.addEventListener("scroll", handleViewportChange, { once: true });
				// Fallback por rAF caso a viewport nao mude
				requestAnimationFrame(restorePosition);
			} else {
				requestAnimationFrame(restorePosition);
			}
		};
	}, []);

	// 2. Focus Trap & Tecla ESC / Voltar
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				executeClose();
				return;
			}

			if (e.key === "Tab") {
				if (!containerRef.current) return;
				const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
					'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
				);
				if (focusableElements.length === 0) return;

				const firstElement = focusableElements[0];
				const lastElement = focusableElements[focusableElements.length - 1];

				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						lastElement.focus();
						e.preventDefault();
					}
				} else {
					if (document.activeElement === lastElement) {
						firstElement.focus();
						e.preventDefault();
					}
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		// Foco inicial seguro no container ou primeiro input
		if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
			const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
				'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
			);
			if (focusableElements.length > 0) {
				focusableElements[0].focus();
			} else {
				containerRef.current.focus();
			}
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	if (!isOpen) return null;

	const alignmentClasses =
		variant === "centered" ?
			"items-center justify-center p-3 sm:p-4"
		:	"items-end sm:items-center justify-center p-0 sm:p-4";

	const modalClasses =
		variant === "centered" ?
			`w-full ${maxWidthClass} max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-xl border border-border bg-background p-4 pb-6 shadow-2xl outline-none my-auto`
		:	`w-full ${maxWidthClass} max-h-[92dvh] sm:max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-t-2xl sm:rounded-xl border-x border-t sm:border border-border bg-background p-4 pb-6 shadow-2xl outline-none my-0 sm:my-auto animate-fade-up`;

	return createPortal(
		<div
			ref={overlayRef}
			tabIndex={-1}
			className={`fixed inset-0 z-[9999] flex ${alignmentClasses} bg-black/75 backdrop-blur-sm`}
			onClick={(e) => {
				if (e.target === overlayRef.current) {
					executeClose();
				}
			}}>
			<div
				ref={containerRef}
				tabIndex={-1}
				className={modalClasses}
				onClick={(e) => e.stopPropagation()}>
				{(title || eyebrow || onClose) && (
					<div className="mb-4 flex items-center justify-between gap-3 border-b border-border/40 pb-3">
						<div>
							{eyebrow && (
								<p className="font-mono-ui text-[10px] uppercase tracking-wider text-foreground-faint">
									{eyebrow}
								</p>
							)}
							{title && (
								<h2 className="mt-0.5 font-logo text-lg font-bold text-foreground">
									{title}
								</h2>
							)}
						</div>
						{onClose && (
							<button
								type="button"
								onClick={executeClose}
								aria-label="Fechar janela"
								className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-foreground-faint hover:bg-secondary hover:text-foreground">
								&times;
							</button>
						)}
					</div>
				)}
				{children}
			</div>
		</div>,
		document.body
	);
}
