import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { socket } from "../utils/socket";

type Message = {
  senderId: number;
  receiverId: number;
  message: string;
  createdAt: string;
  seen?: number;
};

type TypingPayload = {
  from: number;
};

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const otherId = Number(id);

  const myId = JSON.parse(
    atob(localStorage.getItem("token")!.split(".")[1])
  ).id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otherId) {
      navigate("/matches");
      return;
    }

    socket.connect();
    socket.emit("online", myId);

    apiFetch(`/api/chat/${otherId}`)
      .then(res => res.json())
      .then((data: Message[]) => {
        setMessages(data);
        socket.emit("seen", { from: otherId, to: myId });
      });

    socket.on("receive-message", (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      socket.emit("seen", { from: msg.senderId, to: myId });
    });

    socket.on("typing", ({ from }: TypingPayload) => {
      if (from === otherId) {
        setTyping(true);
        setTimeout(() => setTyping(false), 1200);
      }
    });

    socket.on("seen", ({ by }: { by: number }) => {
      if (by === otherId) {
        setMessages(prev =>
          prev.map(m =>
            m.senderId === myId ? { ...m, seen: 1 } : m
          )
        );
      }
    });

    return () => {
      socket.off("receive-message");
      socket.off("typing");
      socket.off("seen");
      socket.disconnect();
    };
  }, [otherId, myId, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function send() {
    if (!text.trim()) return;

    await apiFetch(`/api/chat/${otherId}`, {
      method: "POST",
      body: JSON.stringify({ message: text }),
    });

    const msg: Message = {
      senderId: myId,
      receiverId: otherId,
      message: text,
      createdAt: new Date().toISOString(),
      seen: 0,
    };

    socket.emit("send-message", msg);
    setMessages(prev => [...prev, msg]);
    setText("");
  }

  function handleTyping() {
    socket.emit("typing", { from: myId, to: otherId });
  }

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 20,
        height: "85vh",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #ddd",
        borderRadius: 12,
        background: "#f8f9fa",
      }}
    >
      <h3 style={{ marginBottom: 10 }}>Chat</h3>

      {/* CHAT MESSAGES */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 6px",
          marginBottom: 10,
        }}
      >
        {messages.map((m, i) => {
          const isMe = m.senderId === myId;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: isMe ? "#a29bfe" : "#e9ecef",
                  color: "#000",
                  fontSize: 14,
                }}
              >
                <div>{m.message}</div>

                {isMe && (
                  <div
                    style={{
                      fontSize: 10,
                      textAlign: "right",
                      marginTop: 2,
                      opacity: 0.7,
                    }}
                  >
                    {m.seen ? "✓✓ Seen" : "✓ Sent"}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {typing && (
          <div style={{ fontSize: 12, color: "#555" }}>
            Typing…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT BAR */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={send}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "#6c5ce7",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
