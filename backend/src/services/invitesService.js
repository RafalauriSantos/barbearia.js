const argon2 = require("argon2");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { AppError } = require("../lib/errors");
const AuthRepository = require("../repositories/authRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const InvitesRepository = require("../repositories/invitesRepository");
const EmailService = require("./emailService");

function createToken() {
	return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

function buildInviteUrl(token) {
	return `${env.APP_URL.replace(/\/$/, "")}/accept-invite?token=${token}`;
}

function toPublicInvite(invite) {
	return {
		id: invite.id,
		email: invite.email,
		expira_em: invite.expira_em,
		aceito_em: invite.aceito_em,
		revogado_em: invite.revogado_em,
		barbeiro: invite.barbeiro ?
			{
				id: invite.barbeiro.id,
				nome: invite.barbeiro.nome,
				email: invite.barbeiro.email || null,
			}
		:	null,
		barbearia: invite.barbearia ?
			{
				id: invite.barbearia.id,
				nome: invite.barbearia.nome,
			}
		:	null,
	};
}

function assertActiveInvite(invite) {
	if (!invite) {
		throw new AppError(404, "INVITE_NOT_FOUND", "Convite nao encontrado.");
	}
	if (invite.aceito_em) {
		throw new AppError(400, "INVITE_ALREADY_ACCEPTED", "Convite ja aceito.");
	}
	if (invite.revogado_em) {
		throw new AppError(400, "INVITE_REVOKED", "Convite revogado.");
	}
	if (new Date(invite.expira_em).getTime() < Date.now()) {
		throw new AppError(400, "INVITE_EXPIRED", "Convite expirado.");
	}
}

function createSession(user) {
	const accessToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
		expiresIn: "15m",
	});
	const refreshToken = jwt.sign(
		{ userId: user.id, type: "refresh" },
		env.JWT_SECRET,
		{ expiresIn: "30d" },
	);
	return { accessToken, refreshToken };
}

exports.createBarberInvite = async function (barbeiroId, payload, user) {
	if (!user?.barbearia_id || user.role !== "admin") {
		throw new AppError(
			403,
			"BARBERS_FORBIDDEN",
			"Apenas administradores podem convidar barbeiros.",
		);
	}

	const barber = await BarbersRepository.findByIdInBarbearia(
		barbeiroId,
		user.barbearia_id,
	);
	if (!barber) throw new AppError(404, "NOT_FOUND", "Barbeiro nao encontrado.");
	if (barber.usuario_id) {
		throw new AppError(
			400,
			"BARBER_ALREADY_LINKED",
			"Barbeiro ja possui acesso vinculado.",
		);
	}

	const email = payload.email.trim().toLowerCase();
	await BarbersRepository.update(barbeiroId, user.barbearia_id, { email });
	await InvitesRepository.revokePendingForBarber(barbeiroId);

	const token = createToken();
	const tokenHash = hashToken(token);
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
	const invite = await InvitesRepository.create({
		barbeariaId: user.barbearia_id,
		barbeiroId,
		email,
		tokenHash,
		expiresAt,
		createdByUserId: user.id,
	});
	const inviteUrl = buildInviteUrl(token);

	await EmailService.sendBarberInviteEmail({
		to: email,
		barberName: barber.nome || barber.name,
		shopName: invite.barbearia?.nome,
		inviteUrl,
	});

	return {
		invite: toPublicInvite(invite),
		inviteUrl,
	};
};

exports.getInviteByToken = async function (token) {
	const invite = await InvitesRepository.findByTokenHash(hashToken(token));
	assertActiveInvite(invite);
	return toPublicInvite(invite);
};

exports.acceptInvite = async function (token, payload) {
	const invite = await InvitesRepository.findByTokenHash(hashToken(token));
	assertActiveInvite(invite);

	if (invite.barbeiro?.usuario_id) {
		throw new AppError(
			400,
			"BARBER_ALREADY_LINKED",
			"Barbeiro ja possui acesso vinculado.",
		);
	}

	const email = invite.email.trim().toLowerCase();
	let user = await AuthRepository.findByEmail(email);
	if (!user) {
		if (!payload.password) {
			throw new AppError(
				400,
				"PASSWORD_REQUIRED",
				"Informe uma senha para criar o acesso.",
			);
		}
		const password_hash = await argon2.hash(payload.password, {
			type: argon2.argon2id,
		});
		user = await AuthRepository.create({
			email,
			password_hash,
			nome: payload.nome || invite.barbeiro?.nome || email.split("@")[0],
			email_verificado_em: new Date().toISOString(),
		});
	} else if (!user.email_verificado_em) {
		user = await AuthRepository.markEmailVerified(user.id);
	}

	const linkedBarber = await BarbersRepository.linkUser(
		invite.barbeiro_id,
		invite.barbearia_id,
		user.id,
		email,
	);
	if (!linkedBarber) {
		throw new AppError(
			400,
			"BARBER_ALREADY_LINKED",
			"Barbeiro ja possui acesso vinculado.",
		);
	}

	await InvitesRepository.markAccepted(invite.id);
	const currentUser = await AuthRepository.findById(user.id);

	return {
		user: currentUser,
		...createSession(currentUser),
	};
};
