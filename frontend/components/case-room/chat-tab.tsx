"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  Bot,
  User,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useCaseRoomStore } from "@/lib/store";
import { ChatMessage } from "@/types";

interface ChatTabProps {
  caseId: string;
}

export function ChatTab({ caseId }: ChatTabProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatMessages, setChatMessages, addChatMessage, prefilledMessage, setPrefilledMessage } = useCaseRoomStore();

  const { data: suggestedQuestions } = useQuery({
    queryKey: ["suggested-questions", caseId],
    queryFn: () => api.chat.getSuggestedQuestions(caseId),
  });

  useQuery({
    queryKey: ["chat-messages", caseId],
    queryFn: async () => {
      const data = await api.chat.getMessages(caseId);
      if (chatMessages.length === 0) setChatMessages(data);
      return data;
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (prefilledMessage) {
      setInput(prefilledMessage);
      setPrefilledMessage("");
    }
  }, [prefilledMessage, setPrefilledMessage]);

  const handleSend = async (message?: string) => {
    const text = message || input;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `cm-user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setInput("");
    setSending(true);

    try {
      const response = await api.chat.sendMessage(caseId, text);
      addChatMessage(response);
    } catch {
      addChatMessage({
        id: `cm-error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-300px)] min-h-[500px]">
      {/* Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] ${
                    msg.role === "user" ? "order-first" : ""
                  }`}
                >
                  <div
                    className={`rounded-lg p-4 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.citations.map((citation, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs bg-secondary/50 border border-border rounded-md px-3 py-2"
                        >
                          <FileText className="w-3 h-3 text-primary shrink-0" />
                          <span className="text-muted-foreground">
                            Source:{" "}
                            <span className="text-foreground font-medium">
                              {citation.document}
                            </span>{" "}
                            — Page {citation.page}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {sending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing case documents...
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      {chatMessages.length <= 1 && suggestedQuestions && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => handleSend(question)}
                className="text-xs bg-card border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="mt-4 flex gap-3">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this case..."
            className="w-full bg-card border border-border rounded-lg px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={1}
          />
        </div>
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || sending}
          size="icon"
          className="h-[46px] w-[46px]"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
