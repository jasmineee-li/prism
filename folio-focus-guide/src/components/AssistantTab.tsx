import { useEffect, useState, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

// Chat message type
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantTabProps {
  file?: File | null;
  documentId?: string | null;
}

export function AssistantTab({
  file = null,
  documentId = null,
}: AssistantTabProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [analysisCtx, setAnalysisCtx] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // fetch analysis when a document id is supplied
  useEffect(() => {
    if (documentId) {
      fetch(`http://127.0.0.1:5000/api/documents/${documentId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch analysis");
          const data = await res.json();
          setAnalysisCtx(JSON.stringify(data.results).slice(0, 8000));
        })
        .catch(() => setAnalysisCtx(null));
    } else {
      setAnalysisCtx(null);
    }
  }, [documentId]);

  // Auto-scroll whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const callChatApi = async (userMsg: string) => {
    setLoading(true);
    try {
      const payload: any = {
        messages: [...messages, { role: "user", content: userMsg }],
        conversation_id: conversationId,
      };
      if (analysisCtx)
        payload.context = `The following JSON describes statistical analysis results for the paper: ${analysisCtx}`;
      else if (file)
        payload.context = `We are discussing the PDF named ${file.name}.`;
      const res = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.assistant },
        ]);
        if (data.conversation_id) setConversationId(data.conversation_id);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    await callChatApi(userMsg);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-border-light">
        <CardTitle className="text-base">AI Assistant (GPT-4o)</CardTitle>
        {file && (
          <p className="text-sm text-muted-foreground">
            Discussing: {file.name}
          </p>
        )}
      </CardHeader>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((m, idx) => (
            <Card key={idx} className="bg-surface border-border-light">
              <CardContent className="p-3">
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </CardContent>
            </Card>
          ))}

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
