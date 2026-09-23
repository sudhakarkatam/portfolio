import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  Minimize2,
  ExternalLink,
  Bookmark,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  streamMistralResponse,
  ChatMessage,
  isMistralKeyConfigured,
} from "@/services/mistralService";

// Inline parser for bold (**text**), code (`code`), and markdown links ([text](url))
function formatInlineMarkdown(content: string): React.ReactNode[] {
  const tokens = content.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);

  return tokens.map((part, idx) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-zinc-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-purple-600 dark:text-purple-400 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Markdown link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:text-purple-500 font-semibold"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={idx}>{part}</span>;
  });
}

// Markdown Formatter: renders numbered lists, bullet lists, bold text, and clean paragraphs
const renderFormattedText = (text: string) => {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Numbered list item: e.g. "1. **Droply**: ..."
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 my-1 pl-1">
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold shrink-0">
                {numMatch[1]}.
              </span>
              <div className="flex-1">
                {formatInlineMarkdown(numMatch[2])}
              </div>
            </div>
          );
        }

        // Bullet item: e.g. "- ..." or "* ..." or "• ..."
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 my-1 pl-1">
              <span className="text-purple-600 dark:text-purple-400 font-bold shrink-0">•</span>
              <div className="flex-1">
                {formatInlineMarkdown(bulletMatch[1])}
              </div>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={lineIdx} className="my-1">
            {formatInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
};

export const PortfolioChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hi! I am Sudhakar's AI assistant. Ask me anything about his software engineering background, production apps like Droply, AI/RAG architectures, or hiring details!",
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Initialize Speech Recognition for Voice Input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e.error);
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!speechRecognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Error starting speech recognition:", err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isStreaming) return;

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const assistantMessageId = `assistant-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMessageId,
      sender: "assistant",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setInputText("");
    setIsStreaming(true);

    const chatHistory = messages.map((m) => ({
      role: m.sender,
      content: m.text,
    }));

    try {
      const { text: fullResponse, citations, intent } = await streamMistralResponse(
        text,
        chatHistory,
        (chunkText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, text: chunkText } : msg
            )
          );
        }
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, text: fullResponse, citations, intent }
            : msg
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                text: "I encountered an issue generating a response. Please try asking again!",
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* ── 1. Floating Launch Button ── */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-zinc-950 text-white border border-zinc-700 shadow-2xl hover:border-purple-500 transition-all group overflow-hidden"
          title="Open Sudhakar AI Assistant"
        >
          {isOpen ? (
            <X size={22} className="transition-transform group-hover:rotate-90 duration-200" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <Bot size={26} className="text-purple-400 group-hover:scale-110 transition-transform duration-200" />
              <span className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-zinc-950 shadow-sm" />
            </div>
          )}

          {/* Unread Indicator Badge */}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md animate-pulse">
              {unreadCount}
            </span>
          )}

          {/* Glowing Aura Ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur -z-10 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>

      {/* ── 2. Floating Chat Drawer / Popup Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[590px] max-h-[82vh] bg-white dark:bg-[#0c0c11] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left font-sans select-text"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="/profile-pic.webp"
                    alt="Sudhakar AI"
                    className="w-9 h-9 rounded-full object-cover border border-purple-500/30 shadow-sm"
                    width={36}
                    height={36}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white leading-tight">
                    Sudhakar AI
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
                  title="Close Chat"
                >
                  <Minimize2 size={15} />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "assistant" && (
                    <img
                      src="/profile-pic.webp"
                      alt="Sudhakar AI"
                      className="w-7 h-7 rounded-full object-cover border border-purple-500/30 shrink-0 mt-0.5 shadow-sm"
                      width={28}
                      height={28}
                      loading="eager"
                      decoding="async"
                    />
                  )}

                  <div className={`space-y-1.5 max-w-[85%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`p-3.5 rounded-2xl ${
                        msg.sender === "user"
                          ? "bg-purple-600 text-white rounded-br-sm shadow-md"
                          : "bg-zinc-100 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-800/70 rounded-bl-sm"
                      }`}
                    >
                      {msg.text ? (
                        renderFormattedText(msg.text)
                      ) : (
                        <span className="flex items-center gap-1.5 text-zinc-400 animate-pulse text-xs font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                          <span>Thinking...</span>
                        </span>
                      )}
                    </div>

                    {/* Citations Grounding Chips (Clickable Links) */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {msg.citations.map((cite, idx) => (
                          cite.link ? (
                            <a
                              key={idx}
                              href={cite.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 transition-colors group"
                            >
                              <Bookmark size={10} className="text-purple-500" />
                              <span className="font-semibold">{cite.title}</span>
                              <ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60"
                            >
                              <Bookmark size={9} />
                              <span>{cite.title}</span>
                            </span>
                          )
                        ))}
                      </div>
                    )}

                    <span className="text-[10px] font-mono text-zinc-400 block px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Voice Listening Wave Indicator */}
            {isListening && (
              <div className="px-4 py-2 bg-purple-500/10 border-t border-purple-500/20 flex items-center justify-between text-xs text-purple-600 dark:text-purple-300 font-mono">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>Listening... Speak your question</span>
                </span>
                <button
                  onClick={toggleVoiceInput}
                  className="text-red-500 font-bold hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Input Box Footer */}
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#0c0c11]">
              <div className="relative flex items-center bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2 shadow-sm focus-within:border-purple-500/70 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about Sudhakar..."
                  disabled={isStreaming}
                  className="flex-1 bg-transparent outline-none text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-sans"
                />

                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  {/* Voice Input Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-xl transition-colors ${
                      isListening
                        ? "bg-red-500 text-white animate-pulse"
                        : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                    title={isListening ? "Stop listening" : "Click to speak (Voice Input)"}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>

                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() || isStreaming}
                    className={`p-2 rounded-xl transition-all ${
                      inputText.trim() && !isStreaming
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md cursor-pointer"
                        : "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                    }`}
                    title="Send Message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>

              {/* Footer Attribution */}
              <div className="flex items-center justify-center px-1 pt-2 text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Codestral • Mistral AI</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PortfolioChatbot;
