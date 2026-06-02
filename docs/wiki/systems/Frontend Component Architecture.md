# Frontend Component Architecture

Related hubs: [[wiki/systems/Project Architecture|Project Architecture]], [[wiki/systems/UI Flow Analysis|UI Flow Analysis]], [[wiki/systems/player-card-upgrade/00 Current Canonical System State|Player Card and Upgrade Systems]].

## Connected Component Architecture Rule

This project enforces a **Connected Component Architecture** for the frontend UI. Any repeated visual component must be built as a single, canonical shared component. 

When a design update is required (e.g., changing a border style, drop shadow, or text glow), it must be done in the shared component file so that the change automatically propagates to all screens in the game.

### Strict Single-Source-of-Truth Components:

1. **Player Cards**: 
   - Canonical Source: `src/components/player/PlayerCard.tsx`
   - Handles: Player visual representation, Native scaling, Premium Black Position Badges, Selected Ring States, and Stamina Bars.
   - Usage: Match Gameplay, Stadium/Lobby, Substitution Modal, Bench Row, Player Storage.
   - *Note: Do NOT use inline CSS scaling wrappers. Pass `scale={0.80}` directly as a prop.*

2. **Item & Equipment Cards**:
   - Canonical Source: `src/components/items/ItemCard.tsx`
   - Handles: Materials, Upgrade modules, Equipment, Crafting blueprints, Item Rarity frames, Background Halftone animations, and Quantities.
   - Usage: Inventory Screen (Materials, Equipment, Crafting grids), Future Shop/Reward modals.

3. **Skill Badges**:
   - Canonical Source: `src/components/skills/SkillBadge.tsx`
   - Handles: Base skills, Special skills, Hover tooltips, Quality (Common-Legendary) auras, and Reroll/Learn actions.
   - Usage: PlayerHexProfileModal, PlayerCard.
   - *Note: For functional specs of special skills, families, and ascension, see [[wiki/systems/player-card-upgrade/00 Current Canonical System State|Player Card and Upgrade Systems]].*

## Design Patterns

- **API-Driven UI Control**: Use explicit props (`scale`, `selected`, `showPositionBox`) instead of external CSS wrappers to manipulate the visual output.
- **Premium Parity**: All visual iterations must retain the exact premium console-grade design (e.g., dark faceted glass position boxes, halftone overlays) consistently across screens.
