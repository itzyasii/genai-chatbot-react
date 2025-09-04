import React, { useEffect, useState, useRef } from "react";
import logger from "../logger";

const ChatUI = ({ formData }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [preview, setPreview] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const makeId = () =>
      `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const userMessage = { id: makeId(), text: inputValue, sender: "user" };
    // Add user message immediately so UI feels responsive
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setIsStreaming(true);
    try {
      await fetchResponse(inputValue);
    } finally {
      setIsStreaming(false);
    }
  };

  const fetchResponse = async (message) => {
    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `${formData.name}-${formData.email}-session`,
          message,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Network response was not OK");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulated = "";
      const makeId = () =>
        `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split complete SSE events. Keep the leftover in buffer.
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          if (!part.startsWith("data:")) continue;

          const raw = part.replace(/^data:/, "").trim();
          try {
            const parsed = JSON.parse(raw);

            // Server uses JSON.stringify("[DONE]") when finished
            if (parsed === "[DONE]") {
              return;
            }

            const contentPart = parsed;
            accumulated += contentPart;

            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.sender === "chatbot") {
                // Preserve id for stable keys and replace text atomically
                copy[copy.length - 1] = { ...last, text: accumulated };
              } else {
                copy.push({
                  id: makeId(),
                  sender: "chatbot",
                  text: accumulated,
                });
              }
              return copy;
            });
          } catch (e) {
            logger.error("Failed to parse SSE data chunk", raw, e);
          }
        }
      }
    } catch (error) {
      logger.error("Error fetching response:", error);
    }
  };

  // Helpers for formatting and parsing thinking segments
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Very small markdown-like formatting: **bold**, *italic*, `code`, and newlines
  const formatToHtml = (text) => {
    if (!text) return "";
    let s = escapeHtml(text);
    // bold
    s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // italic
    s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // inline code
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    // line breaks
    s = s.replace(/\n/g, "<br />");
    return s;
  };

  const extractThinkSegments = (text) => {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const thinks = [];
    const source = text || "";
    let match;
    while ((match = thinkRegex.exec(source)) !== null) {
      thinks.push(match[1]);
    }
    const cleaned = source.replace(thinkRegex, "").trim();
    return { thinks, cleaned };
  };

  const messagesRef = useRef(null);

  // Auto-scroll when messages change
  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Ensure we scroll a bit after streaming finishes to avoid overlap/layout jumps
  useEffect(() => {
    if (!isStreaming) {
      const el = messagesRef.current;
      if (el) {
        // delay a tiny bit to let the DOM reflow and transitions settle
        const t = setTimeout(() => {
          el.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
          });
        }, 120);
        return () => clearTimeout(t);
      }
    }
  }, [isStreaming]);

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (e) {
      logger.error("Copy failed", e);
    }
  };

  // Clear chat history
  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {formData.name && formData.email && (
        // User Information
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="user-info bg-white p-4 rounded-xl shadow-md mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                  Welcome, {formData?.name}!
                  <span className="text-sm ml-2 text-gray-500">
                    ({formData?.email})
                  </span>
                </h2>
                <button
                  onClick={clearChat}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg transition-colors"
                >
                  Clear Chat
                </button>
              </div>
            </div>

            {/* Chat UI */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-purple-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Chat Assistant
                </h3>
              </div>

              <div
                className="messages h-96 overflow-y-auto p-4 bg-gray-50"
                ref={messagesRef}
                role="log"
                aria-live="polite"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mb-3 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const { thinks, cleaned } = extractThinkSegments(msg.text);
                    const displayName =
                      msg.sender === "user" ? "You" : "Assistant";
                    const isUser = msg.sender === "user";
                    return (
                      <div
                        key={msg.id || index}
                        className={`message-group mb-4 ${
                          isUser ? "flex justify-end" : "flex justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md lg:max-w-lg ${
                            isUser ? "ml-10" : "mr-10"
                          }`}
                        >
                          <div
                            className={`flex items-end ${
                              isUser ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 mx-2 ${
                                isUser ? "ml-2" : "mr-2"
                              }`}
                            >
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  isUser ? "bg-purple-500" : "bg-blue-500"
                                }`}
                              >
                                {isUser ? (
                                  <span className="text-white text-sm font-medium">
                                    {formData.name.charAt(0)}
                                  </span>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 text-white"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>

                            <div
                              className={`relative ${
                                isUser
                                  ? "bg-purple-500 text-white"
                                  : "bg-white border border-gray-200"
                              } rounded-2xl p-4 shadow-sm`}
                            >
                              <div className="font-medium text-xs mb-1 opacity-80">
                                {displayName}
                              </div>

                              {/* Render cleaned (final/visible) content with basic formatting */}
                              <div
                                className="message-content break-words"
                                dangerouslySetInnerHTML={{
                                  __html: formatToHtml(cleaned),
                                }}
                              />

                              {/* If there are think segments, show a separate thinking UI */}
                              {thinks.length > 0 && (
                                <details className="thinking mt-3">
                                  <summary className="text-xs cursor-pointer select-none opacity-70 hover:opacity-100">
                                    Reasoning
                                  </summary>
                                  <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                                    {thinks.map((t, i) => (
                                      <div
                                        key={i}
                                        className="think-content mt-1 break-words"
                                        dangerouslySetInnerHTML={{
                                          __html: formatToHtml(t),
                                        }}
                                      />
                                    ))}
                                  </div>
                                </details>
                              )}

                              {/* Copy button */}
                              <button
                                className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full px-3 py-1 transition-all opacity-0 group-hover:opacity-100 ${
                                  copiedMessageId === msg.id
                                    ? "bg-green-100 text-green-700"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleCopy(
                                    (cleaned || "") +
                                      (thinks.join("\n\n") || ""),
                                    msg.id
                                  )
                                }
                                title="Copy message"
                              >
                                {copiedMessageId === msg.id
                                  ? "Copied!"
                                  : "Copy"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {isStreaming && (
                  <div className="message-group mb-4 flex justify-start">
                    <div className="max-w-xs md:max-w-md lg:max-w-lg mr-10">
                      <div className="flex items-end">
                        <div className="flex-shrink-0 mr-2">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                          <div className="font-medium text-xs mb-1 opacity-80">
                            Assistant is thinking
                          </div>
                          <div className="flex space-x-1">
                            <div
                              className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "200ms" }}
                            ></div>
                            <div
                              className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "400ms" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100">
                <form className="flex gap-2" onSubmit={handleSubmit}>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="w-full p-4 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-300 focus:border-purple-300 focus:outline-none transition-colors"
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setPreview(e.target.value);
                      }}
                      disabled={isStreaming}
                    />
                    <button
                      type="submit"
                      disabled={!inputValue || isStreaming}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 active:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send message"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </form>

                {/* Realtime formatting preview */}
                {preview && (
                  <div className="preview mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Preview:</div>
                    <div
                      className="text-sm text-gray-700"
                      dangerouslySetInnerHTML={{
                        __html: formatToHtml(preview),
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(ChatUI);
