# Skill Tape And Reroll Economy

This document details the Skill Tape currency, special skill training flows, reroll safeguards, and high-rarity protection modals.

---

## 1. Skill Tape Currency & Training

Special learned signature skills require **Skill Tape** to roll or reroll:
* **Cost**: Exactly **1 Skill Tape** is consumed at the start of any roll or reroll action.
* **Unlock Requirement**: Special skill training is unlocked for a card only when it reaches **at least Star 1**.
* **Limit Checks**: Slot 1 is available at Star 1+. Slot 2 is available only at **Star 5+**.

---

## 2. Reroll Safeguards & The Pending State

To prevent users from losing valuable signature skills on bad rolls, the training loop implements a non-destructive **Pending State**:

1. **Roll Trigger**: The user spends 1 Skill Tape and triggers `trainSpecialSkill(...)`.
2. **State Creation**: A `pendingSkillTraining` object is saved in context. The original equipped skills are **not** modified or overwritten yet.
3. **Decoupled Replacement**: The user is presented with a selection panel:
   - **Replace Slot 1**: Replaces slot 1 with the new skill.
   - **Replace Slot 2**: Replaces slot 2 with the new skill (available only at Star 5+).
   - **Forfeit / Keep Current**: Discards the new rolled skill, leaving existing equipped skills intact. No Skill Tape is refunded.
4. **Minimize Capability**: The user can choose to **Minimize** the pending overlay. This saves the training state for later, allowing the user to navigate the roster and app normally without being blocked.

---

## 3. High-Rarity Accidental Overwrite Protection

Epic and Legendary skills have extremely low drop rates (Epic `2.5%`, Legendary `0.5%`). To prevent accidental overwrites:
* **The Guardrail**: A high-priority warning dialog pops up if the user attempts to:
  - Reroll an equipped Epic or Legendary skill.
  - Overwrite/Replace an equipped Epic or Legendary skill.
  - Reroll or Forfeit a pending Epic or Legendary skill they just rolled.
* **Confirmation**: The user must explicitly click "Confirm Training" or "Confirm Sacrifice" through a custom 2K-aesthetic modal to proceed.
* **Rarity-Based Colors**: Trigger rate numbers and skill badge labels are styled dynamically based on quality (Common = Emerald, Rare = Blue, Elite = Violet, Epic = Orange, Legendary = Red Glow) to visually emphasize value.
