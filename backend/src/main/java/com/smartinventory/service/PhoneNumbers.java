package com.smartinventory.service;

import com.smartinventory.exception.BadRequestException;

/** Normalizes phone numbers to E.164. Local Vietnamese numbers (0912 345 678) become +84912345678. */
public final class PhoneNumbers {

    private static final String INVALID_MESSAGE = "Phone number is not valid.";

    private PhoneNumbers() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            throw new BadRequestException("INVALID_PHONE", INVALID_MESSAGE);
        }
        String s = raw.trim().replaceAll("[\\s().-]", "");
        if (s.startsWith("00")) {
            s = "+" + s.substring(2);
        }
        if (s.startsWith("+")) {
            // already international
        } else if (s.startsWith("0")) {
            s = "+84" + s.substring(1);
        } else if (s.startsWith("84")) {
            s = "+" + s;
        } else {
            throw new BadRequestException("INVALID_PHONE", INVALID_MESSAGE);
        }
        boolean valid = s.startsWith("+84")
                ? s.matches("\\+84[35789]\\d{8}")
                : s.matches("\\+[1-9]\\d{7,14}");
        if (!valid) {
            throw new BadRequestException("INVALID_PHONE", INVALID_MESSAGE);
        }
        return s;
    }
}
