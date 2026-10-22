import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getRecentRooms, type RecentRoom } from "@/lib/supabase/queries";
import { formatRoomCode } from "@/lib/utils";

/**
 * Items for the AppMenu "Rooms" submenu: the rooms this session has joined,
 * most recent first. Radix mounts submenu content only while it is open, so
 * the list is fetched fresh each time the submenu opens.
 */
export function RecentRoomsMenuItems({ userId }: { userId: string | undefined }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RecentRoom[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getRecentRooms(userId)
      .then((result) => !cancelled && setRooms(result))
      .catch((error) => {
        console.error("Failed to load recent rooms:", error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (failed) {
    return <DropdownMenuItem disabled>Couldn't load your rooms</DropdownMenuItem>;
  }
  if (!rooms) {
    return <DropdownMenuItem disabled>Loading…</DropdownMenuItem>;
  }
  if (rooms.length === 0) {
    return <DropdownMenuItem disabled>No rooms yet</DropdownMenuItem>;
  }

  return rooms.map((room) => (
    <DropdownMenuItem
      key={room.room_code}
      onClick={() => navigate(`/room/${room.room_code}`)}
    >
      {room.is_leader && <Crown aria-label="You lead this room" />}
      <span className="flex-1 truncate">{room.name}</span>
      <span className="text-muted-foreground font-mono text-xs">
        {formatRoomCode(room.room_code)}
      </span>
    </DropdownMenuItem>
  ));
}
