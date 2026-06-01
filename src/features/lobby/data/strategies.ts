export interface LobbyStrategy {
  name: string;
  desc: string;
  focus: string;
  stat: string;
}

export const LOBBY_OFFENSIVE_STRATEGIES: LobbyStrategy[] = [
  { name: "Motion Offense", desc: "Balanced passing and off-ball movement.", focus: "PG playmaking, C screens", stat: "+2% effectiveness per level" },
  { name: "Pick & Roll", desc: "High screen action utilizing roll-man and ball handler.", focus: "PG passing, C inside scoring", stat: "+2% effectiveness per level" },
  { name: "Isolation (ISO)", desc: "Clear out space for your star scorers to play 1-on-1.", focus: "SG/SF solo scoring efficiency", stat: "+2% effectiveness per level" },
  { name: "5-Out Spacing", desc: "All 5 players spaced on perimeter to maximize open shots.", focus: "PG/SG 3PT shooting volume", stat: "+2% effectiveness per level" },
  { name: "Post Isolation", desc: "Feed the ball inside for your big men to operate.", focus: "PF/C inside physical scoring", stat: "+2% effectiveness per level" },
  { name: "Run & Gun", desc: "Ultra high-tempo transition play prioritizing speed and rapid fastbreak shots.", focus: "PG/SG/SF speed and fastbreak scoring", stat: "+2% effectiveness per level" },
  { name: "Pace & Space", desc: "Modern perimeter spacing scheme maximizing high-volume three-point looks.", focus: "SG/SF perimeter shooting and court spreading", stat: "+2% effectiveness per level" },
  { name: "Outside Shoot", desc: "Prioritize perimeter jumpers and deep spacing for your high-efficiency shooters.", focus: "PG/SG perimeter shooting volume", stat: "+2% effectiveness per level" },
  { name: "Corner 3s", desc: "Focus offensive rotations on producing open catch-and-shoot looks in the corners.", focus: "SG/SF wing & corner three-point volume", stat: "+2% effectiveness per level" },
  { name: "Inside Score", desc: "Feed the low block and slash to the rim, maximizing inside paint dominance.", focus: "PF/C interior paint physical scoring", stat: "+2% effectiveness per level" },
  { name: "Hawk Entry", desc: "Utilize high-post screens and weakside baseline cuts to slash through defenses.", focus: "SF/PF mid-range and baseline cutting", stat: "+2% effectiveness per level" },
  { name: "Outside Cut Entry", desc: "Initiate passing sequences from the perimeter, executing backdoor cuts to the rim.", focus: "SF/SG off-ball baseline cuts & assists", stat: "+2% effectiveness per level" },
  { name: "Princeton Offense", desc: "Run highly structured, constant off-ball motion requiring high-IQ passing from all 5 positions.", focus: "Balanced team playmaking & backdoors", stat: "+2% effectiveness per level" }
];

export const LOBBY_DEFENSIVE_STRATEGIES: LobbyStrategy[] = [
  { name: "Man-to-Man", desc: "Traditional defensive coverage tracking players 1-on-1.", focus: "Balanced defensive coverage", stat: "+2% effectiveness per level" },
  { name: "Drop Coverage", desc: "C sags into paint to protect rim while giving up mid-range.", focus: "C rim protection, interior focus", stat: "+2% effectiveness per level" },
  { name: "Switch Defense", desc: "Defenders switch screens immediately to close perimeter space.", focus: "SF/PF versatility on screens", stat: "+2% effectiveness per level" },
  { name: "Blitz/Trap", desc: "Aggressive double-teaming on key ball handlers to force mistakes.", focus: "Higher STL rate, higher stamina drain", stat: "+2% effectiveness per level" },
  { name: "2-3 Zone", desc: "Clog the interior paint with 3 zone-defenders.", focus: "Defensive Rebounding, denies driving layups", stat: "+2% effectiveness per level" },
  { name: "Full-Court Press", desc: "All-out pressure starting from the opponent's backcourt.", focus: "Massive STL boost, very high stamina drain", stat: "+2% effectiveness per level" },
  { name: "Full-court press", desc: "Aggressive full-court pressure boosting steal rate at a very high stamina drain.", focus: "Massive STL boost, very high stamina drain", stat: "+2% effectiveness per level" },
  { name: "Half-Court Press", desc: "Apply aggressive defensive pressure starting at half-court, trapping sideline ball handlers.", focus: "Moderately high STL boost, minor fatigue cost", stat: "+2% effectiveness per level" },
  { name: "Half-court press", desc: "Apply aggressive defensive pressure starting at half-court, trapping sideline ball handlers.", focus: "Moderately high STL boost, minor fatigue cost", stat: "+2% effectiveness per level" },
  { name: "3-2 Zone", desc: "Deploy a high perimeter zone designed to close down open wing and corner three-point attempts.", focus: "Denies opponent corner & wing 3PT looks", stat: "+2% effectiveness per level" },
  { name: "Protect the Lane", desc: "Instruct your defenders to drop deep inside the paint, fully protecting the rim against driving layups.", focus: "PF/C paint protection, blocks drives & layups", stat: "+2% effectiveness per level" },
  { name: "1-3-1 Zone", desc: "Deploy an active trapping zone shifting defenders dynamically to sideline pass intercept lanes.", focus: "High steal rate, forces passing turnovers", stat: "+2% effectiveness per level" },
  { name: "Combination Defense", desc: "Run a dynamic hybrid defense specifically focused on shutting down the opponent's primary high-OVR scorer.", focus: "Suppresses opponent primary star scorer", stat: "+2% effectiveness per level" }
];
