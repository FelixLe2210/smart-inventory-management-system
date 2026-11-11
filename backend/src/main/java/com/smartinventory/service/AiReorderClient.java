package com.smartinventory.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartinventory.exception.AiServiceException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.Map;

/** Gọi {@code POST /api/reorder/recommend} của AI service (AI #2). Tách riêng để dễ mock khi kiểm thử. */
@Component
public class AiReorderClient {

    private final RestClient aiServiceClient;

    public AiReorderClient(RestClient aiServiceRestClient) {
        this.aiServiceClient = aiServiceRestClient;
    }

    /** @return nút {@code data} của phản hồi AI. */
    public JsonNode recommend(Map<String, Object> payload) {
        JsonNode envelope;
        try {
            envelope = aiServiceClient.post()
                    .uri("/api/reorder/recommend")
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (ResourceAccessException exception) {
            if (isTimeout(exception)) {
                throw new AiServiceException("AI_SERVICE_TIMEOUT",
                        "AI service did not respond before the request timed out.", HttpStatus.GATEWAY_TIMEOUT);
            }
            throw new AiServiceException("AI_SERVICE_UNAVAILABLE",
                    "AI service is unavailable. Please try again later.", HttpStatus.BAD_GATEWAY);
        } catch (RestClientResponseException exception) {
            throw new AiServiceException("AI_SERVICE_ERROR",
                    "AI service could not process the reorder request.", HttpStatus.BAD_GATEWAY);
        } catch (RestClientException exception) {
            throw invalidResponse();
        }

        if (envelope == null || !envelope.path("success").asBoolean(false)
                || !envelope.hasNonNull("data") || !envelope.get("data").isObject()) {
            throw invalidResponse();
        }
        return envelope.get("data");
    }

    private static boolean isTimeout(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SocketTimeoutException || cause instanceof HttpTimeoutException) {
                return true;
            }
        }
        return false;
    }

    private static AiServiceException invalidResponse() {
        return new AiServiceException("AI_SERVICE_INVALID_RESPONSE",
                "AI service returned a response that does not match the reorder contract.", HttpStatus.BAD_GATEWAY);
    }
}
