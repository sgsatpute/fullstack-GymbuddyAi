import React from "react";
import { Bot, Send } from "lucide-react";
import { CoachConversationMessage, CoachPromptSuggestion } from "../../utils/coachTypes";
import { formatDateTime } from "../../utils/display";

interface CoachChatProps {
  messages: CoachConversationMessage[];
  sendingMessage: boolean;
  chatDraft: string;
  setChatDraft: (value: string) => void;
  onSendMessage: (messageOverride?: string) => void;
  quickPrompts?: CoachPromptSuggestion[];
  onUsePrompt: (message: string) => void;
  aiEnabled: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
}

export default function CoachChat({
  messages,
  sendingMessage,
  chatDraft,
  setChatDraft,
  onSendMessage,
  quickPrompts,
  onUsePrompt,
  aiEnabled,
  bottomRef,
}: CoachChatProps) {
  return (
    <div className="card h-full flex flex-col">
      <div className="section-head">
        <div>
          <span className="eyebrow">Coach Chat</span>
          <h2>Ask for the next best move</h2>
          <p className="muted">
            {aiEnabled
              ? "Streaming personalized advice from your training context."
              : "Fallback mode is active until Gemini or Claude is configured."}
          </p>
        </div>
        <Bot size={18} />
      </div>

      {quickPrompts?.length ? (
        <div className="chip-row mt-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.label}
              className="chip"
              onClick={() => onUsePrompt(prompt.message)}
              type="button"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="coach-chat-panel flex-1 flex flex-col justify-between mt-3">
        <div className="coach-chat-scroll flex-1 overflow-y-auto pr-1 max-h-[400px]">
          {messages.length === 0 ? (
            <div className="feedback">
              Ask about today&apos;s workout, your meal timing, or how to recover better this week.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={`${message.id}-${message.createdAt}`}
                className={message.role === "assistant" ? "coach-chat-row ai" : "coach-chat-row user"}
              >
                <div className={message.role === "assistant" ? "chat-bubble-ai" : "chat-bubble-user"}>
                  <div className="whitespace-pre-wrap">
                    {message.content || (
                      <span className="typing-dots" aria-label="Coach is thinking">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                    {message.role === "assistant" && sendingMessage && message.content && (
                      <span className="streaming-cursor" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mt-2 text-[11px] opacity-70">
                    {formatDateTime(message.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="coach-chat-compose mt-3">
          <textarea
            rows={3}
            value={chatDraft}
            onChange={(event) => setChatDraft(event.target.value)}
            placeholder="Ask about training, recovery, meals, or how to adjust the plan..."
          />
          <div className="action-row mt-2">
            <button className="btn btn-primary" onClick={() => onSendMessage()} disabled={sendingMessage}>
              <Send size={16} />
              {sendingMessage ? "Sending..." : "Send"}
            </button>
            {chatDraft.trim() && (
              <button
                className="btn btn-secondary"
                onClick={() => onSendMessage(chatDraft)}
                disabled={sendingMessage}
              >
                Send Prompt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
