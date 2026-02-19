# 24gameapi Chat Workspace - PRD

## Problem Statement
Build a minimal web-based client chat workspace for 24gameapi.com - a browser-based real-time chat system where leads can chat with the team after clicking a link from WhatsApp.

## User Personas
1. **Visitors/Leads** - Coming from WhatsApp links, no signup required, mobile-first experience
2. **Support Agents** - Team members responding to visitor chats, multi-agent routing

## Core Requirements (Static)
- No mandatory signup/login for visitors
- Mobile-first design
- Clean premium SaaS-style UI
- Persistent chat history per session
- File/image sharing support
- Multi-agent support with assignment/routing
- Browser notifications for agents
- Light/Dark theme toggle

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + WebSocket
- **Database**: MongoDB
- **File Storage**: Local server storage

## What's Been Implemented (Feb 2026)

### Backend
- [x] Visitor management (create, get)
- [x] Chat session CRUD (create, get, list, assign, close)
- [x] Message management with WebSocket real-time
- [x] Agent registration and authentication (JWT)
- [x] File upload API (images + documents)
- [x] WebSocket handlers for visitors and agents
- [x] Multi-agent connection manager

### Frontend
- [x] Visitor Chat Interface (mobile-first, 100dvh layout)
- [x] Agent Login/Register (tabs with form validation)
- [x] Agent Dashboard (sidebar + chat list + chat view)
- [x] Real-time messaging with WebSocket
- [x] File/image sharing
- [x] Theme toggle (light/dark)
- [x] Browser notifications
- [x] Session filtering and search

## Database Collections
- `visitors` - Session-based visitor tracking
- `agents` - Agent accounts with authentication
- `chat_sessions` - Active/archived chats with status
- `messages` - Chat messages with file references

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Visitor chat entry (name input → chat)
- [x] Agent login/register
- [x] Real-time messaging
- [x] Session assignment

### P1 - Important
- [ ] Canned responses for agents
- [ ] Chat transcripts/export
- [ ] Email notifications for offline agents
- [ ] Agent typing indicators to visitor

### P2 - Nice to Have
- [ ] Chat analytics dashboard
- [ ] Customer satisfaction ratings
- [ ] Integration with CRM
- [ ] Multi-language support

## Next Tasks
1. Add canned responses feature for agents
2. Implement email notifications for offline agents
3. Add chat export/transcript feature
4. Consider adding chat analytics
