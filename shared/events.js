/**
 * Snake Nexus — Shared Socket.IO Network Events
 */

export const SOCKET_EVENTS = {
  // Room lifecycle
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  ROOM_NOT_FOUND: 'room:not_found',
  ROOM_ERROR: 'room:error',
  
  // Lobby & readiness
  PLAYER_SET_NAME: 'player:set_name',
  PLAYER_READY: 'player:ready',
  PLAYER_LIST_UPDATE: 'player:list_update',
  ROOM_CONFIG_UPDATE: 'room:config_update',
  
  // Match progression
  MATCH_COUNTDOWN: 'match:countdown',
  MATCH_START: 'match:start',
  GAME_STATE_TICK: 'game:state_tick',
  PLAYER_INPUT: 'player:input',
  
  // Game events
  FOOD_EATEN: 'game:food_eaten',
  PLAYER_ELIMINATED: 'game:player_eliminated',
  FACE_CLEARED: 'cube:face_cleared',
  GATEWAY_OPENED: 'cube:gateway_opened',
  FINAL_STAGE_START: 'cube:final_stage_start',
  FACE_TRANSITION: 'cube:face_transition',
  PORTAL_TRANSITION: 'game:portal_transition',
  
  // Game conclusion
  MATCH_END: 'match:end',
  REMATCH_REQUEST: 'match:rematch_request',
  REMATCH_START: 'match:rematch_start',
  
  // Bots toggle
  FILL_BOTS: 'room:fill_bots'
};

