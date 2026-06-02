# Upgrade Materials and Equipment Crafting

This document outlines the resources, equipment slots, crafting formulas, facility progression rules, and passive store rates of the game economy.

---

## 1. Core Currencies & Inventory

* **Cash / Team Funds**: Main operational currency. Used for signing free agents, upgrading facilities, and upgrading equipment.
* **TK / VC**: Premium virtual currency. Used to expand roster storage limits.
* **Roster limit**: Initial court (5) and bench (6) slots are supplemented by storage capacity. Roster storage starts with a default limit and can be expanded in blocks of **+10 slots for 100 TK/VC**.

---

## 2. Upgrade & Crafting Materials

* **Crafting Materials (`mat_crafting`)**: Resources consumed to craft standard base equipment blueprints.
* **Upgrade Stones (`mat_upgrade`)**: Consumed to upgrade equipment pieces and to perform card star-up ascensions.

---

## 3. Equipment Crafting & Upgrades

Equipment can be equipped in 5 distinct slots: **Shoes, T-Shirt, Knee Pads, Jersey, and Headband**.

### Upgrade Probability Formula
Upgrading an equipment item consumes `mat_upgrade` and `Cash` (costs scale with item level). Upgrade success is determined by a linear decay formula:

```typescript
successRate = Math.max(0.10, 0.90 - currentLevel * 0.15)
```

* **+0 → +1**: `90%` success rate.
* **+1 → +2**: `75%` success rate.
* **+2 → +3**: `60%` success rate.
* **+3 → +4**: `45%` success rate.
* **+4 → +5**: `30%` success rate.
* **+5 → +6**: `15%` success rate.
* **+6+**: Clamps at the **10.0%** minimum success rate floor.

> [!CAUTION]
> **Resource Loss**: On failure, all consumed Upgrade Stones and Cash are lost, but the equipment piece is **not destroyed or degraded** in level.

---

## 4. Facility Upgrades & Passive Store Revenue

Users can upgrade 4 facilities: **Arena, Gym, Lab, and Store**.
* **Upgrade Cost**: Upgrades cost `lvl * $50,000` Cash.

### Passive Store Cash Accumulation
The **Store** facility passively accumulates cash in the background:
* **Timer Interval**: Ticks every **3 seconds**.
* **Accumulation Rate**: Generates `store * $15` Cash per tick (effectively `$5 / sec` per facility level).
* **Cap**: Cash accumulates up to a maximum cap of `store * $50,000` Cash. The user must manually click to claim accumulated store revenue.
