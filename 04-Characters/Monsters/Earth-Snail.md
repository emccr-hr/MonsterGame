# Earth Snail

*Designed by the designer (Round 86).*

| Field | Value |
|---|---|
| What it is | a big snail with a little world of plants on its shell |
| Home biome | **Forest** ("the grass area") |
| Spawn number | *Proposal:* **10** (rare, like Blizzard Boy; the other Forest weights stay the same) |
| Size | Large (**4x Dumble**, as big as Blizzard Boy) |
| How it moves | *Proposal:* Slides slowly; the little trees on its shell sway. |
| Look | A big snail whose shell has **trees, bushes and grass** growing on top. |
| Ability (1) | **Damp Moss**: can never be Burned. |
| Evolves into | **[World Snail](World-Snail.md)** |
| Evolves at level X | **20** |
| Evolves from | Nothing, it's a first form |

## Moves (max 4)
| # | Move | What it does | Power |
|---|---|---|---|
| 1 | **Tree Hit 🌿** | Bonks with a tree from its shell. *(New.)* | High |
| 2 | **Berry Kick 🌿** | Kicks a hard berry. *(New.)* | Medium |
| 3 | **Snail Bite** | A slow, strong chomp. *(New.)* | Medium |
| 4 | **Shell** | Hides in its shell: the next attack on it does **nothing at all** (no damage, no Burned, no weaker attacks). *(New rule.)* | — |

🔥 Fire · 💧 Water · 🪨 Earth · 🧊 Ice · 🌿 Nature = element tags.

## Big Monster version
1.5x size, small stat boost, star in the collection.

## Notes
- Shell is a new move rule (`shell` in `moves.json`). The shell stays closed until the next attack on it, then opens. If the snail is faster, it blocks the attack in the same turn; if it is slower, it blocks the next turn's attack. The computer doesn't use Shell again while the shell is already closed.
- A Burn it already has keeps ticking (Damp Moss means it can't get one anyway).
- Stats (size rule, 4x): HP 66, Attack 46, Defense 62, Speed 26 (tough but slow).
