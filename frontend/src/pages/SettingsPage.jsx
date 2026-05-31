import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
	IconButton,
	Notice,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import { loadProfile, saveProfile } from "@/lib/store";

const DEFAULT_OPENING_TIME = "08:00";
const DEFAULT_CLOSING_TIME = "18:00";
const DEFAULT_APPOINTMENT_DURATION = "30";
const DEFAULT_SCHEDULE_INTERVAL = "30";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
	const [shopName, setShopName] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [openingTime, setOpeningTime] = useState(DEFAULT_OPENING_TIME);
	const [closingTime, setClosingTime] = useState(DEFAULT_CLOSING_TIME);
	const [appointmentDuration, setAppointmentDuration] = useState(
		DEFAULT_APPOINTMENT_DURATION,
	);
	const [scheduleInterval, setScheduleInterval] = useState(
		DEFAULT_SCHEDULE_INTERVAL,
	);
	const [barberName, setBarberName] = useState("");
	const [barberPhotoUrl, setBarberPhotoUrl] = useState("");
	const [barberPhotoUpload, setBarberPhotoUpload] = useState(null);
	const [removeBarberPhoto, setRemoveBarberPhoto] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	useEffect(() => {
		let mounted = true;

		async function fetchProfile() {
			try {
				const profile = await loadProfile();
				if (mounted) {
					setShopName(profile?.shopName || "");
					setPhone(profile?.phone || "");
					setAddress(profile?.address || "");
					setOpeningTime(profile?.openingTime || DEFAULT_OPENING_TIME);
					setClosingTime(profile?.closingTime || DEFAULT_CLOSING_TIME);
					setAppointmentDuration(
						String(profile?.appointmentDuration || DEFAULT_APPOINTMENT_DURATION),
					);
					setScheduleInterval(
						String(profile?.scheduleInterval || DEFAULT_SCHEDULE_INTERVAL),
					);
					setBarberName(profile?.barberName || "");
					setBarberPhotoUrl(profile?.barberPhotoUrl || profile?.photo_url || "");
					setBarberPhotoUpload(null);
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
	}, []);

	const handlePhotoChange = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
			setErrorMessage("Use uma foto JPG, PNG ou WebP.");
			setSuccessMessage("");
			event.target.value = "";
			return;
		}

		if (file.size > AVATAR_MAX_BYTES) {
			setErrorMessage("A foto precisa ter ate 2MB.");
			setSuccessMessage("");
			event.target.value = "";
			return;
		}

		try {
			const dataUrl = await readFileAsDataUrl(file);
			setBarberPhotoUpload({
				dataUrl,
				fileName: file.name,
				mimeType: file.type,
			});
			setRemoveBarberPhoto(false);
			setErrorMessage("");
			setSuccessMessage("Foto pronta para salvar.");
		} catch (error) {
			setErrorMessage(error.message || "Nao foi possivel carregar a foto.");
			setSuccessMessage("");
		}
	};

	const handleRemovePhoto = () => {
		setBarberPhotoUpload(null);
		setBarberPhotoUrl("");
		setRemoveBarberPhoto(true);
		setSuccessMessage("Foto marcada para remocao.");
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

			if (barberPhotoUpload) {
				payload.barberPhoto = barberPhotoUpload;
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
			setBarberPhotoUpload(null);
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
		barberPhotoUpload?.dataUrl || (!removeBarberPhoto ? barberPhotoUrl : "");

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
				onSubmit={handleSaveProfile}
				className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
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

					{isAdmin ? (
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
					) : (
						<SettingSection eyebrow="Barbearia" title="Dados da loja">
							<ReadOnlyRow label="Nome da barbearia" value={shopName || "Kurt"} />
							<ReadOnlyRow
								label="Permissão"
								value="Somente o dono altera dados da barbearia."
							/>
						</SettingSection>
					)}

					<SettingSection eyebrow="Agenda" title="Padrões de atendimento">
						{isAdmin ? (
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
						) : (
							<>
								<ReadOnlyRow
									label="Funcionamento"
									value={`${openingTime} ate ${closingTime}`}
								/>
								<ReadOnlyRow
									label="Atendimento"
									value={`${appointmentDuration} min por cliente`}
								/>
							</>
						)}
					</SettingSection>

					<SettingSection eyebrow="Minha conta" title="Perfil de acesso">
						<div className="flex items-center gap-4 rounded-lg border border-border bg-background-deep p-3">
							<div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#4ade80]/35 bg-card text-sm font-semibold text-[#86efac]">
								{avatarPreviewUrl ? (
									<img
										src={avatarPreviewUrl}
										alt={barberName || "Foto do perfil"}
										className="h-full w-full object-cover"
									/>
								) : (
									<span>{getInitials(barberName || user?.email)}</span>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
									Foto da agenda
								</p>
								<p className="mt-1 font-client text-sm leading-snug text-foreground">
									Aparece no topo da sua agenda e nos avatares da equipe.
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									<input
										id="barberPhoto"
										name="barberPhoto"
										type="file"
										accept="image/jpeg,image/png,image/webp"
										aria-label="Foto da agenda"
										onChange={handlePhotoChange}
										className="sr-only"
										disabled={isSaving || isLoading}
									/>
									<label
										htmlFor="barberPhoto"
										className="cursor-pointer rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-[11px] text-foreground transition-colors hover:bg-card">
										Trocar foto
									</label>
									{avatarPreviewUrl && (
										<button
											type="button"
											onClick={handleRemovePhoto}
											disabled={isSaving || isLoading}
											className="rounded-md border border-border px-3 py-2 font-mono-ui text-[11px] text-foreground-faint transition-colors hover:text-foreground disabled:opacity-60">
											Remover
										</button>
									)}
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

					<div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-lg md:border">
						<button
							type="submit"
							disabled={isSaving || isLoading}
							className="w-full rounded-md bg-foreground px-4 py-3 font-mono-ui text-sm text-primary-foreground transition-opacity disabled:opacity-60">
							{isSaving ? "Salvando..." : "Salvar alterações"}
						</button>
					</div>

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
		</div>
	);
}
