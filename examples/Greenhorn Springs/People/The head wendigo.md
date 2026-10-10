---
type: npc
tags: [greenhorn-springs]
---
# The head wendigo
Nine feet tall on two legs, a deer skull for a head, glowing red eyes. The source of everything the party has fought tonight. Its death reverts everyone it ever turned, anywhere.

```statblock
name: "The head wendigo"
type: "Huge undead, chaotic evil"
cr: "6 (solo boss)"
ac: "15 (natural armor)"
hp: "130"
speed: "40 ft. (60 ft. on all fours, bonus action)"
stats: [20, 15, 18, 8, 14, 11]
saves: "Str +8, Con +7, Wis +5"
skillsaves: "Perception +5, Stealth +5, Survival +5"
damage_resistances: "cold"
damage_vulnerabilities: "fire"
condition_immunities: "frightened, exhaustion"
senses: "darkvision 120 ft., passive Perception 15"
traits:
  - name: "Legendary Resistance (1/Day)"
    desc: "If the head wendigo fails a saving throw, it can choose to succeed instead."
  - name: "Mimic Voice (Recharge 5–6)"
    desc: "Calls out in the voice of someone the target has lost. DC 13 Wisdom save or frightened until the end of its next turn, and must move as far as possible toward the voice."
actions:
  - name: "Multiattack"
    desc: "Two claw attacks and one bite attack."
  - name: "Claws"
    desc: "Melee Weapon Attack: +8 to hit, reach 10 ft. Hit: 2d6+5 slashing damage."
  - name: "Bite"
    desc: "Melee Weapon Attack: +8 to hit, reach 10 ft. Hit: 2d6+5 piercing damage, and the head wendigo gains temporary hit points equal to the damage dealt."
legendary_actions:
  - name: "Move"
    desc: "Moves up to half its speed without provoking opportunity attacks."
  - name: "Claw Attack"
    desc: "Makes one claw attack."
lair_actions:
  - "The waterfall's roar surges — disadvantage on hearing-based Perception checks until initiative count 20 next round."
  - "The stone underfoot goes slick — one creature within 30 ft. makes a DC 12 Dexterity save or falls prone."
  - "A sudden cold rolls through the chamber — one creature within 15 ft. takes 2d4 cold damage (DC 12 Constitution save negates)."
note: "Roughly CR 6 as a solo legendary boss against a 3-person level 5 party. Use Mimic Voice deliberately to create tactical drama."
```
