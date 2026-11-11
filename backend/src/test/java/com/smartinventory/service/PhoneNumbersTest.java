package com.smartinventory.service;

import com.smartinventory.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PhoneNumbersTest {

    @Test
    void localVietnameseNumberBecomesE164() {
        assertEquals("+84912345678", PhoneNumbers.normalize("0912 345 678"));
        assertEquals("+84912345678", PhoneNumbers.normalize("0912.345.678"));
    }

    @Test
    void internationalSpellingsAreAccepted() {
        assertEquals("+84912345678", PhoneNumbers.normalize("+84 912-345-678"));
        assertEquals("+84912345678", PhoneNumbers.normalize("84912345678"));
        assertEquals("+84912345678", PhoneNumbers.normalize("0084912345678"));
        assertEquals("+14155552671", PhoneNumbers.normalize("+1 (415) 555-2671"));
    }

    @Test
    void invalidNumbersAreRejectedWithInvalidPhoneCode() {
        for (String bad : new String[] {null, "", "abc", "12345", "0212345678", "+84123456789", "+0123456789"}) {
            BadRequestException ex = assertThrows(BadRequestException.class, () -> PhoneNumbers.normalize(bad), "input: " + bad);
            assertEquals("INVALID_PHONE", ex.getCode());
        }
    }
}
