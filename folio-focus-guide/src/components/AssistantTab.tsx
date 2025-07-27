import { useEffect, useState, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

// Chainlit hooks
import {
  useChatSession,
  useChatMessages,
  useChatInteract,
  useChatData,
} from "@chainlit/react-client";

interface AssistantTabProps {
  file?: File | null;
  documentId?: string | null;
}

export function AssistantTab({ file = null }: AssistantTabProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { connect, disconnect } = useChatSession();
  const { messages } = useChatMessages();
  const { sendMessage } = useChatInteract();
  const { loading, error } = useChatData();

  // Establish websocket on mount
  useEffect(() => {
    connect({
      metadata: {
        filename: file?.name ?? undefined,
      },
    });
    return () => disconnect();
  }, [connect, disconnect, file?.name]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage({ content: input.trim() });
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (error) {
    return (
      <p className="p-4 text-center text-red-500">Failed to connect to chat.</p>
    );
  }

  // UI similar to previous implementation but messages come from chainlit state
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-border-light">
        <CardTitle className="text-base">AI Assistant</CardTitle>
        {file && (
          <p className="text-sm text-muted-foreground">
            Discussing: {file.name}
          </p>
        )}
      </CardHeader>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages
            .filter((m) => Boolean((m as any).output ?? (m as any).content))
            .map((m) => {
              const text = (m as any).output ?? (m as any).content;
              return (
                <Card key={m.id} className="bg-surface border-border-light">
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{text}</p>
                  </CardContent>
                </Card>
              );
            })}

          {loading && (
            <p className="text-muted-foreground text-sm">
              Assistant is typing…
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border-light">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask something…"
            className="resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
