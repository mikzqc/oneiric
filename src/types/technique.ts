export type TechniqueType =
  | 'MILD'
  | 'SSILD'
  | 'WBTB'
  | 'WILD'
  | 'DEILD'
  | 'FILD'
  | 'SATS'
  | 'Reality Checks'
  | 'Intention Setting'
  | 'CANWILD'
  | 'Other';

export type TechniqueOutcome = 'no_recall' | 'dream_recalled' | 'lucid_dream';

export interface TechniqueLog {
  id: string;
  date: string; // YYYY-MM-DD
  technique: TechniqueType | string;
  customTechniqueName?: string;
  notes?: string;
  outcome: TechniqueOutcome;
  bedTime?: string;
  wakeTime?: string;
  confidenceRating?: number;
  secondaryTechniques?: (TechniqueType | string)[];
  lucidDreamAchieved?: boolean;
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TechniqueDraft = Omit<TechniqueLog, 'id' | 'createdAt' | 'updatedAt'>;

export type TechniqueCategory =
  | 'All Protocols'
  | 'Mnemonic & Mental'
  | 'Sensory Conditioning'
  | 'Direct Entry (WILD)'
  | 'Awakening & REM'
  | 'Daytime Awareness'
  | 'Hypnagogic State';

export type TechniqueDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface TechniqueInfo {
  id: string;
  name: string;
  acronym: string;
  category: TechniqueCategory;
  difficulty: TechniqueDifficulty;
  shortDesc: string;
  description: string;
  scientificMechanism: string;
  recommendedTiming: string;
  prerequisites: string;
  steps: string[];
  bestPractices: string[];
  commonPitfalls: string[];
  synergies: string[];
}

export const TECHNIQUE_CATALOG: TechniqueInfo[] = [
  {
    id: 'MILD',
    name: 'Mnemonic Induction of Lucid Dreams',
    acronym: 'MILD',
    category: 'Mnemonic & Mental',
    difficulty: 'Beginner',
    shortDesc: 'Prospective memory affirmation paired with visualization of lucidity.',
    description:
      'Developed by Dr. Stephen LaBerge at Stanford University, MILD trains prospective memory (remembering to perform a specific action in the future) so that when you enter a dream, you spontaneously remember to realize that you are dreaming.',
    scientificMechanism:
      'Activates prospective memory circuits within the dorsolateral prefrontal cortex. Mentally rehearsing dream recognition primes neural networks to fire recognition patterns upon encountering dream signs during subsequent REM cycles.',
    recommendedTiming: 'During WBTB after 4.5 to 6 hours of sleep (most effective), or at bedtime.',
    prerequisites: 'Basic dream recall (remembering at least 1 dream per night regularly).',
    steps: [
      'Upon waking up from a dream during the night (ideally during a WBTB window), recall as much detail as possible.',
      'Lie comfortably in bed and relax completely. While falling back to sleep, vividly visualize yourself returning to that exact dream.',
      'In your mental rehearsal, identify a dream sign or bizarre occurrence and see yourself realizing: "Aha, I am dreaming!".',
      'Silently repeat a focused mnemonic affirmation: "The next time I am dreaming, I will remember to recognize that I am dreaming."',
      'Hold the sensory experience of realizing you are lucid and allow yourself to gently drift back to sleep with this thought as your final conscious focus.',
    ],
    bestPractices: [
      'Focus intensely on the *feeling* and conviction of lucidity, rather than mindlessly chanting words.',
      'Pick a specific moment from a recent dream where you missed a dream sign, and rewrite the outcome in your mind.',
      'Combine with 15–30 minutes of quiet WBTB wakefulness to elevate cortical arousal.',
    ],
    commonPitfalls: [
      'Chanting affirmations like a robot without visual and emotional engagement.',
      'Allowing random racing thoughts to supersede the visualization right before sleep.',
      'Practicing only at initial bedtime when deep NREM sleep dominates rather than REM.',
    ],
    synergies: ['WBTB', 'Reality Checks', 'Prospective Memory'],
  },
  {
    id: 'WBTB',
    name: 'Wake Back To Bed',
    acronym: 'WBTB',
    category: 'Awakening & REM',
    difficulty: 'Beginner',
    shortDesc: 'Strategic sleep interruption during peak REM to restore conscious prefrontal cortex activity.',
    description:
      'WBTB is the universal multiplier and backbone for all lucid dreaming techniques. By briefly waking during peak late-night REM phases, your prefrontal cortex regains executive function before diving back into prolonged REM sleep.',
    scientificMechanism:
      'Human sleep architecture concentrates longer REM cycles in the final 3–4 hours of the sleep cycle. Waking up during this window clears sleep inertia, resets cognitive faculties, and allows transitioning directly into vivid, protracted REM with elevated neurochemical alertness.',
    recommendedTiming: '5 to 6 hours after initial sleep onset (typically 4:30 AM – 6:00 AM).',
    prerequisites: 'Consistent sleep schedule and sufficient total sleep opportunity (7–8 hours).',
    steps: [
      'Set a gentle, non-jarring alarm for 5 to 6 hours after you plan to fall asleep.',
      'When the alarm rings, immediately sit up and get out of bed into a dimly lit room.',
      'Spend 15 to 30 minutes engaged in quiet, lucid-dreaming-related activities (e.g., reading your dream journal, studying technique protocols, practicing calm meditation).',
      'Avoid bright blue light, phone screens, social media, work emails, or intense physical exertion.',
      'Return to bed and apply an induction protocol (such as MILD, SSILD, or WILD) as you drift back to sleep.',
    ],
    bestPractices: [
      'Calibrate your awake time: if you take a long time to fall back asleep, stay up only 10–15 minutes; if you fall asleep instantly and lose alertness, stay up 30–45 minutes.',
      'Keep a warm sweater nearby so you do not get chilled during the awake period.',
      'Hydrate with a sip of water, but avoid heavy snacks or caffeine.',
    ],
    commonPitfalls: [
      'Getting hooked on bright smartphone feeds, destroying melatonin and triggering insomnia.',
      'Setting alarms every hour, which severely fragments sleep architecture and causes daytime exhaustion.',
      'Staying in bed with eyes closed and immediately falling back into deep sleep without cognitive engagement.',
    ],
    synergies: ['MILD', 'SSILD', 'WILD', 'FILD'],
  },
  {
    id: 'SSILD',
    name: 'Senses Initiated Lucid Dream',
    acronym: 'SSILD',
    category: 'Sensory Conditioning',
    difficulty: 'Beginner',
    shortDesc: 'Rapid and slow cyclical sensory scans through sight, sound, and touch.',
    description:
      'Developed by user CosmicIron, SSILD is one of the highest-yield, most user-friendly modern induction protocols. By systematically sweeping attention across primary senses, your brain enters a state of heightened sensory readiness that naturally spawns DILDs, false awakenings, or seamless WILD transitions.',
    scientificMechanism:
      'Sensory cycling conditions passive, receptive mindfulness without intellectual strain. It balances the mind on the threshold of hypnagogia, preventing unconscious sleep while avoiding the anxiety or performance pressure common in direct WILD attempts.',
    recommendedTiming: 'Strictly during WBTB (after 4.5 to 5.5 hours of sleep).',
    prerequisites: 'Ability to fall back asleep within 15–20 minutes after WBTB.',
    steps: [
      'Wake up after 4.5–5 hours of sleep and spend 5–10 minutes awake.',
      'Return to bed in a comfortable position and close your eyes.',
      'Phase 1 (Quick Warm-up): Spend 3–5 seconds focusing on the blackness/patterns behind your eyelids (Sight). Shift to room sounds/ear ringing for 3–5 seconds (Sound). Shift to skin/sheet sensations for 3–5 seconds (Touch). Repeat for 4 to 6 quick cycles.',
      'Phase 2 (Slow Conditioning): Now repeat the cycle slowly, spending 20 to 30 seconds on each sense (Sight → Sound → Touch). Complete 3 to 4 slow cycles.',
      'Phase 3 (Sleep Release): When done, roll over into your most comfortable natural sleeping posture and allow yourself to fall asleep naturally. Do not try to force lucidity.',
    ],
    bestPractices: [
      'Never strain to see visuals or hear faint sounds. Passive observation is the core principle.',
      'Always perform a thorough reality check the moment you open your eyes in the morning or during the night—SSILD is legendary for generating ultra-realistic false awakenings.',
    ],
    commonPitfalls: [
      'Treating the slow cycles like a strict chore and stressing over timing each second.',
      'Continuing the cycles indefinitely instead of letting go and falling asleep.',
      'Failing to reality check upon waking and mistaking a lucid false awakening for physical reality.',
    ],
    synergies: ['WBTB', 'False Awakening Tracking', 'Reality Checks'],
  },
  {
    id: 'WILD',
    name: 'Wake Initiated Lucid Dream',
    acronym: 'WILD',
    category: 'Direct Entry (WILD)',
    difficulty: 'Advanced',
    shortDesc: 'Conscious uninterrupted transition from waking awareness directly into the dreamscape.',
    description:
      'The direct transition from waking consciousness straight into the dream state without any break in awareness. WILD bypasses the need for spontaneous dream-sign recognition, resulting in immediate high-clarity lucidity with complete stability.',
    scientificMechanism:
      'Maintains cortical awareness while the thalamus gates sensory input and the brainstem initiates REM atonia (sleep paralysis). As hypnagogic imagery coalesces, conscious awareness anchors to an internal focus until the sensory dreamscape envelops perception.',
    recommendedTiming: 'During WBTB after 5 hours of sleep, or during an afternoon nap.',
    prerequisites: 'Solid foundation in relaxation, ability to remain still, and emotional comfort with hypnagogia.',
    steps: [
      'Wake up after 5 hours of sleep, stay up for 15–20 minutes, then return to bed.',
      'Lie flat on your back or in your favorite sleep posture and systematically relax every muscle from toes to crown.',
      'Establish a gentle mental anchor (such as breathing sensations, a quiet mental countdown, or observing phosphenes behind eyelids).',
      'As your body falls asleep, you may perceive hypnagogic hallucinations: buzzing sounds, geometric lights, or a feeling of heaviness/vibrations.',
      'Remain a passive, calm observer. Do not attempt to move or open your physical eyes.',
      'When the sensations peak or a complete visual scene forms, gently step, float, or roll your dream body out of bed into the dream.',
    ],
    bestPractices: [
      'Remember that sleep paralysis / atonia is completely harmless and simply the body’s natural safety mechanism to prevent acting out dreams.',
      'Keep your mental anchor subtle. If you concentrate too aggressively, you will prevent sleep onset.',
    ],
    commonPitfalls: [
      'Attempting WILD at initial bedtime when your body needs deep slow-wave NREM sleep.',
      'Panicking or fighting hypnagogic vibrations and auditory illusions.',
      'Checking repeatedly whether your body is asleep yet (the "roll-over urge" paradox).',
    ],
    synergies: ['WBTB', 'SATS', 'DEILD'],
  },
  {
    id: 'DEILD',
    name: 'Dream Exit Induced Lucid Dream (Dream Chaining)',
    acronym: 'DEILD',
    category: 'Direct Entry (WILD)',
    difficulty: 'Intermediate',
    shortDesc: 'Re-entering the dream state immediately upon waking by staying motionless.',
    description:
      'Also known as "dream chaining", DEILD takes advantage of the brief neurochemical window immediately following an awakening from REM sleep. By remaining completely still with eyes closed, you can re-enter a dream within 5 to 15 seconds.',
    scientificMechanism:
      'When waking naturally from REM sleep, the brain remains in a neurochemical state saturated with acetylcholine. If motor movement and sensory stimulation are avoided, REM atonia can be instantly re-engaged, bridging directly into a new dream scene.',
    recommendedTiming: 'Any natural nighttime awakening immediately following a dream.',
    prerequisites: 'Conditioning yourself to wake up without moving or opening your eyes.',
    steps: [
      'Train yourself through daytime intention: the moment you realize you are waking up, freeze completely.',
      'Keep your eyes firmly closed and do not shift your posture, scratch an itch, or swallow heavily.',
      'Immediately recall the dream you were just having or visualize a desired dream setting.',
      'Within seconds, you will feel the physical body dissolve into hypnagogic vibrations or auditory shifts.',
      'Step back into the visualized dream world with full lucidity.',
    ],
    bestPractices: [
      'Even if you moved slightly upon waking, stay still immediately—DEILD can often still succeed within 20 seconds.',
      'Chain multiple dreams in sequence: when one dream fades, hold still and DEILD right into the next.',
    ],
    commonPitfalls: [
      'Opening your eyes or rolling over before remembering to stay still.',
      'Giving up too quickly if the dream does not materialize in 5 seconds.',
    ],
    synergies: ['WILD', 'FILD', 'WBTB'],
  },
  {
    id: 'FILD',
    name: 'Finger Induced Lucid Dream',
    acronym: 'FILD',
    category: 'Direct Entry (WILD)',
    difficulty: 'Intermediate',
    shortDesc: 'Micro-movements of two fingers on a flat surface as a gentle hypnagogic anchor.',
    description:
      'A streamlined variation of WILD designed for extreme sleepiness. By performing imperceptible, alternating finger movements like playing two piano keys, your mind retains a thread of awareness while the body drops directly into REM.',
    scientificMechanism:
      'Sub-threshold motor cortex stimulation provides just enough neural signal to keep the conscious mind tethered without activating muscular tension or preventing transition into sleep atonia.',
    recommendedTiming: 'During WBTB when you are extremely tired and able to fall asleep in 1–2 minutes.',
    prerequisites: 'High level of sleepiness; practice during WBTB or late morning naps.',
    steps: [
      'Wake up after 4.5–5 hours of sleep, briefly wake your mind for 5–10 minutes, and return to bed.',
      'Lie in a comfortable position with your fingers resting gently on the mattress.',
      'When you are on the very brink of sleep, begin alternating micro-movements with your index and middle fingers.',
      'The movement should be so subtle that your fingers barely move—you are essentially just sending the mental impulse to press down.',
      'Continue this gentle rhythm for 30 to 45 seconds while letting the rest of your body fall completely asleep.',
      'Without opening your eyes, perform a nose-pinch reality check with your other hand. If you can breathe through your pinched nose, you are already inside the dream!',
    ],
    bestPractices: [
      'Do not press down firmly; imagine touching keys made of mist.',
      'The nose-pinch check is crucial: 90% of successful FILD attempts feel identical to being awake in bed.',
    ],
    commonPitfalls: [
      'Pressing fingers too hard, which activates muscular tension and prevents sleep.',
      'Counting seconds or stressing over timing rather than sinking into sleepiness.',
    ],
    synergies: ['WBTB', 'DEILD', 'Reality Checks'],
  },
  {
    id: 'Reality Checks',
    name: 'Reality Checks & All-Day Awareness (ADA)',
    acronym: 'RC / ADA',
    category: 'Daytime Awareness',
    difficulty: 'Beginner',
    shortDesc: 'Systematic daytime reality verification habits that migrate into nocturnal consciousness.',
    description:
      'Reality testing is the foundation of cognitive lucid dreaming. By cultivating genuine critical reflection regarding your state of consciousness throughout waking hours, this critical faculty replicates naturally within the dream state.',
    scientificMechanism:
      'Habitual metacognition strengthens the connection between the frontopolar cortex and sensory processing hubs. Because the subconscious copies waking mental habits, questioning reality during the day triggers spontaneous lucidity in dreams (DILD).',
    recommendedTiming: 'Throughout waking hours (8–12 times per day), especially upon seeing dream signs.',
    prerequisites: 'Mindfulness and willingness to pause routine activities for 15 seconds.',
    steps: [
      'Pause whatever you are doing and genuinely ask: "Could this possibly be a dream right now?".',
      'The Nose-Pinch Check: Pinch both nostrils closed with fingers and try to breathe through your nose. (In a dream, you will breathe effortlessly through the closed nose).',
      'The Text & Digital Clock Check: Read a line of text or watch a digital clock, look away for 2 seconds, and look back. (In dreams, text and numbers almost always mutate or scramble).',
      'Memory Tracing: Trace back how you arrived in this room over the past 2 hours. (Dreams rarely have a logical chronological beginning).',
      'Examine your hands: Count your fingers one by one. Check for extra, missing, or morphing fingers.',
    ],
    bestPractices: [
      'Never perform a check on autopilot. For at least 10 seconds, genuinely entertain the hypothesis that you might be dreaming.',
      'Anchor your checks to personal dream signs identified in your Oneiric Dream Signs library (e.g., passing through doors, seeing cats, meeting school friends).',
    ],
    commonPitfalls: [
      'Mindless physical checks: pinching your nose while thinking about dinner or scrolling social media.',
      'Doing only one physical test: always combine two independent checks (e.g. nose pinch + text re-read).',
    ],
    synergies: ['Dream Signs Library', 'MILD', 'False Awakening Tracking'],
  },
  {
    id: 'SATS',
    name: 'State Akin To Sleep & Sensory Looping',
    acronym: 'SATS',
    category: 'Hypnagogic State',
    difficulty: 'Intermediate',
    shortDesc: 'Entering a drowsy theta-wave trance while looping a focused sensory dream seed.',
    description:
      'A deeply relaxed hypnagogic technique popularized in cognitive psychology and mental rehearsal. By entering the borderland between waking and sleeping while looping a short sensory scene, you seed the nascent dreamscape with targeted imagery.',
    scientificMechanism:
      'Exploits the brain’s transition into high-amplitude theta brainwaves (4–7 Hz), where the critical conscious filter softens while imagery generation is hyper-responsive to intentional priming.',
    recommendedTiming: 'At bedtime, during WBTB, or during afternoon relaxation sessions.',
    prerequisites: 'Ability to relax physical muscles and maintain visualization without falling asleep instantaneously.',
    steps: [
      'Lie in a comfortable position and take deep, rhythmic breaths until your body feels heavy and relaxed.',
      'Let your mind quiet down into a drowsy, floating hypnagogic state where thoughts begin to drift.',
      'Construct a short, 5-to-10 second sensory-rich scene representing your dream goal (e.g., flying over mountains, touching a smooth stone, talking to a specific person).',
      'Loop this short scene continuously in the first-person ("through your own eyes"), feeling the physical textures, temperatures, and sounds.',
      'Do not struggle or fight off sleep. Allow the vividness of the looped scene to become your entire reality as you drift across the threshold.',
    ],
    bestPractices: [
      'Keep the scene brief and repetitive rather than creating a long, complex movie.',
      'Focus intensely on tactile touch and bodily movement—kinetic sensations seed dreams faster than abstract visuals.',
    ],
    commonPitfalls: [
      'Looping in the third-person (watching yourself like a movie character) rather than first-person.',
      'Making the scene too long, causing the mind to wander onto unrelated tangents.',
    ],
    synergies: ['WILD', 'MILD', 'Intention Setting'],
  },
  {
    id: 'Intention Setting',
    name: 'Prospective Memory & Subconscious Priming',
    acronym: 'Intention',
    category: 'Mnemonic & Mental',
    difficulty: 'Beginner',
    shortDesc: 'Formulating clear psychological resolve and subconscious directives before sleep.',
    description:
      'A gentle yet foundational practice that aligns the conscious mind with the subconscious before sleep. By writing down and vocalizing your core lucid intention, you establish an emotional contract with your dreaming mind.',
    scientificMechanism:
      'Pre-sleep cognitive priming biases the memory consolidation processes that occur during nocturnal sleep spindles and REM phases, increasing the salience of lucid dream triggers.',
    recommendedTiming: 'Right before lights out at bedtime, and upon returning to bed during WBTB.',
    prerequisites: 'A dream journal and a quiet pre-sleep environment.',
    steps: [
      'Formulate one concise, unambiguous goal (e.g., "Tonight I will notice when something impossible happens and realize I am dreaming").',
      'Write your intention down in your journal with genuine focus and presence.',
      'Take three slow, deep breaths, letting go of daytime stress and worries.',
      'Silently affirm your resolve with quiet confidence as you turn off the light and close your eyes.',
    ],
    bestPractices: [
      'Focus on positive affirmations ("I will remember") rather than negative framing ("I will not miss my signs").',
      'Pair intention with a short 2-minute review of your most common personal dream signs.',
    ],
    commonPitfalls: [
      'Treating intention as an anxious demand rather than a calm, confident expectation.',
      'Cramming too many conflicting goals into a single night.',
    ],
    synergies: ['MILD', 'Reality Checks', 'Dream Signs Library'],
  },
  {
    id: 'CANWILD',
    name: 'Custom Alarm Network WILD',
    acronym: 'CANWILD',
    category: 'Direct Entry (WILD)',
    difficulty: 'Advanced',
    shortDesc: 'Using hands-free auto-shutoff timers to enter WILD with absolute zero movement.',
    description:
      'An engineered variation of WILD that eliminates the primary obstacle of direct entry: moving your body to turn off an alarm. Using an automated alarm that beeps for 2–3 seconds and turns off automatically, you awake with zero physical movement, primed for instant dream entry.',
    scientificMechanism:
      'Physical movement, even reaching for an alarm clock, rapidly terminates REM atonia and dumps adrenaline into the bloodstream. By waking from auditory stimulus that stops on its own, REM atonia is preserved intact.',
    recommendedTiming: 'Set for 4.5, 6, and 7.5 hours after bedtime.',
    prerequisites: 'An auto-shutoff timer or alarm app capable of stopping after 2–3 beeps without screen interaction.',
    steps: [
      'Set an alarm app with an auto-dismiss function (sound plays for 2 to 3 seconds and stops automatically).',
      'When the alarm sounds in the morning, do not move a single muscle, do not open your eyes, and do not reach for your phone.',
      'Allow the alarm to shut off by itself while you remain completely still.',
      'Instantly begin a gentle mental anchor (such as sensory visualization, FILD finger taps, or breath awareness).',
      'Within 10 to 30 seconds, transition directly into a vivid dream world with your dream body.',
    ],
    bestPractices: [
      'Choose a gentle, quiet chime that is just loud enough to stir consciousness without inducing panic or a spike in heart rate.',
      'Combine with DEILD if you wake up naturally between alarm cycles.',
    ],
    commonPitfalls: [
      'Setting the alarm too loud, causing an adrenaline surge that destroys sleepiness.',
      'Reflexively moving your arm to silence the alarm out of daytime habit.',
    ],
    synergies: ['WILD', 'FILD', 'DEILD'],
  },
];
