package com.swee.ordermanagementspring.api.common;

import com.swee.ordermanagementspring.entities.auth.UserRole;
import com.swee.ordermanagementspring.security.AppPrincipal;

/**
 * Usuario da sessao visto pelos casos de uso: id, se e GERENTE ou acima (herda tudo do VENDEDOR) e se e CEO
 * (D-EVO-42: so o CEO administra contas de CEO).
 */
public record CurrentUser(long id, String name, boolean manager, boolean executive) {

    public static CurrentUser of(AppPrincipal principal) {
        boolean executive = principal.role() == UserRole.CEO;
        return new CurrentUser(principal.id(), principal.name(), executive || principal.role() == UserRole.GERENTE, executive);
    }

    /** Terceira barreira: o VENDEDOR so ve o proprio objeto; o GERENTE (e o CEO) ve todos. */
    public boolean owns(Long sellerId) {
        return manager || (sellerId != null && sellerId == id);
    }
}
