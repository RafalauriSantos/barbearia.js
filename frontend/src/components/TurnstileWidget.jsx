import { useEffect, useRef, useState } from "react";

const OFFICIAL_TEST_SITE_KEY = "1x00000000000000000000AA";
const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_URL =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({
	siteKey,
	onSuccess,
	onError,
	onExpire,
	theme = "auto",
	className = "",
}) {
	const containerRef = useRef(null);
	const widgetIdRef = useRef(null);
	const [status, setStatus] = useState("loading"); // 'loading' | 'ready' | 'error'

	const envKey = import.meta.env?.VITE_TURNSTILE_SITE_KEY;
	const validEnvKey = (envKey && envKey !== "undefined" && envKey.trim().length > 0) ? envKey.trim() : null;
	const validPropKey = (siteKey && siteKey !== "undefined" && siteKey.trim().length > 0) ? siteKey.trim() : null;
	const activeSiteKey = validPropKey || validEnvKey || OFFICIAL_TEST_SITE_KEY;

	useEffect(() => {
		const isDevOrTest =
			import.meta.env?.MODE === "test" ||
			(typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
			(typeof window !== "undefined" && window.__VITEST_ENVIRONMENT__) ||
			activeSiteKey === OFFICIAL_TEST_SITE_KEY ||
			(typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"));

		// Vitest or Node test environment bypass
		if (import.meta.env?.MODE === "test" || (typeof process !== "undefined" && process.env?.NODE_ENV === "test") || (typeof window !== "undefined" && window.__VITEST_ENVIRONMENT__)) {
			setStatus("ready");
			if (onSuccess) onSuccess("dummy-turnstile-token");
			return;
		}

		let isMounted = true;

		function handleDevFallback() {
			if (isMounted) {
				setStatus("ready");
				if (onSuccess) onSuccess("dummy-turnstile-token");
			}
		}

		function renderWidget() {
			if (!containerRef.current || !window.turnstile) return;

			try {
				if (widgetIdRef.current !== null) {
					window.turnstile.remove(widgetIdRef.current);
				}

				widgetIdRef.current = window.turnstile.render(containerRef.current, {
					sitekey: activeSiteKey,
					theme,
					callback: (token) => {
						if (isMounted && onSuccess) onSuccess(token);
					},
					"error-callback": (err) => {
						if (isMounted) {
							if (isDevOrTest) {
								handleDevFallback();
								return;
							}
							setStatus("error");
							if (onError) onError(err);
						}
					},
					"expired-callback": () => {
						if (isMounted && onExpire) onExpire();
					},
				});

				if (isMounted) setStatus("ready");
			} catch (err) {
				if (isMounted) {
					if (isDevOrTest) {
						handleDevFallback();
						return;
					}
					setStatus("error");
					if (onError) onError(err);
				}
			}
		}

		// Check if script already loaded
		if (window.turnstile) {
			renderWidget();
		} else {
			let script = document.getElementById(SCRIPT_ID);
			if (!script) {
				script = document.createElement("script");
				script.id = SCRIPT_ID;
				script.src = SCRIPT_URL;
				script.async = true;
				script.defer = true;
				document.head.appendChild(script);
			}

			const handleLoad = () => {
				if (window.turnstile && isMounted) {
					renderWidget();
				}
			};

			const handleError = () => {
				if (isMounted && isDevOrTest) {
					handleDevFallback();
				}
			};

			script.addEventListener("load", handleLoad);
			script.addEventListener("error", handleError);

			return () => {
				isMounted = false;
				script.removeEventListener("load", handleLoad);
				script.removeEventListener("error", handleError);
				if (widgetIdRef.current !== null && window.turnstile) {
					try {
						window.turnstile.remove(widgetIdRef.current);
					} catch (e) {
						// Ignore cleanup error if container already unmounted
					}
				}
			};
		}

		return () => {
			isMounted = false;
			if (widgetIdRef.current !== null && window.turnstile) {
				try {
					window.turnstile.remove(widgetIdRef.current);
				} catch (e) {
					// Ignore cleanup error
				}
			}
		};
	}, [activeSiteKey, theme, onSuccess, onError, onExpire]);

	return (
		<div className={`turnstile-wrapper my-3 ${className}`}>
			<div ref={containerRef} data-testid="turnstile-container" />
			{status === "loading" && (
				<div
					data-testid="turnstile-loading"
					className="text-xs text-stone-400 flex items-center gap-2 py-1"
				>
					<span className="inline-block w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
					Carregando proteção anti-bot...
				</div>
			)}
			{status === "error" && (
				<div
					data-testid="turnstile-error"
					className="text-xs text-rose-500 py-1"
				>
					Erro ao carregar proteção anti-bot. Recarregue a página.
				</div>
			)}
		</div>
	);
}

export default TurnstileWidget;
