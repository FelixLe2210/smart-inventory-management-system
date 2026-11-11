package com.smartinventory.service;

import com.smartinventory.dto.OtpSentResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.service.sms.SmsSender;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * One-time codes for phone sign-in. Codes live in memory (like the WebSocket sessions, this assumes one backend
 * instance): 6 digits, valid 5 minutes, one resend every 30 seconds, at most 5 wrong guesses.
 */
@Service
public class PhoneOtpService {

    static final Duration TTL = Duration.ofMinutes(5);
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(30);
    static final int MAX_ATTEMPTS = 5;
    private static final int MAX_PENDING = 10_000;

    private static final class Entry {
        final String code;
        final Instant expiresAt;
        final Instant sentAt;
        int attempts;

        Entry(String code, Instant expiresAt, Instant sentAt) {
            this.code = code;
            this.expiresAt = expiresAt;
            this.sentAt = sentAt;
        }
    }

    private final Map<String, Entry> pending = new HashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final SmsSender smsSender;
    private final boolean devMode;
    private final boolean enabled;
    private final Clock clock;

    @Autowired
    public PhoneOtpService(
            SmsSender smsSender,
            @Value("${app.auth.phone.dev-mode:false}") boolean devMode,
            @Value("${app.auth.phone.enabled:true}") boolean enabled
    ) {
        this(smsSender, devMode, enabled, Clock.systemUTC());
    }

    PhoneOtpService(SmsSender smsSender, boolean devMode, boolean enabled, Clock clock) {
        this.smsSender = smsSender;
        this.devMode = devMode;
        this.enabled = enabled;
        this.clock = clock;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** Creates and sends a code for an already normalized (E.164) number. */
    public synchronized OtpSentResponse requestCode(String phoneE164) {
        if (!enabled) {
            throw new BadRequestException("PHONE_DISABLED", "Phone sign-in is turned off.");
        }
        Instant now = clock.instant();
        pending.values().removeIf(entry -> entry.expiresAt.isBefore(now));

        Entry previous = pending.get(phoneE164);
        if (previous != null) {
            long wait = Duration.between(now, previous.sentAt.plus(RESEND_COOLDOWN)).toSeconds();
            if (wait > 0) {
                throw new BadRequestException("OTP_TOO_SOON", "Please wait " + (wait + 1) + " seconds before asking for a new code.");
            }
        } else if (pending.size() >= MAX_PENDING) {
            throw new BadRequestException("OTP_BUSY", "Too many pending requests. Try again in a few minutes.");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        pending.put(phoneE164, new Entry(code, now.plus(TTL), now));
        smsSender.send(phoneE164, "Smart Inventory: ma xac thuc cua ban la " + code + " (hieu luc 5 phut).");
        return new OtpSentResponse(phoneE164, (int) TTL.toSeconds(), (int) RESEND_COOLDOWN.toSeconds(), devMode ? code : null);
    }

    /** Checks a code. A correct code is used up; wrong guesses are counted. */
    public synchronized void verify(String phoneE164, String code) {
        Instant now = clock.instant();
        Entry entry = pending.get(phoneE164);
        if (entry == null || entry.expiresAt.isBefore(now)) {
            pending.remove(phoneE164);
            throw new UnauthorizedException("OTP_INVALID", "The code is wrong or has expired.");
        }
        if (entry.attempts >= MAX_ATTEMPTS) {
            pending.remove(phoneE164);
            throw new UnauthorizedException("OTP_TOO_MANY_ATTEMPTS", "Too many wrong attempts. Ask for a new code.");
        }
        boolean match = code != null && MessageDigest.isEqual(
                entry.code.getBytes(StandardCharsets.UTF_8), code.getBytes(StandardCharsets.UTF_8));
        if (!match) {
            entry.attempts++;
            throw new UnauthorizedException("OTP_INVALID", "The code is wrong or has expired.");
        }
        pending.remove(phoneE164);
    }
}
