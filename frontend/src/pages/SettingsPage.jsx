import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
	IconButton,
	Notice,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import { getCachedProfile, loadProfile, saveProfile } from "@/lib/store";

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

function SettingSection({ eyebrow, title, children, action }) {
	return (
		<section className="rounded-lg border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						{eyebrow}
					</p>
					<h2 className="mt-1 font-client text-lg leading-tight text-foreground">
						{title}
					</h2>
				</div>
				{action}
			</div>
			<div className="mt-4 space-y-4">{children}</div>
		</section>
	);
}

function Field({ id, label, children, hint }) {
	return (
		<div>
			<label
				htmlFor={id}
				className="block font-mono-ui text-[10px] uppercase text-foreground-faint">
				{label}
			</label>
			<div className="mt-1">{children}</div>
			{hint && (
				<p className="mt-1 font-client text-xs leading-snug text-foreground-faint">
					{hint}
				</p>
			)}
		</div>
	);
}

function ReadOnlyRow({ label, value }) {
	return (
		<div className="border-t border-border pt-3 first:border-t-0 first:pt-0">
			<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
				{label}
			</p>
			<p className="mt-1 break-words font-client text-sm text-foreground">
				{value}
			</p>
		</div>
	);
}

export default function SettingsPage() {
	const navigate = useNavigate();
	const { logout, user } = useAuth();
	const isAdmin = user?.role === "admin";
	const initialProfileRef = useRef(null);
	if (initialProfileRef.current === null) {
		initialProfileRef.current = getCachedProfile() || false;
	}
	const initialProfile = initialProfileRef.current || null;
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

	const inputClass =
		"w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground transition-colors focus-visible:border-foreground disabled:opacity-60";
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
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<ScreenHeader
				eyebrow="Conta"
				title="Configurações"
				action={
					<IconButton label="Voltar" onClick={() => navigate("/app")}>
						‹
					</IconButton>
				}
			/>

			<form
				id="settingsForm"
				onSubmit={handleSaveProfile}
				className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 safe-bottom">
				<div className="mx-auto max-w-3xl space-y-4">
					<div aria-live="polite" className="space-y-3">
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
							<p className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase text-foreground-faint">
								Atualizando perfil...
							</p>
						)}
					</div>

					{isAdmin ?
						<SettingSection eyebrow="Barbearia" title="Dados da loja">
							<div className="grid gap-4 md:grid-cols-2">
								<Field id="shopName" label="Nome da barbearia">
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
								</Field>

								<Field id="phone" label="Telefone">
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
								</Field>
							</div>

							<Field id="address" label="Endereço">
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
							</Field>
						</SettingSection>
					:	<SettingSection eyebrow="Barbearia" title="Dados da loja">
							<ReadOnlyRow
								label="Nome da barbearia"
								value={shopName || "Gestor Barbearia"}
							/>
							<ReadOnlyRow
								label="Permissão"
								value="Somente o dono altera dados da barbearia."
							/>
						</SettingSection>
					}

					<SettingSection eyebrow="Agenda" title="Padrões de atendimento">
						{isAdmin ?
							<>
								<div className="grid gap-4 md:grid-cols-2">
									<Field id="openingTime" label="Abertura">
										<input
											id="openingTime"
											name="openingTime"
											type="time"
											value={openingTime}
											onChange={(event) => setOpeningTime(event.target.value)}
											className={inputClass}
											disabled={isSaving || isLoading}
										/>
									</Field>

									<Field id="closingTime" label="Fechamento">
										<input
											id="closingTime"
											name="closingTime"
											type="time"
											value={closingTime}
											onChange={(event) => setClosingTime(event.target.value)}
											className={inputClass}
											disabled={isSaving || isLoading}
										/>
									</Field>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<Field
										id="appointmentDuration"
										label="Duração padrão"
										hint="Tempo médio de um atendimento em minutos.">
										<input
											id="appointmentDuration"
											name="appointmentDuration"
											type="number"
											inputMode="numeric"
											min="5"
											max="480"
											step="5"
											value={appointmentDuration}
											onChange={(event) =>
												setAppointmentDuration(event.target.value)
											}
											className={inputClass}
											disabled={isSaving || isLoading}
										/>
									</Field>

									<Field
										id="scheduleInterval"
										label="Intervalo da agenda"
										hint="Espaço usado para organizar os horários.">
										<input
											id="scheduleInterval"
											name="scheduleInterval"
											type="number"
											inputMode="numeric"
											min="5"
											max="240"
											step="5"
											value={scheduleInterval}
											onChange={(event) =>
												setScheduleInterval(event.target.value)
											}
											className={inputClass}
											disabled={isSaving || isLoading}
										/>
									</Field>
								</div>
							</>
						:	<>
								<ReadOnlyRow
									label="Funcionamento"
									value={`${openingTime} ate ${closingTime}`}
								/>
								<ReadOnlyRow
									label="Atendimento"
									value={`${appointmentDuration} min por cliente`}
								/>
							</>
						}
					</SettingSection>

					<SettingSection eyebrow="Minha conta" title="Perfil de acesso">
						<div className="rounded-lg border border-border bg-background-deep p-3">
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
							<div className="flex items-center gap-4">
								<div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#4ade80]/35 bg-card text-sm font-semibold text-[#86efac]">
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
									<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
										Foto da agenda
									</p>
									<p className="mt-1 font-client text-sm leading-snug text-foreground">
										{barberPhotoDraft ?
											"O editor de foto esta aberto."
										:	"Aparece no topo da sua agenda e nos avatares da equipe."}
									</p>
									{!barberPhotoDraft && (
										<p className="mt-1 font-client text-xs leading-snug text-foreground-faint">
											Aceita fotos do celular. O app comprime a imagem ao salvar.
										</p>
									)}
									<div
										className={
											barberPhotoDraft ? "hidden" : "mt-3 flex flex-wrap gap-2"
										}>
										<label
											htmlFor="barberPhoto"
											className="cursor-pointer rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-[11px] text-foreground transition-colors hover:bg-card">
											Trocar foto
										</label>
										{avatarPreviewUrl && (
											<>
												<button
													type="button"
													onClick={handleEditCurrentPhoto}
													disabled={isSaving || isLoading}
													className="rounded-md border border-[#4ade80]/35 bg-[#052e1b]/35 px-3 py-2 font-mono-ui text-[11px] text-[#86efac] transition-colors hover:bg-[#064e3b]/45 disabled:opacity-60">
													Editar enquadramento
												</button>
												<button
													type="button"
													onClick={handleRemovePhoto}
													disabled={isSaving || isLoading}
													className="rounded-md border border-border px-3 py-2 font-mono-ui text-[11px] text-foreground-faint transition-colors hover:text-foreground disabled:opacity-60">
													Remover
												</button>
											</>
										)}
									</div>
								</div>
							</div>
						</div>

						<Field id="barberName" label="Nome na agenda">
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
						</Field>

						<div className="grid gap-3 md:grid-cols-2">
							<ReadOnlyRow
								label="Email"
								value={user?.email || "Email nao informado"}
							/>
							<ReadOnlyRow
								label="Cargo"
								value={isAdmin ? "Dono da barbearia" : "Barbeiro"}
							/>
						</div>
					</SettingSection>

					<SettingSection eyebrow="Acesso" title="Sessão e permissões">
						<div className="grid gap-3 md:grid-cols-3">
							<button
								type="button"
								onClick={() => navigate("/forgot-password")}
								disabled={isSaving}
								className="rounded-md border border-border bg-background-deep px-4 py-3 font-mono-ui text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-60">
								Alterar senha
							</button>

							{isAdmin && (
								<button
									type="button"
									onClick={() => navigate("/team")}
									disabled={isSaving}
									className="rounded-md border border-border bg-background-deep px-4 py-3 font-mono-ui text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-60">
									Equipe
								</button>
							)}

							<button
								type="button"
								onClick={handleLogout}
								disabled={isSaving}
								className="rounded-md border border-border bg-background-deep px-4 py-3 font-mono-ui text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-60">
								Sair da conta
							</button>
						</div>
					</SettingSection>
				</div>
			</form>
			{barberPhotoDraft && (
				<div className="absolute inset-0 z-40 flex flex-col bg-background">
					<div className="shrink-0 border-b border-border bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
						<div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
							<div className="min-w-0">
								<p className="font-mono-ui text-[10px] uppercase text-[#86efac]">
									Editando foto
								</p>
								<h2 className="mt-1 truncate font-client text-lg leading-tight text-foreground">
									Enquadramento da agenda
								</h2>
							</div>
							<button
								type="button"
								onClick={handleCancelPhotoDraft}
								disabled={isSaving || isLoading}
								className="shrink-0 rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-[11px] text-foreground transition-colors hover:bg-card disabled:opacity-60">
								Sair sem salvar
							</button>
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
						<div className="mx-auto max-w-3xl space-y-5">
							<p className="font-client text-sm leading-snug text-foreground-faint">
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
								className="mx-auto flex h-56 w-56 touch-none items-center justify-center overflow-hidden rounded-full border border-[#4ade80]/50 bg-card shadow-[0_0_0_8px_rgba(74,222,128,0.06)]">
								<img
									src={barberPhotoDraft.dataUrl}
									alt=""
									className="h-full w-full select-none object-cover"
									style={avatarImageStyle}
									draggable={false}
								/>
							</div>

							<div className="rounded-lg border border-border bg-background-deep p-4">
								<div className="flex items-center justify-between gap-3">
									<label
										htmlFor="avatarZoom"
										className="font-mono-ui text-[10px] uppercase text-foreground-faint">
										Zoom da foto
									</label>
									<span className="font-value text-[11px] text-[#86efac]">
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
									className="mt-3 w-full accent-[#4ade80]"
									disabled={isSaving || isLoading}
								/>
								<div
									data-testid="avatar-editor-actions"
									className="mt-4 grid grid-cols-2 gap-2">
									<label
										htmlFor="barberPhoto"
										className="flex h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-secondary px-2 text-center font-mono-ui text-[11px] text-foreground transition-colors hover:bg-card">
										Trocar foto
									</label>
									<button
										type="button"
										onClick={handleResetAvatarFrame}
										disabled={isSaving || isLoading}
										className="h-11 rounded-md border border-border bg-secondary px-2 font-mono-ui text-[11px] text-foreground transition-colors hover:bg-card disabled:opacity-60">
										Centralizar
									</button>
								</div>
							</div>
						</div>
					</div>

					<div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
						<div className="mx-auto grid max-w-3xl grid-cols-[0.8fr_1.2fr] gap-2">
							<button
								type="button"
								onClick={handleCancelPhotoDraft}
								disabled={isSaving || isLoading}
								className="rounded-md border border-border bg-secondary px-3 py-3 font-mono-ui text-[11px] text-foreground transition-colors hover:bg-card disabled:opacity-60">
								Cancelar
							</button>
							<button
								type="submit"
								form="settingsForm"
								disabled={isSaving || isLoading}
								className="rounded-md bg-foreground px-3 py-3 font-mono-ui text-sm text-primary-foreground transition-opacity disabled:opacity-60">
								{footerSaveLabel}
							</button>
						</div>
					</div>
				</div>
			)}
			{!barberPhotoDraft && (
				<div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
					<div className="mx-auto max-w-3xl">
						<button
							type="submit"
							form="settingsForm"
							disabled={isSaving || isLoading}
							className="w-full rounded-md bg-foreground px-4 py-3 font-mono-ui text-sm text-primary-foreground transition-opacity disabled:opacity-60">
							{footerSaveLabel}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
