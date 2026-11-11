package com.smartinventory.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Default sender used while no SMS gateway is wired in. It never contacts a phone: in dev mode it prints the
 * message to the backend log (so phone sign-in works locally), otherwise it only warns and does not print the code.
 */
@Component
public class LoggingSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsSender.class);

    private final boolean devMode;

    public LoggingSmsSender(@Value("${app.auth.phone.dev-mode:false}") boolean devMode) {
        this.devMode = devMode;
    }

    @Override
    public void send(String toE164, String message) {
        if (devMode) {
            log.info("[SMS simulated] to {}: {}", toE164, message);
        } else {
            log.warn("No SMS gateway configured: message to {} was NOT delivered.", toE164);
        }
    }
}
