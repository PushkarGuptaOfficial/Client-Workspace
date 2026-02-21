import { useRef, useState } from 'react';
import { Send, Paperclip, X, ChevronLeft, MoreVertical, UserPlus, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatPanel({
  session,
  messages,
  agent,
  onBack,
  onSendMessage,
  onAssign,
  onMarkOrder,
  onClose,
  visitorTyping
}) {
  const [newMessage, setNewMessage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || !session) return;

    if (pendingFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', pendingFile);

      try {
        const res = await axios.post(`${API}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const { file_url, file_name, file_type } = res.data;
        const content = newMessage.trim() || (file_type === 'image' ? 'Shared an image' : `Shared file: ${file_name}`);
        
        onSendMessage({
          content,
          message_type: file_type,
          file_url,
          file_name
        });
        
        clearPendingFile();
        setNewMessage('');
      } catch (error) {
        toast.error('Failed to upload file');
      } finally {
        setUploading(false);
      }
    } else {
      onSendMessage({
        content: newMessage.trim(),
        message_type: 'text'
      });
      setNewMessage('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setPendingFile(file);
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (imageExts.includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => setPendingPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPendingPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setPendingPreview(null);
  };

  const canReply = session?.assigned_agent_id === agent?.id && session?.status !== 'closed';

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-[#111111] mb-1">Select a conversation</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Choose a chat from the list to view messages and respond
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gray-100 text-[#111111]">
              {session.visitor_name?.[0]?.toUpperCase() || 'V'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-[#111111]">{session.visitor_name || 'Visitor'}</h2>
            <p className="text-xs text-gray-500">
              {session.status === 'active' ? 'Active' : session.status === 'waiting' ? 'Waiting' : 'Closed'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {session.status === 'waiting' && (
            <Button size="sm" onClick={() => onAssign(session.id)} className="bg-[#111111] hover:bg-[#333] text-white rounded-full">
              <UserPlus className="w-4 h-4 mr-1.5" /> Take
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!session.is_order && (
                <DropdownMenuItem onClick={() => onMarkOrder(session.id)}>
                  <ShoppingBag className="w-4 h-4 mr-2" /> Mark as Order
                </DropdownMenuItem>
              )}
              {session.status !== 'closed' && (
                <DropdownMenuItem onClick={() => onClose(session.id)} className="text-red-600">
                  Close Chat
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender_type === 'visitor' && (
                <Avatar className="w-8 h-8 mr-2 mt-1 shrink-0">
                  <AvatarFallback className="bg-gray-100 text-xs text-gray-600">
                    {session.visitor_name?.[0] || 'V'}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                msg.sender_type === 'agent' 
                  ? 'bg-[#111111] text-white rounded-br-sm' 
                  : 'bg-gray-100 text-[#111111] rounded-bl-sm'
              }`}>
                {msg.message_type === 'image' && msg.file_url && (
                  <img
                    src={`${process.env.REACT_APP_BACKEND_URL}${msg.file_url}`}
                    alt="Shared"
                    className="rounded-lg max-w-[200px] mb-2"
                  />
                )}
                
                {msg.message_type === 'file' && msg.file_url && (
                  <a
                    href={`${process.env.REACT_APP_BACKEND_URL}${msg.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm underline"
                  >
                    <Paperclip className="w-4 h-4" />
                    {msg.file_name}
                  </a>
                )}
                
                {msg.message_type === 'text' && <p className="text-sm">{msg.content}</p>}
                
                <p className={`text-[10px] mt-1 ${msg.sender_type === 'agent' ? 'text-white/50' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {visitorTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {canReply ? (
        <div className="p-4 border-t border-gray-100 bg-white">
          {pendingFile && (
            <div className="max-w-2xl mx-auto mb-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                {pendingPreview ? (
                  <img src={pendingPreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <span className="flex-1 text-sm truncate text-gray-600">{pendingFile.name}</span>
                <Button variant="ghost" size="icon" onClick={clearPendingFile} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSend} className="max-w-2xl mx-auto flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
            
            <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-full shrink-0">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5 text-gray-500" />}
            </Button>
            
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 h-11 rounded-full border-gray-200 focus:border-[#111111] focus:ring-[#111111]"
            />
            
            <Button type="submit" disabled={(!newMessage.trim() && !pendingFile) || uploading} className="rounded-full h-11 w-11 shrink-0 bg-[#111111] hover:bg-[#333]">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 text-center border-t">
          <p className="text-sm text-gray-500">
            {session.status === 'closed' ? 'This chat is closed' : 'Take this chat to respond'}
          </p>
        </div>
      )}
    </div>
  );
}
