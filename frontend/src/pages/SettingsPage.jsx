import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Notice } from "@/components/ScreenPrimitives";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
	getCachedPaymentMethods,
	getCachedProfile,
	loadPaymentMethods,
	loadProfile,
	savePaymentMethod,
	saveProfile,
} from "@/lib/store";

const DEFAULT_OPENING_TIME = "08:00";
const DEFAULT_CLOSING_TIME = "18:00";
const DEFAULT_APPOINTMENT_DURATION = "30";
const DEFAULT_SCHEDULE_INTERVAL = "30";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
const AVATAR_INPUT_ACCEPT = "image/*";
const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_OUTPUT_TYPE = "image/jpeg";
const AVATAR_OUTPUT_QUALITIES = [0.9, 0.82, 0.72, 0.62];
const DEFAULT_AVATAR_FOCUS = { x: 50, y: 50 };
const DEFAULT_AVATAR_ZOOM = 1;

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function getInitials(name) {
	const trimmed = String(name || "").trim();
	if (!trimmed) return "?";
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function readFileAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem."));
		reader.readAsDataURL(file);
	});
}

function loadImage(dataUrl) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => resolve(image);
		image.onerror = () =>
			reject(new Error("Nao foi possivel preparar a foto."));
		image.src = dataUrl;
	});
}

function makeAvatarFileName(fileName) {
	const baseName =
		String(fileName || "foto")
			.replace(/\.[^.]+$/u, "")
			.replace(/[^\w-]+/gu, "-")
			.replace(/^-+|-+$/gu, "")
			.slice(0, 80) || "foto";

	return `${baseName}-avatar.jpg`;
}

function isAcceptedAvatarFile(file) {
	const type = String(file?.type || "").toLowerCase();
	if (type) {
		return type.startsWith("image/") && type !== "image/svg+xml";
	}

	return /\.(jpe?g|png|webp|heic|heif)$/iu.test(String(file?.name || ""));
}

async function createCroppedAvatarUpload({ draft, focus, zoom }) {
	const image = await loadImage(draft.dataUrl);
	const canvas = document.createElement("canvas");
	canvas.width = AVATAR_OUTPUT_SIZE;
	canvas.height = AVATAR_OUTPUT_SIZE;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Nao foi possivel ajustar a foto neste navegador.");
	}

	const naturalWidth = image.naturalWidth || image.width;
	const naturalHeight = image.naturalHeight || image.height;
	if (!naturalWidth || !naturalHeight) {
		throw new Error("Nao foi possivel medir a foto selecionada.");
	}

	const sourceSize = Math.max(
		1,
		Math.min(naturalWidth, naturalHeight) / clamp(zoom, 1, 2.5),
	);
	const centerX = naturalWidth * (clamp(focus.x, 0, 100) / 100);
	const centerY = naturalHeight * (clamp(focus.y, 0, 100) / 100);
	const sourceX = clamp(centerX - sourceSize / 2, 0, naturalWidth - sourceSize);
	const sourceY = clamp(
		centerY - sourceSize / 2,
		0,
		naturalHeight - sourceSize,
	);

	context.fillStyle = "#050b09";
	context.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
	context.drawImage(
		image,
		sourceX,
		sourceY,
		sourceSize,
		sourceSize,
		0,
		0,
		AVATAR_OUTPUT_SIZE,
		AVATAR_OUTPUT_SIZE,
	);

	for (const quality of AVATAR_OUTPUT_QUALITIES) {
		const dataUrl = canvas.toDataURL(AVATAR_OUTPUT_TYPE, quality);
		if (!dataUrl.startsWith(`data:${AVATAR_OUTPUT_TYPE};base64,`)) {
			throw new Error("Nao foi possivel gerar a foto ajustada.");
		}

		const base64 = dataUrl.split(",")[1] || "";
		const byteCount = Math.ceil((base64.length * 3) / 4);
		if (byteCount <= AVATAR_MAX_BYTES) {
			return {
				dataUrl,
				fileName: makeAvatarFileName(draft.fileName),
				mimeType: AVATAR_OUTPUT_TYPE,
			};
		}
	}

	throw new Error("A foto ajustada ficou acima de 2MB.");
}

function SettingsSection({ label, children }) {
	return (
		<section>
			<p className="mb-2 mt-5 px-5 font-client text-[10px] font-semibold uppercase tracking-[1px] text-[#5F5E5A]">
				{label}
			</p>
			{children}
		</section>
	);
}

function FieldGroup({ children }) {
	return (
		<div className="mx-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111110]">
			{children}
		</div>
	);
}

function GroupItem({ children, className = "" }) {
	return (
		<div
			className={`border-b border-white/[0.05] last:border-b-0 ${className}`}>
			{children}
		</div>
	);
}

function GridPair({ children }) {
	return (
		<div className="grid grid-cols-2 divide-x divide-white/[0.05] border-b border-white/[0.05] last:border-b-0">
			{children}
		</div>
	);
}

function VerticalField({ id, label, children, hint }) {
	return (
		<div className="flex min-w-0 flex-col gap-1 px-4 py-3.5">
			<label
				htmlFor={id}
				className="font-client text-[11px] font-medium tracking-[0.2px] text-[#5F5E5A]">
				{label}
			</label>
			{hint && (
				<p className="font-client text-[11px] leading-snug text-[#3a3a38]">
					{hint}
				</p>
			)}
			{children}
		</div>
	);
}

function RowField({ id, label, hint, children }) {
	return (
		<div className="flex min-h-[58px] items-center justify-between gap-4 px-4 py-3.5">
			<div className="min-w-0">
				<label
					htmlFor={id}
					className="block font-client text-sm text-[#c8c8c2]">
					{label}
				</label>
				{hint && (
					<p className="mt-0.5 font-client text-[11px] leading-tight text-[#3a3a38]">
						{hint}
					</p>
				)}
			</div>
			<div className="min-w-[90px] shrink-0 text-right">{children}</div>
		</div>
	);
}

function ReadOnlyCell({ label, value }) {
	return (
		<div className="flex min-w-0 flex-col gap-1 px-4 py-3.5">
			<p className="font-client text-[11px] font-medium tracking-[0.2px] text-[#5F5E5A]">
				{label}
			</p>
			<p className="break-words font-client text-[12px] text-[#e8e8e2]">
				{value}
			</p>
		</div>
	);
}

function NavRow({ label, onClick, disabled }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-4 px-4 py-3.5 text-left font-client text-sm text-[#c8c8c2] transition-colors hover:bg-white/[0.03] disabled:opacity-60">
			<span>{label}</span>
			<span aria-hidden="true" className="font-client text-lg leading-none text-[#3a3a38]">
				›
			</span>
		</button>
	);
}

function SettingsPill({ children, tone = "neutral" }) {
	const tones = {
		green: "border-[#1D9E75]/30 bg-[#1D9E75]/15 text-[#5DCAA5]",
		neutral: "border-white/10 bg-white/[0.06] text-[#888780]",
	};

	return (
		<span
			className={`inline-flex items-center rounded-md border px-2 py-0.5 font-client text-[10px] font-medium uppercase tracking-wide ${tones[tone]}`}>
			{children}
		</span>
	);
}

function formatPercentInput(value) {
	const number = Number(value || 0);
	if (!Number.isFinite(number)) return "0";
	return String(Math.round(number * 10000) / 10000).replace(".", ",");
}

function parsePercentInput(value) {
	const normalized = String(value || "")
		.replace(",", ".")
		.trim();
	const number = Number(normalized);
	return Number.isFinite(number) ? number : NaN;
}

export default function SettingsPage() {
	const navigate = useNavigate();
	const { logout, user } = useAuth();
	const isAdmin = user?.role === "admin";
	const initialProfileRef = useRef(null);
	if (initialProfileRef.current === null) {
		initialProfileRef.current = getCachedProfile() || false;
	}
	const initialPaymentMethodsRef = useRef(null);
	if (initialPaymentMethodsRef.current === null) {
		initialPaymentMethodsRef.current = getCachedPaymentMethods() || false;
	}
	const initialProfile = initialProfileRef.current || null;
	const initialPaymentMethods = initialPaymentMethodsRef.current || [];
	const [shopName, setShopName] = useState(initialProfile?.shopName || "");
	const [phone, setPhone] = useState(initialProfile?.phone || "");
	const [address, setAddress] = useState(initialProfile?.address || "");
	const [openingTime, setOpeningTime] = useState(
		initialProfile?.openingTime || DEFAULT_OPENING_TIME,
	);
	const [closingTime, setClosingTime] = useState(
		initialProfile?.closingTime || DEFAULT_CLOSING_TIME,
	);
	const [appointmentDuration, setAppointmentDuration] = useState(
		String(initialProfile?.appointmentDuration || DEFAULT_APPOINTMENT_DURATION),
	);
	const [scheduleInterval, setScheduleInterval] = useState(
		String(initialProfile?.scheduleInterval || DEFAULT_SCHEDULE_INTERVAL),
	);
	const [barberName, setBarberName] = useState(
		initialProfile?.barberName || "",
	);
	const [barberPhotoUrl, setBarberPhotoUrl] = useState(
		initialProfile?.barberPhotoUrl || initialProfile?.photo_url || "",
	);
	const [barberPhotoDraft, setBarberPhotoDraft] = useState(null);
	const [avatarFocus, setAvatarFocus] = useState(DEFAULT_AVATAR_FOCUS);
	const [avatarZoom, setAvatarZoom] = useState(DEFAULT_AVATAR_ZOOM);
	const [removeBarberPhoto, setRemoveBarberPhoto] = useState(false);
	const [isLoading, setIsLoading] = useState(!initialProfile);
	const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods);
	const [paymentDrafts, setPaymentDrafts] = useState(() =>
		Object.fromEntries(
			initialPaymentMethods.map((method) => [
				method.id,
				formatPercentInput(method.fee_percent),
			]),
		),
	);
	const [isLoadingPayments, setIsLoadingPayments] = useState(
		!initialPaymentMethodsRef.current,
	);
	const [isSavingPayments, setIsSavingPayments] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const avatarDragRef = useRef(null);

	useEffect(() => {
		let mounted = true;

		async function fetchProfile() {
			try {
				const profile = await loadProfile({ force: Boolean(initialProfile) });
				if (mounted) {
					setShopName(profile?.shopName || "");
					setPhone(profile?.phone || "");
					setAddress(profile?.address || "");
					setOpeningTime(profile?.openingTime || DEFAULT_OPENING_TIME);
					setClosingTime(profile?.closingTime || DEFAULT_CLOSING_TIME);
					setAppointmentDuration(
						String(
							profile?.appointmentDuration || DEFAULT_APPOINTMENT_DURATION,
						),
					);
					setScheduleInterval(
						String(profile?.scheduleInterval || DEFAULT_SCHEDULE_INTERVAL),
					);
					setBarberName(profile?.barberName || "");
					setBarberPhotoUrl(
						profile?.barberPhotoUrl || profile?.photo_url || "",
					);
					setBarberPhotoDraft(null);
					setAvatarFocus(DEFAULT_AVATAR_FOCUS);
					setAvatarZoom(DEFAULT_AVATAR_ZOOM);
					setRemoveBarberPhoto(false);
				}
			} catch (error) {
				if (mounted) {
					setErrorMessage(error.message || "Falha ao carregar perfil.");
					setSuccessMessage("");
				}
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		}

		fetchProfile();

		return () => {
			mounted = false;
		};
	}, [initialProfile]);

	useEffect(() => {
		if (!isAdmin) {
			setIsLoadingPayments(false);
			return;
		}

		let mounted = true;
		loadPaymentMethods({ force: Boolean(initialPaymentMethodsRef.current) })
			.then((methods) => {
				if (!mounted) return;
				setPaymentMethods(methods);
				setPaymentDrafts(
					Object.fromEntries(
						methods.map((method) => [
							method.id,
							formatPercentInput(method.fee_percent),
						]),
					),
				);
			})
			.catch((error) => {
				if (mounted) {
					setErrorMessage(
						error.message || "Falha ao carregar formas de pagamento.",
					);
					setSuccessMessage("");
				}
			})
			.finally(() => {
				if (mounted) setIsLoadingPayments(false);
			});

		return () => {
			mounted = false;
		};
	}, [isAdmin]);

	const handlePhotoChange = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!isAcceptedAvatarFile(file)) {
			setErrorMessage("Use uma foto em formato de imagem.");
			setSuccessMessage("");
			event.target.value = "";
			return;
		}

		if (file.size > AVATAR_SOURCE_MAX_BYTES) {
			setErrorMessage("Use uma foto de ate 20MB. O app comprime ao salvar.");
			setSuccessMessage("");
			event.target.value = "";
			return;
		}

		try {
			const dataUrl = await readFileAsDataUrl(file);
			setBarberPhotoDraft({
				dataUrl,
				fileName: file.name,
				mimeType: file.type,
			});
			setAvatarFocus(DEFAULT_AVATAR_FOCUS);
			setAvatarZoom(DEFAULT_AVATAR_ZOOM);
			setRemoveBarberPhoto(false);
			setErrorMessage("");
			setSuccessMessage("Ajuste o foco da foto e salve.");
			event.target.value = "";
		} catch (error) {
			setErrorMessage(error.message || "Nao foi possivel carregar a foto.");
			setSuccessMessage("");
		}
	};

	const handleRemovePhoto = () => {
		setBarberPhotoDraft(null);
		setBarberPhotoUrl("");
		setAvatarFocus(DEFAULT_AVATAR_FOCUS);
		setAvatarZoom(DEFAULT_AVATAR_ZOOM);
		setRemoveBarberPhoto(true);
		setSuccessMessage("Foto marcada para remocao.");
		setErrorMessage("");
	};

	const updateAvatarFocusFromPointer = (event) => {
		const rect = event.currentTarget.getBoundingClientRect();
		if (!rect.width || !rect.height) return;

		setAvatarFocus({
			x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
			y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
		});
	};

	const handleAvatarPointerDown = (event) => {
		if (!barberPhotoDraft || isSaving || isLoading) return;
		avatarDragRef.current = true;
		event.currentTarget.setPointerCapture?.(event.pointerId);
		updateAvatarFocusFromPointer(event);
	};

	const handleAvatarPointerMove = (event) => {
		if (!avatarDragRef.current) return;
		updateAvatarFocusFromPointer(event);
	};

	const handleAvatarPointerUp = (event) => {
		avatarDragRef.current = false;
		event.currentTarget.releasePointerCapture?.(event.pointerId);
	};

	const handleResetAvatarFrame = () => {
		setAvatarFocus(DEFAULT_AVATAR_FOCUS);
		setAvatarZoom(DEFAULT_AVATAR_ZOOM);
	};

	const handleEditCurrentPhoto = () => {
		if (!barberPhotoUrl || isSaving || isLoading) return;
		setBarberPhotoDraft({
			dataUrl: barberPhotoUrl,
			fileName: "foto-atual.jpg",
			mimeType: "image/jpeg",
			isExistingPhoto: true,
		});
		setAvatarFocus(DEFAULT_AVATAR_FOCUS);
		setAvatarZoom(DEFAULT_AVATAR_ZOOM);
		setRemoveBarberPhoto(false);
		setErrorMessage("");
		setSuccessMessage("Ajuste a foto atual e salve.");
	};

	const handleCancelPhotoDraft = () => {
		setBarberPhotoDraft(null);
		setAvatarFocus(DEFAULT_AVATAR_FOCUS);
		setAvatarZoom(DEFAULT_AVATAR_ZOOM);
		setRemoveBarberPhoto(false);
		setSuccessMessage("");
		setErrorMessage("");
	};

	const handleSaveProfile = async (event) => {
		event.preventDefault();
		if (isSaving || isLoading) return;

		const cleanShopName = shopName.trim();
		const cleanBarberName = barberName.trim();
		const cleanPhone = phone.trim();
		const cleanAddress = address.trim();
		const durationValue = Number.parseInt(appointmentDuration, 10);
		const intervalValue = Number.parseInt(scheduleInterval, 10);

		if (!cleanBarberName || (isAdmin && !cleanShopName)) {
			setErrorMessage("Preencha os nomes obrigatorios antes de salvar.");
			setSuccessMessage("");
			return;
		}

		if (isAdmin && openingTime >= closingTime) {
			setErrorMessage("O horario de abertura precisa ser antes do fechamento.");
			setSuccessMessage("");
			return;
		}

		if (
			isAdmin &&
			(!Number.isFinite(durationValue) || !Number.isFinite(intervalValue))
		) {
			setErrorMessage("Informe tempos validos para a agenda.");
			setSuccessMessage("");
			return;
		}

		setIsSaving(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			const payload = {
				barberName: cleanBarberName,
			};

			if (barberPhotoDraft) {
				payload.barberPhoto = await createCroppedAvatarUpload({
					draft: barberPhotoDraft,
					focus: avatarFocus,
					zoom: avatarZoom,
				});
			}

			if (removeBarberPhoto) {
				payload.removeBarberPhoto = true;
			}

			if (isAdmin) {
				Object.assign(payload, {
					shopName: cleanShopName,
					phone: cleanPhone,
					address: cleanAddress,
					openingTime,
					closingTime,
					appointmentDuration: durationValue,
					scheduleInterval: intervalValue,
				});
			}

			const savedProfile = await saveProfile(payload);
			setBarberPhotoUrl(
				savedProfile?.barberPhotoUrl || savedProfile?.photo_url || "",
			);
			setBarberPhotoDraft(null);
			setAvatarFocus(DEFAULT_AVATAR_FOCUS);
			setAvatarZoom(DEFAULT_AVATAR_ZOOM);
			setRemoveBarberPhoto(false);
			setSuccessMessage("Configuracoes salvas.");
			window.dispatchEvent(new Event("profile-updated"));
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar configuracoes.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleLogout = () => {
		logout();
		navigate("/login", { replace: true });
	};

	const handleSavePaymentMethods = async () => {
		if (isSavingPayments || isLoadingPayments) return;

		const updates = [];
		for (const method of paymentMethods) {
			const feePercent = parsePercentInput(paymentDrafts[method.id]);
			if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
				setErrorMessage("Informe taxas entre 0 e 100%.");
				setSuccessMessage("");
				return;
			}
			if (Math.abs(feePercent - Number(method.fee_percent || 0)) >= 0.0001) {
				updates.push({ method, feePercent });
			}
		}

		if (updates.length === 0) {
			setSuccessMessage("Taxas ja estao atualizadas.");
			setErrorMessage("");
			return;
		}

		setIsSavingPayments(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			const saved = await Promise.all(
				updates.map(({ method, feePercent }) =>
					savePaymentMethod(method.id, { fee_percent: feePercent }),
				),
			);
			setPaymentMethods((current) =>
				current.map((method) => {
					const updated = saved.find((item) => item.id === method.id);
					return updated || method;
				}),
			);
			setPaymentDrafts((current) => ({
				...current,
				...Object.fromEntries(
					saved.map((method) => [
						method.id,
						formatPercentInput(method.fee_percent),
					]),
				),
			}));
			setSuccessMessage("Taxas de pagamento salvas.");
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar taxas.");
		} finally {
			setIsSavingPayments(false);
		}
	};

	const inputClass =
		"w-full bg-transparent p-0 font-client text-sm text-[#e8e8e2] outline-none placeholder:text-[#3a3a38] disabled:text-[#5F5E5A]";
	const rowInputClass =
		"w-full bg-transparent p-0 text-right font-mono text-sm text-[#e8e8e2] outline-none disabled:text-[#5F5E5A]";
	const avatarPreviewUrl =
		barberPhotoDraft?.dataUrl || (!removeBarberPhoto ? barberPhotoUrl : "");
	const avatarImageStyle =
		barberPhotoDraft ?
			{
				objectPosition: `${avatarFocus.x}% ${avatarFocus.y}%`,
				transform: `scale(${avatarZoom})`,
				transformOrigin: `${avatarFocus.x}% ${avatarFocus.y}%`,
			}
		:	undefined;
	const footerSaveLabel =
		isSaving ? "Salvando..."
		: barberPhotoDraft ? "Salvar foto e alterações"
		: "Salvar alterações";

	return (
		<div className="mx-auto flex h-[var(--app-height)] min-h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-[#0a0a0a] font-client text-[#f0f0ea]">
			<form
				id="settingsForm"
				onSubmit={handleSaveProfile}
				className="min-h-0 flex-1 overflow-y-auto pb-8">
				<header className="mb-6 px-5 pt-5">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => navigate("/app")}
							aria-label="Voltar"
							title="Voltar"
							className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 font-client text-lg leading-none text-[#a0a09a] transition-colors hover:bg-white/[0.08]">
							‹
						</button>
						<h1 className="min-w-0 flex-1 truncate font-client text-xl font-semibold leading-none tracking-tight text-[#f0f0ea]">
							Configurações
						</h1>
						<ThemeToggle className="rounded-[10px] border-white/10 bg-white/5 text-[#a0a09a] hover:bg-white/[0.08] hover:text-[#f0f0ea]" />
					</div>
				</header>

				<div aria-live="polite" className="mx-5 space-y-3">
						{errorMessage && (
							<Notice tone="error" title="Erro">
								{errorMessage}
							</Notice>
						)}

						{successMessage && (
							<Notice tone="success" title="Sucesso">
								{successMessage}
							</Notice>
						)}

						{isLoading && (
							<p className="rounded-lg border border-white/[0.07] bg-[#111110] px-3 py-2 font-mono-ui text-[10px] uppercase text-[#5F5E5A]">
								Atualizando perfil...
							</p>
						)}
				</div>

					<input
						id="barberPhoto"
						name="barberPhoto"
						type="file"
						accept={AVATAR_INPUT_ACCEPT}
						aria-label="Foto da agenda"
						onChange={handlePhotoChange}
						className="sr-only"
						disabled={isSaving || isLoading}
					/>

				<section className="mx-5 flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#111110] p-5">
					<div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#1D9E75]/30 bg-gradient-to-br from-[#1a3a2a] to-[#0f6e56] text-[22px] font-semibold text-[#5DCAA5]">
								{avatarPreviewUrl ?
									<img
										src={avatarPreviewUrl}
										alt={barberName || "Foto do perfil"}
										className="h-full w-full object-cover"
										style={avatarImageStyle}
									/>
								:	<span>{getInitials(barberName || user?.email)}</span>}
					</div>

					<div className="min-w-0 flex-1">
						<h2 className="mb-1 truncate font-client text-base font-semibold leading-tight tracking-tight text-[#f0f0ea]">
							{barberName || user?.email || "Seu perfil"}
						</h2>
						<div className="flex flex-wrap gap-1.5">
							<SettingsPill tone="green">
								{isAdmin ? "Dono da barbearia" : "Barbeiro"}
							</SettingsPill>
							<SettingsPill>{shopName || "Gestor Barbearia"}</SettingsPill>
						</div>

						<div className="mt-2 flex flex-wrap gap-1.5">
							<label
								htmlFor="barberPhoto"
								className="cursor-pointer rounded-[7px] border border-white/[0.12] bg-white/5 px-2.5 py-1 font-client text-[11px] font-medium text-[#a0a09a] transition-colors hover:bg-white/[0.08] hover:text-[#f0f0ea]">
								Trocar foto
							</label>
							{avatarPreviewUrl && (
								<button
									type="button"
									onClick={handleEditCurrentPhoto}
									disabled={isSaving || isLoading}
									className="rounded-[7px] border border-white/[0.12] bg-white/5 px-2.5 py-1 font-client text-[11px] font-medium text-[#a0a09a] transition-colors hover:bg-white/[0.08] hover:text-[#f0f0ea] disabled:opacity-60">
									Recortar
								</button>
							)}
							{avatarPreviewUrl && (
								<button
									type="button"
									onClick={handleRemovePhoto}
									disabled={isSaving || isLoading}
									className="rounded-[7px] border border-white/[0.12] bg-white/5 px-2.5 py-1 font-client text-[11px] font-medium text-[#a0a09a] transition-colors hover:bg-[#A32D2D]/15 hover:text-[#E24B4A] disabled:opacity-60">
									Remover
								</button>
							)}
						</div>
					</div>
				</section>

					<SettingsSection label="Perfil">
						<FieldGroup>
							<GroupItem>
								<VerticalField id="barberName" label="Nome na agenda">
									<input
										id="barberName"
										name="barberName"
										type="text"
										autoComplete="name"
										required
										value={barberName}
										onChange={(event) => setBarberName(event.target.value)}
										className={inputClass}
										disabled={isSaving || isLoading}
									/>
								</VerticalField>
							</GroupItem>
							<GridPair>
								<ReadOnlyCell
									label="Email"
									value={user?.email || "Email nao informado"}
								/>
								<ReadOnlyCell
									label="Cargo"
									value={isAdmin ? "Dono" : "Barbeiro"}
								/>
							</GridPair>
						</FieldGroup>
					</SettingsSection>

					<SettingsSection label="Barbearia">
						<FieldGroup>
							{isAdmin ?
								<>
									<GroupItem>
										<VerticalField id="shopName" label="Nome da barbearia">
											<input
												id="shopName"
												name="shopName"
												type="text"
												autoComplete="organization"
												required
												value={shopName}
												onChange={(event) => setShopName(event.target.value)}
												className={inputClass}
												disabled={isSaving || isLoading}
											/>
										</VerticalField>
									</GroupItem>
									<GridPair>
										<VerticalField id="phone" label="Telefone">
											<input
												id="phone"
												name="phone"
												type="tel"
												inputMode="tel"
												autoComplete="tel"
												value={phone}
												onChange={(event) => setPhone(event.target.value)}
												className={inputClass}
												disabled={isSaving || isLoading}
											/>
										</VerticalField>
										<VerticalField id="address" label="Endereço">
											<input
												id="address"
												name="address"
												type="text"
												autoComplete="street-address"
												value={address}
												onChange={(event) => setAddress(event.target.value)}
												className={inputClass}
												disabled={isSaving || isLoading}
											/>
										</VerticalField>
									</GridPair>
								</>
							:	<>
									<GroupItem>
										<ReadOnlyCell
											label="Nome da barbearia"
											value={shopName || "Gestor Barbearia"}
										/>
									</GroupItem>
									<ReadOnlyCell
										label="Permissão"
										value="Somente o dono altera dados da barbearia."
									/>
								</>
							}
						</FieldGroup>
					</SettingsSection>

					{isAdmin && (
						<SettingsSection label="Recebimento">
							<FieldGroup>
								{paymentMethods
									.filter((method) => method.code !== "fiado")
									.map((method) => (
										<GroupItem key={method.id}>
											<RowField
												id={`payment-${method.id}`}
												label={method.name}
												hint={
													Number(method.fee_percent || 0) > 0 ?
														`Atual: ${formatPercentInput(method.fee_percent)}%`
													:	"Sem taxa"
												}>
												<div className="flex items-center justify-end gap-1">
													<input
														id={`payment-${method.id}`}
														type="text"
														inputMode="decimal"
														value={paymentDrafts[method.id] ?? "0"}
														onChange={(event) =>
															setPaymentDrafts((current) => ({
																...current,
																[method.id]: event.target.value,
															}))
														}
														className="w-16 bg-transparent p-0 text-right font-mono text-sm text-[#e8e8e2] outline-none disabled:text-[#5F5E5A]"
														disabled={
															isSaving ||
															isLoading ||
															isSavingPayments ||
															isLoadingPayments
														}
													/>
													<span className="font-mono text-sm text-[#5F5E5A]">
														%
													</span>
												</div>
											</RowField>
										</GroupItem>
									))}
								<GroupItem>
									<div className="px-4 py-3.5">
										<button
											type="button"
											onClick={handleSavePaymentMethods}
											disabled={
												isSaving ||
												isLoading ||
												isSavingPayments ||
												isLoadingPayments
											}
											className="w-full rounded-[10px] border border-[#1D9E75]/30 bg-[#1D9E75]/15 py-3 font-client text-sm font-medium text-[#5DCAA5] transition-colors hover:bg-[#1D9E75]/25 disabled:opacity-60">
											{isSavingPayments ?
												"Salvando taxas..."
											:	"Salvar taxas"}
										</button>
									</div>
								</GroupItem>
							</FieldGroup>
						</SettingsSection>
					)}

					<SettingsSection label="Acesso">
						<FieldGroup>
							<GroupItem>
								<NavRow
									label="Alterar senha"
									onClick={() => navigate("/forgot-password")}
									disabled={isSaving}
								/>
							</GroupItem>
							{isAdmin && (
								<NavRow
									label="Gerenciar equipe"
									onClick={() => navigate("/team")}
									disabled={isSaving}
								/>
							)}
						</FieldGroup>
					</SettingsSection>

					<SettingsSection label="Conta">
						<div className="mx-5 rounded-2xl border border-[#A32D2D]/20 bg-[#A32D2D]/[0.08] p-4">
							<p className="mb-3 flex items-center gap-1.5 font-client text-[11px] font-semibold uppercase tracking-[0.8px] text-[#A32D2D]">
								<span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#A32D2D]/40 text-[9px]">
									!
								</span>
								Sessão atual
							</p>
							<button
								type="button"
								onClick={handleLogout}
								disabled={isSaving}
								className="w-full rounded-[10px] border border-[#A32D2D]/30 bg-[#A32D2D]/15 py-3 font-client text-sm font-medium text-[#E24B4A] transition-colors hover:bg-[#A32D2D]/25 disabled:opacity-60">
								Sair da conta
							</button>
						</div>
					</SettingsSection>

					{!barberPhotoDraft && (
						<button
							type="submit"
							disabled={isSaving || isLoading}
							className="sticky bottom-0 mx-5 mt-6 flex w-[calc(100%-2.5rem)] cursor-pointer items-center justify-center rounded-2xl bg-[#1D9E75] px-4 py-3 text-center font-client text-[15px] font-semibold tracking-tight text-[#04342C] transition-opacity disabled:opacity-60">
							{footerSaveLabel}
						</button>
					)}
			</form>
			{barberPhotoDraft && (
				<div
					data-testid="avatar-editor-panel"
					className="fixed bottom-0 left-1/2 top-0 z-[100] flex w-full max-w-[420px] -translate-x-1/2 flex-col overflow-hidden bg-[#0a0a0a] text-[#f0f0ea] shadow-[0_24px_80px_hsl(220_30%_1%/0.55)]">
					<div className="shrink-0 border-b border-white/[0.07] bg-[#0a0a0a]/95 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
						<div className="mx-auto flex max-w-[420px] items-center justify-between gap-3">
							<div className="min-w-0">
								<p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[#5DCAA5]">
									Editando foto
								</p>
								<h2 className="mt-1 truncate font-client text-lg leading-tight text-[#f0f0ea]">
									Enquadramento da agenda
								</h2>
							</div>
							<button
								type="button"
								onClick={handleCancelPhotoDraft}
								disabled={isSaving || isLoading}
								className="shrink-0 rounded-md border border-white/[0.07] bg-white/[0.04] px-3 py-2 font-mono-ui text-[10px] uppercase tracking-[0.08em] text-[#c8c8c2] transition-colors hover:bg-white/[0.07] disabled:opacity-60">
								Sair sem salvar
							</button>
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
						<div className="mx-auto max-w-[420px] space-y-5">
							<p className="font-client text-sm leading-snug text-[#c8c8c2]">
								Arraste na foto para escolher o foco e use o zoom para aproximar.
								Se a foto ja estava salva, o ajuste acontece sobre o recorte atual.
							</p>

							<div
								role="img"
								aria-label="Prévia ajustável da foto"
								onPointerDown={handleAvatarPointerDown}
								onPointerMove={handleAvatarPointerMove}
								onPointerUp={handleAvatarPointerUp}
								onPointerCancel={handleAvatarPointerUp}
								className="mx-auto flex h-56 w-56 touch-none items-center justify-center overflow-hidden rounded-full border border-[#5DCAA5]/40 bg-[#111110] shadow-[0_0_0_8px_rgba(29,158,117,0.08)]">
								<img
									src={barberPhotoDraft.dataUrl}
									alt=""
									className="h-full w-full select-none object-cover"
									style={avatarImageStyle}
									draggable={false}
								/>
							</div>

							<div className="rounded-xl border border-white/[0.07] bg-[#111110] p-4">
								<div className="flex items-center justify-between gap-3">
									<label
										htmlFor="avatarZoom"
										className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-[#5F5E5A]">
										Zoom da foto
									</label>
									<span className="font-value text-[11px] text-[#5DCAA5]">
										{Math.round(avatarZoom * 100)}%
									</span>
								</div>
								<input
									id="avatarZoom"
									type="range"
									min="1"
									max="2.5"
									step="0.05"
									value={avatarZoom}
									onChange={(event) => setAvatarZoom(Number(event.target.value))}
									className="mt-3 w-full accent-[#1D9E75]"
									disabled={isSaving || isLoading}
								/>
								<div
									data-testid="avatar-editor-actions"
									className="mt-4 grid grid-cols-2 gap-2">
									<label
										htmlFor="barberPhoto"
										className="flex h-11 cursor-pointer items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] px-2 text-center font-mono-ui text-[10px] uppercase tracking-[0.08em] text-[#e8e8e2] transition-colors hover:bg-white/[0.06]">
										Trocar foto
									</label>
									<button
										type="button"
										onClick={handleResetAvatarFrame}
										disabled={isSaving || isLoading}
										className="h-11 rounded-md border border-white/[0.07] bg-white/[0.03] px-2 font-mono-ui text-[10px] uppercase tracking-[0.08em] text-[#e8e8e2] transition-colors hover:bg-white/[0.06] disabled:opacity-60">
										Centralizar
									</button>
								</div>
							</div>
						</div>
					</div>

					<div className="shrink-0 border-t border-white/[0.07] bg-[#0a0a0a]/95 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
						<div className="mx-auto grid max-w-[420px] grid-cols-[0.8fr_1.2fr] gap-2">
							<button
								type="button"
								onClick={handleCancelPhotoDraft}
								disabled={isSaving || isLoading}
								className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 font-mono-ui text-[10px] uppercase tracking-[0.08em] text-[#c8c8c2] transition-colors hover:bg-white/[0.06] disabled:opacity-60">
								Cancelar
							</button>
							<button
								type="submit"
								form="settingsForm"
								disabled={isSaving || isLoading}
								className="rounded-xl bg-[#1D9E75] px-3 py-3 font-mono-ui text-sm text-[#04342C] transition-opacity disabled:opacity-60">
								{footerSaveLabel}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
