const BarbersRepository = require("../repositories/barbersRepository");
const InvitesService = require("./invitesService");
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

	return BarbersRepository.update(id, user.barbearia_id, payload);
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

	const appointmentsCount = await BarbersRepository.countAppointments(id);

	if (appointmentsCount > 0) {
		await BarbersRepository.deletePendingInvites(id);
		await BarbersRepository.update(id, user.barbearia_id, { ativo: false });
		return { success: true, mode: "soft", message: "Barbeiro inativado com sucesso." };
	} else {
		await BarbersRepository.deletePendingInvites(id);
		await BarbersRepository.hardDelete(id, user.barbearia_id);
		return { success: true, mode: "hard", message: "Barbeiro excluido com sucesso." };
	}
};
