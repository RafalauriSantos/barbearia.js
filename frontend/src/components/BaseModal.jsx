import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function BaseModal({
	isOpen = true,
	onClose,
	title,
	eyebrow,
	children,
	maxWidthClass = "max-w-[520px]",
	variant = "bottom-sheet", // 'bottom-sheet' | 'centered'
}) {
	const overlayRef = useRef(null);
	const containerRef = useRef(null);
	const previousFocusRef = useRef(null);
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	// 1. Guardar foco anterior & Bloquear scroll do body
	useEffect(() => {

		previousFocusRef.current = document.activeElement;

		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = originalOverflow;
			// Restaura o foco ao fechar
			if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
				previousFocusRef.current.focus();
			}
		};
	}, []);

	// 2. Focus Trap & Tecla ESC
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				onCloseRef.current?.();
				return;
			}

			if (e.key === "Tab") {
				if (!containerRef.current) return;
				const focusableElements = containerRef.current.querySelectorAll(
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

		// Foco inicial se nao houver nenhum foco ativo no container
		if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
			const focusableElements = containerRef.current.querySelectorAll(
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
			tabIndex="-1"
			className={`fixed inset-0 z-[9999] flex ${alignmentClasses} bg-black/75 backdrop-blur-sm`}
			onClick={(e) => {
				if (e.target === overlayRef.current) {
					onCloseRef.current?.();
				}
			}}>
			<div
				ref={containerRef}
				tabIndex="-1"
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
								onClick={onClose}
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
