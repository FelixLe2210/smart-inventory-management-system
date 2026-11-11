package com.smartinventory.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Giữ danh sách client đang kết nối {@code /ws/inventory} và phát tin nhắn JSON tới tất cả. */
public class InventoryWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(InventoryWebSocketHandler.class);
    private static final int SEND_TIME_LIMIT_MS = 5_000;
    private static final int BUFFER_SIZE_LIMIT = 256 * 1024;

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        WebSocketSession safe = new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT);
        sessions.put(session.getId(), safe);
        safe.sendMessage(new TextMessage("{\"type\":\"CONNECTED\"}"));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // Client gửi "ping" định kỳ để giữ kết nối và phát hiện đứt mạng.
        if ("ping".equals(message.getPayload())) {
            WebSocketSession safe = sessions.get(session.getId());
            if (safe != null) {
                safe.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        sessions.remove(session.getId());
        log.debug("WebSocket transport error on session {}: {}", session.getId(), exception.getMessage());
    }

    /** Một client lỗi hoặc chậm không làm các client khác mất tin; session đã đóng bị loại khỏi danh sách. */
    public void broadcast(String json) {
        TextMessage message = new TextMessage(json);
        sessions.forEach((id, session) -> {
            if (!session.isOpen()) {
                sessions.remove(id);
                return;
            }
            try {
                session.sendMessage(message);
            } catch (IOException | RuntimeException exception) {
                log.warn("Dropping WebSocket session {} after send failure: {}", id, exception.getMessage());
                sessions.remove(id);
                try {
                    session.close(CloseStatus.SERVER_ERROR);
                } catch (IOException | RuntimeException ignored) {
                    // đã đóng
                }
            }
        });
    }

    public int sessionCount() {
        return sessions.size();
    }
}
