// frontend/src/components/ChatBot.jsx

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, AlertCircle, Paperclip, X } from 'lucide-react';
import { api } from '../api/client';
import './ChatBot.css';

export default function ChatBot({ projectId, taskId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setAttachedImage(event.target.result);
    reader.readAsDataURL(file);
    e.target.value = null; 
  };

  // Load chat history on mount
  useEffect(() => {
    if (!projectId) return;
    loadChatHistory();
  }, [projectId]);

  const loadChatHistory = async () => {
    try {
      const res = await api.get(`/api/v1/projects/${projectId}/conversation`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError('Could not load chat history');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      imageUri: attachedImage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Capture snapshot for API transfer before reset
    const imagePayload = attachedImage;
    
    setInput('');
    setAttachedImage(null);
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/api/v1/chat/message`, {
        projectId,
        taskId,
        content: input,
        image: imagePayload
      });

      const mentorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'mentor',
        content: res.data.response,
        structuredData: res.data.structuredData,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, mentorMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to get response from mentor');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="chat-message user-message" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          {msg.imageUri && (
             <img src={msg.imageUri} alt="User Upload" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', marginBottom: '4px' }} />
          )}
          <div className="message-content">{msg.content}</div>
        </div>
      );
    }

    // Mentor message with structured data
    return (
      <div key={msg.id} className="chat-message mentor-message">
        {msg.structuredData && (
          <div className="structured-response">
            {msg.structuredData.goal && (
              <div className="response-section">
                <strong>Goal:</strong>
                <p>{msg.structuredData.goal}</p>
              </div>
            )}
            {msg.structuredData.milestone && (
              <div className="response-section">
                <strong>Milestone:</strong>
                <p>{msg.structuredData.milestone}</p>
              </div>
            )}
            {msg.structuredData.currentTask && (
              <div className="response-section">
                <strong>Today's Task:</strong>
                <p>{msg.structuredData.currentTask}</p>
              </div>
            )}
            {msg.structuredData.steps && (
              <div className="response-section">
                <strong>Steps:</strong>
                <ol>
                  {(Array.isArray(msg.structuredData.steps) ? msg.structuredData.steps : []).map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            {msg.structuredData.commands && (
              <div className="response-section">
                <strong>Commands:</strong>
                <div className="code-block">
                  {(Array.isArray(msg.structuredData.commands) ? msg.structuredData.commands : []).map((cmd, idx) => (
                    <div key={idx} className="command-line">
                      <code>{cmd}</code>
                      <button
                        className="copy-btn"
                        onClick={() => navigator.clipboard.writeText(cmd)}
                        title="Copy command"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {msg.structuredData.explanation && (
              <div className="response-section">
                <strong>Explanation:</strong>
                <p>{msg.structuredData.explanation}</p>
              </div>
            )}
          </div>
        )}
        {!msg.structuredData && <p className="message-content">{msg.content}</p>}
      </div>
    );
  };

  return (
    <div className="chatbot-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-chat">
            <p>👋 Hello! I'm your AI Mentor.</p>
            <p>Ask me anything about your project or current task.</p>
          </div>
        )}
        {messages.map(renderMessage)}
        {loading && (
          <div className="chat-message mentor-message loading">
            <Loader2 className="spinner" size={16} />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSendMessage} style={{ flexDirection: 'column', gap: '8px' }}>
        {attachedImage && (
           <div style={{ position: 'relative', width: '60px' }}>
              <img src={attachedImage} alt="Attachment" style={{ width: '100%', borderRadius: '4px' }} />
              <button 
                type="button" 
                onClick={() => setAttachedImage(null)}
                style={{ position: 'absolute', top: -5, right: -5, background: '#f87171', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              ><X size={12} /></button>
           </div>
        )}
        <div style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center' }}>
          <label style={{ cursor: 'pointer', color: 'var(--tx-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }} title="Attach Screenshot">
             <Paperclip size={18} />
             <input type="file" accept="image/png, image/jpeg, image/webp" style={{ display:'none' }} onChange={handleImageUpload} />
          </label>
          <input
            type="text"
            placeholder="Ask for help..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="chat-input"
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !attachedImage)}
            className="chat-submit-btn"
            title="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
