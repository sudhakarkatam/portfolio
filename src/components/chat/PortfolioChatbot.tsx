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
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  streamMistralResponse,
  ChatMessage,
  isMistralKeyConfigured,
} from "@/services/mistralService";

// Inline parser for bold (**text**), code (`code`), markdown links ([text](url)), raw URLs (https://...), and emails
function formatInlineMarkdown(content: string): React.ReactNode[] {
  // Regex matches:
  // 1. Markdown link: [text](url)
  // 2. Bold text: **text**
  // 3. Inline code: `code`
  // 4. Raw URLs: https?://...
  // 5. Emails: name@domain.com
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`|https?:\/\/[^\s),]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const parts = content.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-zinc-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-purple-600 dark:text-purple-400 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Markdown link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const href = linkMatch[2].startsWith("http") || linkMatch[2].startsWith("mailto:")
        ? linkMatch[2]
        : `https://${linkMatch[2]}`;
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:text-purple-500 dark:hover:text-purple-300 font-medium inline-flex items-center gap-0.5"
        >
          <span>{linkMatch[1]}</span>
          <ExternalLink size={11} className="inline opacity-70" />
        </a>
      );
    }

    // Raw URL: https://...
    if (/^https?:\/\//i.test(part)) {
      const cleanUrl = part.replace(/[.,!?:;)]+$/, "");
      const trailing = part.slice(cleanUrl.length);
      return (
        <span key={idx}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:text-purple-500 dark:hover:text-purple-300 font-medium inline-flex items-center gap-0.5 break-all"
          >
            <span>{cleanUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
            <ExternalLink size={11} className="inline opacity-70" />
          </a>
          {trailing}
        </span>
      );
    }

    // Email address
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
      return (
        <a
          key={idx}
          href={`mailto:${part}`}
          className="text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:text-purple-500 dark:hover:text-purple-300 font-medium"
        >
          {part}
        </a>
      );
    }

    return <span key={idx}>{part}</span>;
  });
}

// Markdown Formatter: renders numbered lists, bullet lists, bold text, links, and clean paragraphs
const renderFormattedText = (text: string) => {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-2 leading-relaxed text-xs sm:text-sm">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-0.5" />;
        }

        // Numbered list item: e.g. "1. **Droply**: ..."
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 my-1 pl-1">
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold shrink-0 text-xs mt-0.5">
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
          <p key={lineIdx} className="my-0.5">
            {formatInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
};

export const PortfolioChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hi! I am Sudhakar's AI assistant. Ask me anything about him or if you want to contact for hiring details I can help with your queries to know more",
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

  // Teaser bubble discovery: show 3.5s after load if chat hasn't been opened
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTeaser((prev) => (!isOpen ? true : false));
    }, 3500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowTeaser(false);
  };

  // Reset / Clear Conversation
  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: "Hi! I am Sudhakar's AI assistant. Ask me anything about him or if you want to contact for hiring details I can help with your queries to know more",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInputText("");
    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }
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
      {/* ── 1. Floating Launch Button & Teaser Bubble ── */}
      <div className={`fixed bottom-6 right-6 z-50 ${isOpen ? "hidden sm:block" : "block"}`}>
        {/* Floating Greeting Teaser Bubble (Point 4) */}
        <AnimatePresence>
          {!isOpen && showTeaser && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={handleOpenChat}
              className="absolute bottom-[4.2rem] right-0 w-60 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl cursor-pointer hover:border-purple-500/40 transition-colors group select-none text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base select-none">👋</span>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
                    Ask me about me, my projects, skills
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTeaser(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Speech bubble tail pointer */}
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-zinc-900 border-r border-b border-zinc-200 dark:border-zinc-800 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              handleOpenChat();
            }
          }}
          className="relative flex items-center justify-center w-14 h-14 rounded-full border border-zinc-300 dark:border-zinc-700 bg-black shadow-xl hover:shadow-2xl hover:border-zinc-400 dark:hover:border-zinc-500 transition-all duration-200 group overflow-hidden"
          title="Open Sudhakar AI Assistant"
        >
          {isOpen ? (
            <div className="flex items-center justify-center w-full h-full bg-zinc-900 text-white">
              <X size={22} className="transition-transform group-hover:rotate-90 duration-200" />
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src="/icon chatbot.png"
                alt="Chatbot Icon"
                className="w-full h-full rounded-full object-cover select-none pointer-events-none"
              />
            </div>
          )}
        </motion.button>
      </div>

      {/* ── 2. Floating Chat Drawer / Mobile Native Bottom Sheet (Point 5) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 sm:bottom-24 sm:right-6 sm:left-auto z-50 w-full sm:w-[400px] h-[92vh] sm:h-[590px] sm:max-h-[82vh] bg-white dark:bg-[#0c0c11] border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left font-sans select-text"
          >
            {/* Mobile Sheet Drag Indicator */}
            <div className="sm:hidden w-full pt-2.5 pb-1 flex justify-center bg-zinc-50/70 dark:bg-zinc-900/60 backdrop-blur-md">
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* Header Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 backdrop-blur-md">
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
                {/* Reset / Clear Chat Button (↺) */}
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
                  title="Reset Conversation (↺)"
                >
                  <RotateCcw size={15} />
                </button>

                {/* Minimize / Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
                  title="Close Chat"
                >
                  <X size={16} className="sm:hidden" />
                  <Minimize2 size={15} className="hidden sm:block" />
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
                      className={`p-3.5 rounded-2xl ${msg.sender === "user"
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
                    className={`p-2 rounded-xl transition-colors ${isListening
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
                    className={`p-2 rounded-xl transition-all ${inputText.trim() && !isStreaming
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
