package com.smartinventory.service.sms;

/** Sends a text message. Replace {@link LoggingSmsSender} with a real gateway (Twilio, eSMS, ...) for production. */
public interface SmsSender {

    /** @param toE164 destination number in E.164 format, e.g. +84912345678 */
    void send(String toE164, String message);
}
