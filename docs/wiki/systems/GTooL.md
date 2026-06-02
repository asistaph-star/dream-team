# GTooL - Drag Alignment

### States:
  // Custom Court Layout State
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [courtPositions, setCourtPositions] = useState<Record<string, {x: number, y: number, snappedX?: boolean, snappedY?: boolean}>>({
    'SF': { x: 15, y: 10 },
    'PF': { x: 85, y: 10 },
    'C':  { x: 50, y: 35 },
    'SG': { x: 28, y: 60 },
    'PG': { x: 72, y: 60 }
  });
  const [draggedLayoutSlot, setDraggedLayoutSlot] = useState<string | null>(null);
  const courtRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('dream_team_court_layout');
    if (saved) {
      try {
        setCourtPositions(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

### Handlers:
              const handleCourtPointerDown = (e: React.PointerEvent, slot: string) => {
                if (!isEditingLayout) return;
                e.preventDefault();
                setDraggedLayoutSlot(slot);
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              };

              const handleCourtPointerMove = (e: React.PointerEvent) => {
                if (!isEditingLayout || !draggedLayoutSlot || !courtRef.current) return;
                const rect = courtRef.current.getBoundingClientRect();
                let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                
                // Snapping Logic
                const snapThreshold = 2.5; // percentage distance to snap
                let snappedX = false;
                let snappedY = false;

                Object.entries(courtPositions).forEach(([slot, pos]) => {
                  if (slot !== draggedLayoutSlot) {
                    if (!snappedX && Math.abs(x - pos.x) < snapThreshold) {
                      x = pos.x;
                      snappedX = true;
                    }
                    if (!snappedY && Math.abs(y - pos.y) < snapThreshold) {
                      y = pos.y;
                      snappedY = true;
                    }
                  }
                });

                setCourtPositions(prev => ({
                  ...prev,
                  [draggedLayoutSlot]: { x, y, snappedX, snappedY }
                }));
              };

              const handleCourtPointerUp = (e: React.PointerEvent) => {
                if (!isEditingLayout || !draggedLayoutSlot) return;
                setDraggedLayoutSlot(null);
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
              };

              const toggleEditLayout = () => {
                if (isEditingLayout) {
                  // Save
                  localStorage.setItem('dream_team_court_layout', JSON.stringify(courtPositions));
                }
                setIsEditingLayout(!isEditingLayout);

### JSX / Court Div:
                    ref={courtRef}
                    onPointerMove={handleCourtPointerMove}
                    onPointerUp={handleCourtPointerUp}
                    onPointerCancel={handleCourtPointerUp}
                    className={`relative z-10 flex-1 w-full max-w-[1000px] mx-auto mt-6 mb-4 flex items-center justify-center ${isEditingLayout ? 'touch-none' : ''}`}

### Alignment Lines JSX:
                        )}
                        {/* Vertical Line - Only show when snapped */}
                        {courtPositions[draggedLayoutSlot].snappedX && (
                          <div 
                            className="absolute top-0 bottom-0 border-l border-fuchsia-500 border-dashed flex items-end"
                            style={{ left: `${courtPositions[draggedLayoutSlot].x}%`, opacity: 0.8 }}
                          >
                            <span className="bg-[#d946ef] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full absolute -left-3.5 -bottom-6 shadow-md drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                              {Math.round(courtPositions[draggedLayoutSlot].x)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Active Lineup Players on Court */}
                    {currentLineup.map((p, idx) => {
                      const slotPos = SLOT_POSITIONS[idx];
                      const isSelected = subCourtPick === p.id;
                      const stam = matchState.playerStamina[p.id] ?? 100;
                      
                      const coords = courtPositions[slotPos] || { x: 50, y: 50 };
                      
                      return (
                        <div key={p.id} 
                          className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transform transition-all cursor-pointer ${isSelected && !isEditingLayout ? 'scale-[1.15] z-30' : 'hover:scale-105 z-20'} ${isEditingLayout ? 'touch-none select-none z-50' : ''}`}
                          style={{ left: `${coords.x}%`, top: `${coords.y}%` }}