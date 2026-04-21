package com.vims.config;

import java.util.UUID;

public class TenantContext {

    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    public static void set(UUID id) {
        CURRENT.set(id);
    }

    public static UUID get() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }

    public static boolean isSuperAdmin() {
        return CURRENT.get() == null;
    }
}
