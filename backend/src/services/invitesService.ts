import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
const { env } = require("../config/env");
import { AppError } from "../lib/errors";
const AuthRepository = require("../repositories/authRepository");
const BarbersRepository = require("../repositories/barbersRepository");
const InvitesRepository = require("../repositories/invitesRepository");
const EmailService = require("./emailService");
const AuditService = require("./auditService");

function createToken(): string {
	return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
	return crypto.createHash("sha256").update(token).digest("hex");
}

function buildInviteUrl(token: string): string {
	return `${env.APP_URL.replace(/\/$/, "")}/accept-invite?token=${token}`;
}

function toPublicInvite(invite: any) {
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

function assertActiveInvite(invite: any) {
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

function createSession(user: any) {
	const version = user.token_version || 1;
	const accessToken = jwt.sign(
		{ userId: user.id, tokenVersion: version },
		env.JWT_SECRET,
		{ expiresIn: "15m" }
	);
	const refreshToken = jwt.sign(
		{ userId: user.id, type: "refresh", tokenVersion: version },
		env.JWT_SECRET,
		{ expiresIn: "30d" }
	);
	return { accessToken, refreshToken };
}

export async function createBarberInvite(barbeiroId: string, payload: Record<string, any>, user: any, runtimeEnv?: any) {
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

	await AuditService.logResourceChange({
		action: "INVITE_REVOKED",
		resourceType: "invite",
		resourceId: barbeiroId,
		user,
		metadata: { barbeiroId },
	});

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

	await AuditService.logResourceChange({
		action: "INVITE_SENT",
		resourceType: "invite",
		resourceId: invite.id,
		user,
		newValues: { email, barbeiroId },
	});

	await EmailService.sendBarberInviteEmail({
		to: email,
		barberName: barber.nome || barber.name,
		shopName: invite.barbearia?.nome,
		inviteUrl,
	}, runtimeEnv);

	return {
		invite: toPublicInvite(invite),
		inviteUrl,
	};
}

export async function getInviteByToken(token: string) {
	const invite = await InvitesRepository.findByTokenHash(hashToken(token));
	assertActiveInvite(invite);
	return toPublicInvite(invite);
}

export async function acceptInvite(token: string, payload: Record<string, any>) {
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
		const password_hash = await bcrypt.hash(payload.password, 10);
		user = await AuthRepository.create({
			email,
			password_hash,
			nome: payload.nome || invite.barbeiro?.nome || email.split("@")[0],
			email_verificado_em: new Date().toISOString(),
		});
	} else if (!user.email_verificado_em) {
		user = await AuthRepository.markEmailVerified(user.id);
	}

	let linkedBarber: any;
	try {
		linkedBarber = await BarbersRepository.linkUser(
			invite.barbeiro_id,
			invite.barbearia_id,
			user.id,
			email,
		);
	} catch (error: any) {
		if (error.code === "23505" || error.message?.includes("idx_barbeiros_usuario_unique")) {
			throw new AppError(
				400,
				"USER_ALREADY_LINKED",
				"Este e-mail ja esta vinculado ao acesso de outro barbeiro.",
			);
		}
		throw error;
	}

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
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	createBarberInvite,
	getInviteByToken,
	acceptInvite,
}; }
export default {
	createBarberInvite,
	getInviteByToken,
	acceptInvite,
};
