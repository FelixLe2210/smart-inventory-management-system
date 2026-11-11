package com.smartinventory.security;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginAttemptLimiterTest {

    /** Đồng hồ giả để test không phải chờ thật. */
    private static final class MutableClock extends Clock {
        private long millis = 1_000_000L;

        void advance(Duration d) {
            millis += d.toMillis();
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis);
        }

        @Override
        public long millis() {
            return millis;
        }
    }

    private final MutableClock clock = new MutableClock();
    private final LoginAttemptLimiter limiter = new LoginAttemptLimiter(3, Duration.ofMinutes(10), clock);

    @Test
    void allowsAttemptsBelowTheLimit() {
        limiter.recordFailure("admin");
        limiter.recordFailure("admin");
        assertEquals(0L, limiter.retryAfterSeconds("admin"));
    }

    @Test
    void locksAfterTooManyFailuresAndReportsWait() {
        for (int i = 0; i < 3; i++) {
            limiter.recordFailure("admin");
        }
        long wait = limiter.retryAfterSeconds("admin");
        assertTrue(wait > 0 && wait <= 600, "wait was " + wait);
    }

    @Test
    void unlocksWhenTheWindowPasses() {
        for (int i = 0; i < 3; i++) {
            limiter.recordFailure("admin");
        }
        clock.advance(Duration.ofMinutes(10).plusSeconds(1));
        assertEquals(0L, limiter.retryAfterSeconds("admin"));
    }

    @Test
    void successResetsTheCounter() {
        limiter.recordFailure("admin");
        limiter.recordFailure("admin");
        limiter.reset("admin");
        limiter.recordFailure("admin");
        assertEquals(0L, limiter.retryAfterSeconds("admin"));
    }

    @Test
    void identityIsCaseAndSpaceInsensitiveAndIndependentPerUser() {
        for (int i = 0; i < 3; i++) {
            limiter.recordFailure("  Admin ");
        }
        assertTrue(limiter.retryAfterSeconds("admin") > 0);
        assertEquals(0L, limiter.retryAfterSeconds("staff"));
    }
}
