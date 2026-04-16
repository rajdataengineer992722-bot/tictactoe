const USERNAME_KEY = "tictac.username";
const USER_ID_KEY = "tictac.userId";
const MATCH_ID_KEY = "tictac.activeMatchId";

export function saveUsername(username: string) {
  window.localStorage.setItem(USERNAME_KEY, username);
  if (!window.localStorage.getItem(USER_ID_KEY)) {
    window.localStorage.setItem(USER_ID_KEY, crypto.randomUUID());
  }
}

export function getUsername() {
  return window.localStorage.getItem(USERNAME_KEY) ?? "";
}

export function getUserId() {
  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  window.localStorage.setItem(USER_ID_KEY, id);
  return id;
}

export function saveActiveMatch(matchId: string) {
  window.localStorage.setItem(MATCH_ID_KEY, matchId);
}

export function getActiveMatch() {
  return window.localStorage.getItem(MATCH_ID_KEY) ?? "";
}

export function clearActiveMatch() {
  window.localStorage.removeItem(MATCH_ID_KEY);
}
