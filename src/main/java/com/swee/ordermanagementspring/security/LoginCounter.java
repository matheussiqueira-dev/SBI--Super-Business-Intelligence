package com.swee.ordermanagementspring.security;

import java.time.Instant;
import java.util.Optional;

/**
 * Contador de falhas de login gravado por UPDATE atomico no banco (G-02): duas tentativas simultaneas nunca
 * leem o mesmo valor e gravam o mesmo incremento.
 */
public interface LoginCounter {

    /** Estado da conta depois de uma falha; {@code lockedNow} indica que esta falha acionou o bloqueio. */
    record FailureState(int failedAttempts, Instant lockedUntil, boolean lockedNow) {}

    /**
     * Soma uma falha. Ao chegar em {@code maxFailures}, bloqueia ate {@code lockUntil} e zera o contador.
     * Conta ja bloqueada em {@code now} nao e alterada (o bloqueio nao se prolonga) e devolve vazio.
     */
    Optional<FailureState> registerFailure(long userId, int maxFailures, Instant lockUntil, Instant now);

    /** Zera contador e bloqueio e grava o ultimo acesso, sem tocar nas demais colunas da conta. */
    void registerSuccess(long userId, Instant now);

    /**
     * Troca o hash da mesma senha (novo custo do BCrypt, D-EVO-50) so se ele ainda for {@code currentHash}: uma
     * troca de senha concorrente vence. Nao altera session_version, porque a senha continua a mesma.
     */
    void replacePasswordHash(long userId, String currentHash, String newHash);
}
