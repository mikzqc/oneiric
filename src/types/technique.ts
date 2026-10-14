export type TechniqueType =
  | 'MILD'
  | 'SSILD'
  | 'WBTB'
  | 'WILD'
  | 'SATS'
  | 'Reality Checks'
  | 'Intention Setting'
  | 'Other';

export type TechniqueOutcome = 'no_recall' | 'dream_recalled' | 'lucid_dream';

export interface TechniqueLog {
  id: string;
  date: string; // YYYY-MM-DD
  technique: TechniqueType;
  customTechniqueName?: string;
  notes?: string;
  outcome: TechniqueOutcome;

  // Phase 2 Experiment Tracker Extensions
  bedTime?: string; // HH:mm
  wakeTime?: string; // HH:mm
  confidenceRating?: number; // 1 to 5
  secondaryTechniques?: TechniqueType[];
  lucidDreamAchieved?: boolean;

  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TechniqueDraft = Omit<TechniqueLog, 'id' | 'createdAt' | 'updatedAt'>;

export interface TechniqueInfo {
  id: TechniqueType;
  name: string;
  shortDesc: string;
  description: string;
  steps: string[];
  bestPractices: string[];
  recommendedTiming: string;
}

export const TECHNIQUE_CATALOG: TechniqueInfo[] = [
  {
    id: 'MILD',
    name: 'MILD (Mnemonic Induction of Lucid Dreams)',
    shortDesc: 'Prospective memory affirmation paired with visualization before sleep.',
    description:
      'Developed by Dr. Stephen LaBerge, MILD trains prospective memory (remembering to do something in the future) so that when you enter a dream, you remember that you are dreaming.',
    steps: [
      'Set an intention before falling asleep to remember your dreams upon waking.',
      'When waking up from a dream in the night (ideally during WBTB), recall it in detail.',
      'Visualize yourself back in that dream, recognizing a dream sign or realizing "I am dreaming!".',
      'Repeat a mnemonic affirmation like "Next time I am dreaming, I will remember that I am dreaming".',
      'Hold this visualization and intention as you drift off back to sleep.',
    ],
    bestPractices: [
      'Most effective when practiced after 4.5 to 6 hours of sleep (WBTB).',
      'Focus on the feeling of awareness rather than just repeating words mindlessly.',
    ],
    recommendedTiming: 'During WBTB (after 4.5–6 hours of sleep)',
  },
  {
    id: 'SSILD',
    name: 'SSILD (Senses Initiated Lucid Dream)',
    shortDesc: 'Cycling focus through sight, sound, and touch sensations.',
    description:
      'A simple, highly effective modern technique. SSILD puts your mind in a state of heightened sensory readiness that naturally triggers lucidity or false awakenings.',
    steps: [
      'Wake up after 4.5–5 hours of sleep, stay awake for 5–15 minutes.',
      'Return to bed and close your eyes. Cycle 1: Focus on behind your eyelids (Sight) for a few seconds.',
      'Shift attention to the sounds in your ears/room (Sound) for a few seconds.',
      'Shift attention to bodily sensations/sheets (Touch) for a few seconds.',
      'Complete 4-6 quick cycles, then do 3-4 longer cycles (20-30 seconds per sense).',
      'Fall asleep comfortably without thinking about the technique.',
    ],
    bestPractices: [
      'Do not strain to see or hear things; gentle observation is key.',
      'Always do a reality check when you wake up, as SSILD produces vivid false awakenings.',
    ],
    recommendedTiming: 'During WBTB (after 4.5–5 hours of sleep)',
  },
  {
    id: 'WBTB',
    name: 'WBTB (Wake Back To Bed)',
    shortDesc: 'Interrupting sleep to enter REM with conscious alertness.',
    description:
      'WBTB is the cornerstone amplifier for all induction techniques. By briefly awakening during the peak REM period, your cognitive prefrontal cortex reactivates.',
    steps: [
      'Set an alarm for 5 to 6 hours after your bedtime.',
      'Get out of bed and engage in light, quiet activity (reading about lucid dreaming, journaling) for 15-45 minutes.',
      'Avoid blue light screens or stressful stimuli.',
      'Return to bed while practicing MILD, SSILD, or WILD.',
    ],
    bestPractices: [
      'Adjust awake duration to your sleepiness: if you struggle to sleep, stay awake 10 min; if too groggy, 30 min.',
      'Keep the room dimly lit with warm light.',
    ],
    recommendedTiming: '5 to 6 hours after going to sleep',
  },
  {
    id: 'Reality Checks',
    name: 'Reality Checks & All-Day Awareness',
    shortDesc: 'Regular critical tests of reality throughout the waking day.',
    description:
      'Regularly testing whether you are awake builds a habit of critical reflection that carries directly into dream environments.',
    steps: [
      'Stop what you are doing and genuinely ask: "Am I dreaming right now?".',
      'Perform a physical check: pinch your nose and try to breathe, or examine your hands and count fingers.',
      'Trace back your steps: how did you arrive where you are right now?',
      'Check text, look away, and read it again to see if letters morph.',
    ],
    bestPractices: [
      'Never perform a reality check on autopilot—genuinely question reality for 10 seconds.',
      'Attach checks to personal dream signs (e.g. whenever you walk through a doorway or see water).',
    ],
    recommendedTiming: 'Throughout waking hours (5–10 times daily)',
  },
  {
    id: 'SATS',
    name: 'SATS (State Akin To Sleep)',
    shortDesc: 'Entering a hypnagogic drowsy trance focused on a chosen scene.',
    description:
      'A deeply relaxed hypnagogic state where the body is asleep or near paralysis while consciousness retains gentle directional focus on a specific dream scenario.',
    steps: [
      'Lie down in a relaxed posture and let physical tension dissolve.',
      'Allow drowsiness to set in until you feel floating or heavy.',
      'Loop a short, 5-second first-person sensory scene representing your desired dream activity.',
      'Let the scene gain vividness until it encapsulates your conscious awareness.',
    ],
    bestPractices: [
      'Keep the loop short and sensory-rich (feeling the wind, touching an object).',
      'Maintain an observer mindset without forcing muscular effort.',
    ],
    recommendedTiming: 'Bedtime or afternoon naps',
  },
  {
    id: 'Intention Setting',
    name: 'Intention Setting & Prospective Memory',
    shortDesc: 'Formulating clear psychological resolve before sleep.',
    description:
      'Priming the subconscious with unambiguous, prioritized goals for the upcoming dream cycles.',
    steps: [
      'Decide on one specific dream goal (e.g., "I will look at my hands and become lucid").',
      'Write down your goal in your journal before turning off the lights.',
      'Reflect on why this goal matters to you.',
      'Affirm your commitment with quiet conviction as you close your eyes.',
    ],
    bestPractices: [
      'Keep your intention simple and focused on a single action.',
      'Pair with steady, calming breathing.',
    ],
    recommendedTiming: 'Right before lights out',
  },
  {
    id: 'WILD',
    name: 'WILD (Wake Initiated Lucid Dream)',
    shortDesc: 'Transitioning directly from waking awareness into the dream state.',
    description:
      'The direct transition from conscious wakefulness into REM sleep without a lapse in consciousness. Known for profound hypnagogia and immediate vivid lucidity.',
    steps: [
      'Combine with WBTB after 5 hours of sleep.',
      'Lie completely still and relax every muscle group from head to toe.',
      'Passively observe hypnagogic imagery, lights, and sounds without grasping at them.',
      'When vibrations or sleep paralysis sensations occur, remain calm and breathe steadily.',
      'Visualize moving your dream body out of bed or waiting for the scene to materialize around you.',
    ],
    bestPractices: [
      'Never panic during sleep paralysis; it is a natural, harmless protective reflex.',
      'Best attempted when physically tired but mentally alert.',
    ],
    recommendedTiming: 'During WBTB or afternoon naps',
  },
  {
    id: 'Other',
    name: 'Other / Custom Protocol',
    shortDesc: 'Custom experimental methods, herbal supplements, or hybrid routines.',
    description:
      'Track personalized combinations, meditation protocols, or experimental lucid dreaming methods.',
    steps: [
      'Document your specific sequence in the attempt notes.',
      'Track consistency and observe outcomes over multiple attempts.',
    ],
    bestPractices: [
      'Change only one variable at a time when experimenting.',
    ],
    recommendedTiming: 'Custom',
  },
];
