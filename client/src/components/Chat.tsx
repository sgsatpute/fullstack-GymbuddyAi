import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Avatar from "./Avatar";
import { apiFetch } from "../utils/api";
import { getCurrentUserId } from "../utils/auth";
import { formatDateTime, formatExperience, formatGoal, formatTimePreference } from "../utils/display";
import { ChatMessage, UserProfile } from "../utils/models";
import { socket } from "../utils/socket";

type ChatPayload = {
  participant: UserProfile;
  messages: ChatMessage[];
};

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const otherId = Number(id);
  const myId = getCurrentUserId();
  const [participant, setParticipant] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otherId) {
      navigate("/inbox");
      return;
    }

    if (!myId) {
      navigate("/login");
      return;
    }

    socket.connect();
    socket.emit("online", myId);

    apiFetch(`/api/chat/${otherId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not load this conversation.");
        }
        return data as ChatPayload;
      })
      .then((data) => {
        setParticipant(data.participant);
        setMessages(data.messages);
        socket.emit("seen", { from: otherId, to: myId });
      })
      .catch((loadError: Error) => setError(loadError.message || "Could not load this conversation."))
      .finally(() => setLoading(false));

    socket.on("receive-message", (message: ChatMessage) => {
      if (message.senderId !== otherId || message.receiverId !== myId) {
        return;
      }

      setMessages((current) => [...current, message]);
      socket.emit("seen", { from: message.senderId, to: myId });
    });

    socket.on("typing", ({ from }: { from: number }) => {
      if (from === otherId) {
        setTyping(true);
        setTimeout(() => setTyping(false), 1200);
      }
    });

    socket.on("seen", ({ by }: { by: number }) => {
      if (by === otherId) {
        setMessages((current) =>
          current.map((message) =>
            message.senderId === myId ? { ...message, seen: 1 } : message
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
  }, [myId, navigate, otherId]);

  useEffect(() => {
    const state = location.state as { draftMessage?: string } | null;
    const draftMessage = state?.draftMessage?.trim();

    if (!draftMessage) {
      return;
    }

    setText(draftMessage);
    navigate(`/chat/${otherId}`, { replace: true, state: null });
  }, [location.state, navigate, otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function send() {
    if (!text.trim() || !myId || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await apiFetch(`/api/chat/${otherId}`, {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Could not send this message.");
        return;
      }

      const nextMessage: ChatMessage = {
        senderId: myId,
        receiverId: otherId,
        message: text.trim(),
        createdAt: new Date().toISOString(),
        seen: 0,
      };

      socket.emit("send-message", nextMessage);
      setMessages((current) => [...current, nextMessage]);
      setText("");
    } catch {
      setError("Could not send this message.");
    } finally {
      setSending(false);
    }
  }

  function handleTyping() {
    if (!myId) {
      return;
    }

    socket.emit("typing", { from: myId, to: otherId });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      send();
    }
  }

  async function handleBlockUser() {
    if (!participant || blocking) {
      return;
    }

    const confirmed = window.confirm(`Block ${participant.name}? This removes them from your matches and chat access.`);
    if (!confirmed) {
      return;
    }

    setBlocking(true);
    setError("");

    try {
      const response = await apiFetch("/api/report", {
        method: "POST",
        body: JSON.stringify({
          accusedId: participant.id,
          type: "block",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Could not block this user.");
        return;
      }

      navigate("/matches");
    } catch {
      setError("Could not block this user.");
    } finally {
      setBlocking(false);
    }
  }

  if (loading) {
    return <div className="page-section">Loading conversation...</div>;
  }

  if (error && !participant) {
    return <div className="feedback error">{error || "Conversation not found."}</div>;
  }

  if (!participant) {
    return <div className="feedback error">Conversation not found.</div>;
  }

  return (
    <div className="chat-page">
      <div className="card chat-shell">
        <div className="chat-header">
          <div className="chat-user">
            <Avatar name={participant.name} avatarUrl={participant.avatarUrl} size="md" />
            <div>
              <span className="eyebrow">Conversation</span>
              <h2>{participant.name}</h2>
              <p className="muted">
                {formatGoal(participant.goal)} · {formatExperience(participant.experience)} · {formatTimePreference(participant.preferredTime)}
              </p>
            </div>
          </div>
          <div className="action-row">
            <button className="btn btn-secondary" onClick={() => navigate(`/profile/${participant.id}`)}>
              View Profile
            </button>
            <button className="btn btn-secondary btn-danger-soft" onClick={handleBlockUser} disabled={blocking}>
              {blocking ? "Blocking..." : "Block User"}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate("/inbox")}>
              Back to Inbox
            </button>
          </div>
        </div>

        <div className="chat-stream">
          {messages.map((message, index) => {
            const isMe = message.senderId === myId;

            return (
              <div key={`${message.createdAt}-${index}`} className={`chat-bubble-row ${isMe ? "me" : "them"}`}>
                <div className={`chat-bubble ${isMe ? "me" : "them"}`}>
                  <div>{message.message}</div>
                  <span className="chat-meta">
                    {formatDateTime(message.createdAt)} · {isMe ? (message.seen ? "Seen" : "Sent") : participant.name}
                  </span>
                </div>
              </div>
            );
          })}

          {typing && <div className="muted">Typing...</div>}
          <div ref={bottomRef} />
        </div>

        {error && <div className="chat-error-strip">{error}</div>}

        <div className="chat-composer">
          <input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Send a message that gets the routine started..."
          />
          <button className="btn btn-primary" onClick={send} disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
