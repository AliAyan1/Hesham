const DAILY_API = "https://api.daily.co/v1";

function dailyApiKey(): string {
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) throw new Error("DAILY_API_KEY is not configured");
  return key;
}

export function dailyDomain(): string {
  return (
    process.env.NEXT_PUBLIC_DAILY_DOMAIN?.trim() ||
    process.env.DAILY_DOMAIN?.trim() ||
    "qudrahtech.daily.co"
  );
}

type DailyRoomResponse = {
  name?: string;
  url?: string;
  error?: string;
};

type DailyTokenResponse = {
  token?: string;
  error?: string;
};

export async function createDailyRoomForSession(
  sessionId: string,
  durationMinutes: number,
): Promise<{ roomName: string; roomUrl: string }> {
  const expiryTime = Math.floor(Date.now() / 1000) + durationMinutes * 60 + 1800;

  const response = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${dailyApiKey()}`,
    },
    body: JSON.stringify({
      name: `qt-session-${sessionId}`,
      privacy: "private",
      properties: {
        exp: expiryTime,
        max_participants: 2,
        enable_chat: true,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
        lang: "en",
      },
    }),
  });

  const room = (await response.json()) as DailyRoomResponse;
  if (!response.ok || !room.name || !room.url) {
    throw new Error(room.error ?? "Failed to create Daily room");
  }

  return { roomName: room.name, roomUrl: room.url };
}

export async function createDailyMeetingToken(params: {
  roomName: string;
  userName: string;
  isOwner: boolean;
  durationMinutes: number;
}): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + params.durationMinutes * 60 + 1800;

  const response = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${dailyApiKey()}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: params.roomName,
        user_name: params.userName,
        is_owner: params.isOwner,
        exp,
      },
    }),
  });

  const data = (await response.json()) as DailyTokenResponse;
  if (!response.ok || !data.token) {
    throw new Error(data.error ?? "Failed to create meeting token");
  }

  return data.token;
}
