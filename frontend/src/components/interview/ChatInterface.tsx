import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'ai',
    content: "Hello! I'm your AI interviewer. I can help you understand the problem better, give hints, or clarify any doubts. Feel free to ask!",
    timestamp: new Date()
  }
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    const aiResponses: Record<string, string> = {
      hint: "Here's a hint: Think about using a hash map to store the complement of each number. As you iterate, check if the current number exists as a key in the hash map.",
      explain: "The Two Sum problem asks you to find two numbers in an array that add up to a target sum. The key insight is that for each number, you can calculate what number you need (complement = target - current) and check if you've seen it before.",
      complexity: "The optimal solution uses O(n) time complexity with a single pass through the array, and O(n) space complexity for the hash map.",
      default: "That's a good question! The approach I'd suggest is to think about what data structure would allow you to quickly look up if a complement exists. Hash maps provide O(1) lookup time, which is perfect for this problem."
    };

    const responseKey = input.toLowerCase().includes('hint') ? 'hint' :
      input.toLowerCase().includes('explain') ? 'explain' :
      input.toLowerCase().includes('complexity') ? 'complexity' : 'default';

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: aiResponses[responseKey],
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' && "flex-row-reverse"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                message.role === 'ai' ? "gradient-primary" : "bg-[var(--muted)] text-[var(--primary)]"
              )}>
                {message.role === 'ai' ? (
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className={cn(
                "max-w-[80%] p-3 rounded-lg text-sm",
                message.role === 'ai' 
                  ? "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]" 
                  : "bg-[var(--primary)] text-[var(--primary-foreground)]"
              )}>
                {message.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full gradient-primary text-primary-foreground flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a hint, clarification..."
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="bg-[var(--background)] border-[var(--border)]"
          />
          <Button onClick={sendMessage} size="icon" className="bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:brightness-95">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setInput('Can you give me a hint?');
            }}
          >
            💡 Hint
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setInput('Explain the problem again');
            }}
          >
            📖 Explain
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setInput('What is the time complexity?');
            }}
          >
            ⏱️ Complexity
          </Button>
        </div>
      </div>
    </div>
  );
}
