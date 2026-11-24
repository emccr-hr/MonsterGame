# Flags: Conflicts, Too Complicated, Not Possible

Each item: what he asked for → why it's flagged → suggested simple version → status (open / agreed / dropped).

## Conflicts

### C1. Catch-only vs. battle-to-level (✅ agreed 2026-11-21)
- **Asked:** Play like the inspiration game, where you catch wild monsters by throwing (no fighting them first), **and** monsters level up by defeating other monsters.
- **Why flagged:** In the inspiration game, catching and fighting are separate. If wild monsters are only caught, never fought, the main way to level up is trainer battles.
- **Suggested:** Wild monster appears → you can **battle** it (gain XP) **or** throw a cage right away. Weakening it first makes the catch more likely.
- **Resolved:** The designer chose: "the option to catch the magic monster right away or battle the monster to get it low enough so that you can catch it." Either path works. Lower HP means a better catch chance.

### C2. Card game vs. video game (✅ agreed 2026-11-21)
- **Asked:** "It will be my card game called Magic and Monsters."
- **Why flagged:** Unclear whether that means *use the monsters from my card game* or *battles should play like my card game* (drawing cards, etc.). These lead to very different games.
- **Suggested:** Use his card game's **monsters, names, moves and abilities**, with simple turn-based battles (pick 1 of 4 moves). No card drawing in v1.
- **Resolved:** Monsters only, as suggested.

## Overly complicated (simplify for v1)

### X1. Size of the world (superseded by X2: designer wants 5 biomes)
- **Why flagged:** The inspiration game has 150+ monsters, many towns, gyms, co-op play and motion controls. That's far too much for a first game.
- **Suggested v1:** 1 small map (a town plus 2–3 wild areas), **8–12 monsters** (including evolutions), 1 rival or boss trainer at the end. Grow later.

### F2. Two progression systems: levels + tasks (✅ agreed 2026-11-21, with a note)
- **Why flagged:** Levels and evolution tasks are both good. If tasks get creative ("visit the volcano at night while holding an item"), each one needs custom code.
- **Suggested:** Pick tasks from a fixed menu of countable task types (see Progression-and-Economy.md). One task can be "reach level N", so the two systems connect.
- **Resolved:** v1 uses only "Reach level N".
- **✅ Confirmed by designer (Round 3):** "with X being a certain level for the magic monster to evolve." Level-only evolution is what he wants; each monster has its own X.
- *(Earlier note)* Round 1 asked for "a set of tasks" per monster. With only the level task, evolution works like a level gate. Confirm with the designer that this is OK. The task list is built so more types (win battles, use a move, defeat certain monsters) can be added later without redesign.

### F3. Abilities (mostly handled: shared abilities Quick, Wise, etc. are in 02-Gameplay/Move-List.md)
- **Why flagged:** "1 ability per monster" is simple to say, but every unique ability is a special rule to program.
- **Suggested v1:** 4–6 abilities that several monsters share (e.g., Tough: takes less damage; Quick: always goes first; Lucky: harder to escape cages).

### F4. Big Monsters: what does "big" do? (✅ agreed 2026-11-21)
- **Why flagged:** Needs a definition so it's buildable.
- **Suggested:** About 1 in 20 chance. Drawn 1.5× bigger with a little bonus to stats. Same moves. Marked with a star in your collection.
- **Resolved:** As suggested, except the chance was changed to **1 in 100** by the designer (Round 14).

## Not possible / not allowed

### N1. Copying the existing monster game (agreed in principle)
- **Asked:** "Like the Pokemon game Let's Go Pikachu."
- **Why flagged:** We can't use that game's names, monsters (Pikachu, etc.), capture balls, map, music or art. Copying a specific existing game isn't allowed.
- **What we keep:** The *kind* of game: explore, catch, battle, level up, evolve. That genre is open to everyone.
- **Good news:** His own ideas already replace the copied parts. **Cages** replace the balls, **Big Monsters** replace the special-color versions, and **his card game's monsters** replace theirs. Design docs should describe things in his terms only.

### X2. Five biomes vs. small v1 map (✅ met: 3 wild monsters per biome as of Round 53)
- **Asked:** 5 biomes, each with its own unique monsters (Round 4).
- **Why flagged:** The earlier v1 suggestion was 2–3 wild areas and 8–12 monsters. Five biomes with unique monsters means more maps and more monsters (and more drawings).
- **Suggested:** Keep all 5 biomes but make each one **small** (one screen or a little more), with **2–3 monsters per biome** (base forms that spawn). That's 10–15 wild monsters, plus their evolutions. If the build runs long, the developer can ship biomes 1–2 first and add the rest one at a time.
- **Question:** Do evolved forms also spawn in the wild, or can you only get them by evolving? (Simplest: only by evolving.)

### X3. Map parts bought in biome shops (✅ agreed: a map part opens a hidden biome, Round 61)
- **Asked:** "buy parts of each biome in the shops in each biome. To collect all of the map."
- **Why flagged:** Unclear what a map part does. If parts are needed to walk forward, a player who runs out of Magic Gems could get stuck.
- **Options:** (a) reveals the map and opens a bonus corner, with the main path always open (recommended); (b) required to enter that section; (c) collection only, like a sticker book.
- **Suggested:** (a). Each biome has 3–4 parts. Completing a biome's map gives a prize.

### X4. Special spots at level 50+ (✅ mostly agreed 2026-11-21)
- **Asked:** "special spots where you can travel to. If your magic monster reaches level 50 or up."
- **Why flagged:** (1) Earlier proposed level cap was 20, so it must rise. (2) "Special spots" could mean secret areas or fast-travel points. (3) Unclear if any team monster counts or only the lead.
- **Suggested:** Max level 60. One secret area per biome (rare monsters, better Big Monster chance), opened by a portal when **any** team monster is 50+.
- **Resolved (Round 44):** Special spots = **fast travel**: teleport to every shop, plus up to **5 teleport pins** (bought at shops, deletable). Not secret areas.
- **Max level:** ✅ 100 (designer, Round 57).
- **Still open:** whether a deleted pin comes back.
- **Watch:** Reaching level 50 takes a long time. The XP curve must get there in a reasonable play time.

### X5. Blobbin's slime trail (✅ agreed: visual only, Round 58)
- **Asked:** leaves red slime behind it for a short distance.
- **Why flagged:** As decoration it's easy. If the slime *does* something (hurts, slows, sticky), that's a new rule for the map and battles.
- **Suggested:** Visual only in v1: a short trail that fades. It could later be the idea behind one of its battle moves (e.g., a "Slime Trail" move that slows the other monster).

### X6. "Burn" adds a lasting effect (✅ agreed, Round 58)
- **Asked:** Blobbin's move Burn.
- **Why flagged:** If Burn keeps hurting over several turns, battles need a "status effect" system. It's the first one in the game.
- **Suggested:** Allow just this one simple status: **Burned** = small damage at the end of each turn for 2 turns, shown with a little flame icon. Reuse it for any other fire moves. No other statuses in v1 unless needed.

### C3. "Fire attacks" vs. "no types" (✅ agreed: element tags on moves, Round 58)
- **Asked:** Blobbin is immune to fire attacks 50% of the time (Round 12).
- **Conflict:** Earlier we decided **no types**. To know what a "fire attack" is, the game has to know which moves are fire.
- **Suggested:** Keep "no types" for monsters (no strong/weak chart), but let moves carry a simple **tag** such as 🔥 Fire. Abilities can check the tag. Burn is tagged Fire, and other fire moves get the tag too. That adds no type chart and almost no complexity.

### X7. Dumble's ability only matters if other monsters know Eat (✅ helped: Bushtail and Squawkle know Eat)
- **Asked:** Dumble isn't affected by an opponent's Eat (Round 17).
- **Why flagged:** Right now Dumble is the only monster with Eat. The ability would only matter when fighting another Dumble.
- **Suggested:** Give **Eat** to a few other monsters (e.g., hungry-looking ones in other biomes) so Dumble's ability matters. The designer can say yes when he makes new monsters.

### X8. Peggy's Slobber and Sleep (✅ agreed, Round 58)
- **Asked:** Moves Slobber and Sleep (Round 23).
- **Why flagged:** "Sleep" could mean Peggy naps to heal **or** Peggy puts the opponent to sleep. Putting the opponent to sleep would add a second status effect (after Burned). Slobber could also be a status.
- **Suggested:** **Sleep = Peggy naps**: heals a big chunk of HP, then skips its next turn. That needs no new status. **Slobber** = small damage and the opponent's next attack is a bit weaker (a one-turn effect, no lasting status).
- **Resolved (Sleep):** Designer: "heal, but cannot attack next turn." Peggy naps; no new status needed.

### C4. Peggy's size: "medium" vs. "twice as big as Ron" (✅ agreed 2026-11-21)
- **Asked:** Peggy is medium-sized, "about twice as big as Ron" (Round 25).
- **Conflict:** If "Ron" means **Rom**, Rom is already 2x Dumble, so Peggy would be 4x Dumble. That's large, bigger than Rom, not medium. If he meant **Dumble**, then Peggy = Rom's size, which fits "medium".
- **Suggested:** Peggy is **about Rom's size** (2x Dumble) and counts as medium.
- **Resolved:** Designer: "twice as big as Dumble, same size as Rom."
- **Size scale so far (smallest → biggest):** Dumble (small, 1x) → Peggy / Rom / Anti-Ant / Queen Ant (medium, 2x) → Blobbin (tall) → Slimy (taller) → Scout (4x Dumble, skinny) → Abominable Snowman (1.5x Yeti, about 4.5x Dumble) → Avatar boss (10x Dumble). Blobbin/Slimy exact size vs. Dumble TBD.

### X9. Scout's Fetch power-up (✅ agreed: +20%, stacks twice, resets after battle, Round 58)
- **Asked:** Fetch brings back items that increase Scout's attack by 20% (Round 26).
- **Why flagged:** This is the first move that **boosts a stat**. We need to decide how long it lasts and whether using it again adds more. Also, "items" could mean real items in your bag, which would be a much bigger system.
- **Suggested:** Fetch is just a power-up animation (Scout runs off and comes back with a stick or ball). There are no real bag items. **+20% attack for the rest of the battle**, and it can stack **up to 2 times (+40%)**. The boost resets after battle.
- **Note:** Scout = 4x Dumble (C4 resolved), the biggest monster so far.

### X10. Peggy is a Forest (first-biome) monster but evolves late, at 45 (✅ moot: no fixed first biome as of Round 61)
- **Why flagged:** The Forest is where the game starts, but Peggy evolves at level 45. That's later than Blobbin (25, Volcano) and Dumble (35, Beach). Players will carry Peggy a long time before Scout appears.
- **Not a problem if intended:** It makes Scout a big late-game reward. Just confirm it's on purpose. The XP curve needs level 45 reachable before the final boss.

### X11. Anti-Ant's ability only matters against other Red Ants (open, small)
- **Asked:** "It will not be attacked by other red ants" (Round 30).
- **Why flagged:** Like Dumble's ability (X7), it only works if the opponent is also a Red Ant. That will be rare unless there are several ant monsters.
- **Ideas:** (a) Keep it as is, a fun rule for Red Ant vs. Red Ant. (b) Make an **ant family**: the evolution and maybe other ants (e.g., a Queen Ant boss) count as "red ants" too. (c) Change it to something that comes up more often.
- **Update (Round 34):** Anti-Ant evolves into **Queen Ant**, so the family now has 2 red ants.
- **Suggested:** (b). Any monster tagged "Red Ant" can't attack this one. If the designer makes more ants, the ability gets better.

### X12. Protect the Queen, Sting, and Dig (✅ agreed: Dig is a 2-turn move, Round 58)
- **Protect the Queen:** "Heals all other magic monsters." Read as **your other team monsters** (not the opponent). Battles are 1-on-1, so this heals the ones waiting on your bench. Proposed: 25% of max HP each.
- **Sting:** Simple damage in v1. If he wants poison, it can reuse the **Burned**-style lasting-damage system (X6) as "Poisoned".
- **Dig:** Proposed as a 2-turn move: hide underground (can't be hit), then attack. That's the first 2-turn move, which is a small new rule. Simpler option: Dig is just a normal attack.
- **Question:** Is the Queen a monster in the game? A **Queen Ant final boss** or evolution would fit nicely.

### X13. Freeze adds a second status, and Yeti's ability only blocks it (✅ agreed: Burned + Frozen are the only statuses, Round 58)
- **Asked:** Yeti's move Freeze; ability "could not be frozen" (Round 38).
- **Why flagged:** (1) **Frozen** would be the game's second lasting effect, after Burned (X6). (2) Yeti is the only monster with Freeze so far, so the ability only matters against another Yeti, like X7 and X11.
- **Suggested:** Allow **Frozen** = skip the next turn, with a 25% chance when hit by Freeze. Tag Freeze as 🧊 **Ice** (same idea as the 🔥 Fire tag, C3). Then "cannot be frozen" is easy to build. Give Freeze or other ice moves to more Snowy monsters later so the ability comes up more.
- **Status effects total in v1:** Burned, Frozen. Keep it to these two unless the designer adds more.

### X14. Abominable Snowman's moves (✅ agreed 2026-11-21)
- **Why flagged:** The designer didn't list moves. Yeti's Bite and Scratch don't fit a snowman with a coal mouth and stick hands.
- **Suggested:** Keep **Belly Flop** and **Freeze**. Swap Bite and Scratch for snowman moves, e.g., **Snowball Throw** and **Stick Poke**, or let the designer pick. When Yeti evolves, the swapped moves change automatically (like Dumble → Rom).
- **Resolved:** Designer picked **Snowball, Freeze, Ice Slap, Popsicle** (Round 42). Popsicle's effect (heal) is a proposal.

### C5. "Four elements" vs. five biomes / monster families (✅ agreed 2026-11-21)
- **Asked:** The boss combines **four elements**, with one attack from each monster, one per type (Round 43).
- **Conflict:** There are **5** families (Forest, Beach, Desert, Snowy, Volcano), but 4 elements and a 4-move limit. Also, earlier we chose **no types**. The move tags (🔥 Fire, 🧊 Ice) are the closest thing.
- **Claude's pick (for now):** Fire = Burn, Water = Splash, Earth = Dig, Ice = Freeze. **The Forest family (Peggy/Scout) is left out.**
- **Options:** (a) Keep 4 elements; Forest is left out. (b) Make it **five elements** (add 🌿 Nature from the Forest, e.g., Fetch or Bite) and let the boss break the 4-move rule with 5 moves. (c) Keep 4 moves but swap one element for Nature.
- **Resolved (Round 47):** **Five elements**, option (b). The boss has 5 moves; Nature = Fetch (from Scout).
- **Suggested:** (b). Bosses can be special, and it honors every biome. The tags become Fire, Water, Earth, Ice, Nature. Tags only, still no type chart.

### N2. The name "the Avatar" and a four-element master (✅ agreed with a guardrail, 2026-11-21)
- **Asked:** A boss that combines the four elements, called "the Avatar".
- **Why flagged:** "Avatar" is an ordinary word, but **"the Avatar" who masters the four elements** is the core idea of a well-known TV series. We must not copy that show's characters, look, or story.
- **Resolved (Round 47):** The designer kept the name **Avatar**. It's a common word, and the boss now uses **5 elements from this game's own biomes**, which moves it away from the show's four-element idea. **Guardrail:** the boss is a monster with an original look. Nothing from the show (characters, art, symbols, story).
- **Update (Round 49):** The designer wants Avatar to **look like a human** (10x Dumble). That moves it closer to the TV show, so the guardrail matters more. The developer and artist must **not** use that show's character traits (e.g., a bald kid with arrow markings, monk robes, a flying bison, its symbols). Use the 5-element body idea or the designer's own drawing.
- *(Earlier suggestion)* Give the boss an original name that still sounds epic, e.g., **"The Elemental"**, **"Elementor"**, **"The Magic Monster King"**, or a name the designer makes up. Keep the cool idea: one giant monster made of every biome's power.

### X15. Teleport pins (✅ agreed: deleted pins return; buy before 50, use at 50+, Round 58)
- **Asked:** Buy pins at shops, place them anywhere, teleport there. Max 5 placed; pins can be deleted (Round 44).
- **Why flagged:** Simple to build (save 5 map spots). A few rules need deciding so players don't get stuck or confused.
- **Price:** ✅ 100 Magic Gems (designer, Round 45).
- **Suggested:** A deleted pin goes back into your bag. You can buy before level 50, but pins only work at 50+. No pins in the boss arena.
- **Also note:** Teleporting only unlocks at level 50, and only Scout (45) evolves near that. Players will spend most of the game walking, so the biomes should stay small (Flags X2).

### X16. "Reviver" (place) vs. "Revive" (shop item) (✅ agreed: item renamed Wake-Up Snack, Round 59)
- **Why flagged:** The names are very close and could confuse players. Also, with free full heals at every shop, the bought Revive item matters less. It's still useful far from a shop.
- **Suggested:** Keep **Reviver** for the free healing place (the designer's name). Rename the shop item to something like **Wake-Up Snack** or **Energy Gem**, or let the designer name it.

### X17. Boss in the center: can players walk there too early? (✅ agreed 2026-11-21)
- **Asked:** Avatar lives where all biomes connect, in the center of the map (Round 48).
- **Why flagged:** If every biome touches the center, a new player could wander into the boss fight at level 3.
- **Options:** (a) A **gate** to the center that opens after you've visited all 5 biomes (or caught a monster from each). (b) Open from the start, but Avatar is so strong you lose and get sent to a Reviver. (c) A gate that opens when a team monster reaches a set level.
- **Suggested:** (a) **Catch at least one monster from every biome** to open the center gate. It fits "catch them all" and makes the player explore everything first.
- **Resolved (Round 50):** The center is **gated until you catch every monster from every biome**. Then Avatar can be fought. This is stricter than the suggestion, so see C6.
- **Also:** Should the biomes connect to **each other** too, or only through the center? Simplest: biomes connect in a ring, and each also has a (gated) path to the center.

### C6. "Catch every monster" to fight the boss vs. "catch-all is a bonus" (✅ agreed 2026-11-21)
- **Asked:** You can't fight Avatar until you've caught **every monster from every biome** (Round 50).
- **Conflict:** Earlier decision: beating the boss is the main goal and catching everything is a **bonus**. Now catching everything is **required** before the boss.
- **Why it matters:** (1) Does "every monster" include **evolved forms** (Scout, Rom, Slimy, Queen Ant, Abominable Snowman)? If those only come from evolving, the player must raise Peggy to **level 45** before the boss. (2) **Rare monsters** (Peggy is 5%) mean a lot of searching. (3) Do **Big Monsters** (1 in 100) count? Requiring them would take forever.
- **Resolved (Round 52):** Only the monsters that **spawn naturally** count. Evolved forms don't. Big Monsters aren't required (a normal catch counts).
- **Suggested:** The gate opens when you've caught **every monster that spawns in the wild** (every base form, one of each). Evolved forms and Big Monsters **don't** count toward the gate; they stay as the "catch them all" bonus. The center gate shows a counter, e.g., "Monsters caught: 4 / 5".

### C7. Ansonville and Avatar are both "in the center" (open, default chosen)
- **Asked:** Avatar lives in the center where all biomes connect (Round 48). Ansonville, the starting town, is also in the center (Round 61).
- **Default chosen:** Avatar's arena is a **gated building or area inside Ansonville**. Players see the gate from the very start, which builds excitement, and it opens once every wild monster is caught.
- **Confirm with designer** if he pictured it differently.

### C8. Starting with 100 cages and 100 Magic Gems? (open, default chosen)
- **Asked:** Round 5: start with 100 Magic Gems and buy cages. Round 61: start with **100 cages**.
- **Default chosen:** start with **both** 100 cages and 100 Magic Gems. The gems can go toward a first map part, potions, or more cages.
- **Watch:** 100 cages is a lot, so cage sales will be slow early. That's fine; gems will mostly go to map parts and pins.

### X18. Any biome can be first, so difficulty can't go "easy to hard" (open, default chosen)
- **Why flagged:** The player picks any biome first and opens the rest in any order. Wild monster levels can't assume a fixed order.
- **Default chosen:** wild monster levels **scale with the player's team** (about the team's average level, ±2), with a minimum of level 2 so first catches are easy. Evolve levels stay as designed.

### X19. Map part price and first steps (open, default chosen)
- **Default chosen:** each locked biome has **one map part, 50 Magic Gems**, sold in every shop. With 100 starting gems, a player can open a second biome early, which feels good. Battles give gems so no one gets stuck.

## N3: "Iceman" is an existing superhero's name (Round 68)
- **Problem:** the designer named his ice superhero "Iceman", the name of a well-known comic-book superhero. The game uses only original names (Flags N1, N2).
- **Resolved (Round 68):** same idea and powers, new name picked by the designer: **Blizzard Boy**. His look is an original design (ice body, a mask, a cape and a snowflake on his chest), not drawn from any comic.

## N4: "Fire Punch" is a move name from an existing game (Round 76)
- **Problem:** the designer gave Flame Cat a move called "Fire Punch", the name of a move in a well-known monster game (Flags N1, N2).
- **Resolved (Round 76):** same move, new name picked by the designer: **Magma Fist**.
