import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { ConversationSummary } from "../utils/models";
import { formatDateTime, formatExperience, formatGoal } from "../utils/display";

export default function Inbox() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/api/chat")
      .then((response) => response.json())
      .then((data: ConversationSummary[]) => setConversations(data))
      .catch(() => setError("Could not load your inbox right now."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-section">Loading your conversations...</div>;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Inbox</span>
          <h1>Stay in touch with your gym partners.</h1>
          <p>
            Pick up where you left off, respond to unread messages, and keep the momentum going.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/matches")}>
          Find More Matches
        </button>
      </section>

      {error && <div className="feedback error">{error}</div>}

      {conversations.length === 0 ? (
        <section className="card empty-state">
          <h2>No conversations yet</h2>
          <p>
            Start with your best matches, send the first message, and turn compatibility into consistency.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/matches")}>
            Browse Matches
          </button>
        </section>
      ) : (
        <section className="grid-list">
          {conversations.map((conversation) => (
            <article key={conversation.userId} className="card conversation-card">
              <div className="conversation-top">
                <div>
                  <h3>{conversation.user.name}</h3>
                  <p className="muted">
                    {formatGoal(conversation.user.goal)} · {formatExperience(conversation.user.experience)}
                  </p>
                </div>
                <div className="conversation-meta">
                  <span className="muted">{formatDateTime(conversation.lastMessageAt)}</span>
                  {conversation.unreadCount > 0 && (
                    <span className="badge badge-accent">{conversation.unreadCount} unread</span>
                  )}
                </div>
              </div>

              <p className="conversation-preview">{conversation.lastMessage}</p>

              <div className="chip-row">
                {conversation.user.gym && <span className="chip">{conversation.user.gym}</span>}
                {conversation.user.level && <span className="chip">Level {conversation.user.level}</span>}
              </div>

              <div className="action-row">
                <button className="btn btn-primary" onClick={() => navigate(`/chat/${conversation.userId}`)}>
                  Open Chat
                </button>
                <button className="btn btn-secondary" onClick={() => navigate(`/profile/${conversation.userId}`)}>
                  View Profile
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
