package com.smartinventory.service;

import com.smartinventory.dto.OtpSentResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PhoneOtpServiceTest {

    private static final String PHONE = "+84912345678";

    /** Clock the test can move forward. */
    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-11-07T08:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private MutableClock clock;
    private List<String> sentMessages;
    private PhoneOtpService devService;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        sentMessages = new ArrayList<>();
        devService = new PhoneOtpService((to, message) -> sentMessages.add(to + "|" + message), true, true, clock);
    }

    @Test
    void requestSendsSixDigitCodeAndDevModeReturnsIt() {
        OtpSentResponse response = devService.requestCode(PHONE);

        assertTrue(response.devCode().matches("\\d{6}"));
        assertEquals(PHONE, response.phone());
        assertEquals(300, response.expiresInSeconds());
        assertEquals(30, response.resendAfterSeconds());
        assertEquals(1, sentMessages.size());
        assertTrue(sentMessages.get(0).startsWith(PHONE + "|"));
        assertTrue(sentMessages.get(0).contains(response.devCode()));
    }

    @Test
    void outsideDevModeTheCodeIsNotReturned() {
        PhoneOtpService service = new PhoneOtpService((to, message) -> { }, false, true, clock);
        assertNull(service.requestCode(PHONE).devCode());
    }

    @Test
    void correctCodeWorksOnceOnly() {
        String code = devService.requestCode(PHONE).devCode();

        devService.verify(PHONE, code);

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> devService.verify(PHONE, code));
        assertEquals("OTP_INVALID", ex.getCode());
    }

    @Test
    void wrongCodeIsRejectedButTheRightOneStillWorks() {
        String code = devService.requestCode(PHONE).devCode();
        String wrong = code.equals("000000") ? "000001" : "000000";

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> devService.verify(PHONE, wrong));
        assertEquals("OTP_INVALID", ex.getCode());

        devService.verify(PHONE, code);
    }

    @Test
    void fiveWrongGuessesLockTheCodeEvenForTheRightAnswer() {
        String code = devService.requestCode(PHONE).devCode();
        String wrong = code.equals("000000") ? "000001" : "000000";
        for (int i = 0; i < PhoneOtpService.MAX_ATTEMPTS; i++) {
            assertThrows(UnauthorizedException.class, () -> devService.verify(PHONE, wrong));
        }

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> devService.verify(PHONE, code));
        assertEquals("OTP_TOO_MANY_ATTEMPTS", ex.getCode());
    }

    @Test
    void codeExpiresAfterFiveMinutes() {
        String code = devService.requestCode(PHONE).devCode();
        clock.advance(Duration.ofMinutes(5).plusSeconds(1));

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> devService.verify(PHONE, code));
        assertEquals("OTP_INVALID", ex.getCode());
    }

    @Test
    void verifyWithoutRequestIsRejected() {
        assertThrows(UnauthorizedException.class, () -> devService.verify(PHONE, "123456"));
    }

    @Test
    void resendTooSoonIsRefusedThenAllowedAndReplacesTheOldCode() {
        String first = devService.requestCode(PHONE).devCode();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> devService.requestCode(PHONE));
        assertEquals("OTP_TOO_SOON", ex.getCode());

        clock.advance(Duration.ofSeconds(31));
        String second = devService.requestCode(PHONE).devCode();
        assertEquals(2, sentMessages.size());
        if (!first.equals(second)) {
            assertThrows(UnauthorizedException.class, () -> devService.verify(PHONE, first));
        }
        devService.verify(PHONE, second);
    }

    @Test
    void disabledPhoneSignInRefusesRequests() {
        PhoneOtpService service = new PhoneOtpService((to, message) -> { }, true, false, clock);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.requestCode(PHONE));
        assertEquals("PHONE_DISABLED", ex.getCode());
        assertFalse(service.isEnabled());
    }
}
