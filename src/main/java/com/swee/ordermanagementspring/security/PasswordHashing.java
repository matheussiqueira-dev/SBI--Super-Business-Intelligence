package com.swee.ordermanagementspring.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * D-EVO-50: BCrypt com custo 10 (padrao do Spring Security e minimo do OWASP). No Render free (0,1 CPU) o custo 12
 * levava 3,2 s por login; o 10 leva 0,8 s. Hash gravado com outro custo e refeito no primeiro login correto
 * ({@link LockoutAuthenticationProvider}), entao contas antigas convergem sem precisar da senha em texto.
 */
public final class PasswordHashing {
    public static final int BCRYPT_STRENGTH = 10;

    private static final Pattern BCRYPT = Pattern.compile("^\\$2[abxy]?\\$(\\d{2})\\$");

    private PasswordHashing() {}

    public static PasswordEncoder encoder() {
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
    }

    /** Hash BCrypt com custo diferente do atual. Qualquer outro formato fica como esta. */
    public static boolean needsRehash(String hash) {
        if (hash == null) return false;
        Matcher matcher = BCRYPT.matcher(hash);
        return matcher.find() && Integer.parseInt(matcher.group(1)) != BCRYPT_STRENGTH;
    }
}
