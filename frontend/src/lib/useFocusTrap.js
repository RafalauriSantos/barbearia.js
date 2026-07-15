import { useEffect, useRef } from "react";

export function useFocusTrap(onClose, active = true) {
	const containerRef = useRef(null);

	useEffect(() => {
		if (!active) return;

		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				onClose();
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

		// Focus primary element or modal container
		if (containerRef.current) {
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
	}, [onClose, active]);

	return containerRef;
}
