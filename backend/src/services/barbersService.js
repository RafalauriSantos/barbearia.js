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
