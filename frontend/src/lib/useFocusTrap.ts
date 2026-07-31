import { useEffect, useRef } from "react";

export function useFocusTrap(onClose, active = true) {
	const containerRef = useRef(null);
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		if (!active) return;

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
					// Shift + Tab
					if (document.activeElement === firstElement) {
						lastElement.focus();
						e.preventDefault();
					}
				} else {
					// Tab
					if (document.activeElement === lastElement) {
						firstElement.focus();
						e.preventDefault();
					}
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		// Focus primary element or modal container ONLY if focus is not already inside the container
		if (
			containerRef.current &&
			!containerRef.current.contains(document.activeElement)
		) {
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
	}, [active]);

	return containerRef;
}
