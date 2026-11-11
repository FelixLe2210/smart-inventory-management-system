package com.smartinventory.realtime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InventoryWebSocketHandlerTest {

    private WebSocketSession session(String id, boolean open) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(open);
        return session;
    }

    @Test
    @DisplayName("Tin phát ra tới mọi client đang mở (nhiều client)")
    void broadcastReachesAllOpenClients() throws Exception {
        InventoryWebSocketHandler handler = new InventoryWebSocketHandler();
        WebSocketSession a = session("a", true);
        WebSocketSession b = session("b", true);
        handler.afterConnectionEstablished(a);
        handler.afterConnectionEstablished(b);

        handler.broadcast("{\"type\":\"X\"}");

        // 1 tin CONNECTED + 1 tin broadcast cho mỗi client
        verify(a, times(2)).sendMessage(any(TextMessage.class));
        verify(b, times(2)).sendMessage(any(TextMessage.class));
        assertEquals(2, handler.sessionCount());
    }

    @Test
    @DisplayName("Client lỗi bị loại, client khác vẫn nhận tin")
    void failingClientDoesNotBlockOthers() throws Exception {
        InventoryWebSocketHandler handler = new InventoryWebSocketHandler();
        WebSocketSession bad = session("bad", true);
        WebSocketSession good = session("good", true);
        doNothing().doThrow(new IOException("broken pipe")).when(bad).sendMessage(any(TextMessage.class));
        handler.afterConnectionEstablished(bad);
        handler.afterConnectionEstablished(good);

        handler.broadcast("{\"type\":\"X\"}");

        verify(good, times(2)).sendMessage(any(TextMessage.class));
        assertEquals(1, handler.sessionCount());
    }

    @Test
    @DisplayName("Session đã đóng bị dọn và không nhận tin")
    void closedSessionIsRemoved() throws Exception {
        InventoryWebSocketHandler handler = new InventoryWebSocketHandler();
        WebSocketSession s = session("s", true);
        handler.afterConnectionEstablished(s);
        handler.afterConnectionClosed(s, CloseStatus.NORMAL);

        handler.broadcast("{\"type\":\"X\"}");

        verify(s, times(1)).sendMessage(any(TextMessage.class)); // chỉ tin CONNECTED
        assertEquals(0, handler.sessionCount());
    }

    @Test
    @DisplayName("Client gửi ping thì nhận pong")
    void pingGetsPong() throws Exception {
        InventoryWebSocketHandler handler = new InventoryWebSocketHandler();
        WebSocketSession s = session("s", true);
        handler.afterConnectionEstablished(s);

        handler.handleMessage(s, new TextMessage("ping"));

        verify(s, times(2)).sendMessage(any(TextMessage.class)); // CONNECTED + PONG
    }
}
