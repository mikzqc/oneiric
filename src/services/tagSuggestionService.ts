/**
 * Tag Suggestion Service
 *
 * Provides intelligent, high-coverage tag suggestions for dream entries by:
 * 1. Analyzing the dream's narrative, title, scenes, and dream sign notes.
 * 2. Matching against a comprehensive dictionary of 140+ dream themes and 2,300+ keywords.
 * 3. Incorporating user's custom tags and historical dream tags.
 * 4. Running 100% locally with zero external network or AI dependencies.
 */

export interface TagRule {
  tag: string;
  category: 'action' | 'nature' | 'location' | 'character' | 'creature' | 'object' | 'consciousness' | 'theme';
  keywords: string[];
}

export interface TagSuggestion {
  tag: string;
  category?: string;
  matchCount: number;
  matchedKeywords: string[];
  isFromContent: boolean;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Curated, comprehensive dictionary of dream themes and their keyword triggers.
 * Covers 2348+ keywords across 152 themes for high-recall dream tag recommendations.
 */
export const DREAM_TAG_RULES: TagRule[] = [
  {
    "tag": "Flying",
    "category": "action",
    "keywords": [
      "fly",
      "flying",
      "flew",
      "flown",
      "flight",
      "levitate",
      "levitating",
      "levitation",
      "hover",
      "hovering",
      "hovered",
      "soar",
      "soaring",
      "soared",
      "airborne",
      "glid",
      "glide",
      "gliding",
      "glided",
      "wings",
      "take off",
      "took off",
      "in the air",
      "aloft",
      "skimming",
      "flapped",
      "flapping",
      "superman flight",
      "flying high",
      "launch into the air",
      "floating upward",
      "aerial"
    ]
  },
  {
    "tag": "Falling",
    "category": "action",
    "keywords": [
      "falling",
      "fell",
      "fallen",
      "plummet",
      "plummeting",
      "plummeted",
      "plunging",
      "plunged",
      "free fall",
      "freefall",
      "drop",
      "dropped",
      "dropping",
      "cliff edge",
      "vertigo",
      "abyss",
      "falling down",
      "tumbled",
      "tumbling",
      "toppled",
      "toppling",
      "tripped",
      "slipping",
      "lost my footing",
      "nosedive",
      "free falling"
    ]
  },
  {
    "tag": "Running",
    "category": "action",
    "keywords": [
      "running",
      "ran",
      "run",
      "sprint",
      "sprinting",
      "sprinted",
      "dash",
      "dashing",
      "flee",
      "fleeing",
      "fled",
      "hurrying",
      "jogging",
      "racing",
      "jogged",
      "sprinted away",
      "galloping",
      "darted",
      "bolted",
      "scrambled",
      "scrambling",
      "bounding",
      "stampede"
    ]
  },
  {
    "tag": "Being Chased",
    "category": "action",
    "keywords": [
      "chased",
      "chasing me",
      "pursued",
      "pursuing",
      "pursuit",
      "hunted",
      "stalked",
      "running away",
      "escaping",
      "escaping from",
      "follower",
      "on the run",
      "hound",
      "hounded",
      "tracked down",
      "running for my life",
      "tailing me",
      "in hot pursuit",
      "cornered",
      "closing in on me",
      "could hear footsteps behind"
    ]
  },
  {
    "tag": "Sleep Paralysis",
    "category": "action",
    "keywords": [
      "sleep paralysis",
      "paralyzed",
      "paralysis",
      "can't move",
      "couldn't move",
      "unable to move",
      "frozen in bed",
      "pinned down",
      "heavy limbs",
      "stuck in bed",
      "weight on my chest",
      "immobile",
      "cannot speak",
      "locked in",
      "sleep demon",
      "pressure on chest",
      "tried to scream but nothing came out",
      "lead limbs"
    ]
  },
  {
    "tag": "Swimming",
    "category": "action",
    "keywords": [
      "swimming",
      "swam",
      "swim",
      "swimmer",
      "floating in water",
      "treading water",
      "diving",
      "dove",
      "dived",
      "submerged",
      "underwater",
      "deep end",
      "doggy paddle",
      "breaststroke",
      "freestyle",
      "backstroke",
      "snorkeling",
      "scuba",
      "paddling",
      "wading",
      "waded"
    ]
  },
  {
    "tag": "Breathing Underwater",
    "category": "action",
    "keywords": [
      "breathe underwater",
      "breathing underwater",
      "breath underwater",
      "inhaled water",
      "water in lungs",
      "gills",
      "underwater breath",
      "breathed beneath the water",
      "could breathe under",
      "oxygen underwater"
    ]
  },
  {
    "tag": "Teleportation",
    "category": "action",
    "keywords": [
      "teleport",
      "teleported",
      "teleporting",
      "teleportation",
      "instant travel",
      "blinked away",
      "vanished and reappeared",
      "instantly appeared",
      "portal jump",
      "phase shifted",
      "dematerialized",
      "rematerialized",
      "teleported to",
      "warp"
    ]
  },
  {
    "tag": "Shapeshifting",
    "category": "action",
    "keywords": [
      "shapeshift",
      "shapeshifting",
      "shapeshifter",
      "transformed into",
      "turning into",
      "morph",
      "morphing",
      "morphed",
      "body change",
      "turned into an animal",
      "becoming a wolf",
      "became a bird",
      "transmuted",
      "altered form"
    ]
  },
  {
    "tag": "Teeth Falling Out",
    "category": "action",
    "keywords": [
      "teeth",
      "tooth",
      "teeth falling out",
      "tooth fell out",
      "crumbling teeth",
      "loose tooth",
      "loose teeth",
      "spitting out teeth",
      "broken teeth",
      "cracked tooth",
      "dentist",
      "gums bleeding",
      "molar fell out",
      "pulled my tooth",
      "shattered teeth"
    ]
  },
  {
    "tag": "Naked in Public",
    "category": "action",
    "keywords": [
      "naked",
      "nude",
      "undressed",
      "no clothes",
      "in my underwear",
      "forgot clothes",
      "half naked",
      "embarrassed without clothes",
      "public nudity",
      "barefoot in public",
      "caught with no pants",
      "forgot to wear pants",
      "unclothed",
      "exposed"
    ]
  },
  {
    "tag": "Lost & Wandering",
    "category": "action",
    "keywords": [
      "lost",
      "wandering",
      "cannot find my way",
      "can't find the way",
      "disoriented",
      "lost in the dark",
      "searching for exit",
      "no way out",
      "directionless",
      "wrong turn",
      "unfamiliar neighborhood",
      "lost in a building",
      "missing my way home",
      "where am i",
      "meandering",
      "aimlessly wandering",
      "lost my bearings"
    ]
  },
  {
    "tag": "Losing Voice",
    "category": "action",
    "keywords": [
      "lost my voice",
      "could not scream",
      "couldn't scream",
      "trying to yell",
      "silent scream",
      "no sound came out",
      "whisper only",
      "throat closed up",
      "mute",
      "unable to speak",
      "speechless",
      "choked up",
      "mouth moving but no sound"
    ]
  },
  {
    "tag": "Superpowers",
    "category": "action",
    "keywords": [
      "superpower",
      "superpowers",
      "telekinesis",
      "mind control",
      "energy blast",
      "laser eyes",
      "super strength",
      "invincible",
      "force field",
      "magic blast",
      "super speed",
      "pyrokinesis",
      "bending elements",
      "magic powers",
      "spells",
      "sorcery",
      "casting magic",
      "energy shield",
      "superhuman"
    ]
  },
  {
    "tag": "Climbing & Heights",
    "category": "action",
    "keywords": [
      "climbing",
      "climbed",
      "scaling",
      "scaled",
      "cliff climbing",
      "rock climbing",
      "ladder",
      "scaffolding",
      "rooftop edge",
      "steep incline",
      "summit",
      "ridge",
      "high altitude",
      "clambered",
      "hanging on",
      "gripping ledge",
      "precipice"
    ]
  },
  {
    "tag": "Hiding & Sneaking",
    "category": "action",
    "keywords": [
      "hiding",
      "hid",
      "hidden",
      "sneaking",
      "snuck",
      "stealth",
      "crouched",
      "under the bed",
      "inside the closet",
      "holding my breath",
      "trying not to be seen",
      "secretly watching",
      "tiptoeing",
      "tiptoed",
      "ducked behind",
      "camouflage",
      "concealed",
      "crawling"
    ]
  },
  {
    "tag": "Fighting & Brawling",
    "category": "action",
    "keywords": [
      "fight",
      "fighting",
      "fought",
      "punched",
      "punching",
      "kicked",
      "kicking",
      "slow punches",
      "weak punches",
      "underwater punch",
      "brawl",
      "sparring",
      "wrestling",
      "grappling",
      "defending myself",
      "blow",
      "strike",
      "struck",
      "knocked down",
      "self defense",
      "martial arts"
    ]
  },
  {
    "tag": "Driving & Vehicular",
    "category": "action",
    "keywords": [
      "driving",
      "drove",
      "steered",
      "steering",
      "behind the wheel",
      "brakes failed",
      "no brakes",
      "accelerator stuck",
      "gas pedal",
      "speeding",
      "lost control of car",
      "reversing",
      "highway driving",
      "backseat driving",
      "swerving",
      "drifted"
    ]
  },
  {
    "tag": "Singing & Music Playing",
    "category": "action",
    "keywords": [
      "singing",
      "sang",
      "sung",
      "vocalizing",
      "playing guitar",
      "playing piano",
      "playing drums",
      "melody",
      "humming",
      "performing music",
      "concert solo",
      "instrument",
      "harmonies",
      "choir singing",
      "rapping",
      "playing chords"
    ]
  },
  {
    "tag": "Dancing",
    "category": "action",
    "keywords": [
      "dancing",
      "danced",
      "waltz",
      "tango",
      "ballet",
      "breakdance",
      "twirling",
      "spinning on the floor",
      "ballroom",
      "dance party",
      "rhythm",
      "choreography",
      "swaying to music",
      "dance floor"
    ]
  },
  {
    "tag": "Ocean & Sea",
    "category": "nature",
    "keywords": [
      "ocean",
      "sea",
      "waves",
      "beach",
      "coast",
      "shore",
      "tide",
      "tsunami",
      "marine",
      "deep ocean",
      "coral reef",
      "seashore",
      "surf",
      "cresting wave",
      "coastal",
      "open water",
      "breakers",
      "sandy beach",
      "ocean floor",
      "pelagic",
      "high seas",
      "abyssal",
      "deep sea",
      "whirlpool",
      "maelstrom"
    ]
  },
  {
    "tag": "River & Water",
    "category": "nature",
    "keywords": [
      "river",
      "lake",
      "stream",
      "creek",
      "pond",
      "waterfall",
      "rapids",
      "spring",
      "flooding",
      "flood",
      "fountain",
      "canal",
      "estuary",
      "brook",
      "bayou",
      "marsh",
      "swamp",
      "bog",
      "water bank",
      "flowing water",
      "dam",
      "reservoir"
    ]
  },
  {
    "tag": "Storm & Rain",
    "category": "nature",
    "keywords": [
      "rain",
      "storm",
      "thunder",
      "lightning",
      "hurricane",
      "tornado",
      "tempest",
      "downpour",
      "cyclone",
      "thunderstorm",
      "monsoon",
      "gale",
      "hail",
      "hailstorm",
      "overcast",
      "dark clouds",
      "squall",
      "cloudburst",
      "flash of lightning",
      "thunderclap",
      "drizzle",
      "pouring rain"
    ]
  },
  {
    "tag": "Fire & Burning",
    "category": "nature",
    "keywords": [
      "fire",
      "flame",
      "flames",
      "burning",
      "burned",
      "burnt",
      "smoke",
      "wildfire",
      "blaze",
      "inferno",
      "embers",
      "ashes",
      "campfire",
      "fireball",
      "lava",
      "magma",
      "volcano",
      "erupting",
      "sparks",
      "smoldering",
      "charred",
      "combustion"
    ]
  },
  {
    "tag": "Snow & Winter",
    "category": "nature",
    "keywords": [
      "snow",
      "blizzard",
      "ice",
      "frozen",
      "winter",
      "frost",
      "snowing",
      "snowstorm",
      "glacier",
      "avalanche",
      "freezing",
      "icicle",
      "sleet",
      "snowy mountain",
      "snowdrift",
      "frozen lake",
      "subzero",
      "polar",
      "tundra",
      "chilly"
    ]
  },
  {
    "tag": "Forest & Woods",
    "category": "nature",
    "keywords": [
      "forest",
      "woods",
      "trees",
      "jungle",
      "rainforest",
      "pine forest",
      "woodland",
      "clearing",
      "canopy",
      "branches",
      "foliage",
      "grove",
      "thicket",
      "redwoods",
      "mossy",
      "timberland",
      "deep woods",
      "roots",
      "tree trunk",
      "evergreen"
    ]
  },
  {
    "tag": "Mountain & Cave",
    "category": "nature",
    "keywords": [
      "mountain",
      "mountains",
      "peak",
      "cave",
      "cavern",
      "cliff",
      "canyon",
      "ravine",
      "gorge",
      "underground cave",
      "stalactite",
      "stalagmite",
      "boulder",
      "rocks",
      "rocky",
      "crag",
      "plateau",
      "summit",
      "alpine",
      "pass"
    ]
  },
  {
    "tag": "Desert",
    "category": "nature",
    "keywords": [
      "desert",
      "sand",
      "dunes",
      "sandstorm",
      "sahara",
      "oasis",
      "arid",
      "barren",
      "mirage",
      "cactus",
      "scorching sun",
      "heatwave",
      "wasteland",
      "dusty",
      "sand dune",
      "dry cracked earth"
    ]
  },
  {
    "tag": "Island & Tropics",
    "category": "nature",
    "keywords": [
      "island",
      "tropical",
      "palm tree",
      "lagoon",
      "paradise",
      "atoll",
      "archipelago",
      "remote island",
      "deserted island",
      "coconut tree",
      "turquoise water",
      "bay"
    ]
  },
  {
    "tag": "Garden & Flora",
    "category": "nature",
    "keywords": [
      "garden",
      "flowers",
      "rose",
      "roses",
      "blooming",
      "botanical",
      "orchard",
      "greenhouse",
      "vines",
      "petals",
      "tulips",
      "sunflowers",
      "lilies",
      "wildflowers",
      "blossoms",
      "overgrown garden",
      "hedges",
      "lawn",
      "ivy",
      "meadow"
    ]
  },
  {
    "tag": "Sun & Sunlight",
    "category": "nature",
    "keywords": [
      "sun",
      "sunlight",
      "sunshine",
      "sunrise",
      "sunset",
      "golden hour",
      "dawn",
      "dusk",
      "solar",
      "blinding sun",
      "sunbeams",
      "twilight",
      "daybreak",
      "sundown"
    ]
  },
  {
    "tag": "Earthquake & Landslide",
    "category": "nature",
    "keywords": [
      "earthquake",
      "tremor",
      "ground shaking",
      "fissure",
      "landslide",
      "sinkhole",
      "aftershock",
      "cracking ground",
      "fault line",
      "ground collapsed",
      "mudslide"
    ]
  },
  {
    "tag": "Childhood Home",
    "category": "location",
    "keywords": [
      "childhood home",
      "childhood house",
      "childhood bedroom",
      "old house",
      "house I grew up in",
      "parents house",
      "parent's house",
      "family home",
      "old neighborhood",
      "backyard of my childhood",
      "hometown house"
    ]
  },
  {
    "tag": "School & Classroom",
    "category": "location",
    "keywords": [
      "school",
      "classroom",
      "hallway",
      "locker",
      "lockers",
      "principal",
      "teacher",
      "cafeteria",
      "high school",
      "elementary school",
      "middle school",
      "blackboard",
      "whiteboard",
      "desk",
      "gymnasium",
      "school bus",
      "recess",
      "auditorium",
      "homework",
      "chalkboard",
      "kindergarten"
    ]
  },
  {
    "tag": "University & Campus",
    "category": "location",
    "keywords": [
      "university",
      "college",
      "campus",
      "dorm",
      "dormitory",
      "lecture hall",
      "professor",
      "seminar",
      "student",
      "faculty",
      "quad",
      "campus grounds",
      "fraternity",
      "sorority",
      "grad student",
      "thesis",
      "bachelor",
      "curriculum"
    ]
  },
  {
    "tag": "Exam & Test",
    "category": "location",
    "keywords": [
      "exam",
      "test",
      "final exam",
      "pop quiz",
      "unprepared for test",
      "did not study",
      "testing room",
      "scantron",
      "cheating on test",
      "failed exam",
      "grading",
      "oral exam",
      "test anxiety",
      "forgot about the test",
      "blank exam sheet"
    ]
  },
  {
    "tag": "Hospital & Medical",
    "category": "location",
    "keywords": [
      "hospital",
      "doctor",
      "nurse",
      "emergency room",
      "er",
      "clinic",
      "surgery",
      "operating room",
      "patient",
      "ambulance",
      "stretcher",
      "iv drip",
      "medication",
      "bandages",
      "ward",
      "intensive care",
      "icu",
      "physician",
      "hospital bed"
    ]
  },
  {
    "tag": "Airport & Airplane",
    "category": "location",
    "keywords": [
      "airport",
      "airplane",
      "plane",
      "flight",
      "boarding",
      "terminal",
      "runway",
      "gate",
      "baggage claim",
      "passport",
      "luggage",
      "customs",
      "cockpit",
      "pilot",
      "flight attendant",
      "turbulence",
      "missed my flight",
      "aircraft"
    ]
  },
  {
    "tag": "Train & Subway",
    "category": "location",
    "keywords": [
      "train",
      "subway",
      "metro",
      "railway",
      "train station",
      "platform",
      "tracks",
      "locomotive",
      "carriage",
      "commuter train",
      "train car",
      "bullet train",
      "underground station",
      "tram",
      "trolley",
      "monorail"
    ]
  },
  {
    "tag": "Hotel & Lodging",
    "category": "location",
    "keywords": [
      "hotel",
      "motel",
      "resort",
      "hotel room",
      "lobby",
      "check in",
      "concierge",
      "inn",
      "hostel",
      "suite",
      "keycard",
      "bellhop",
      "room service",
      "penthouse"
    ]
  },
  {
    "tag": "Elevator & Escalator",
    "category": "location",
    "keywords": [
      "elevator",
      "lift",
      "escalator",
      "elevator falling",
      "stuck in elevator",
      "elevator shooting up",
      "wrong floor",
      "moving stairs",
      "elevator shaft",
      "glass elevator",
      "cables snapped",
      "plunging elevator",
      "elevator buttons"
    ]
  },
  {
    "tag": "Stairs & Hallways",
    "category": "location",
    "keywords": [
      "stairs",
      "staircase",
      "spiral staircase",
      "endless hallway",
      "corridor",
      "narrow hallway",
      "stairwell",
      "steps",
      "climbing stairs",
      "descending stairs",
      "hallway with many doors",
      "maze of corridors",
      "creaky stairs"
    ]
  },
  {
    "tag": "Maze & Labyrinth",
    "category": "location",
    "keywords": [
      "maze",
      "labyrinth",
      "hedgemaze",
      "dead end",
      "winding corridors",
      "twisting paths",
      "lost in a maze",
      "endless rooms",
      "puzzle room",
      "backrooms"
    ]
  },
  {
    "tag": "Basement & Underground",
    "category": "location",
    "keywords": [
      "basement",
      "cellar",
      "underground",
      "bunker",
      "dungeon",
      "crypt",
      "vault",
      "subterranean",
      "tunnel",
      "sewer",
      "dark cellar",
      "wine cellar",
      "catacombs",
      "underground facility",
      "bomb shelter",
      "underground tunnel"
    ]
  },
  {
    "tag": "Mansion & Castle",
    "category": "location",
    "keywords": [
      "mansion",
      "castle",
      "palace",
      "estate",
      "manor",
      "chateau",
      "fortress",
      "grand hall",
      "ballroom",
      "tower",
      "ramparts",
      "courtyard",
      "chandeliers",
      "throne room",
      "historic home",
      "citadel",
      "moat"
    ]
  },
  {
    "tag": "Cemetery & Graves",
    "category": "location",
    "keywords": [
      "cemetery",
      "graveyard",
      "grave",
      "tomb",
      "headstone",
      "tombstone",
      "burial",
      "mausoleum",
      "coffin",
      "gravesite",
      "crematorium",
      "casket",
      "crypts",
      "epitaph"
    ]
  },
  {
    "tag": "Bridge & Heights",
    "category": "location",
    "keywords": [
      "bridge",
      "suspension bridge",
      "rope bridge",
      "crossing the bridge",
      "bridge collapsing",
      "overpass",
      "viaduct",
      "footbridge",
      "precipice",
      "ledge",
      "overlook",
      "pier",
      "boardwalk"
    ]
  },
  {
    "tag": "City & Streets",
    "category": "location",
    "keywords": [
      "city",
      "streets",
      "downtown",
      "alley",
      "skyscraper",
      "sidewalk",
      "crosswalk",
      "traffic",
      "metropolis",
      "avenue",
      "boulevard",
      "neon signs",
      "intersection",
      "urban",
      "pedestrian",
      "block",
      "town square",
      "skyline"
    ]
  },
  {
    "tag": "Space & Planets",
    "category": "location",
    "keywords": [
      "space",
      "planet",
      "planets",
      "stars",
      "galaxy",
      "spaceship",
      "asteroid",
      "orbit",
      "outer space",
      "astronaut",
      "alien planet",
      "cosmos",
      "nebula",
      "black hole",
      "milky way",
      "zero gravity",
      "shuttle",
      "starlight",
      "interstellar"
    ]
  },
  {
    "tag": "Moon & Night",
    "category": "location",
    "keywords": [
      "moon",
      "full moon",
      "crescent moon",
      "moonlight",
      "midnight",
      "night sky",
      "darkness",
      "lunar",
      "blood moon",
      "eclipse",
      "nighttime",
      "pitch black"
    ]
  },
  {
    "tag": "Work & Office",
    "category": "location",
    "keywords": [
      "office",
      "cubicle",
      "boss",
      "coworker",
      "meeting",
      "conference room",
      "desk job",
      "workplace",
      "fired",
      "promoted",
      "boardroom",
      "office building",
      "corporate",
      "work shift",
      "breakroom",
      "manager",
      "water cooler",
      "deadline"
    ]
  },
  {
    "tag": "Store & Shopping Mall",
    "category": "location",
    "keywords": [
      "mall",
      "shopping mall",
      "store",
      "supermarket",
      "grocery store",
      "cashier",
      "shopping cart",
      "boutique",
      "department store",
      "aisle",
      "checkout counter",
      "convenience store",
      "clothing store",
      "buying items",
      "retail shop"
    ]
  },
  {
    "tag": "Restaurant & Cafe",
    "category": "location",
    "keywords": [
      "restaurant",
      "cafe",
      "coffee shop",
      "diner",
      "bistro",
      "bar",
      "pub",
      "waiter",
      "waitress",
      "menu",
      "dining table",
      "ordering food",
      "bartender",
      "buffet",
      "food court",
      "kitchen of restaurant",
      "bakery"
    ]
  },
  {
    "tag": "Bathroom & Shower",
    "category": "location",
    "keywords": [
      "bathroom",
      "restroom",
      "toilet",
      "shower",
      "bathtub",
      "sink",
      "public restroom",
      "no doors on stalls",
      "clogged toilet",
      "overflowing toilet",
      "dirty bathroom",
      "showering",
      "hot bath",
      "faucet",
      "soap",
      "towel"
    ]
  },
  {
    "tag": "Kitchen & Cooking",
    "category": "location",
    "keywords": [
      "kitchen",
      "cooking",
      "stove",
      "oven",
      "refrigerator",
      "fridge",
      "pantry",
      "baking",
      "chef",
      "cutting board",
      "pots and pans",
      "skillet",
      "recipe",
      "ingredients",
      "spices",
      "microwave",
      "sink faucet"
    ]
  },
  {
    "tag": "Amusement Park & Carnival",
    "category": "location",
    "keywords": [
      "amusement park",
      "roller coaster",
      "ferris wheel",
      "carnival",
      "fair",
      "theme park",
      "merry-go-round",
      "circus",
      "cotton candy",
      "funhouse",
      "carnival rides",
      "bumper cars",
      "boardwalk games"
    ]
  },
  {
    "tag": "Prison & Confinement",
    "category": "location",
    "keywords": [
      "prison",
      "jail",
      "cell",
      "bars",
      "inmate",
      "warden",
      "locked up",
      "imprisoned",
      "handcuffs",
      "jailbreak",
      "escape from prison",
      "guard",
      "solitary confinement",
      "cage",
      "iron bars"
    ]
  },
  {
    "tag": "Church & Sacred Places",
    "category": "location",
    "keywords": [
      "church",
      "temple",
      "cathedral",
      "altar",
      "shrine",
      "chapel",
      "monastery",
      "stained glass",
      "pew",
      "sanctuary",
      "priest",
      "monk",
      "pastor",
      "cross",
      "sacred temple",
      "holy site",
      "mosque",
      "synagogue",
      "zen garden"
    ]
  },
  {
    "tag": "Theater & Cinema",
    "category": "location",
    "keywords": [
      "theater",
      "cinema",
      "movie theater",
      "stage",
      "auditorium",
      "backstage",
      "red curtain",
      "audience",
      "seats",
      "projection room",
      "balcony seats",
      "silver screen",
      "applause",
      "performing on stage"
    ]
  },
  {
    "tag": "Library & Archives",
    "category": "location",
    "keywords": [
      "library",
      "bookshelf",
      "bookshelves",
      "archive",
      "ancient books",
      "librarian",
      "study hall",
      "scrolls",
      "tomes",
      "manuscripts",
      "quiet room",
      "dusty books",
      "stacks",
      "reading room"
    ]
  },
  {
    "tag": "Laboratory & Science",
    "category": "location",
    "keywords": [
      "laboratory",
      "lab",
      "scientist",
      "experiment",
      "beakers",
      "test tubes",
      "microscope",
      "chemicals",
      "research facility",
      "high tech lab",
      "bunker lab",
      "scientific equipment",
      "specimen"
    ]
  },
  {
    "tag": "Family",
    "category": "character",
    "keywords": [
      "mother",
      "mom",
      "father",
      "dad",
      "sister",
      "brother",
      "parents",
      "grandmother",
      "grandma",
      "grandfather",
      "grandpa",
      "cousin",
      "aunt",
      "uncle",
      "daughter",
      "son",
      "child",
      "children",
      "sibling",
      "family dinner",
      "relatives",
      "in-laws",
      "stepmother",
      "stepfather"
    ]
  },
  {
    "tag": "Deceased Loved One",
    "category": "character",
    "keywords": [
      "deceased",
      "dead relative",
      "passed away",
      "late father",
      "late mother",
      "late grandmother",
      "late grandfather",
      "visitation from dead",
      "ghost of family",
      "alive again",
      "back from dead",
      "hugged deceased",
      "seeing dead person"
    ]
  },
  {
    "tag": "Friends",
    "category": "character",
    "keywords": [
      "friend",
      "friends",
      "best friend",
      "old friend",
      "childhood friend",
      "classmate",
      "peer",
      "buddy",
      "pal",
      "circle of friends",
      "hanging out",
      "crew",
      "roommate"
    ]
  },
  {
    "tag": "Romance & Partner",
    "category": "character",
    "keywords": [
      "boyfriend",
      "girlfriend",
      "husband",
      "wife",
      "partner",
      "fiance",
      "crush",
      "kiss",
      "kissing",
      "hug",
      "cuddle",
      "romantic",
      "dating",
      "holding hands",
      "ex-boyfriend",
      "ex-girlfriend",
      "ex-partner",
      "lover",
      "intimacy",
      "wedding"
    ]
  },
  {
    "tag": "Strangers & Crowds",
    "category": "character",
    "keywords": [
      "stranger",
      "crowd",
      "crowds",
      "mob",
      "group of people",
      "nameless person",
      "faceless",
      "unfamiliar face",
      "gathering",
      "packed room",
      "onlookers",
      "passersby",
      "sea of people",
      "spectators"
    ]
  },
  {
    "tag": "Shadow Figure",
    "category": "character",
    "keywords": [
      "shadow",
      "shadowy",
      "shadow person",
      "shadow figure",
      "shadowy figure",
      "silhouette",
      "dark figure",
      "man in black",
      "hooded figure",
      "faceless man",
      "creeper",
      "lurking figure",
      "black shape",
      "dark silhouette",
      "hat man",
      "shadow entity"
    ]
  },
  {
    "tag": "Celebrities",
    "category": "character",
    "keywords": [
      "celebrity",
      "famous person",
      "actor",
      "actress",
      "singer",
      "musician",
      "president",
      "politician",
      "athlete",
      "movie star",
      "pop star",
      "author",
      "famous creator",
      "influencer"
    ]
  },
  {
    "tag": "Babies & Children",
    "category": "character",
    "keywords": [
      "baby",
      "babies",
      "infant",
      "toddler",
      "newborn",
      "carrying a baby",
      "crying baby",
      "stroller",
      "child playing",
      "orphan",
      "nursery",
      "cradle"
    ]
  },
  {
    "tag": "Monks & Spiritual Guides",
    "category": "character",
    "keywords": [
      "guide",
      "spirit guide",
      "monk",
      "guru",
      "wise old man",
      "wise old woman",
      "sage",
      "oracle",
      "mentor",
      "spiritual teacher",
      "priestess",
      "elder"
    ]
  },
  {
    "tag": "Police & Military",
    "category": "character",
    "keywords": [
      "police",
      "cops",
      "officer",
      "detective",
      "military",
      "soldier",
      "soldiers",
      "army",
      "commander",
      "security guard",
      "siren",
      "arrest",
      "swat team",
      "handcuffing",
      "uniformed officer",
      "patrol"
    ]
  },
  {
    "tag": "Animals & Pets",
    "category": "creature",
    "keywords": [
      "dog",
      "puppy",
      "cat",
      "kitten",
      "pet",
      "animal",
      "horse",
      "bear",
      "wolf",
      "deer",
      "rabbit",
      "bunny",
      "fox",
      "lion",
      "tiger",
      "elephant",
      "monkey",
      "gorilla",
      "wild animal",
      "furry",
      "paws",
      "petting"
    ]
  },
  {
    "tag": "Dogs & Canines",
    "category": "creature",
    "keywords": [
      "dog",
      "dogs",
      "puppy",
      "hound",
      "barking dog",
      "canine",
      "golden retriever",
      "german shepherd",
      "stray dog",
      "dog biting",
      "friendly dog",
      "growling dog",
      "pack of wolves",
      "howling",
      "mastiff"
    ]
  },
  {
    "tag": "Cats & Felines",
    "category": "creature",
    "keywords": [
      "cat",
      "cats",
      "kitten",
      "kittens",
      "black cat",
      "feline",
      "purring",
      "meowing",
      "claws",
      "calico",
      "panther",
      "leopard",
      "cheetah",
      "lynx"
    ]
  },
  {
    "tag": "Birds & Avian",
    "category": "creature",
    "keywords": [
      "bird",
      "birds",
      "eagle",
      "hawk",
      "crow",
      "raven",
      "owl",
      "seagull",
      "sparrow",
      "pigeon",
      "feather",
      "feathers",
      "flock of birds",
      "nest",
      "beak",
      "parrot",
      "falcon",
      "swan",
      "phoenix",
      "hummingbird"
    ]
  },
  {
    "tag": "Sea Creatures & Sharks",
    "category": "creature",
    "keywords": [
      "shark",
      "whale",
      "dolphin",
      "octopus",
      "squid",
      "jellyfish",
      "fish",
      "crab",
      "lobster",
      "sea turtle",
      "manta ray",
      "eel",
      "stingray",
      "shark fin",
      "underwater creature",
      "coral fish",
      "clownfish"
    ]
  },
  {
    "tag": "Insects & Reptiles",
    "category": "creature",
    "keywords": [
      "snake",
      "spider",
      "cobweb",
      "spiderweb",
      "scorpion",
      "lizard",
      "crocodile",
      "alligator",
      "frog",
      "toad",
      "bug",
      "bugs",
      "insect",
      "beetle",
      "wasp",
      "bee",
      "cockroach",
      "ants",
      "swarm",
      "crawling on skin",
      "centipede",
      "moth",
      "butterfly",
      "dragonfly",
      "bitten by snake"
    ]
  },
  {
    "tag": "Monsters & Beasts",
    "category": "creature",
    "keywords": [
      "monster",
      "creature",
      "beast",
      "demon",
      "dragon",
      "giant",
      "mutant",
      "abomination",
      "claws",
      "fangs",
      "tentacles",
      "grotesque",
      "roaring",
      "mythical beast",
      "chupacabra",
      "hydra",
      "behemoth"
    ]
  },
  {
    "tag": "Ghosts & Spirits",
    "category": "creature",
    "keywords": [
      "ghost",
      "spirit",
      "apparition",
      "haunted",
      "haunting",
      "poltergeist",
      "phantom",
      "specter",
      "wraith",
      "entity",
      "supernatural entity",
      "haunted house",
      "eerie presence",
      "cold spot"
    ]
  },
  {
    "tag": "Zombies & Apocalypse",
    "category": "creature",
    "keywords": [
      "zombie",
      "zombies",
      "undead",
      "walking dead",
      "apocalypse",
      "infected",
      "horde",
      "outbreak",
      "survival",
      "end of the world",
      "wastelanders",
      "cannibals",
      "post-apocalyptic",
      "quarantine zone"
    ]
  },
  {
    "tag": "Aliens & UFO",
    "category": "creature",
    "keywords": [
      "alien",
      "aliens",
      "ufo",
      "extraterrestrial",
      "flying saucer",
      "abduction",
      "abducted",
      "crop circle",
      "mothership",
      "martian",
      "beam of light",
      "spaceship landing",
      "grey alien",
      "intergalactic"
    ]
  },
  {
    "tag": "Phone & Screens",
    "category": "object",
    "keywords": [
      "phone",
      "smartphone",
      "iphone",
      "texting",
      "call",
      "calling",
      "screen",
      "tablet",
      "unable to dial",
      "wrong number",
      "cracked screen",
      "battery dead",
      "dialing 911",
      "dial 911",
      "message",
      "notification",
      "app",
      "voicemail"
    ]
  },
  {
    "tag": "Computers & Gaming",
    "category": "object",
    "keywords": [
      "computer",
      "laptop",
      "video game",
      "videogame",
      "keyboard",
      "mouse",
      "glitch",
      "simulation",
      "virtual reality",
      "vr",
      "software",
      "coding",
      "console",
      "controller",
      "pixelated",
      "hud",
      "gaming",
      "arcade"
    ]
  },
  {
    "tag": "Mirrors & Reflections",
    "category": "object",
    "keywords": [
      "mirror",
      "reflection",
      "looking in the mirror",
      "distorted face",
      "strange reflection",
      "shattered mirror",
      "two reflections",
      "wrong eyes in mirror",
      "glass reflection",
      "silver mirror",
      "looking glass"
    ]
  },
  {
    "tag": "Clocks & Time",
    "category": "object",
    "keywords": [
      "clock",
      "watch",
      "wristwatch",
      "alarm",
      "timer",
      "hourglass",
      "spinning hands",
      "numbers changing",
      "digital clock",
      "late",
      "running out of time",
      "countdown",
      "ticking",
      "what time is it",
      "grandfather clock",
      "sundial"
    ]
  },
  {
    "tag": "Car & Vehicles",
    "category": "object",
    "keywords": [
      "car",
      "truck",
      "bus",
      "vehicle",
      "motorcycle",
      "bike",
      "bicycle",
      "van",
      "sedan",
      "convertible",
      "scooter",
      "cab",
      "taxi",
      "jeep",
      "pickup truck",
      "police car",
      "sports car",
      "dashboard"
    ]
  },
  {
    "tag": "Car Crash & Malfunction",
    "category": "object",
    "keywords": [
      "car crash",
      "crash",
      "collision",
      "airbag",
      "flipped over",
      "skidding",
      "swerve",
      "head-on",
      "wreck",
      "totaled car",
      "windshield broke",
      "engine smoking",
      "flat tire",
      "fender bender",
      "crash into water"
    ]
  },
  {
    "tag": "Boats & Watercraft",
    "category": "object",
    "keywords": [
      "boat",
      "ship",
      "sailboat",
      "yacht",
      "ferry",
      "cruise ship",
      "canoe",
      "kayak",
      "raft",
      "rowboat",
      "vessel",
      "sinking ship",
      "deck of ship",
      "captain",
      "anchor",
      "mast",
      "cabin of boat"
    ]
  },
  {
    "tag": "Keys & Locks",
    "category": "object",
    "keywords": [
      "key",
      "keys",
      "lock",
      "padlock",
      "locked",
      "unlocking",
      "wrong key",
      "keyhole",
      "keychain",
      "lost my keys",
      "latch",
      "deadbolt",
      "key ring"
    ]
  },
  {
    "tag": "Secret Doors & Passages",
    "category": "object",
    "keywords": [
      "secret door",
      "hidden room",
      "secret passage",
      "portal",
      "hidden door",
      "trapdoor",
      "false wall",
      "gateway",
      "doorway",
      "passageway",
      "revolving bookcase",
      "sliding panel",
      "secret tunnel"
    ]
  },
  {
    "tag": "Books & Documents",
    "category": "object",
    "keywords": [
      "book",
      "books",
      "pages",
      "reading",
      "letters",
      "words shifting",
      "diary",
      "notebook",
      "journal",
      "paper",
      "scroll",
      "ancient text",
      "parchment",
      "spelling changed",
      "symbols in book",
      "manuscript",
      "binder"
    ]
  },
  {
    "tag": "Weapons & Combat",
    "category": "object",
    "keywords": [
      "gun",
      "guns",
      "pistol",
      "rifle",
      "sword",
      "blade",
      "knife",
      "dagger",
      "shooting",
      "shot",
      "bullets",
      "bow and arrow",
      "shield",
      "armor",
      "holster",
      "grenade",
      "firing weapon",
      "reload",
      "ammunition"
    ]
  },
  {
    "tag": "Money & Wealth",
    "category": "object",
    "keywords": [
      "money",
      "cash",
      "coins",
      "dollar bills",
      "wallet",
      "gold",
      "silver",
      "treasure",
      "rich",
      "wealth",
      "bank",
      "atm",
      "credit card",
      "lottery",
      "millionaire",
      "valuables",
      "fortune",
      "purse",
      "bills"
    ]
  },
  {
    "tag": "Food & Dining",
    "category": "object",
    "keywords": [
      "food",
      "eating",
      "ate",
      "feast",
      "meal",
      "dinner",
      "lunch",
      "breakfast",
      "snack",
      "cake",
      "bread",
      "fruit",
      "meat",
      "drinking",
      "beverage",
      "delicious",
      "tasting food",
      "starving",
      "banquet",
      "pizza",
      "dessert"
    ]
  },
  {
    "tag": "Clothes & Attire",
    "category": "object",
    "keywords": [
      "clothes",
      "clothing",
      "wearing",
      "dress",
      "suit",
      "jacket",
      "coat",
      "shoes",
      "boots",
      "sneakers",
      "hat",
      "costume",
      "disguise",
      "mask",
      "uniform",
      "robe",
      "cape",
      "gloves",
      "jewelry",
      "necklace",
      "ring"
    ]
  },
  {
    "tag": "Cameras & Photography",
    "category": "object",
    "keywords": [
      "camera",
      "photograph",
      "photo",
      "taking photos",
      "picture",
      "filming",
      "recording",
      "lens",
      "flash",
      "shutter",
      "polaroid",
      "video recording",
      "snapshots",
      "candid picture",
      "selfie"
    ]
  },
  {
    "tag": "Lucid Dream",
    "category": "consciousness",
    "keywords": [
      "lucid",
      "lucidity",
      "realized i was dreaming",
      "knew i was dreaming",
      "became conscious",
      "conscious in the dream",
      "dream control",
      "woke up inside the dream",
      "awareness in dream",
      "lucid state",
      "control the dream",
      "controlling the dream"
    ]
  },
  {
    "tag": "Reality Check",
    "category": "consciousness",
    "keywords": [
      "reality check",
      "looked at my hands",
      "finger through palm",
      "pinched my nose",
      "nose pinch",
      "counting fingers",
      "extra fingers",
      "checked the clock",
      "read text twice",
      "light switch",
      "flicked the switch"
    ]
  },
  {
    "tag": "False Awakening",
    "category": "consciousness",
    "keywords": [
      "false awakening",
      "thought i woke up",
      "woke up again",
      "woke up in bed",
      "morning routine in dream",
      "still dreaming",
      "waking loop",
      "dream loop",
      "false start",
      "dream within",
      "woke up but still asleep"
    ]
  },
  {
    "tag": "Nightmare",
    "category": "consciousness",
    "keywords": [
      "nightmare",
      "terrified",
      "horror",
      "dread",
      "terror",
      "scared",
      "screaming",
      "panic",
      "panicked",
      "frightened",
      "creepy",
      "unsettling",
      "grim",
      "chilling",
      "petrified",
      "shivering in fear",
      "disturbing",
      "macabre",
      "grotesque"
    ]
  },
  {
    "tag": "Dream within Dream",
    "category": "consciousness",
    "keywords": [
      "dream within a dream",
      "nested dream",
      "fell asleep in the dream",
      "inception",
      "woke into another dream",
      "multiple levels of dreaming",
      "inner dream"
    ]
  },
  {
    "tag": "Time Travel & Loops",
    "category": "consciousness",
    "keywords": [
      "time travel",
      "time loop",
      "rewind",
      "repeating day",
      "groundhog day",
      "past era",
      "the future",
      "timeline",
      "reliving the moment",
      "time warp",
      "historical period",
      "future world",
      "century ago",
      "temporal"
    ]
  },
  {
    "tag": "Deja Vu & Premonition",
    "category": "consciousness",
    "keywords": [
      "deja vu",
      "premonition",
      "prophetic",
      "felt familiar",
      "foreseeing",
      "already happened",
      "clairvoyant",
      "precognitive",
      "sixth sense",
      "foreshadowing"
    ]
  },
  {
    "tag": "Astral & Out of Body",
    "category": "consciousness",
    "keywords": [
      "out of body",
      "astral",
      "astral projection",
      "floating above my body",
      "looking down at myself",
      "silver cord",
      "ethereal body",
      "separated from body",
      "vibrational stage",
      "vibrations",
      "body buzzing"
    ]
  },
  {
    "tag": "Floating & Zero Gravity",
    "category": "consciousness",
    "keywords": [
      "floating",
      "weightless",
      "zero gravity",
      "drifting in air",
      "weightlessness",
      "hovering effortlessly",
      "gentle drift",
      "bobbing in air",
      "anti-gravity"
    ]
  },
  {
    "tag": "Surreal & Bizarre",
    "category": "theme",
    "keywords": [
      "surreal",
      "bizarre",
      "nonsensical",
      "physics broke",
      "impossible architecture",
      "gravity shifted",
      "weird",
      "strange logic",
      "dream logic",
      "hallucinatory",
      "psychedelic",
      "trippy",
      "kaleidoscope",
      "melting",
      "warped"
    ]
  },
  {
    "tag": "Adventure & Quest",
    "category": "theme",
    "keywords": [
      "adventure",
      "quest",
      "journey",
      "mission",
      "exploration",
      "treasure hunt",
      "traveling",
      "expedition",
      "riddle",
      "artifact",
      "destination",
      "hero",
      "perilous",
      "voyage",
      "odyssey",
      "cross country"
    ]
  },
  {
    "tag": "Peaceful & Serene",
    "category": "theme",
    "keywords": [
      "peaceful",
      "serene",
      "calm",
      "relaxing",
      "tranquil",
      "blissful",
      "content",
      "gentle",
      "warmth",
      "soothing",
      "comforting",
      "quiet beauty",
      "harmony",
      "zen",
      "rejuvenating",
      "stillness"
    ]
  },
  {
    "tag": "Mystery & Investigation",
    "category": "theme",
    "keywords": [
      "mystery",
      "investigation",
      "clues",
      "detective",
      "solving a mystery",
      "puzzle",
      "uncovering a secret",
      "conspiracy",
      "clue",
      "sleuthing",
      "footprints",
      "suspicious",
      "hidden truth",
      "interrogation"
    ]
  },
  {
    "tag": "Dying & Death",
    "category": "theme",
    "keywords": [
      "dying",
      "died",
      "death",
      "killed",
      "fatal",
      "perished",
      "dead body",
      "corpse",
      "near death",
      "passed on",
      "afterlife",
      "reincarnation",
      "ghostly realm",
      "underworld",
      "crossing over"
    ]
  },
  {
    "tag": "Late & Unprepared",
    "category": "theme",
    "keywords": [
      "late for school",
      "late for work",
      "missed the bus",
      "overslept",
      "running late",
      "scrambling",
      "behind schedule",
      "forgot my assignment",
      "forgot my pants",
      "unprepared",
      "clocks moving too fast",
      "missed deadline"
    ]
  },
  {
    "tag": "War & Battle",
    "category": "theme",
    "keywords": [
      "war",
      "battle",
      "battlefield",
      "bombs",
      "bombing",
      "explosions",
      "airstrike",
      "trenches",
      "warzone",
      "invading",
      "artillery",
      "combat zone",
      "tactical",
      "skirmish",
      "armored vehicle",
      "barricade",
      "warriors"
    ]
  },
  {
    "tag": "Magic & Sorcery",
    "category": "theme",
    "keywords": [
      "magic",
      "wizard",
      "witch",
      "spell",
      "casting a spell",
      "incantation",
      "sorcerer",
      "sorcery",
      "potion",
      "wand",
      "cauldron",
      "enchantment",
      "magical powers",
      "alchemy",
      "curse",
      "grimoire"
    ]
  },
  {
    "tag": "Healing & Recovery",
    "category": "theme",
    "keywords": [
      "healing",
      "healed",
      "cure",
      "medicine",
      "recovery",
      "regenerating",
      "feeling better",
      "revived",
      "treatment",
      "mending",
      "wellness",
      "salve"
    ]
  },
  {
    "tag": "Celebration & Party",
    "category": "theme",
    "keywords": [
      "party",
      "celebration",
      "birthday",
      "festivities",
      "confetti",
      "gathering",
      "festival",
      "balloons",
      "champagne",
      "cheering",
      "toast",
      "banquet",
      "carnival party",
      "dancing together"
    ]
  },
  {
    "tag": "Pregnancy & Birth",
    "category": "theme",
    "keywords": [
      "pregnant",
      "pregnancy",
      "giving birth",
      "baby bump",
      "labor",
      "ultrasound",
      "maternity",
      "expecting a child",
      "delivered a baby",
      "contractions"
    ]
  },
  {
    "tag": "Wedding & Marriage",
    "category": "theme",
    "keywords": [
      "wedding",
      "wedding dress",
      "groom",
      "bride",
      "aisle",
      "wedding ceremony",
      "marriage",
      "vows",
      "altar",
      "wedding cake",
      "bridesmaid",
      "wedding rings"
    ]
  },
  {
    "tag": "Betrayal & Secrets",
    "category": "theme",
    "keywords": [
      "betrayal",
      "betrayed",
      "traitor",
      "stabbed in the back",
      "secret",
      "conspiracy",
      "cheating partner",
      "lying",
      "deception",
      "hidden agenda",
      "whispering",
      "revealed truth"
    ]
  },
  {
    "tag": "Invisibility & Stealth",
    "category": "theme",
    "keywords": [
      "invisible",
      "invisibility",
      "unseen",
      "cloaking",
      "nobody could see me",
      "vanished",
      "ghostly form",
      "transparent body",
      "stealth mode"
    ]
  },
  {
    "tag": "Giant & Miniature",
    "category": "theme",
    "keywords": [
      "giant",
      "huge",
      "colossal",
      "massive creature",
      "miniature",
      "tiny",
      "shrunk",
      "shrunken",
      "dollhouse",
      "microscopic",
      "towering over me",
      "enormous building",
      "gargantuan"
    ]
  },
  {
    "tag": "Colors & Vibrance",
    "category": "theme",
    "keywords": [
      "vivid colors",
      "black and white",
      "monochrome",
      "glowing neon",
      "golden light",
      "crimson",
      "emerald green",
      "violet",
      "iridescent",
      "prismatic",
      "sepia",
      "saturated",
      "ultraviolet"
    ]
  },
  {
    "tag": "Pain & Physical Sensation",
    "category": "action",
    "keywords": [
      "pain",
      "felt pain",
      "stinging",
      "numb",
      "numbness",
      "burning sensation",
      "aching",
      "headache",
      "throbbing",
      "physical pain",
      "electric shock",
      "tingling",
      "cold chill",
      "heat wave",
      "dizzy",
      "dizziness",
      "fainting",
      "passed out",
      "bleeding",
      "wounded",
      "bruised",
      "cuts and scrapes",
      "scratched"
    ]
  },
  {
    "tag": "Smell & Taste",
    "category": "action",
    "keywords": [
      "smell",
      "smelled",
      "scent",
      "fragrance",
      "aroma",
      "foul odor",
      "stench",
      "taste",
      "tasted",
      "sweet taste",
      "bitter",
      "sour",
      "metallic taste",
      "flavor",
      "tasting food",
      "pungent",
      "perfume"
    ]
  },
  {
    "tag": "Sounds & Acoustic",
    "category": "action",
    "keywords": [
      "whisper",
      "whispering",
      "screaming",
      "shouting",
      "loud bang",
      "explosion sound",
      "ringing in ears",
      "chimes",
      "eerie music",
      "footsteps echoing",
      "growl",
      "howl",
      "knocking on door",
      "sirens wailing",
      "static noise",
      "humming sound",
      "applause",
      "cacophony",
      "thunderous"
    ]
  },
  {
    "tag": "Sight & Darkness",
    "category": "action",
    "keywords": [
      "blind",
      "blinded",
      "cannot see",
      "couldn't see",
      "pitch black",
      "dim light",
      "blurry vision",
      "tunnel vision",
      "blinding flash",
      "glowing eyes",
      "foggy",
      "misty",
      "mirage",
      "double vision",
      "seeing colors",
      "glowing in dark"
    ]
  },
  {
    "tag": "Sky & Weather Phenomena",
    "category": "nature",
    "keywords": [
      "aurora borealis",
      "northern lights",
      "rainbow",
      "shooting star",
      "comet",
      "meteor shower",
      "solar flare",
      "dense fog",
      "thick mist",
      "heavy haze",
      "blood sky",
      "purple sky",
      "two suns",
      "red moon",
      "whirlwind",
      "dust devil",
      "gale force wind",
      "cloudscape",
      "cumulus"
    ]
  },
  {
    "tag": "Canyon & Cliffs",
    "category": "nature",
    "keywords": [
      "canyon",
      "grand canyon",
      "ravine",
      "gorge",
      "chasm",
      "precipice",
      "crag",
      "cliffside",
      "red rocks",
      "plateau",
      "butte",
      "steep drop",
      "edge of the cliff",
      "abyss below"
    ]
  },
  {
    "tag": "Jungle & Rainforest",
    "category": "nature",
    "keywords": [
      "jungle",
      "rainforest",
      "thick canopy",
      "vines hanging",
      "exotic plants",
      "dense undergrowth",
      "tropical birds",
      "bamboo forest",
      "jungle ruins",
      "humid air",
      "machete",
      "jungle river"
    ]
  },
  {
    "tag": "Gym & Sports Arena",
    "category": "location",
    "keywords": [
      "gym",
      "gymnasium",
      "stadium",
      "sports arena",
      "basketball court",
      "soccer field",
      "football field",
      "track and field",
      "locker room",
      "bleachers",
      "weights",
      "treadmill",
      "playing a match",
      "tournament",
      "referee",
      "scorekeeper"
    ]
  },
  {
    "tag": "Museum & Art Gallery",
    "category": "location",
    "keywords": [
      "museum",
      "art gallery",
      "exhibit",
      "sculpture",
      "paintings",
      "artifacts",
      "dinosaur bones",
      "fossil",
      "curator",
      "display case",
      "ancient relics",
      "statues",
      "gallery hall"
    ]
  },
  {
    "tag": "Subway & Underground Transit",
    "category": "location",
    "keywords": [
      "subway platform",
      "subway car",
      "metro train",
      "turnstile",
      "underground track",
      "metro station",
      "subway map",
      "missed the train",
      "stuck in subway",
      "rattling train",
      "commute"
    ]
  },
  {
    "tag": "Bridges & Crossings",
    "category": "location",
    "keywords": [
      "wooden bridge",
      "stone bridge",
      "drawbridge",
      "aqueduct",
      "over water bridge",
      "bridge swinging",
      "crossing a river",
      "narrow bridge",
      "bridge snapped"
    ]
  },
  {
    "tag": "Airport Terminal & Planes",
    "category": "location",
    "keywords": [
      "boarding gate",
      "security checkpoint",
      "metal detector",
      "lost passport",
      "conveyor belt",
      "tarmac",
      "plane engine",
      "emergency landing",
      "plane crashed",
      "plane descending",
      "overhead compartment"
    ]
  },
  {
    "tag": "Roads & Highways",
    "category": "location",
    "keywords": [
      "highway",
      "freeway",
      "empty highway",
      "crossroads",
      "roundabout",
      "dirt road",
      "winding road",
      "mountain road",
      "intersection",
      "traffic jam",
      "broken down on road",
      "road trip"
    ]
  },
  {
    "tag": "Jewelry & Valuables",
    "category": "object",
    "keywords": [
      "necklace",
      "gemstone",
      "diamond",
      "ruby",
      "emerald",
      "sapphire",
      "gold ring",
      "pendant",
      "bracelet",
      "earrings",
      "crown",
      "tiara",
      "pearls",
      "crystal",
      "crystals",
      "jeweled box"
    ]
  },
  {
    "tag": "Boxes & Containers",
    "category": "object",
    "keywords": [
      "chest",
      "treasure chest",
      "wooden crate",
      "locked box",
      "cardboard box",
      "container",
      "urn",
      "jar",
      "trunk",
      "capsule",
      "package",
      "mystery box",
      "unwrapping",
      "parcel"
    ]
  },
  {
    "tag": "Weapons & Firearms",
    "category": "object",
    "keywords": [
      "shotgun",
      "sniper",
      "revolver",
      "ammo",
      "magazine",
      "katana",
      "broadsword",
      "machete",
      "spear",
      "javelin",
      "crossbow",
      "arrows",
      "grenades",
      "explosive",
      "bulletproof vest"
    ]
  },
  {
    "tag": "Bicycles & Motorcycles",
    "category": "object",
    "keywords": [
      "bicycle",
      "bike ride",
      "cycling",
      "motorcycle",
      "motorbike",
      "scooter",
      "moped",
      "helmet",
      "pedaling",
      "bike chain",
      "handlebars",
      "bmx"
    ]
  },
  {
    "tag": "Musical Instruments",
    "category": "object",
    "keywords": [
      "guitar",
      "acoustic guitar",
      "electric guitar",
      "piano keys",
      "grand piano",
      "drums",
      "drum kit",
      "violin",
      "cello",
      "flute",
      "trumpet",
      "saxophone",
      "synthesizer",
      "bass guitar",
      "harp"
    ]
  },
  {
    "tag": "Teachers & Mentors",
    "category": "character",
    "keywords": [
      "teacher",
      "tutor",
      "instructor",
      "headmaster",
      "mentor",
      "coach",
      "sensei",
      "master",
      "advisor",
      "trainer",
      "drill sergeant",
      "lecturer"
    ]
  },
  {
    "tag": "Royalty & Leaders",
    "category": "character",
    "keywords": [
      "king",
      "queen",
      "prince",
      "princess",
      "emperor",
      "empress",
      "monarch",
      "ruler",
      "lord",
      "noble",
      "knight",
      "knights in armor",
      "prime minister"
    ]
  },
  {
    "tag": "Criminals & Thieves",
    "category": "character",
    "keywords": [
      "thief",
      "robber",
      "burglar",
      "gang",
      "gangsters",
      "mobsters",
      "bandit",
      "outlaw",
      "smuggler",
      "assassin",
      "hitman",
      "kidnapper",
      "hostage"
    ]
  },
  {
    "tag": "Horses & Equine",
    "category": "creature",
    "keywords": [
      "horse",
      "horses",
      "stallion",
      "mare",
      "riding a horse",
      "gallop",
      "trot",
      "saddle",
      "pegasus",
      "unicorn",
      "pony",
      "stable",
      "reins"
    ]
  },
  {
    "tag": "Reptiles & Amphibians",
    "category": "creature",
    "keywords": [
      "lizard",
      "gecko",
      "iguana",
      "chameleon",
      "komodo dragon",
      "tortoise",
      "turtle",
      "salamander",
      "tadpole",
      "serpent",
      "constrictor",
      "viper"
    ]
  },
  {
    "tag": "Rodents & Small Mammals",
    "category": "creature",
    "keywords": [
      "rat",
      "rats",
      "mouse",
      "mice",
      "squirrel",
      "chipmunk",
      "hamster",
      "guinea pig",
      "ferret",
      "raccoon",
      "possum",
      "hedgehog",
      "badger",
      "beaver"
    ]
  },
  {
    "tag": "Loss & Grief",
    "category": "theme",
    "keywords": [
      "grief",
      "mourning",
      "sorrow",
      "crying",
      "weeping",
      "tears",
      "heartbroken",
      "sadness",
      "lost forever",
      "funeral ceremony",
      "condolences",
      "eulogy",
      "bereavement",
      "deep loss"
    ]
  },
  {
    "tag": "Guilt & Shame",
    "category": "theme",
    "keywords": [
      "guilt",
      "guilty",
      "ashamed",
      "shame",
      "remorse",
      "regret",
      "caught doing something bad",
      "blamed",
      "confessing",
      "apologizing",
      "disgraced",
      "humiliated"
    ]
  },
  {
    "tag": "Telepathy & Mind Reading",
    "category": "theme",
    "keywords": [
      "telepathy",
      "telepathic",
      "reading minds",
      "mind reading",
      "thought transfer",
      "hearing thoughts",
      "psychic connection",
      "mental communication",
      "shared mind"
    ]
  },
  {
    "tag": "Transformation & Metamorphosis",
    "category": "theme",
    "keywords": [
      "transformation",
      "metamorphosis",
      "cocoon",
      "shedding skin",
      "evolving",
      "mutating",
      "changing into another person",
      "changing into an object",
      "transfigured"
    ]
  },
  {
    "tag": "Competition & Sports",
    "category": "theme",
    "keywords": [
      "tournament",
      "match",
      "game",
      "championship",
      "race",
      "scoreboard",
      "winning",
      "losing",
      "trophy",
      "medal",
      "competing",
      "opponent",
      "rival"
    ]
  },
  {
    "tag": "Wealth & Luxury",
    "category": "theme",
    "keywords": [
      "luxury",
      "limousine",
      "private jet",
      "luxurious",
      "extravagant",
      "diamonds",
      "silk sheets",
      "champagne lifestyle",
      "golden",
      "mansions",
      "first class"
    ]
  },
  {
    "tag": "Poverty & Scarcity",
    "category": "theme",
    "keywords": [
      "homeless",
      "begging",
      "destitute",
      "no money",
      "starving",
      "empty pockets",
      "shantytown",
      "slums",
      "scavenging",
      "worn out shoes",
      "ragged clothes"
    ]
  }
];

export interface ExtractSuggestionsOptions {
  title?: string;
  narrative?: string;
  notes?: string;
  scenes?: string[];
  existingTags?: string[];
  userDistinctTags?: string[];
  limit?: number;
}

export interface SuggestionResult {
  detectedSuggestions: TagSuggestion[];
  generalSuggestions: string[];
}

/**
 * Extracts tag suggestions by analyzing dream text and querying historical user tags.
 */
export function extractTagSuggestions(
  input: string | ExtractSuggestionsOptions,
  maybeOptions?: ExtractSuggestionsOptions
): SuggestionResult {
  const options: ExtractSuggestionsOptions =
    typeof input === 'string'
      ? { ...(maybeOptions || {}), narrative: input }
      : input;

  const existingLower = new Set((options.existingTags || []).map((t) => t.toLowerCase()));

  // 1. Gather all dream textual fields into a single search space
  const textParts: string[] = [];
  if (options.title) textParts.push(options.title);
  if (options.narrative) textParts.push(options.narrative);
  if (options.notes) textParts.push(options.notes);
  if (options.scenes && options.scenes.length > 0) {
    textParts.push(...options.scenes);
  }

  const combinedText = textParts.join(' ').toLowerCase();
  // Normalize punctuation and whitespace for regex boundary safety
  const normalizedText = ' ' + combinedText.replace(/[\r\n\t]+/g, ' ') + ' ';

  const detectedMap = new Map<string, TagSuggestion>();

  if (combinedText.trim().length > 0) {
    // Check against curated dream tag rules
    for (const rule of DREAM_TAG_RULES) {
      if (existingLower.has(rule.tag.toLowerCase())) {
        continue;
      }

      let matchCount = 0;
      const matchedKeywords: string[] = [];

      for (const kw of rule.keywords) {
        const escaped = escapeRegex(kw.toLowerCase());
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'g');
        const matches = normalizedText.match(regex);
        if (matches && matches.length > 0) {
          matchCount += matches.length;
          matchedKeywords.push(kw);
        }
      }

      // Also check exact rule tag itself if not already checked in keywords
      const escapedTag = escapeRegex(rule.tag.toLowerCase());
      const tagRegex = new RegExp(`(^|[^a-zA-Z0-9])${escapedTag}([^a-zA-Z0-9]|$)`, 'g');
      const tagMatches = normalizedText.match(tagRegex);
      if (tagMatches && !matchedKeywords.includes(rule.tag)) {
        matchCount += tagMatches.length;
        matchedKeywords.push(rule.tag);
      }

      if (matchCount > 0) {
        detectedMap.set(rule.tag, {
          tag: rule.tag,
          category: rule.category,
          matchCount,
          matchedKeywords,
          isFromContent: true,
        });
      }
    }

    // 2. Check user's own distinct tags from database against dream content
    if (options.userDistinctTags && options.userDistinctTags.length > 0) {
      for (const userTag of options.userDistinctTags) {
        const trimmed = userTag.trim();
        if (!trimmed || existingLower.has(trimmed.toLowerCase())) {
          continue;
        }

        // If not already detected via rules
        if (!detectedMap.has(trimmed)) {
          const escaped = escapeRegex(trimmed.toLowerCase());
          const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'g');
          const matches = normalizedText.match(regex);
          if (matches && matches.length > 0) {
            detectedMap.set(trimmed, {
              tag: trimmed,
              category: 'theme',
              matchCount: matches.length,
              matchedKeywords: [trimmed],
              isFromContent: true,
            });
          }
        }
      }
    }
  }

  // Sort detected suggestions by match count descending, then alphabetically
  const detectedSuggestions = Array.from(detectedMap.values()).sort((a, b) => {
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }
    return a.tag.localeCompare(b.tag);
  });

  // 3. General frequent/fallback suggestions (excluding already selected and already detected)
  const generalSet = new Set<string>();
  const detectedTagsLower = new Set(detectedSuggestions.map((s) => s.tag.toLowerCase()));

  // Add user historical tags first
  if (options.userDistinctTags) {
    for (const ut of options.userDistinctTags) {
      const trimmed = ut.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed && !existingLower.has(lower) && !detectedTagsLower.has(lower)) {
        generalSet.add(trimmed);
      }
    }
  }

  // Add popular curated tags
  for (const rule of DREAM_TAG_RULES) {
    const lower = rule.tag.toLowerCase();
    if (!existingLower.has(lower) && !detectedTagsLower.has(lower)) {
      generalSet.add(rule.tag);
    }
  }

  const limit = options.limit || 12;
  const generalSuggestions = Array.from(generalSet).slice(0, limit);

  return {
    detectedSuggestions,
    generalSuggestions,
  };
}

export const tagSuggestionService = {
  extractTagSuggestions,
  getRules: () => DREAM_TAG_RULES,
};
