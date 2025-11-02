'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MapPin, Calendar, Users } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'train_list' | 'booking_confirmation';
  trains?: any[];
  booking?: any;
  timestamp: Date;
}

interface ConversationState {
  id: string;
  step: 'initial' | 'showing_trains' | 'awaiting_selection' | 'booking_confirmed';
  trains: any[];
  selectedTrain: any;
  selectedCoach: string;
  context: {
    origin?: string;
    destination?: string;
    date?: string;
  };
}

export default function AIMargPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationState>({
    id: `user_${Date.now()}_session_${Math.random().toString(36).substr(2, 9)}`,
    step: 'initial',
    trains: [],
    selectedTrain: null,
    selectedCoach: '',
    context: {},
  });
  // Use ADK server directly on port 8000
  const [apiBaseUrl] = useState(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message to backend
  const handleSendMessage = async (userMessage?: string) => {
    const messageToSend = userMessage || input;
    if (!messageToSend.trim()) return;

    // Add user message to chat
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build request body in ADK format
      const requestBody = {
        conversation_id: conversation.id,
        query: messageToSend,
        step: conversation.step,
      };

      console.log('Sending POST request to:', `${apiBaseUrl}/api/query`);
      console.log('Request body:', requestBody);

      const response = await fetch(`${apiBaseUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Response:', data);

      // Extract trains and context from response
      const trains = data.trains || [];
      const display = data.display || data.message || data.response || '';
      const step = data.step || conversation.step;

      // Update conversation state
      if (trains.length > 0) {
        setConversation((prev) => ({
          ...prev,
          trains,
          step: 'showing_trains',
          context: {
            origin: data.origin || prev.context.origin,
            destination: data.destination || prev.context.destination,
            date: data.date || prev.context.date,
          },
        }));
      }

      // Determine message type
      let messageType: Message['type'] = 'text';
      if (step === 'showing_trains' && trains.length > 0) {
        messageType = 'train_list';
      } else if (data.booking_url) {
        messageType = 'booking_confirmation';
      }

      // Add assistant response
      const assistantMsg: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: display,
        type: messageType,
        trains: trains,
        booking: data.booking_url
          ? {
              url: data.booking_url,
              train: data.train,
              coach: data.coach,
              message: data.message,
            }
          : undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update step for next interaction
      if (step === 'showing_trains') {
        setConversation((prev) => ({
          ...prev,
          step: 'awaiting_selection',
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `❌ Connection Error: ${error instanceof Error ? error.message : 'Failed to connect to backend'}\n\n📌 Troubleshooting:\n1. Check if ADK server is running: adk api_server\n2. Verify backend is accessible at: ${apiBaseUrl}/api/query\n3. Check browser console (F12) for more details\n4. Ensure request format: POST with conversation_id, query, step`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Handle quick actions
  const handleQuickAction = (text: string) => {
    setInput(text);
    setTimeout(() => {
      handleSendMessage(text);
    }, 100);
  };

  // Render train list
  const renderTrainList = (trains: any[]) => {
    return (
      <div className="grid grid-cols-1 gap-3 mt-4">
        {trains.map((train) => (
          <Card key={train.index} className="p-4 hover:bg-blue-50 cursor-pointer transition border border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">[{train.index}]</span>
                  <h3 className="font-semibold text-gray-900">{train.train_name}</h3>
                  <span className="text-xs text-gray-500">#{train.train_number}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-900">{train.departure}</span>
                    <span>→</span>
                    <span className="font-bold text-gray-900">{train.arrival}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm">({train.duration})</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-lg">💰</span>
                    <span className="font-semibold text-green-600">{train.price}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>👥</span>
                    <span>{train.seats}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>⭐</span>
                    <span>{train.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Render booking confirmation
  const renderBookingConfirmation = (booking: any) => {
    return (
      <Card className="p-6 mt-4 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-400">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-green-700 mb-2">✅ Booking Confirmed!</h3>
          <p className="text-sm text-gray-600 mb-4">Your booking is ready. Click the link below to proceed with payment.</p>
        </div>

        {booking.train && (
          <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase">Train Number</p>
                <p className="font-bold text-gray-900">{booking.train.train_number}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Train Name</p>
                <p className="font-bold text-gray-900">{booking.train.train_name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Departure</p>
                <p className="font-bold text-gray-900">{booking.train.departure}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Arrival</p>
                <p className="font-bold text-gray-900">{booking.train.arrival}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Coach Class</p>
                <p className="font-bold text-blue-600">{booking.coach}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase">Price</p>
                <p className="font-bold text-green-600">{booking.train.price}</p>
              </div>
            </div>
          </div>
        )}

        <a
          href={booking.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-center transition"
        >
          → Proceed to Payment
        </a>
        <p className="text-xs text-gray-500 mt-2 text-center">You will be redirected to EasyMyTrip to complete payment</p>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">✨</div>
            <h1 className="text-3xl font-bold">AIMarg</h1>
          </div>
          <p className="text-blue-100">Your AI-Powered Travel Booking Assistant</p>
          <p className="text-xs text-blue-200 mt-2">
            Backend: <span className="font-mono bg-blue-700 px-2 py-1 rounded">ADK Server on {apiBaseUrl}</span>
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {/* Chat Messages */}
          <ScrollArea className="h-[500px] md:h-[600px] p-6">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="text-5xl mb-4">🚂</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to AIMarg</h2>
                  <p className="text-gray-500 mb-6 max-w-sm">
                    Book trains, buses, and more with AI assistance. Start by telling me where you want to go!
                  </p>
                  <div className="space-y-2 w-full">
                    <p className="text-sm text-gray-600 font-semibold mb-3">Try these examples:</p>
                    <Button
                      onClick={() => handleQuickAction('Book train from Ongole to Hyderabad on 04-11-2025')}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                    >
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>Book train from Ongole to Hyderabad</span>
                    </Button>
                    <Button
                      onClick={() => handleQuickAction('Find buses from Mumbai to Pune')}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                    >
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>Find buses from Mumbai to Pune</span>
                    </Button>
                    <Button
                      onClick={() => handleQuickAction('Help me plan my trip')}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                    >
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>Help me plan my trip</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xl rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        {/* Text content */}
                        {msg.type !== 'train_list' && msg.type !== 'booking_confirmation' && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        )}

                        {/* Train list */}
                        {msg.type === 'train_list' && msg.trains && msg.trains.length > 0 && (
                          <div>
                            <p className="text-sm mb-4 whitespace-pre-wrap">{msg.content}</p>
                            {renderTrainList(msg.trains)}
                            <p className="text-xs mt-4 text-gray-600 italic">
                              💡 Tip: Reply with "Train 0, 2A coach" to book
                            </p>
                          </div>
                        )}

                        {/* Booking confirmation */}
                        {msg.type === 'booking_confirmation' && msg.booking && renderBookingConfirmation(msg.booking)}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            {loading && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing your request...
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tell me your travel plans... (e.g., Book train from Ongole to Hyderabad on 04-11-2025)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleSendMessage();
                  }
                }}
                disabled={loading}
                className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              💾 Connected to: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{apiBaseUrl}</span>
            </p>
          </div>
        </div>

        {/* Info Box */}
        <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How AIMarg Works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 🗣️ Describe your travel plans naturally</li>
            <li>• 🚂 AI will find and display available options</li>
            <li>• 🎫 Select your preferred train and coach class</li>
            <li>• 💳 Get instant booking URL for payment</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
