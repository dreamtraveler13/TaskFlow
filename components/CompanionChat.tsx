import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, MessageCircle } from 'lucide-react';
import { Task } from '../types';
import { processAgentCommand } from '../services/geminiService';

interface CompanionChatProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
}

export const CompanionChat: React.FC<CompanionChatProps> = ({ tasks, setTasks }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'agent', text: "Hi! I'm your study buddy. Need to change times or move tasks? Just ask!" }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsg: Message = { id: crypto.randomUUID(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const result = await processAgentCommand(userMsg.text, tasks);
      
      if (result.updatedTasks) {
        setTasks(result.updatedTasks);
      }

      const agentMsg: Message = { 
        id: crypto.randomUUID(), 
        sender: 'agent', 
        text: result.responseText 
      };
      setMessages(prev => [...prev, agentMsg]);

    } catch (error) {
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        sender: 'agent', 
        text: "Oops, something went wrong. Try again?" 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-xl shadow-stone-200 border border-stone-100 flex items-center justify-center z-[60] hover:scale-105 transition-transform group"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-tf-art to-tf-math rounded-full opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <Bot className="w-7 h-7 text-tf-accent relative z-10" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tf-lang-text opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-tf-lang-text"></span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-end sm:items-center justify-center pointer-events-none">
      <div className="w-full sm:max-w-md h-[80vh] sm:h-[600px] bg-tf-bg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto ring-1 ring-black/5">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-tf-math to-tf-art rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-tf-accent" />
            </div>
            <div>
              <h3 className="font-bold text-tf-accent">Study Buddy</h3>
              <p className="text-xs text-stone-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-500" /> AI Powered
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-tf-accent text-white rounded-br-none'
                    : 'bg-white border border-stone-200 text-stone-700 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
               <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                 <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                 <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-stone-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Change time, reorder tasks..."
            className="flex-1 bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tf-accent/20 transition-all placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="w-12 h-12 bg-tf-accent text-white rounded-xl flex items-center justify-center hover:bg-stone-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};