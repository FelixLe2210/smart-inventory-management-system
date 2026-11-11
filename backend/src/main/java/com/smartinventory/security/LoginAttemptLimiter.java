package com.smartinventory.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn số lần đăng nhập sai theo tên đăng nhập: quá {@code maxFailures} lần trong {@code window}
 * thì khóa tạm thời cho tới khi lần sai cũ nhất trượt khỏi cửa sổ.
 *
 * <p>Lưu trong bộ nhớ của một máy chủ. Chạy nhiều bản backend thì mỗi bản đếm riêng
 * (muốn dùng chung cần Redis hoặc bảng trong cơ sở dữ liệu).
 */
@Component
public class LoginAttemptLimiter {

    private final int maxFailures;
    private final long windowMillis;
    private final Clock clock;
    private final Map<String, Deque<Long>> failures = new ConcurrentHashMap<>();

    @Autowired
    public LoginAttemptLimiter(
            @Value("${app.auth.max-login-failures:5}") int maxFailures,
            @Value("${app.auth.lockout-minutes:15}") long lockoutMinutes
    ) {
        this(maxFailures, Duration.ofMinutes(lockoutMinutes), Clock.systemUTC());
    }

    public LoginAttemptLimiter(int maxFailures, Duration window, Clock clock) {
        if (maxFailures < 1) {
            throw new IllegalArgumentException("maxFailures must be >= 1");
        }
        this.maxFailures = maxFailures;
        this.windowMillis = window.toMillis();
        this.clock = clock;
    }

    /** Số giây còn bị khóa của tên đăng nhập này; 0 nếu được phép thử. */
    public long retryAfterSeconds(String identity) {
        String key = key(identity);
        Deque<Long> recent = failures.get(key);
        if (recent == null) {
            return 0;
        }
        synchronized (recent) {
            prune(recent);
            if (recent.isEmpty()) {
                failures.remove(key, recent);
                return 0;
            }
            if (recent.size() < maxFailures) {
                return 0;
            }
            long unlockAt = recent.peekFirst() + windowMillis;
            return Math.max(1, (unlockAt - clock.millis() + 999) / 1000);
        }
    }

    public void recordFailure(String identity) {
        Deque<Long> recent = failures.computeIfAbsent(key(identity), k -> new ArrayDeque<>());
        synchronized (recent) {
            prune(recent);
            recent.addLast(clock.millis());
        }
    }

    public void reset(String identity) {
        failures.remove(key(identity));
    }

    private void prune(Deque<Long> recent) {
        long cutoff = clock.millis() - windowMillis;
        while (!recent.isEmpty() && recent.peekFirst() <= cutoff) {
            recent.pollFirst();
        }
    }

    private static String key(String identity) {
        return identity == null ? "" : identity.trim().toLowerCase(Locale.ROOT);
    }
}
