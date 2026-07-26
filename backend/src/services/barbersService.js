const BarbersRepository = require("../repositories/barbersRepository");
const AuthRepository = require("../repositories/authRepository");
const InvitesService = require("./invitesService");
const AuditService = require("./auditService");
const { AppError } = require("../lib/errors");

function assertAdmin(user) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}

	if (user.role !== "admin") {
		throw new AppError(
			403,
			"BARBERS_FORBIDDEN",
			"Apenas administradores podem listar barbeiros.",
		);
	}
}

exports.listBarbers = async function (user) {
	assertAdmin(user);
	return BarbersRepository.findAllByBarbearia(user.barbearia_id);
};

exports.createBarber = async function (payload, user) {
	assertAdmin(user);

	const barber = await BarbersRepository.create({
		barbeariaId: user.barbearia_id,
		nome: payload.nome,
		email: payload.email,
		comissao_percent: payload.comissao_percent,
	});

	await AuditService.logResourceChange({
		action: "BARBER_CREATED",
		resourceType: "barber",
		resourceId: barber.id,
		user,
		newValues: { nome: barber.nome, email: barber.email, comissao_percent: barber.comissao_percent },
	});

	if (payload.send_invite && payload.email) {
		const invite = await InvitesService.createBarberInvite(
			barber.id,
			{ email: payload.email },
			user,
		);
		return { ...barber, convite_pendente: invite.invite, inviteUrl: invite.inviteUrl };
	}

	return barber;
};

exports.updateBarber = async function (id, payload, user) {
	assertAdmin(user);
	const existing = await BarbersRepository.findByIdInBarbearia(
		id,
		user.barbearia_id,
	);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Barbeiro nao encontrado.");

	const updated = await BarbersRepository.update(id, user.barbearia_id, payload);

	const action =
		payload.comissao_percent !== undefined && payload.comissao_percent !== existing.comissao_percent ?
			"COMMISSION_CHANGED"
		:	"BARBER_UPDATED";

	await AuditService.logResourceChange({
		action,
		resourceType: "barber",
		resourceId: id,
		user,
		oldValues: { nome: existing.nome, email: existing.email, comissao_percent: existing.comissao_percent },
		newValues: { nome: updated.nome, email: updated.email, comissao_percent: updated.comissao_percent },
	});

	return updated;
};

exports.deleteBarber = async function (id, user) {
	assertAdmin(user);
	const existing = await BarbersRepository.findByIdInBarbearia(
		id,
		user.barbearia_id,
	);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Barbeiro nao encontrado.");

	if (existing.cargo === "dono") {
		throw new AppError(
			400,
			"CANNOT_DELETE_OWNER",
			"Nao e permitido remover o proprietario da barbearia.",
		);
	}

	// Session Revocation Defense: invalidate active JWT sessions for deactivated user
	if (existing.usuario_id) {
		const linkedUser = await AuthRepository.findById(existing.usuario_id);
		if (linkedUser) {
			const nextVersion = Number(linkedUser.token_version || 1) + 1;
			await AuthRepository.updateTokenVersion(existing.usuario_id, nextVersion);
		}
	}

	const appointmentsCount = await BarbersRepository.countAppointments(id);

	if (appointmentsCount > 0) {
		await BarbersRepository.deletePendingInvites(id, user.barbearia_id);
		await BarbersRepository.update(id, user.barbearia_id, { ativo: false });

		await AuditService.logResourceChange({
			action: "BARBER_DISABLED",
			resourceType: "barber",
			resourceId: id,
			user,
			oldValues: { ativo: true },
			newValues: { ativo: false },
		});

		return { success: true, mode: "soft", message: "Barbeiro inativado com sucesso." };
	} else {
		await BarbersRepository.deletePendingInvites(id, user.barbearia_id);
		await BarbersRepository.hardDelete(id, user.barbearia_id);

		await AuditService.logResourceChange({
			action: "BARBER_DELETED",
			resourceType: "barber",
			resourceId: id,
			user,
			oldValues: { nome: existing.nome, email: existing.email },
		});

		return { success: true, mode: "hard", message: "Barbeiro excluido com sucesso." };
	}
};
