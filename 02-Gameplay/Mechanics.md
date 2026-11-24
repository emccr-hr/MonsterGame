# Mechanics

| Mechanic | Description | Supports pillar | Status |
|---|---|---|---|
| Cages | Throw a tiny cage. It grows into a big cage mid-air and closes around the monster. It may hold or the monster may escape. Can be thrown at the start of an encounter or during a battle. | 1 | From designer |
| Monsters in Ansonville | Grassy spots all around town and a ring around Avatar's arena, where **any first-form monster** from any place can appear. | 71 | From designer |
| Visible wild monsters | Wild monsters wander on the grass, sand, snow and ash, so you can see them (and spot a Big one, which looks bigger) before you battle. Walk into one to start a battle with it. Some hidden ones can still jump out of the grass. | 62 | From designer |
| Wild encounter choice | When a wild monster appears: **Throw cage** right away, or **Battle** to lower its HP and then throw. | 1, 4 | ✅ Agreed (C1) |
| Big Monsters | Very rare (1 in 100) version of any monster: 1.5x size, small stat boost (+10%), same moves, star in the collection. Slightly harder to catch. | 4 | ✅ Agreed |
| Battles | Turn-based. Each side picks 1 of its 4 moves; the faster monster goes first. A monster loses when its HP reaches 0. **No types** and no card drawing. | 3 | ✅ Agreed |
| 4 moves | Each monster knows at most 4 moves. Learning a 5th means choosing one to forget. | 3 | From designer |
| 1 ability | Each monster has exactly 1 ability, a passive bonus that is always on (e.g., "+1 speed when HP is low"). | 3 | From designer, keep abilities simple (F3) |
| Levels | Defeating monsters gives XP. Enough XP means a level up: more HP and power, sometimes a new move. | 4 | From designer |
| Evolution tasks | Most families have 2 forms; a few (chosen by designer) have 3. Each monster evolves when it reaches **its own level X** (confirmed by designer). Built as a task list so more task types can be added later. | 4 | ✅ Agreed (F2) |
| Magic Gems & shops | Win battles to earn Magic Gems. Buy cages (and maybe healing items) in the town shop. | 4 | ✅ Agreed |

## Catch chance (✅ agreed, Round 58)
Catch chance = base chance + bonus for missing HP.
- Full HP: about 30%. Half HP: about 60%. Very low HP: about 90%.
- Formula: `chance = 0.30 + 0.60 × (1 − currentHP / maxHP)`, capped at 95%.
- Big Monsters are a bit harder: multiply by 0.8.
- If the catch fails, the monster stays and the battle continues (or the encounter goes on, if no battle started). It may run away after 3 failed throws.
- Knocking a wild monster out (HP 0) means it can't be caught, but you still get XP. That gives the player a reason to stop attacking at the right moment.

## Starting numbers (to tune during testing)
- Level cap: **100** (designer, Round 57).
- XP curve guidance: all evolutions happen by level 45, teleporting unlocks at 50, and 100 is the long-term goal. Suggested pacing: level 50 in roughly the time it takes to explore all 5 biomes. Levels 50–100 are for players who keep playing after the boss.
- Evolution levels: set per monster by the designer (Blobbin → Slimy at 25). With a max level of about 60 and special spots at 50, around 20–30 for a first evolution fits well.
- Cage price: 10 Magic Gems. Magic Gems per wild battle win: 5–10. Trainer win: 30.
- Big Monster chance: **1 in 100** spawns (designer, Round 14).

## Move tags
Monsters have **no types** and there is no strong/weak chart. But a move can carry an **element tag**: 🔥 Fire, 💧 Water, 🪨 Earth, 🧊 Ice, 🌿 Nature (one per biome) so abilities can react to it. Example: Blobbin's ability ignores fire moves 50% of the time. See Flags C3.

## Spawning
When a wild monster spawns, the game picks one of that biome's monsters by its **spawn chance** (e.g., Blobbin = 20% in the Volcano). Then it rolls the Big Monster chance. Spawn chances per biome add up to 100%.

## Shared moves
Moves can be shared between monsters (e.g., **Hit** is known by Blobbin and Dumble). Build each move once in a move list and reuse it.

## Teleporting (unlocks when any team monster reaches level 50)
Designer, Round 44.
- **Shop teleport:** you can teleport to **every shop**: the starting town plus all 5 biome shops.
- **Teleport pins:** bought at any shop. Place a pin anywhere on the map, then teleport to it whenever you want.
  - **Max 5 pins placed at once.**
  - **Pins can be deleted** to free up a slot.
- **Pins cost 100 Magic Gems each** (designer, Round 45).
- Agreed (✅ agreed, Round 58): Deleting a pin **gives it back** to your bag so you can place it again (no re-buying). You can **buy** pins before level 50 but only **use** them after. Pins can't be placed inside the final boss's arena.
- Teleport menu: open the map → pick a shop or pin → poof. *(Built in M6b: press M, pick Teleport. "Place a pin here" puts a pin where you stand; X picks a pin back up.)*

## Revivers
Designer, Round 46.
- A **Reviver** stands **next to every shop** (the starting town plus all 5 biomes).
- Step in or use it to **heal all your monsters for free**: full HP, knocked-out monsters revived, Burned and Frozen cleared.
- If you lose a battle, you wake up at the **last Reviver you used**. (✅ agreed, Round 58)
- Since shops are teleport spots at level 50+, Revivers are too.

## Adding unlimited monsters (designer asked, Round 48)
The designer wants to add **as many monsters as he wants** and still give each a spawn %. Build spawning so that works:
- Each monster's spawn number is a **weight**, not a fixed slice. The game adds up the weights in a biome and divides.
- Example: Volcano has Blobbin 20 and a new monster 40, total 60. Blobbin shows up 20/60 = 33% of the time, and the new one 67%.
- If a biome's numbers add up to exactly 100, they work as plain percentages. If they go over 100, everything scales down fairly and nothing breaks.
- Adding a monster is just adding one row (name, biome, spawn number) to the monster data. No code changes.

## Team and backpack (designer, Round 51)
- **Team:** up to **6 monsters** "at the ready". These are the ones you battle with.
- **Backpack:** stores **every monster you catch**, with no limit.
- **Swapping:** you can change which monsters are on your team "from time to time". (✅ agreed, Round 58) Swap **anytime outside battle** by opening the backpack. **During battle**, you can switch to another team monster, but it uses your turn.
- If your team is full when you catch a new monster, it goes **straight into the backpack**.
- Battles are 1-on-1: your lead monster fights, and the other 5 wait. If the lead is knocked out, you pick the next one. You lose the battle only when all 6 are knocked out.
- Moves like **Protect the Queen** heal the other monsters on your team (not the backpack).

## Start of the game (designer, Round 61)
- **No starter monster.** The player starts in **Ansonville** with **100 cages** and must **catch their first monster**.
- Until the first catch, the player has no monster to battle with, so the first catch is a "throw the cage right away" catch (that option already exists, C1). With 100 cages, running out isn't a worry.
- At the start, only **Ansonville** and **one biome the player picks** are open. Other biomes stay hidden until the player **buys that biome's map part** (see Progression).
- Proposed: on a new game, Ansonville shows 5 gates. The player picks 1, and the other 4 stay closed until their map part is bought.
