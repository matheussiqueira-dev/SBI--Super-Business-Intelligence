package com.swee.ordermanagementspring.entities.audit;

/**
 * Acoes aceitas por ck_audit_event_action (V5, ampliada na V8 com as operacoes de usuario, na V11 com o desconto manual
 * e na V12 com a equipe e a meta anual, e na V13 com a foto de produto).
 */
public enum AuditAction {
    LOGIN_SUCCEEDED, LOGIN_FAILED, ACCOUNT_LOCKED, LOGOUT, CUSTOMER_CREATED, CUSTOMER_UPDATED,
    CUSTOMER_DELETED, STOCK_ADJUSTED, PRODUCT_STATUS_CHANGED, ORDER_CANCELED,
    USER_CREATED, USER_UPDATED, USER_ROLE_CHANGED, USER_STATUS_CHANGED, ACCOUNT_UNLOCKED, PASSWORD_RESET, PASSWORD_CHANGED,
    DISCOUNT_APPROVED, DISCOUNT_POLICY_CHANGED, USER_TEAM_CHANGED, ANNUAL_GOAL_SAVED,
    PRODUCT_PHOTO_CHANGED, PRODUCT_PHOTO_REMOVED
}
