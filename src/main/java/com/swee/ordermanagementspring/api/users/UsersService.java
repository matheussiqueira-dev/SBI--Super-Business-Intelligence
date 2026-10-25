package com.swee.ordermanagementspring.api.users;

import com.swee.ordermanagementspring.api.common.CurrentUser;
import com.swee.ordermanagementspring.api.common.DbSessionContext;
import com.swee.ordermanagementspring.api.common.PageResponse;
import com.swee.ordermanagementspring.api.users.UsersDtos.*;
import com.swee.ordermanagementspring.entities.audit.AuditAction;
import com.swee.ordermanagementspring.entities.auth.UserRole;
import com.swee.ordermanagementspring.exceptions.ApiException;
import com.swee.ordermanagementspring.exceptions.ErrorCode;
import com.swee.ordermanagementspring.security.AuditService;
import com.swee.ordermanagementspring.security.StrongPasswordValidator;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Cadastro de usuarios pelo GERENTE (G-03). Papel, situacao, desbloqueio e senha temporaria incrementam
 * session_version no mesmo UPDATE, o que encerra as sessoes abertas do usuario (G-01). O ultimo GERENTE ativo e
 * protegido pelo gatilho keep_one_active_manager (V8), verificado dentro da propria requisicao. Conta de CEO so e
 * criada, promovida ou alterada por outro CEO (D-EVO-43), e a equipe do vendedor aponta para um GERENTE ativo (V12).
 */
@Service
public class UsersService {
    private final UsersRepository users;
    private final JdbcClient jdbc;
    private final DbSessionContext session;
    private final AuditService audit;
    private final PasswordEncoder encoder;
    private final ObjectMapper mapper;

    public UsersService(UsersRepository users, JdbcClient jdbc, DbSessionContext session, AuditService audit,
                        PasswordEncoder encoder, ObjectMapper mapper) {
        this.users = users;
        this.jdbc = jdbc;
        this.session = session;
        this.audit = audit;
        this.encoder = encoder;
        this.mapper = mapper;
    }

    private static ApiException notFound(long id) {
        return ApiException.notFound("User not found, id: " + id);
    }

    private static String normalizedEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String trimmedName(String name) {
        String trimmed = name.trim();
        if (trimmed.length() < 3) throw ApiException.badRequest("name: size must be between 3 and 120");
        return trimmed;
    }

    /** D-EVO-43: o GERENTE nao cria, promove nem altera conta de CEO (403), o que impediria escalar privilegio. */
    private static void executiveGuard(CurrentUser user, UserRole... roles) {
        if (user.executive()) return;
        for (UserRole role : roles) {
            if (role == UserRole.CEO) {
                throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Only a CEO can create or change a CEO account");
            }
        }
    }

    private static void notSelf(CurrentUser user, long id) {
        if (user.id() == id) {
            throw ApiException.conflict(ErrorCode.SELF_CHANGE_FORBIDDEN,
                    "Use another manager account to change your own role, status or password");
        }
    }

    private String detail(Map<String, Object> values) {
        return mapper.writeValueAsString(values);
    }

    /** Dispara agora o gatilho diferido keep_one_active_manager, para o 409 sair nesta requisicao. */
    private void checkManagers() {
        jdbc.sql("SET CONSTRAINTS keep_one_active_manager IMMEDIATE").update();
    }

    @PreAuthorize("hasRole('GERENTE')")
    @Transactional(readOnly = true)
    public PageResponse<UserSummary> search(UsersRepository.Filter filter, int page, int size) {
        return new PageResponse<>(users.search(filter, page, size), page, size, users.count(filter));
    }

    @PreAuthorize("hasRole('GERENTE')")
    @Transactional(readOnly = true)
    public UserDetail get(long id) {
        return users.detail(id).orElseThrow(() -> notFound(id));
    }

    @PreAuthorize("hasRole('GERENTE')")
    @Transactional
    public UserDetail create(CurrentUser user, UserCreateRequest request) {
        executiveGuard(user, request.role());
        session.apply(user.id(), null);
        long id = jdbc.sql("""
                INSERT INTO app_users(name, email, password_hash, role, must_change_password, created_by)
                VALUES (:name, :email, :hash, :role, true, :user) RETURNING id""")
                .param("name", trimmedName(request.name()))
                .param("email", normalizedEmail(request.email()))
                .param("hash", encoder.encode(request.temporaryPassword()))
                .param("role", request.role().name())
                .param("user", user.id())
                .query(Long.class).single();
        audit.record(AuditAction.USER_CREATED, user.id(), "app_users", id, detail(Map.of("role", request.role().name())));
        return users.detail(id).orElseThrow();
    }

    @PreAuthorize("hasRole('GERENTE')")
    @Transactional
    public UserDetail update(CurrentUser user, long id, UserUpdateRequest request) {
        session.apply(user.id(), null);
        var head = users.head(id).orElseThrow(() -> notFound(id));
        executiveGuard(user, head.role());
        if (head.version() != request.version()) {
            throw ApiException.conflict(ErrorCode.CONCURRENT_UPDATE, "User was changed by someone else; reload and try again");
        }
        jdbc.sql("""
                UPDATE app_users SET name = :name, email = :email, version = version + 1, updated_at = now()
                 WHERE id = :id""")
                .param("name", trimmedName(request.name()))
                .param("email", normalizedEmail(request.email()))
                .param("id", id).update();
        audit.record(AuditAction.USER_UPDATED, user.id(), "app_users", id, null);
        return users.detail(id).orElseThrow();
    }

    @PreAuthorize("hasRole('GERENTE')")
    @Transactional
    public UserDetail changeRole(CurrentUser user, long id, UserRoleRequest request) {
        notSelf(user, id);
        session.apply(user.id(), request.reason().trim());
        var head = users.head(id).orElseThrow(() -> notFound(id));
        executiveGuard(user, head.role(), request.role());
        if (head.role() != request.role()) {
            jdbc.sql("""
                    UPDATE app_users SET role = :role, session_version = session_version + 1, version = version + 1,
                           updated_at = now()
                     WHERE id = :id""")
                    .param("role", request.role().name()).param("id", id).update();
            checkManagers();
            Map<String, Object> values = new LinkedHashMap<>();
            values.put("from", head.role().name());
            values.put("to", request.role().name());
            values.put("reason", request.reason().trim());
            audit.record(AuditAction.USER_ROLE_CHANGED, user.id(), "app_users", id, detail(values));
        }
        return users.detail(id).orElseThrow();
    }

    @PreAuthorize("hasRole('GERENTE')")
    @Transactional
    public UserDetail changeStatus(CurrentUser user, long id, UserStatusRequest request) {
        notSelf(user, id);
        session.apply(user.id(), request.reason().trim());
        var head = users.head(id).orElseThrow(() -> notFound(id));
        executiveGuard(user, head.role());
        if (head.active() != request.active()) {
            jdbc.sql("""
                    UPDATE app_users SET active = :active, session_version = session_version + 1, version = version + 1,
                           updated_at = now()
                     WHERE id = :id""")
                    .param("active", request.active()).param("id", id).update();
            checkManagers();
            Map<String, Object> values = new LinkedHashMap<>();
            values.put("active", request.active());
            values.put("reason", request.reason().trim());
            audit.record(AuditAction.USER_STATUS_CHANGED, user.id(), "app_users", id, detail(values));
        }
        return users.detail(id).orElseThrow();
    }

    /**
     * Equipe do vendedor (V12): o responsavel e um GERENTE ativo, ou nenhum. Nao encerra a sessao do vendedor, porque
     * a equipe nao muda o que ele pode fazer; so muda onde a venda dele aparece na meta por gerente.
     */
    @PreAuthorize("hasRole('GERENTE')")
    @Transactional
    public UserDetail changeManager(CurrentUser user, long id, UserManagerRequest request) {
        session.apply(user.id(), null);
        var head = users.head(id).orElseThrow(() -> notFound(id));
        if (head.role() != UserRole.VENDEDOR) {
            throw ApiException.conflict(ErrorCode.STATE_CONFLICT, "Only sellers belong to a team");
        }
        Long managerId = request.managerId();
        if (managerId != null && jdbc.sql("SELECT count(*) FROM app_users WHERE id = :id AND role = 'GERENTE' AND active")
                .param("id", managerId).query(Long.class).single() == 0) {
            throw ApiException.badRequest("managerId: user " + managerId + " is not an active manager");
        }
        // Sem equipe, manager_id e NULL: optional() devolve vazio em vez de falhar como single().
        Long before = jdbc.sql("SELECT manager_id FROM app_users WHERE id = :id").param("id", id).query(Long.class)
                .optional().orElse(null);
        if (!Objects.equals(before, managerId)) {
            jdbc.sql("UPDATE app_users SET manager_id = :manager, version = version + 1, updated_at = now() WHERE id = :id")
                    .param("manager", managerId).param("id", id).update();
            Map<String, Object> values = new LinkedHashMap<>();
            values.put("from", before);
            values.put("to", managerId);
            audit.record(AuditAction.USER_TEAM_CHANGED, user.id(), "app_users", id, detail(values));
        }
        return users.detail(id).orElseThrow();
    }

    @PreAuthorize("hasRole('GERENTE')")
    @Transactional
    public void unlock(CurrentUser user, long id) {
        session.apply(user.id(), null);
        executiveGuard(user, users.head(id).orElseThrow(() -> notFound(id)).role());
        jdbc.sql("""
                UPDATE app_users SET failed_login_attempts = 0, locked_until = NULL,
                       session_version = session_version + 1, updated_at = now()
                 WHERE id = :id""")
                .param("id", id).update();
        audit.record(AuditAction.ACCOUNT_UNLOCKED, user.id(), "app_users", id, null);
    }

    @PreAuthorize("hasRole('GERENTE')")
    @Transactional
    public void resetPassword(CurrentUser user, long id, PasswordResetRequest request) {
        notSelf(user, id);
        session.apply(user.id(), null);
        var head = users.head(id).orElseThrow(() -> notFound(id));
        executiveGuard(user, head.role());
        if (StrongPasswordValidator.sameAsEmail(request.temporaryPassword(), head.email())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "One or more fields are invalid",
                    List.of("temporaryPassword: must differ from the e-mail"));
        }
        jdbc.sql("""
                UPDATE app_users SET password_hash = :hash, must_change_password = true, password_changed_at = now(),
                       failed_login_attempts = 0, locked_until = NULL,
                       session_version = session_version + 1, version = version + 1, updated_at = now()
                 WHERE id = :id""")
                .param("hash", encoder.encode(request.temporaryPassword())).param("id", id).update();
        audit.record(AuditAction.PASSWORD_RESET, user.id(), "app_users", id, null);
    }
}
