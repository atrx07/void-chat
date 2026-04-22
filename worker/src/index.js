export { ChatRoom } from './chatroom.js';

import { verifyFirebaseToken } from './firebase-verify.js';
import { corsHeaders, jsonResponse, errorResponse } from './utils.js';
import { handleMessages } from './routes/messages.js';
import { handleOnline } from './routes/online.js';
import { handleAnnounce } from './routes/announce.js';
import { handleAdminClear } from './routes/admin/clear.js';
import { handleAdminBan } from './routes/admin/ban.js';
import { handleAdminUnban } from './routes/admin/unban.js';
import { handleAdminUsers } from './routes/admin/users.js';
import { handleAdminDeleteMessage } from './routes/admin/delete-message.js';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ── WebSocket upgrade ────────────────────────────────────────────────
      if (path === '/api/ws') {
        if (request.headers.get('Upgrade') !== 'websocket') {
          return errorResponse('Expected WebSocket upgrade', 426, env);
        }

        const token = url.searchParams.get('token');
        if (!token) return errorResponse('Missing token', 401, env);

        const payload = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
        if (!payload) return errorResponse('Invalid token', 401, env);

        const uid = payload.sub;
        const displayName = encodeURIComponent(
          payload.name || payload.email?.split('@')[0] || 'user'
        );

        const id = env.CHAT_ROOM.idFromName('global');
        const room = env.CHAT_ROOM.get(id);

        const roomUrl = new URL(request.url);
        roomUrl.pathname = '/websocket';
        roomUrl.searchParams.set('uid', uid);
        roomUrl.searchParams.set('name', displayName);

        return room.fetch(new Request(roomUrl.toString(), request));
      }

      // ── REST API ─────────────────────────────────────────────────────────
      if (path === '/api/messages')             return handleMessages(request, env, ctx);
      if (path === '/api/online')               return handleOnline(request, env, ctx);
      if (path === '/api/announce')             return handleAnnounce(request, env, ctx);
      if (path === '/api/admin/clear')          return handleAdminClear(request, env, ctx);
      if (path === '/api/admin/ban')            return handleAdminBan(request, env, ctx);
      if (path === '/api/admin/unban')          return handleAdminUnban(request, env, ctx);
      if (path === '/api/admin/users')          return handleAdminUsers(request, env, ctx);
      if (path === '/api/admin/delete-message') return handleAdminDeleteMessage(request, env, ctx);

      return errorResponse('Not found', 404, env);
    } catch (e) {
      return errorResponse(e.message, 500, env);
    }
  },
};
