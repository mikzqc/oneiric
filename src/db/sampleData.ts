import { DreamEntry } from '../types/dream';
import { TechniqueLog } from '../types/technique';
import { DreamSign } from '../types/dreamSign';
import { getTodayDateString } from '../utils/dateUtils';

export function generateSampleData(): {
  dreams: DreamEntry[];
  techniqueLogs: TechniqueLog[];
  dreamSigns: DreamSign[];
} {
  const now = new Date();

  const getDateOffset = (offsetDays: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - offsetDays);
    return getTodayDateString(d);
  };

  const dreams: DreamEntry[] = [
    {
      id: 'sample-dream-1',
      title: 'The Obsidian Observatory and the River of Stars',
      narrative:
        'I found myself standing on an open marble terrace atop a colossal obsidian spire protruding through a purple twilight cloud deck. Celestial brass instruments turned silently above me, mapping constellations that pulsed in harmonic resonance.\n\nI looked down at my hands and noticed faint, glowing silver traceries beneath my skin. The sudden thought struck me: "I am dreaming right now." The realization brought a thrilling rush of energy. I took a slow breath, anchored my feet to the cool obsidian floor, and spun slowly to stabilize the environment.\n\nThe stars above were not distant dots; they formed a flowing river of liquid light descending into a canyon below. I gently pushed off the stone balustrade and floated weightless, steering by thought toward the luminous ring.',
      date: getDateOffset(0),
      wakeUpTime: '06:45',
      vividness: 5,
      recallQuality: 'crystal',
      lucidity: 'lucid',
      dreamControl: 4,
      lucidityConfidence: 5,
      scenesCount: 2,
      scenes: [
        {
          id: 's1-scene-1',
          sceneNumber: 1,
          title: 'The Obsidian Spire Terrace',
          narrative:
            'I found myself standing on an open marble terrace atop a colossal obsidian spire protruding through a purple twilight cloud deck. Celestial brass instruments turned silently above me, mapping constellations that pulsed in harmonic resonance.',
          lucid: false,
          falseAwakening: false,
        },
        {
          id: 's1-scene-2',
          sceneNumber: 2,
          title: 'Astral Light Flight',
          narrative:
            'I looked down at my hands and noticed glowing silver traceries beneath my skin. Confirming lucidity, I grounded my feet, spun to stabilize, and floated into the river of liquid light.',
          lucid: true,
          falseAwakening: false,
        },
      ],
      falseAwakening: false,
      realityChecksUseful: ['Looking at hands', 'Grounding & spinning'],
      interpretationNotes: 'Constellation motifs symbolize striving for cognitive clarity and navigation in waking life.',
      emotions: ['Wonder', 'Awe', 'Euphoria', 'Serenity'],
      tags: ['Flying', 'Space', 'Astral'],
      dreamSignsNotes:
        'Dream sign: Glowing silver lines in hands triggered a reality check. Anchored lucidity by grounding on stone and spinning.',
      isSample: true,
      createdAt: Date.now() - 3600000 * 5,
      updatedAt: Date.now() - 3600000 * 5,
    },
    {
      id: 'sample-dream-2',
      title: 'The Subterranean Library of Alexandria',
      narrative:
        'Walking along endless curved corridors carved from pale limestone. Thousands of scrolls and ancient leather-bound codices rested in alcoves illuminated by soft, bioluminescent cyan moss.\n\nAn elderly scholar wearing a cloak woven from peacock feathers was indexing scrolls using a wooden compass. We spoke about forgotten languages; every time I tried to read the script, the letters rearranged themselves into geometric fractals. I did not realize it was a dream, but felt an immense sense of ancient peace and curiosity.',
      date: getDateOffset(1),
      wakeUpTime: '07:15',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'non-lucid',
      dreamControl: 1,
      scenesCount: 1,
      falseAwakening: false,
      realityChecksUseful: ['Reading text twice'],
      interpretationNotes: 'Felt like a deep dive into unconscious archives of forgotten memories.',
      emotions: ['Curiosity', 'Mystery', 'Serenity'],
      tags: ['Recurring Theme'],
      dreamSignsNotes:
        'Text morphing into fractals when reading—classic dream sign to remember for next time!',
      isSample: true,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: 'sample-dream-3',
      title: 'Gliding Above the Phosphor Coast',
      narrative:
        'Running down a steep dune toward a bioluminescent ocean. When my feet touched the water, instead of sinking, the waves lifted me up like a thermal updraft. I remembered my SSILD intention from earlier that night.\n\nI pinched my nose and discovered I could breathe comfortably underwater! That confirmed lucidity instantly. I spent several minutes practicing flight stabilization, feeling the salt breeze and testing the kinetic resistance of the air.',
      date: getDateOffset(2),
      wakeUpTime: '05:30',
      vividness: 5,
      recallQuality: 'crystal',
      lucidity: 'lucid',
      dreamControl: 5,
      lucidityConfidence: 5,
      scenesCount: 2,
      falseAwakening: false,
      realityChecksUseful: ['Nose-pinch breathing check', 'Flight balance'],
      interpretationNotes: 'Breakthrough in sensory tactile stabilization during flight.',
      emotions: ['Adventure', 'Joy', 'Euphoria'],
      tags: ['Flying', 'Ocean', 'Lucid Induction'],
      dreamSignsNotes:
        'Nose-pinch reality check succeeded underwater. Triggered directly after SSILD cycles during 5 AM awakening.',
      isSample: true,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'sample-dream-4',
      title: 'The Bedroom Alarm Loop',
      narrative:
        'I awoke in my bedroom to the sound of my alarm. The morning sunlight was streaming across my wooden floorboards, exactly as normal. I sat up on the edge of the bed and reached for my glasses.\n\nLooking at the digital clock on my nightstand, the LED numbers were spinning backward: 88:99, then 72:14. For a moment I felt complete confusion. I pinched my nose and breathed in effortlessly—revealing that I had never actually woken up! It was a vivid false awakening. Before I could leave the room, the transition faded into true awakening.',
      date: getDateOffset(4),
      wakeUpTime: '08:00',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'lucid',
      dreamControl: 2,
      lucidityConfidence: 4,
      scenesCount: 2,
      scenes: [
        {
          id: 's4-scene-1',
          sceneNumber: 1,
          title: 'Morning Routine Bedroom',
          narrative:
            'I awoke in my bedroom to the sound of my alarm. The morning sunlight was streaming across my wooden floorboards. I sat up on the edge of the bed and reached for my glasses.',
          lucid: false,
          falseAwakening: true,
        },
        {
          id: 's4-scene-2',
          sceneNumber: 2,
          title: 'The Backward Clock Anomaly',
          narrative:
            'Looking at the digital clock on my nightstand, the LED numbers were spinning backward: 88:99, then 72:14. I pinched my nose and breathed in effortlessly, discovering I was still dreaming before fading into true awakening.',
          lucid: true,
          falseAwakening: true,
        },
      ],
      falseAwakening: true,
      falseAwakeningDetails: {
        believedAwake: true,
        environmentDescription: 'My bedroom in realistic morning illumination',
        triggerOrAnomaly: 'Digital clock numbers running backward with impossible digits',
        realityCheckNotes: 'Nose pinch check immediately confirmed sleep state despite hyper-realistic bedroom setting.',
      },
      realityChecksUseful: ['Nose pinch on waking', 'Clock reading test'],
      interpretationNotes: 'False awakenings frequently mimic normal morning routines; must make reality checks automatic upon waking.',
      emotions: ['Confusion', 'Wonder', 'Curiosity'],
      tags: ['False Awakening', 'Recurring Theme'],
      dreamSignsNotes:
        'Clocks running backwards triggered reality check. Bedroom environment was 100% convincing.',
      isSample: true,
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'sample-dream-5',
      title: 'Tea in the Chime Forest',
      narrative:
        'Sitting at a cedar table in a temperate rainforest where the pine needles clinked together like delicate glass chimes in the breeze. Drinking hot jasmine tea with an old friend from university. The mist tasted faintly like lavender.',
      date: getDateOffset(6),
      wakeUpTime: '07:45',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'non-lucid',
      dreamControl: 1,
      scenesCount: 1,
      falseAwakening: false,
      emotions: ['Nostalgia', 'Joy', 'Serenity'],
      tags: [],
      isSample: true,
      createdAt: Date.now() - 86400000 * 6,
      updatedAt: Date.now() - 86400000 * 6,
    },
  ];

  const techniqueLogs: TechniqueLog[] = [
    {
      id: 'sample-tech-1',
      date: getDateOffset(0),
      technique: 'MILD',
      bedTime: '23:30',
      wakeTime: '06:45',
      confidenceRating: 5,
      secondaryTechniques: ['WBTB', 'Intention Setting'],
      notes:
        'Woke after 5 hours of sleep. Replayed observatory dream imagery and repeated intention for 10 minutes before drifting off.',
      outcome: 'lucid_dream',
      isSample: true,
      createdAt: Date.now() - 3600000 * 6,
      updatedAt: Date.now() - 3600000 * 6,
    },
    {
      id: 'sample-tech-2',
      date: getDateOffset(2),
      technique: 'SSILD',
      bedTime: '23:00',
      wakeTime: '05:30',
      confidenceRating: 4,
      secondaryTechniques: ['WBTB'],
      notes:
        'Completed 4 fast cycles (sight, sound, somatosensory) followed by 4 slow cycles of 25 seconds each. Felt strong hypnagogic warmth.',
      outcome: 'lucid_dream',
      isSample: true,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'sample-tech-3',
      date: getDateOffset(3),
      technique: 'Reality Checks',
      confidenceRating: 3,
      notes:
        'Performed 8 mindful reality checks throughout the day whenever passing through doorways.',
      outcome: 'dream_recalled',
      isSample: true,
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'sample-tech-4',
      date: getDateOffset(5),
      technique: 'WBTB',
      bedTime: '00:00',
      wakeTime: '05:30',
      confidenceRating: 4,
      notes:
        'Stayed awake 25 minutes reading lucid dream journal entries. Drank chamomile tea before returning to sleep.',
      outcome: 'dream_recalled',
      isSample: true,
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
    },
  ];

  const dreamSigns: DreamSign[] = [
    {
      id: 'sample-sign-1',
      name: 'Flying / Levitation',
      category: 'anomaly',
      keywords: ['flying', 'fly', 'flight', 'floating', 'levitating', 'gliding'],
      status: 'confirmed',
      isRealityCheckReminder: true,
      linkedDreamIds: ['sample-dream-1', 'sample-dream-3'],
      distinctDreamCount: 2,
      lastOccurred: getDateOffset(0),
      userNotes: 'Whenever feet lift or buoyancy shifts, immediately perform a nose pinch test.',
      isSample: true,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'sample-sign-2',
      name: 'Clocks & Timepieces',
      category: 'object',
      keywords: ['clock', 'clocks', 'watch', 'digital clock', 'digits'],
      status: 'confirmed',
      isRealityCheckReminder: true,
      linkedDreamIds: ['sample-dream-4'],
      distinctDreamCount: 1,
      lastOccurred: getDateOffset(4),
      userNotes: 'Digital clocks in dreams frequently display flickering, impossible digits.',
      isSample: true,
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'sample-sign-3',
      name: 'Bioluminescent Ocean',
      category: 'location',
      keywords: ['ocean', 'sea', 'coast', 'water', 'phosphor'],
      status: 'suggested',
      isRealityCheckReminder: false,
      linkedDreamIds: ['sample-dream-3'],
      distinctDreamCount: 1,
      lastOccurred: getDateOffset(2),
      isSample: true,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
  ];

  return { dreams, techniqueLogs, dreamSigns };
}
