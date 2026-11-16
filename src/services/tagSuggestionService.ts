/**
 * Tag Suggestion Service
 *
 * Provides intelligent, high-precision tag suggestions for dream entries by:
 * 1. Analyzing the dream's narrative, title, scenes, and notes.
 * 2. Matching against a dictionary of 230 clean, atomic dream tags with tight keyword connections.
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
 * Curated, clean atomic dream tags with precise, non-vague keyword triggers.
 * No compound bucket labels (e.g. no "Adventure & Quest" or "Ocean & Sea").
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
      "glide",
      "gliding",
      "glided",
      "wings",
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
      "nosedive"
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
      "bolted",
      "scrambled"
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
      "escaping from",
      "on the run",
      "tracked down",
      "running for my life",
      "tailing me",
      "in hot pursuit",
      "closing in on me"
    ]
  },
  {
    "tag": "Sleep Paralysis",
    "category": "consciousness",
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
      "pressure on chest",
      "tried to scream but nothing came out"
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
      "doggy paddle",
      "breaststroke",
      "freestyle",
      "backstroke",
      "snorkeling",
      "scuba",
      "paddling",
      "wading"
    ]
  },
  {
    "tag": "Underwater",
    "category": "nature",
    "keywords": [
      "underwater",
      "submerged",
      "deep underwater",
      "bottom of the pool",
      "under the surface",
      "beneath the surface",
      "breathe underwater",
      "breathing underwater",
      "inhaled water",
      "gills"
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
      "transmuted"
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
      "gums bleeding",
      "molar fell out",
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
      "public nudity",
      "barefoot in public",
      "forgot to wear pants",
      "unclothed",
      "exposed"
    ]
  },
  {
    "tag": "Lost",
    "category": "action",
    "keywords": [
      "lost",
      "cannot find my way",
      "can't find the way",
      "disoriented",
      "lost in the dark",
      "searching for exit",
      "no way out",
      "directionless",
      "wrong turn",
      "lost in a building",
      "where am i",
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
      "energy shield",
      "superhuman"
    ]
  },
  {
    "tag": "Climbing",
    "category": "action",
    "keywords": [
      "climbing",
      "climbed",
      "scaling",
      "scaled",
      "rock climbing",
      "climbing a tree",
      "climbing a wall",
      "clambered",
      "gripping ledge"
    ]
  },
  {
    "tag": "Hiding",
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
      "ducked behind",
      "concealed"
    ]
  },
  {
    "tag": "Fighting",
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
      "martial arts"
    ]
  },
  {
    "tag": "Driving",
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
      "highway driving",
      "swerving"
    ]
  },
  {
    "tag": "Singing",
    "category": "action",
    "keywords": [
      "singing",
      "sang",
      "sung",
      "vocalizing",
      "choir singing",
      "humming a song",
      "singing on stage",
      "singing loud"
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
      "dance party",
      "choreography",
      "dance floor"
    ]
  },
  {
    "tag": "Floating",
    "category": "action",
    "keywords": [
      "floating",
      "weightless",
      "weightlessness",
      "drifting in air",
      "bobbing in air",
      "anti-gravity",
      "floating in midair"
    ]
  },
  {
    "tag": "Drowning",
    "category": "action",
    "keywords": [
      "drowning",
      "drowned",
      "sinking in water",
      "cannot surface",
      "swallowed water",
      "pulled underwater",
      "gasped for air"
    ]
  },
  {
    "tag": "Searching",
    "category": "action",
    "keywords": [
      "searching",
      "searching for",
      "looking everywhere",
      "scouring",
      "seeking",
      "trying to find",
      "hunting for"
    ]
  },
  {
    "tag": "Ocean",
    "category": "nature",
    "keywords": [
      "ocean",
      "oceans",
      "oceanic",
      "deep ocean",
      "open water",
      "ocean floor",
      "high seas",
      "abyssal",
      "pacific ocean",
      "atlantic ocean"
    ]
  },
  {
    "tag": "Sea",
    "category": "nature",
    "keywords": [
      "sea",
      "seas",
      "deep sea",
      "seafloor",
      "seabed",
      "coral reef",
      "marine life"
    ]
  },
  {
    "tag": "Beach",
    "category": "nature",
    "keywords": [
      "beach",
      "beaches",
      "shore",
      "shoreline",
      "coast",
      "coastline",
      "sandy beach",
      "seashore",
      "surf",
      "sand by the water"
    ]
  },
  {
    "tag": "Waves",
    "category": "nature",
    "keywords": [
      "wave",
      "waves",
      "tsunami",
      "giant wave",
      "cresting wave",
      "tidal wave",
      "breakers",
      "swell",
      "rough water"
    ]
  },
  {
    "tag": "River",
    "category": "nature",
    "keywords": [
      "river",
      "rivers",
      "stream",
      "creek",
      "brook",
      "rapids",
      "riverbank",
      "flowing river"
    ]
  },
  {
    "tag": "Lake",
    "category": "nature",
    "keywords": [
      "lake",
      "lakes",
      "pond",
      "lagoon",
      "reservoir",
      "lakeside",
      "quiet lake"
    ]
  },
  {
    "tag": "Waterfall",
    "category": "nature",
    "keywords": [
      "waterfall",
      "waterfalls",
      "cascading water",
      "cascade",
      "falling water",
      "plunge pool"
    ]
  },
  {
    "tag": "Rain",
    "category": "nature",
    "keywords": [
      "rain",
      "raining",
      "rained",
      "downpour",
      "drizzle",
      "pouring rain",
      "monsoon",
      "raindrops",
      "rain shower"
    ]
  },
  {
    "tag": "Storm",
    "category": "nature",
    "keywords": [
      "storm",
      "thunder",
      "lightning",
      "thunderstorm",
      "hurricane",
      "tornado",
      "tempest",
      "cyclone",
      "gale",
      "hail",
      "hailstorm",
      "thunderclap"
    ]
  },
  {
    "tag": "Fire",
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
      "smoldering"
    ]
  },
  {
    "tag": "Snow",
    "category": "nature",
    "keywords": [
      "snow",
      "snowing",
      "snowstorm",
      "blizzard",
      "snowflakes",
      "snowdrift",
      "deep snow",
      "fresh snow"
    ]
  },
  {
    "tag": "Ice",
    "category": "nature",
    "keywords": [
      "ice",
      "frozen",
      "frost",
      "glacier",
      "icicle",
      "freezing cold",
      "frozen lake",
      "slippery ice",
      "subzero"
    ]
  },
  {
    "tag": "Forest",
    "category": "nature",
    "keywords": [
      "forest",
      "pine forest",
      "rainforest",
      "woodland",
      "deep forest",
      "canopy",
      "tall trees",
      "redwoods",
      "overgrown forest"
    ]
  },
  {
    "tag": "Woods",
    "category": "nature",
    "keywords": [
      "woods",
      "in the woods",
      "clearing in the woods",
      "grove",
      "thicket",
      "timberland"
    ]
  },
  {
    "tag": "Jungle",
    "category": "nature",
    "keywords": [
      "jungle",
      "thick jungle",
      "vines hanging",
      "exotic jungle",
      "dense undergrowth",
      "tropical rainforest"
    ]
  },
  {
    "tag": "Mountain",
    "category": "nature",
    "keywords": [
      "mountain",
      "mountains",
      "mountain peak",
      "mountain range",
      "summit",
      "alpine",
      "rocky mountain",
      "climbing a mountain"
    ]
  },
  {
    "tag": "Cave",
    "category": "nature",
    "keywords": [
      "cave",
      "cavern",
      "underground cave",
      "stalactite",
      "stalagmite",
      "dark cave",
      "grotto",
      "deep cave"
    ]
  },
  {
    "tag": "Cliff",
    "category": "nature",
    "keywords": [
      "cliff",
      "cliffs",
      "cliffside",
      "canyon",
      "ravine",
      "gorge",
      "chasm",
      "precipice",
      "crag",
      "steep drop"
    ]
  },
  {
    "tag": "Desert",
    "category": "nature",
    "keywords": [
      "desert",
      "sand dunes",
      "sandstorm",
      "sahara",
      "oasis",
      "arid",
      "mirage",
      "cactus",
      "scorching desert",
      "dry wasteland"
    ]
  },
  {
    "tag": "Island",
    "category": "nature",
    "keywords": [
      "island",
      "islands",
      "remote island",
      "deserted island",
      "tropical island",
      "atoll",
      "archipelago"
    ]
  },
  {
    "tag": "Garden",
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
      "petals",
      "tulips",
      "sunflowers",
      "meadow"
    ]
  },
  {
    "tag": "Sun",
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
      "solar flare",
      "blinding sun"
    ]
  },
  {
    "tag": "Moon",
    "category": "nature",
    "keywords": [
      "moon",
      "full moon",
      "crescent moon",
      "moonlight",
      "lunar",
      "blood moon",
      "eclipse"
    ]
  },
  {
    "tag": "Night",
    "category": "nature",
    "keywords": [
      "midnight",
      "night sky",
      "pitch black",
      "pitch dark",
      "nighttime",
      "in the middle of the night"
    ]
  },
  {
    "tag": "Earthquake",
    "category": "nature",
    "keywords": [
      "earthquake",
      "ground shaking",
      "tremor",
      "fissure",
      "landslide",
      "sinkhole",
      "aftershock",
      "cracking earth"
    ]
  },
  {
    "tag": "Volcano",
    "category": "nature",
    "keywords": [
      "volcano",
      "lava",
      "magma",
      "erupting volcano",
      "volcanic ash",
      "crater",
      "molten rock"
    ]
  },
  {
    "tag": "Childhood Home",
    "category": "location",
    "keywords": [
      "childhood home",
      "childhood house",
      "childhood bedroom",
      "old house I lived in",
      "house I grew up in",
      "parents house",
      "family home"
    ]
  },
  {
    "tag": "School",
    "category": "location",
    "keywords": [
      "school",
      "high school",
      "elementary school",
      "middle school",
      "school hallway",
      "school bus",
      "recess",
      "kindergarten"
    ]
  },
  {
    "tag": "Classroom",
    "category": "location",
    "keywords": [
      "classroom",
      "blackboard",
      "whiteboard",
      "desk",
      "chalkboard",
      "teacher at front",
      "lecture in class"
    ]
  },
  {
    "tag": "University",
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
      "quad"
    ]
  },
  {
    "tag": "Exam",
    "category": "location",
    "keywords": [
      "exam",
      "test",
      "final exam",
      "pop quiz",
      "unprepared for test",
      "did not study",
      "testing room",
      "failed exam",
      "test anxiety",
      "forgot about the test"
    ]
  },
  {
    "tag": "Hospital",
    "category": "location",
    "keywords": [
      "hospital",
      "emergency room",
      "clinic",
      "surgery",
      "operating room",
      "patient",
      "ambulance",
      "stretcher",
      "iv drip",
      "hospital bed",
      "icu"
    ]
  },
  {
    "tag": "Airport",
    "category": "location",
    "keywords": [
      "airport",
      "terminal",
      "boarding gate",
      "runway",
      "baggage claim",
      "security checkpoint",
      "passport control",
      "tarmac"
    ]
  },
  {
    "tag": "Airplane",
    "category": "location",
    "keywords": [
      "airplane",
      "plane",
      "cockpit",
      "flight attendant",
      "turbulence",
      "aircraft",
      "boarding the plane",
      "plane taking off"
    ]
  },
  {
    "tag": "Train",
    "category": "location",
    "keywords": [
      "train",
      "train station",
      "railway",
      "locomotive",
      "train tracks",
      "train car",
      "commuter train",
      "bullet train"
    ]
  },
  {
    "tag": "Subway",
    "category": "location",
    "keywords": [
      "subway",
      "metro",
      "subway station",
      "subway car",
      "underground station",
      "turnstile",
      "metro train"
    ]
  },
  {
    "tag": "Hotel",
    "category": "location",
    "keywords": [
      "hotel",
      "motel",
      "hotel room",
      "lobby",
      "concierge",
      "hostel",
      "resort",
      "suite",
      "keycard",
      "bellhop"
    ]
  },
  {
    "tag": "Elevator",
    "category": "location",
    "keywords": [
      "elevator",
      "lift",
      "elevator falling",
      "stuck in elevator",
      "elevator shooting up",
      "elevator shaft",
      "glass elevator",
      "elevator buttons"
    ]
  },
  {
    "tag": "Stairs",
    "category": "location",
    "keywords": [
      "stairs",
      "staircase",
      "spiral staircase",
      "stairwell",
      "creaky stairs",
      "climbing stairs",
      "descending stairs"
    ]
  },
  {
    "tag": "Hallway",
    "category": "location",
    "keywords": [
      "hallway",
      "corridor",
      "narrow hallway",
      "endless hallway",
      "hallway with many doors",
      "maze of corridors"
    ]
  },
  {
    "tag": "Labyrinth",
    "category": "location",
    "keywords": [
      "labyrinth",
      "maze",
      "hedgemaze",
      "dead end",
      "winding corridors",
      "lost in a maze",
      "endless rooms",
      "backrooms"
    ]
  },
  {
    "tag": "Basement",
    "category": "location",
    "keywords": [
      "basement",
      "cellar",
      "dark cellar",
      "wine cellar",
      "down in the basement",
      "creepy basement"
    ]
  },
  {
    "tag": "Underground",
    "category": "location",
    "keywords": [
      "underground",
      "bunker",
      "dungeon",
      "crypt",
      "vault",
      "subterranean",
      "tunnel",
      "sewer",
      "catacombs",
      "underground facility",
      "bomb shelter"
    ]
  },
  {
    "tag": "Castle",
    "category": "location",
    "keywords": [
      "castle",
      "fortress",
      "palace",
      "throne room",
      "ramparts",
      "moat",
      "citadel",
      "tower",
      "grand hall"
    ]
  },
  {
    "tag": "Mansion",
    "category": "location",
    "keywords": [
      "mansion",
      "manor",
      "chateau",
      "grand estate",
      "chandeliers",
      "luxurious house",
      "historic mansion"
    ]
  },
  {
    "tag": "Pyramid",
    "category": "location",
    "keywords": [
      "pyramid",
      "pyramids",
      "pharaoh",
      "hieroglyphs",
      "ancient tomb",
      "sarcophagus",
      "egyptian pyramid"
    ]
  },
  {
    "tag": "Cemetery",
    "category": "location",
    "keywords": [
      "cemetery",
      "graveyard",
      "gravesite",
      "crematorium",
      "mausoleum",
      "burial ground"
    ]
  },
  {
    "tag": "Grave",
    "category": "location",
    "keywords": [
      "grave",
      "graves",
      "tomb",
      "tombs",
      "headstone",
      "tombstone",
      "coffin",
      "casket",
      "crypts",
      "burial plot"
    ]
  },
  {
    "tag": "Bridge",
    "category": "location",
    "keywords": [
      "bridge",
      "suspension bridge",
      "rope bridge",
      "crossing the bridge",
      "bridge collapsing",
      "viaduct",
      "overpass"
    ]
  },
  {
    "tag": "City",
    "category": "location",
    "keywords": [
      "city",
      "downtown",
      "skyscraper",
      "skyscrapers",
      "metropolis",
      "skyline",
      "urban",
      "busy city"
    ]
  },
  {
    "tag": "Streets",
    "category": "location",
    "keywords": [
      "street",
      "streets",
      "alley",
      "alleyway",
      "sidewalk",
      "crosswalk",
      "intersection",
      "boulevard",
      "avenue"
    ]
  },
  {
    "tag": "Space",
    "category": "location",
    "keywords": [
      "outer space",
      "in space",
      "galaxy",
      "cosmos",
      "milky way",
      "nebula",
      "zero gravity",
      "interstellar"
    ]
  },
  {
    "tag": "Stars",
    "category": "location",
    "keywords": [
      "stars",
      "starlight",
      "constellation",
      "shooting star",
      "meteor",
      "starfield"
    ]
  },
  {
    "tag": "Planet",
    "category": "location",
    "keywords": [
      "planet",
      "planets",
      "alien planet",
      "mars",
      "orbit",
      "black hole",
      "solar system"
    ]
  },
  {
    "tag": "Office",
    "category": "location",
    "keywords": [
      "office",
      "cubicle",
      "conference room",
      "boardroom",
      "office building",
      "water cooler",
      "breakroom"
    ]
  },
  {
    "tag": "Store",
    "category": "location",
    "keywords": [
      "store",
      "mall",
      "shopping mall",
      "supermarket",
      "grocery store",
      "cashier",
      "shopping cart",
      "department store",
      "aisle"
    ]
  },
  {
    "tag": "Restaurant",
    "category": "location",
    "keywords": [
      "restaurant",
      "diner",
      "bistro",
      "dining table",
      "waiter",
      "waitress",
      "menu",
      "buffet",
      "food court"
    ]
  },
  {
    "tag": "Cafe",
    "category": "location",
    "keywords": [
      "cafe",
      "coffee shop",
      "espresso",
      "barista",
      "bakery"
    ]
  },
  {
    "tag": "Bathroom",
    "category": "location",
    "keywords": [
      "bathroom",
      "restroom",
      "toilet",
      "shower",
      "bathtub",
      "sink",
      "public restroom",
      "dirty bathroom",
      "overflowing toilet"
    ]
  },
  {
    "tag": "Kitchen",
    "category": "location",
    "keywords": [
      "kitchen",
      "stove",
      "oven",
      "refrigerator",
      "fridge",
      "pantry",
      "cooking",
      "baking",
      "pots and pans"
    ]
  },
  {
    "tag": "Carnival",
    "category": "location",
    "keywords": [
      "carnival",
      "amusement park",
      "roller coaster",
      "ferris wheel",
      "circus",
      "funhouse",
      "carnival rides"
    ]
  },
  {
    "tag": "Prison",
    "category": "location",
    "keywords": [
      "prison",
      "jail",
      "cell",
      "jail cell",
      "inmate",
      "bars",
      "iron bars",
      "warden",
      "handcuffs",
      "jailbreak",
      "solitary confinement"
    ]
  },
  {
    "tag": "Church",
    "category": "location",
    "keywords": [
      "church",
      "chapel",
      "cathedral",
      "pew",
      "altar",
      "stained glass",
      "priest",
      "pastor"
    ]
  },
  {
    "tag": "Temple",
    "category": "location",
    "keywords": [
      "temple",
      "shrine",
      "sanctuary",
      "monastery",
      "ancient temple",
      "sacred altar",
      "monk"
    ]
  },
  {
    "tag": "Theater",
    "category": "location",
    "keywords": [
      "theater",
      "cinema",
      "movie theater",
      "stage",
      "auditorium",
      "backstage",
      "red curtain",
      "silver screen"
    ]
  },
  {
    "tag": "Library",
    "category": "location",
    "keywords": [
      "library",
      "bookshelf",
      "bookshelves",
      "archive",
      "ancient books",
      "librarian",
      "reading room",
      "stacks"
    ]
  },
  {
    "tag": "Laboratory",
    "category": "location",
    "keywords": [
      "laboratory",
      "lab",
      "scientist",
      "experiment",
      "beakers",
      "test tubes",
      "microscope",
      "research facility"
    ]
  },
  {
    "tag": "Rooftop",
    "category": "location",
    "keywords": [
      "rooftop",
      "roof",
      "on the roof",
      "edge of the roof",
      "chimney",
      "skylight"
    ]
  },
  {
    "tag": "Gym",
    "category": "location",
    "keywords": [
      "gym",
      "gymnasium",
      "weights",
      "workout",
      "treadmill",
      "locker room",
      "bleachers",
      "basketball court"
    ]
  },
  {
    "tag": "Museum",
    "category": "location",
    "keywords": [
      "museum",
      "exhibit",
      "art gallery",
      "display case",
      "sculpture",
      "ancient artifacts"
    ]
  },
  {
    "tag": "Family",
    "category": "character",
    "keywords": [
      "family",
      "relatives",
      "parents",
      "sibling",
      "family dinner",
      "in-laws"
    ]
  },
  {
    "tag": "Mother",
    "category": "character",
    "keywords": [
      "mother",
      "mom",
      "mommy",
      "my mother"
    ]
  },
  {
    "tag": "Father",
    "category": "character",
    "keywords": [
      "father",
      "dad",
      "daddy",
      "my father"
    ]
  },
  {
    "tag": "Brother",
    "category": "character",
    "keywords": [
      "brother",
      "brothers",
      "my brother"
    ]
  },
  {
    "tag": "Sister",
    "category": "character",
    "keywords": [
      "sister",
      "sisters",
      "my sister"
    ]
  },
  {
    "tag": "Grandmother",
    "category": "character",
    "keywords": [
      "grandmother",
      "grandma",
      "granny",
      "nana"
    ]
  },
  {
    "tag": "Grandfather",
    "category": "character",
    "keywords": [
      "grandfather",
      "grandpa",
      "gramps"
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
      "pal",
      "buddy",
      "hanging out with friends"
    ]
  },
  {
    "tag": "Romance",
    "category": "character",
    "keywords": [
      "romance",
      "romantic",
      "crush",
      "kiss",
      "kissing",
      "cuddle",
      "dating",
      "holding hands",
      "lover",
      "intimacy"
    ]
  },
  {
    "tag": "Partner",
    "category": "character",
    "keywords": [
      "boyfriend",
      "girlfriend",
      "husband",
      "wife",
      "fiance",
      "ex-boyfriend",
      "ex-girlfriend",
      "spouse"
    ]
  },
  {
    "tag": "Strangers",
    "category": "character",
    "keywords": [
      "stranger",
      "strangers",
      "unfamiliar face",
      "faceless person",
      "random person"
    ]
  },
  {
    "tag": "Crowd",
    "category": "character",
    "keywords": [
      "crowd",
      "crowds",
      "mob",
      "group of people",
      "packed room",
      "sea of people",
      "gathering of people"
    ]
  },
  {
    "tag": "Shadow Figure",
    "category": "character",
    "keywords": [
      "shadow figure",
      "shadow person",
      "shadowy figure",
      "silhouette",
      "dark figure",
      "man in black",
      "hooded figure",
      "faceless man",
      "hat man",
      "shadow entity"
    ]
  },
  {
    "tag": "Celebrity",
    "category": "character",
    "keywords": [
      "celebrity",
      "famous person",
      "actor",
      "actress",
      "pop star",
      "movie star",
      "president",
      "famous musician"
    ]
  },
  {
    "tag": "Baby",
    "category": "character",
    "keywords": [
      "baby",
      "babies",
      "infant",
      "toddler",
      "newborn",
      "stroller",
      "carrying a baby"
    ]
  },
  {
    "tag": "Teacher",
    "category": "character",
    "keywords": [
      "teacher",
      "professor",
      "instructor",
      "mentor",
      "principal",
      "sensei"
    ]
  },
  {
    "tag": "Police",
    "category": "character",
    "keywords": [
      "police",
      "cops",
      "police officer",
      "cop",
      "detective",
      "siren",
      "arrested",
      "patrol car"
    ]
  },
  {
    "tag": "Soldier",
    "category": "character",
    "keywords": [
      "soldier",
      "soldiers",
      "military",
      "army",
      "troops",
      "commander",
      "warrior"
    ]
  },
  {
    "tag": "Doctor",
    "category": "character",
    "keywords": [
      "doctor",
      "physician",
      "surgeon",
      "nurse",
      "stethoscope"
    ]
  },
  {
    "tag": "Dog",
    "category": "creature",
    "keywords": [
      "dog",
      "dogs",
      "puppy",
      "puppies",
      "barking dog",
      "canine",
      "golden retriever",
      "hound",
      "wolf",
      "wolves"
    ]
  },
  {
    "tag": "Cat",
    "category": "creature",
    "keywords": [
      "cat",
      "cats",
      "kitten",
      "kittens",
      "feline",
      "purring",
      "black cat",
      "panther",
      "leopard",
      "tiger",
      "lion"
    ]
  },
  {
    "tag": "Bird",
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
      "flock of birds",
      "parrot"
    ]
  },
  {
    "tag": "Fish",
    "category": "creature",
    "keywords": [
      "fish",
      "fishes",
      "school of fish",
      "goldfish",
      "coral fish"
    ]
  },
  {
    "tag": "Shark",
    "category": "creature",
    "keywords": [
      "shark",
      "sharks",
      "shark fin",
      "great white shark",
      "hammerhead"
    ]
  },
  {
    "tag": "Whale",
    "category": "creature",
    "keywords": [
      "whale",
      "whales",
      "humpback whale",
      "blue whale",
      "dolphin",
      "dolphins"
    ]
  },
  {
    "tag": "Snake",
    "category": "creature",
    "keywords": [
      "snake",
      "snakes",
      "serpent",
      "viper",
      "cobra",
      "python",
      "rattlesnake",
      "bitten by snake"
    ]
  },
  {
    "tag": "Spider",
    "category": "creature",
    "keywords": [
      "spider",
      "spiders",
      "cobweb",
      "spiderweb",
      "tarantula",
      "crawling spider"
    ]
  },
  {
    "tag": "Insect",
    "category": "creature",
    "keywords": [
      "insect",
      "insects",
      "bug",
      "bugs",
      "beetle",
      "wasp",
      "bee",
      "cockroach",
      "ants",
      "swarm of bugs",
      "centipede",
      "moth",
      "butterfly"
    ]
  },
  {
    "tag": "Horse",
    "category": "creature",
    "keywords": [
      "horse",
      "horses",
      "stallion",
      "mare",
      "riding a horse",
      "galloping",
      "saddle",
      "pegasus",
      "unicorn",
      "pony"
    ]
  },
  {
    "tag": "Bear",
    "category": "creature",
    "keywords": [
      "bear",
      "bears",
      "grizzly bear",
      "polar bear",
      "black bear",
      "bear cub"
    ]
  },
  {
    "tag": "Monster",
    "category": "creature",
    "keywords": [
      "monster",
      "monsters",
      "beast",
      "demon",
      "demons",
      "creature",
      "abomination",
      "grotesque creature"
    ]
  },
  {
    "tag": "Dragon",
    "category": "creature",
    "keywords": [
      "dragon",
      "dragons",
      "breathing fire",
      "winged dragon",
      "wyvern"
    ]
  },
  {
    "tag": "Ghost",
    "category": "creature",
    "keywords": [
      "ghost",
      "ghosts",
      "spirit",
      "spirits",
      "apparition",
      "haunted",
      "poltergeist",
      "phantom",
      "specter",
      "wraith"
    ]
  },
  {
    "tag": "Zombie",
    "category": "creature",
    "keywords": [
      "zombie",
      "zombies",
      "undead",
      "walking dead",
      "infected horde",
      "apocalypse horde"
    ]
  },
  {
    "tag": "Alien",
    "category": "creature",
    "keywords": [
      "alien",
      "aliens",
      "extraterrestrial",
      "martian",
      "grey alien"
    ]
  },
  {
    "tag": "UFO",
    "category": "object",
    "keywords": [
      "ufo",
      "flying saucer",
      "mothership",
      "spaceship landing",
      "beam of light from sky"
    ]
  },
  {
    "tag": "Phone",
    "category": "object",
    "keywords": [
      "phone",
      "smartphone",
      "iphone",
      "texting",
      "phone call",
      "cellphone",
      "unable to dial",
      "cracked screen",
      "dialing 911"
    ]
  },
  {
    "tag": "Computer",
    "category": "object",
    "keywords": [
      "computer",
      "laptop",
      "keyboard",
      "screen",
      "monitor",
      "pc",
      "software",
      "coding"
    ]
  },
  {
    "tag": "Gaming",
    "category": "object",
    "keywords": [
      "video game",
      "videogame",
      "game console",
      "controller",
      "arcade",
      "pixelated",
      "hud"
    ]
  },
  {
    "tag": "Mirror",
    "category": "object",
    "keywords": [
      "mirror",
      "reflection in mirror",
      "looking in the mirror",
      "distorted reflection",
      "shattered mirror",
      "strange reflection"
    ]
  },
  {
    "tag": "Clock",
    "category": "object",
    "keywords": [
      "clock",
      "watch",
      "wristwatch",
      "alarm clock",
      "timer",
      "hourglass",
      "spinning clock hands",
      "digital clock",
      "grandfather clock"
    ]
  },
  {
    "tag": "Car",
    "category": "object",
    "keywords": [
      "car",
      "cars",
      "automobile",
      "vehicle",
      "sedan",
      "sports car",
      "dashboard"
    ]
  },
  {
    "tag": "Crash",
    "category": "object",
    "keywords": [
      "crash",
      "car crash",
      "collision",
      "totaled car",
      "flipped car",
      "airbag deployed",
      "wreck"
    ]
  },
  {
    "tag": "Boat",
    "category": "object",
    "keywords": [
      "boat",
      "ship",
      "sailboat",
      "yacht",
      "canoe",
      "kayak",
      "raft",
      "rowboat",
      "vessel",
      "sinking boat"
    ]
  },
  {
    "tag": "Key",
    "category": "object",
    "keywords": [
      "key",
      "keys",
      "keychain",
      "lost my keys",
      "keyhole",
      "brass key"
    ]
  },
  {
    "tag": "Lock",
    "category": "object",
    "keywords": [
      "lock",
      "padlock",
      "locked door",
      "unlocking",
      "deadbolt",
      "combination lock"
    ]
  },
  {
    "tag": "Secret Door",
    "category": "object",
    "keywords": [
      "secret door",
      "hidden door",
      "hidden room",
      "secret passage",
      "portal",
      "trapdoor",
      "hidden gateway"
    ]
  },
  {
    "tag": "Book",
    "category": "object",
    "keywords": [
      "book",
      "books",
      "reading a book",
      "pages turning",
      "novel",
      "diary",
      "journal notebook",
      "ancient tome",
      "parchment",
      "scroll"
    ]
  },
  {
    "tag": "Sword",
    "category": "object",
    "keywords": [
      "sword",
      "blade",
      "katana",
      "dagger",
      "broadsword",
      "fencing",
      "slashing"
    ]
  },
  {
    "tag": "Gun",
    "category": "object",
    "keywords": [
      "gun",
      "guns",
      "pistol",
      "rifle",
      "shotgun",
      "firearm",
      "bullets",
      "shooting gun"
    ]
  },
  {
    "tag": "Money",
    "category": "object",
    "keywords": [
      "money",
      "cash",
      "coins",
      "dollar bills",
      "wallet",
      "bank",
      "atm",
      "credit card",
      "rich",
      "wealth"
    ]
  },
  {
    "tag": "Treasure",
    "category": "object",
    "keywords": [
      "treasure",
      "treasure chest",
      "gold",
      "silver",
      "valuables",
      "fortune",
      "ancient treasure"
    ]
  },
  {
    "tag": "Chest",
    "category": "object",
    "keywords": [
      "chest",
      "wooden chest",
      "locked chest",
      "iron chest",
      "crate"
    ]
  },
  {
    "tag": "Food",
    "category": "object",
    "keywords": [
      "food",
      "eating",
      "ate",
      "meal",
      "dinner",
      "lunch",
      "breakfast",
      "feast",
      "snack",
      "cake",
      "bread",
      "pizza"
    ]
  },
  {
    "tag": "Clothes",
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
      "costume",
      "uniform"
    ]
  },
  {
    "tag": "Camera",
    "category": "object",
    "keywords": [
      "camera",
      "photograph",
      "photo",
      "taking photos",
      "taking pictures",
      "polaroid",
      "filming"
    ]
  },
  {
    "tag": "Bicycle",
    "category": "object",
    "keywords": [
      "bicycle",
      "bike",
      "riding a bike",
      "pedaling",
      "bike ride"
    ]
  },
  {
    "tag": "Motorcycle",
    "category": "object",
    "keywords": [
      "motorcycle",
      "motorbike",
      "scooter",
      "riding a motorcycle"
    ]
  },
  {
    "tag": "Jewelry",
    "category": "object",
    "keywords": [
      "jewelry",
      "ring",
      "diamond",
      "necklace",
      "bracelet",
      "earrings",
      "gemstone",
      "ruby",
      "emerald"
    ]
  },
  {
    "tag": "Music",
    "category": "object",
    "keywords": [
      "music",
      "guitar",
      "piano",
      "drums",
      "violin",
      "melody",
      "playing music",
      "headphones"
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
      "became conscious in the dream",
      "conscious in the dream",
      "woke up inside the dream",
      "awareness in dream",
      "lucid state",
      "controlled the dream"
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
      "counting fingers",
      "checked the clock in dream",
      "light switch did not work"
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
      "dream loop",
      "thought i was awake"
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
      "panicked",
      "frightened",
      "scary dream",
      "screaming in terror",
      "petrified"
    ]
  },
  {
    "tag": "Dream within Dream",
    "category": "consciousness",
    "keywords": [
      "dream within a dream",
      "nested dream",
      "fell asleep in the dream",
      "inception dream",
      "multiple levels of dreaming"
    ]
  },
  {
    "tag": "Time Travel",
    "category": "consciousness",
    "keywords": [
      "time travel",
      "traveling in time",
      "past era",
      "in the future",
      "historical period",
      "century ago",
      "time loop"
    ]
  },
  {
    "tag": "Deja Vu",
    "category": "consciousness",
    "keywords": [
      "deja vu",
      "premonition",
      "prophetic dream",
      "already happened",
      "foreseeing"
    ]
  },
  {
    "tag": "Astral Projection",
    "category": "consciousness",
    "keywords": [
      "astral projection",
      "astral body",
      "out of body",
      "floating above my body",
      "looking down at myself",
      "silver cord",
      "separated from body",
      "vibrational stage"
    ]
  },
  {
    "tag": "Adventure",
    "category": "theme",
    "keywords": [
      "adventure",
      "adventures",
      "adventuring",
      "adventurous"
    ]
  },
  {
    "tag": "Quest",
    "category": "theme",
    "keywords": [
      "quest",
      "quests",
      "questing",
      "epic quest"
    ]
  },
  {
    "tag": "Journey",
    "category": "theme",
    "keywords": [
      "journey",
      "journeying",
      "journeys",
      "expedition",
      "odyssey",
      "voyage"
    ]
  },
  {
    "tag": "Surreal",
    "category": "theme",
    "keywords": [
      "surreal",
      "bizarre",
      "nonsensical",
      "physics broke",
      "impossible architecture",
      "strange dream logic",
      "melting objects",
      "psychedelic"
    ]
  },
  {
    "tag": "Mystery",
    "category": "theme",
    "keywords": [
      "mystery",
      "investigation",
      "clues",
      "solving a mystery",
      "detective",
      "puzzle to solve",
      "secret uncovered"
    ]
  },
  {
    "tag": "Death",
    "category": "theme",
    "keywords": [
      "dying",
      "died",
      "death",
      "killed",
      "dead body",
      "corpse",
      "near death experience",
      "afterlife",
      "passed away"
    ]
  },
  {
    "tag": "War",
    "category": "theme",
    "keywords": [
      "war",
      "battle",
      "battlefield",
      "bombs",
      "bombing",
      "explosions",
      "trenches",
      "warzone",
      "invading army",
      "artillery"
    ]
  },
  {
    "tag": "Magic",
    "category": "theme",
    "keywords": [
      "magic",
      "wizard",
      "witch",
      "casting a spell",
      "incantation",
      "sorcery",
      "potion",
      "magic wand",
      "enchantment"
    ]
  },
  {
    "tag": "Healing",
    "category": "theme",
    "keywords": [
      "healing",
      "healed",
      "cure",
      "recovering",
      "regenerating",
      "feeling better",
      "cured"
    ]
  },
  {
    "tag": "Party",
    "category": "theme",
    "keywords": [
      "party",
      "celebration",
      "birthday party",
      "festivities",
      "celebrating with friends"
    ]
  },
  {
    "tag": "Wedding",
    "category": "theme",
    "keywords": [
      "wedding",
      "wedding dress",
      "groom",
      "bride",
      "wedding ceremony",
      "marriage vows",
      "altar"
    ]
  },
  {
    "tag": "Invisibility",
    "category": "theme",
    "keywords": [
      "invisible",
      "invisibility",
      "unseen",
      "cloaking",
      "nobody could see me"
    ]
  },
  {
    "tag": "Telepathy",
    "category": "theme",
    "keywords": [
      "telepathy",
      "telepathic",
      "reading minds",
      "mind reading",
      "hearing thoughts",
      "mental communication"
    ]
  },
  {
    "tag": "Darkness",
    "category": "theme",
    "keywords": [
      "darkness",
      "pitch black",
      "complete darkness",
      "dim light",
      "shadows all around",
      "dark room"
    ]
  },
  {
    "tag": "Light",
    "category": "theme",
    "keywords": [
      "blinding light",
      "glowing light",
      "beam of light",
      "radiant light",
      "bright glow",
      "golden light"
    ]
  },
  {
    "tag": "Wolf",
    "category": "creature",
    "keywords": [
      "wolf",
      "wolves",
      "howling wolf",
      "pack of wolves",
      "lone wolf",
      "white wolf",
      "howling at moon"
    ]
  },
  {
    "tag": "Rabbit",
    "category": "creature",
    "keywords": [
      "rabbit",
      "bunny",
      "rabbits",
      "white rabbit",
      "cottontail",
      "hare",
      "pet rabbit"
    ]
  },
  {
    "tag": "Fox",
    "category": "creature",
    "keywords": [
      "fox",
      "foxes",
      "red fox",
      "wild fox",
      "clever fox"
    ]
  },
  {
    "tag": "Deer",
    "category": "creature",
    "keywords": [
      "deer",
      "stag",
      "doe",
      "fawn",
      "antlers",
      "wild deer"
    ]
  },
  {
    "tag": "Lion",
    "category": "creature",
    "keywords": [
      "lion",
      "lions",
      "lioness",
      "roaring lion",
      "lion cub",
      "mane"
    ]
  },
  {
    "tag": "Tiger",
    "category": "creature",
    "keywords": [
      "tiger",
      "tigers",
      "bengal tiger",
      "white tiger",
      "tiger stripes",
      "prowling tiger"
    ]
  },
  {
    "tag": "Elephant",
    "category": "creature",
    "keywords": [
      "elephant",
      "elephants",
      "trunk",
      "tusks",
      "huge elephant",
      "baby elephant"
    ]
  },
  {
    "tag": "Monkey",
    "category": "creature",
    "keywords": [
      "monkey",
      "monkeys",
      "ape",
      "chimpanzee",
      "gorilla",
      "baboon",
      "swinging on branches"
    ]
  },
  {
    "tag": "Frog",
    "category": "creature",
    "keywords": [
      "frog",
      "frogs",
      "toad",
      "toads",
      "croaking frog",
      "tree frog",
      "tadpole"
    ]
  },
  {
    "tag": "Turtle",
    "category": "creature",
    "keywords": [
      "turtle",
      "turtles",
      "sea turtle",
      "tortoise",
      "turtle shell"
    ]
  },
  {
    "tag": "Dolphin",
    "category": "creature",
    "keywords": [
      "dolphin",
      "dolphins",
      "swimming with dolphins",
      "jumping dolphin",
      "playful dolphin"
    ]
  },
  {
    "tag": "Octopus",
    "category": "creature",
    "keywords": [
      "octopus",
      "squid",
      "tentacles",
      "kraken",
      "giant squid",
      "sea octopus"
    ]
  },
  {
    "tag": "Owl",
    "category": "creature",
    "keywords": [
      "owl",
      "owls",
      "hoot owl",
      "barn owl",
      "screech owl",
      "wise owl"
    ]
  },
  {
    "tag": "Eagle",
    "category": "creature",
    "keywords": [
      "eagle",
      "eagles",
      "bald eagle",
      "soaring eagle",
      "golden eagle",
      "eagle talons"
    ]
  },
  {
    "tag": "Crow",
    "category": "creature",
    "keywords": [
      "crow",
      "crows",
      "raven",
      "ravens",
      "black crow",
      "cawing crow",
      "murder of crows"
    ]
  },
  {
    "tag": "Tower",
    "category": "location",
    "keywords": [
      "tower",
      "towers",
      "watchtower",
      "stone tower",
      "spire",
      "bell tower",
      "clock tower",
      "high tower"
    ]
  },
  {
    "tag": "Lighthouse",
    "category": "location",
    "keywords": [
      "lighthouse",
      "beacon",
      "lighthouse beam",
      "tower by the sea",
      "coastal lighthouse"
    ]
  },
  {
    "tag": "Tunnel",
    "category": "location",
    "keywords": [
      "tunnel",
      "tunnels",
      "underground tunnel",
      "dark tunnel",
      "train tunnel",
      "secret tunnel"
    ]
  },
  {
    "tag": "Bunker",
    "category": "location",
    "keywords": [
      "bunker",
      "bunkers",
      "bomb shelter",
      "underground bunker",
      "fallout shelter",
      "concrete bunker"
    ]
  },
  {
    "tag": "Attic",
    "category": "location",
    "keywords": [
      "attic",
      "dusty attic",
      "crawlspace",
      "in the attic",
      "attic stairs",
      "climbing to attic"
    ]
  },
  {
    "tag": "Balcony",
    "category": "location",
    "keywords": [
      "balcony",
      "porch",
      "veranda",
      "patio",
      "balcony railing",
      "standing on the balcony"
    ]
  },
  {
    "tag": "Alley",
    "category": "location",
    "keywords": [
      "alley",
      "alleys",
      "alleyway",
      "back alley",
      "dark alley",
      "narrow alley"
    ]
  },
  {
    "tag": "Highway",
    "category": "location",
    "keywords": [
      "highway",
      "freeway",
      "motorway",
      "interstate",
      "empty highway",
      "driving on the highway"
    ]
  },
  {
    "tag": "Crossroads",
    "category": "location",
    "keywords": [
      "crossroads",
      "intersection",
      "fork in the road",
      "four-way stop"
    ]
  },
  {
    "tag": "Oasis",
    "category": "location",
    "keywords": [
      "oasis",
      "desert oasis",
      "water in desert",
      "palm trees in desert"
    ]
  },
  {
    "tag": "Swamp",
    "category": "location",
    "keywords": [
      "swamp",
      "marsh",
      "bog",
      "bayou",
      "wetlands",
      "swamp water",
      "muddy swamp"
    ]
  },
  {
    "tag": "Armor",
    "category": "object",
    "keywords": [
      "armor",
      "suit of armor",
      "plate armor",
      "chainmail",
      "breastplate",
      "armored"
    ]
  },
  {
    "tag": "Shield",
    "category": "object",
    "keywords": [
      "shield",
      "shields",
      "wooden shield",
      "iron shield",
      "deflecting with shield"
    ]
  },
  {
    "tag": "Knife",
    "category": "object",
    "keywords": [
      "knife",
      "knives",
      "dagger",
      "pocket knife",
      "blade knife",
      "sharp knife"
    ]
  },
  {
    "tag": "Backpack",
    "category": "object",
    "keywords": [
      "backpack",
      "bag",
      "duffel bag",
      "luggage",
      "suitcase",
      "carrying a backpack",
      "school bag"
    ]
  },
  {
    "tag": "Wallet",
    "category": "object",
    "keywords": [
      "wallet",
      "purse",
      "lost my wallet",
      "stolen wallet",
      "empty wallet",
      "leather wallet"
    ]
  },
  {
    "tag": "Mask",
    "category": "object",
    "keywords": [
      "mask",
      "masks",
      "wearing a mask",
      "disguise",
      "masquerade",
      "hidden face"
    ]
  },
  {
    "tag": "Shoes",
    "category": "object",
    "keywords": [
      "shoes",
      "boots",
      "sneakers",
      "barefoot",
      "lost my shoes",
      "high heels",
      "running shoes",
      "untied shoes"
    ]
  },
  {
    "tag": "Candle",
    "category": "object",
    "keywords": [
      "candle",
      "candles",
      "candlestick",
      "candlelight",
      "lit a candle",
      "flickering candle"
    ]
  },
  {
    "tag": "Painting",
    "category": "object",
    "keywords": [
      "painting",
      "paintings",
      "canvas",
      "portrait",
      "mural",
      "painted picture",
      "gallery painting"
    ]
  },
  {
    "tag": "Guitar",
    "category": "object",
    "keywords": [
      "guitar",
      "acoustic guitar",
      "electric guitar",
      "strumming guitar",
      "guitar strings",
      "bass guitar",
      "playing guitar"
    ]
  },
  {
    "tag": "Piano",
    "category": "object",
    "keywords": [
      "piano",
      "grand piano",
      "piano keys",
      "playing piano",
      "keyboard piano"
    ]
  },
  {
    "tag": "Drums",
    "category": "object",
    "keywords": [
      "drum",
      "drums",
      "drumming",
      "drum set",
      "drum kit",
      "percussion"
    ]
  },
  {
    "tag": "Helicopter",
    "category": "object",
    "keywords": [
      "helicopter",
      "chopper",
      "helicopter blades",
      "flying in helicopter",
      "helipad"
    ]
  },
  {
    "tag": "Spaceship",
    "category": "object",
    "keywords": [
      "spaceship",
      "spacecraft",
      "starship",
      "rocket",
      "shuttle",
      "cockpit of spaceship"
    ]
  },
  {
    "tag": "Submarine",
    "category": "object",
    "keywords": [
      "submarine",
      "sub",
      "underwater vessel",
      "periscope",
      "sonar"
    ]
  },
  {
    "tag": "Potion",
    "category": "object",
    "keywords": [
      "potion",
      "elixir",
      "drank a potion",
      "magic bottle",
      "glowing liquid"
    ]
  },
  {
    "tag": "Wand",
    "category": "object",
    "keywords": [
      "wand",
      "magic wand",
      "pointing wand",
      "casting with wand"
    ]
  },
  {
    "tag": "Crown",
    "category": "object",
    "keywords": [
      "crown",
      "tiara",
      "golden crown",
      "wearing a crown"
    ]
  },
  {
    "tag": "Knight",
    "category": "character",
    "keywords": [
      "knight",
      "knights",
      "knight in armor",
      "paladin",
      "chivalry"
    ]
  },
  {
    "tag": "King",
    "category": "character",
    "keywords": [
      "king",
      "kings",
      "monarch",
      "royal throne"
    ]
  },
  {
    "tag": "Queen",
    "category": "character",
    "keywords": [
      "queen",
      "queens",
      "empress",
      "royal queen"
    ]
  },
  {
    "tag": "Prince",
    "category": "character",
    "keywords": [
      "prince",
      "royal prince"
    ]
  },
  {
    "tag": "Princess",
    "category": "character",
    "keywords": [
      "princess",
      "royal princess"
    ]
  },
  {
    "tag": "Thief",
    "category": "character",
    "keywords": [
      "thief",
      "robber",
      "burglar",
      "stole",
      "stolen",
      "robbery",
      "pickpocket"
    ]
  },
  {
    "tag": "Wizard",
    "category": "character",
    "keywords": [
      "wizard",
      "sorcerer",
      "mage",
      "warlock",
      "wise wizard",
      "spellcaster"
    ]
  },
  {
    "tag": "Witch",
    "category": "character",
    "keywords": [
      "witch",
      "witches",
      "witchcraft",
      "coven",
      "enchantress"
    ]
  },
  {
    "tag": "Giant",
    "category": "character",
    "keywords": [
      "giant",
      "giants",
      "colossal figure",
      "towering giant",
      "huge giant"
    ]
  },
  {
    "tag": "Late",
    "category": "theme",
    "keywords": [
      "late for school",
      "late for work",
      "running late",
      "missed the bus",
      "overslept",
      "missed deadline",
      "alarm did not go off"
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
