# Balance: proposed numbers

*Written 2026-11-21 (M1). Every number here is a **proposal for the parent to skim**, and the designer
can change any of them. The game reads them from `src/data/` (`monsters.json`, `moves.json`,
`rules.json`), so tuning is a data change, not a code change. Final tuning happens in M9 play-tests.
Numbers the designer already decided are marked "(designer)".*

## Move power
Each move's power word from `Move-List.md` maps to one number (`rules.json`, `powerTiers`):

| Power word | Number |
|---|---|
| Low | 30 |
| Low–Medium | 40 |
| Medium | 50 |
| Medium–High | 65 |
| High | 80 |
| None (status moves) | 0 |

Avatar's moves hit 30% harder (`bossMovePowerBonus`, from `Final-Boss.md`).

## Move effects
| Move | Number | Source |
|---|---|---|
| Burn | Burned for 2 turns | designer |
| Freeze | 25% chance to freeze for 1 turn | designer |
| Fetch | +20% attack, stacks 2 times | designer |
| Eat | Heals half the damage dealt | designer |
| Popsicle | Heals 25% | designer |
| Sleep | Heals **50%**, then skips the next turn | proposal |
| Protect the Queen | Heals the other team monsters **25%** | proposal |
| Slobber, Spit, Screech | The target's next attack does **30%** less damage | proposal |

## Base stats (proposal)
A simple rule, so it's easy to explain and tune:
- **Stat total:** first forms 200, evolved forms 280, Avatar 520.
- **Size:** bigger monsters get more HP and less speed; smaller ones the reverse. A monster twice
  Dumble's size gets an even split (a quarter of the total each). Each size step of 1× moves 3% of the
  total from speed to HP. Attack and Defense stay at a quarter each.
- **Quick** monsters always go first anyway, so they get no extra speed.
- Stats grow with level (formula in M2). Big Monsters get +10% (designer).

| Monster | Form | Size (× Dumble) | HP | Attack | Defense | Speed |
|---|---|---|---|---|---|---|
| Peggy | First form | 2 | 50 | 50 | 50 | 50 |
| Scout | Evolved | 4 | 87 | 70 | 70 | 53 |
| Bushtail | First form | 1 | 44 | 50 | 50 | 56 |
| Treetail | Evolved | 2 | 70 | 70 | 70 | 70 |
| Hootle | First form | 1.5 | 47 | 50 | 50 | 53 |
| Grandhoot | Evolved | 2.5 | 74 | 70 | 70 | 66 |
| Dumble | First form | 1 | 44 | 50 | 50 | 56 |
| Rom | Evolved | 2 | 70 | 70 | 70 | 70 |
| Sidesnap | First form | 1 | 44 | 50 | 50 | 56 |
| Boulderclaw | Evolved | 3 | 78 | 70 | 70 | 62 |
| Squawkle | First form | 2 | 50 | 50 | 50 | 50 |
| Pouchbeak | Evolved | 3 | 78 | 70 | 70 | 62 |
| Anti-Ant | First form | 2 | 50 | 50 | 50 | 50 |
| Queen Ant | Evolved | 2 | 70 | 70 | 70 | 70 |
| Stingtail | First form | 2 | 50 | 50 | 50 | 50 |
| Dunestinger | Evolved | 3 | 78 | 70 | 70 | 62 |
| Camelump | First form | 3 | 56 | 50 | 50 | 44 |
| Triplump | Evolved | 4 | 87 | 70 | 70 | 53 |
| Yeti | First form | 3 | 56 | 50 | 50 | 44 |
| Abominable Snowman | Evolved | 4.5 | 91 | 70 | 70 | 49 |
| Pengwiggle | First form | 1 | 44 | 50 | 50 | 56 |
| Emperwaddle | Evolved | 2.5 | 74 | 70 | 70 | 66 |
| Frostpaw | First form | 1.5 | 47 | 50 | 50 | 53 |
| Glacitail | Evolved | 2.5 | 74 | 70 | 70 | 66 |
| Blobbin | First form | 2.5 | 53 | 50 | 50 | 47 |
| Slimy | Evolved | 3 | 78 | 70 | 70 | 62 |
| Cinderscale | First form | 2 | 50 | 50 | 50 | 50 |
| Moltenmaw | Evolved | 3.5 | 83 | 70 | 70 | 57 |
| Ashflap | First form | 1 | 44 | 50 | 50 | 56 |
| Smokewing | Evolved | 2 | 70 | 70 | 70 | 70 |
| Avatar | Boss | 10 | 177 | 130 | 130 | 83 |

## Other numbers (`rules.json`)
| What | Number | Source |
|---|---|---|
| Start with | 100 cages, 100 Magic Gems | designer |
| Level cap | 100 | designer |
| Team size | 6 | designer |
| Magic Gems per win | wild 5–10, trainer 30 | Progression doc |
| Big Monster | 1 in 100, +10% stats, 1.5× size, catch chance ×0.8 | designer / agreed |
| Catch chance | 30% + 60% × missing HP, max 95%; runs after 3 failed throws | agreed (Round 58) |
| Prices | Cage 10, Potion 15 (heals 20 HP), Wake-Up Snack 30 (half HP), Map part 50, Teleport pin 100 | agreed / designer |
