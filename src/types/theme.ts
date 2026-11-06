export type ThemeId =
  | 'midnight'
  | 'abyssal-obsidian'
  | 'nordic-aurora'
  | 'emerald-abyss'
  | 'amethyst-twilight'
  | 'solar-eclipse'
  | 'crimson-nebula'
  | 'cyberspace-slate'
  | 'nocturnal-moss'
  | 'deep-oceanic'
  | 'velvet-espresso'
  | 'bioluminescent'
  | 'monochrome-matrix'
  | 'astral-dusk'
  | 'vaporwave-night';

export type ThemeCategory = 'all' | 'nocturnal' | 'cosmic' | 'earthy';

export interface ThemePalette {
  bgBase: string;
  bgSurface: string;
  bgSurfaceRaised: string;
  borderSubtle: string;
  borderStrong: string;
  accentPrimary: string;
  accentHover: string;
  textPrimary: string;
  textSecondary: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  category: ThemeCategory;
  palette: ThemePalette;
  previewColors: [string, string, string, string]; // [bgBase, bgSurface, accent, border]
}

export const THEMES_CATALOG: ThemeConfig[] = [
  {
    id: 'midnight',
    name: 'Oneiric Midnight',
    description: 'The canonical deep midnight-blue analytical workbench.',
    category: 'nocturnal',
    palette: {
      bgBase: '#0b132b',
      bgSurface: '#101a38',
      bgSurfaceRaised: '#152248',
      borderSubtle: '#1e293b',
      borderStrong: '#334155',
      accentPrimary: '#2563eb',
      accentHover: '#1d4ed8',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
    },
    previewColors: ['#0b132b', '#101a38', '#2563eb', '#1e293b'],
  },
  {
    id: 'abyssal-obsidian',
    name: 'Abyssal Obsidian',
    description: 'Pure pitch-black OLED monochrome with cool ice-slate accents.',
    category: 'nocturnal',
    palette: {
      bgBase: '#09090b',
      bgSurface: '#121216',
      bgSurfaceRaised: '#1c1c22',
      borderSubtle: '#27272a',
      borderStrong: '#3f3f46',
      accentPrimary: '#38bdf8',
      accentHover: '#0284c7',
      textPrimary: '#fafafa',
      textSecondary: '#a1a1aa',
    },
    previewColors: ['#09090b', '#121216', '#38bdf8', '#27272a'],
  },
  {
    id: 'nordic-aurora',
    name: 'Nordic Aurora',
    description: 'Arctic midnight teal and luminous boreal cyan reflections.',
    category: 'cosmic',
    palette: {
      bgBase: '#08131a',
      bgSurface: '#0d1f2b',
      bgSurfaceRaised: '#132c3d',
      borderSubtle: '#19394f',
      borderStrong: '#25506e',
      accentPrimary: '#06b6d4',
      accentHover: '#0891b2',
      textPrimary: '#f0fdfa',
      textSecondary: '#99f6e4',
    },
    previewColors: ['#08131a', '#0d1f2b', '#06b6d4', '#19394f'],
  },
  {
    id: 'emerald-abyss',
    name: 'Emerald Abyss',
    description: 'Deep nocturnal forest depths with bioluminescent evergreen tones.',
    category: 'earthy',
    palette: {
      bgBase: '#061712',
      bgSurface: '#0c241d',
      bgSurfaceRaised: '#12362b',
      borderSubtle: '#1b4a3c',
      borderStrong: '#266754',
      accentPrimary: '#10b981',
      accentHover: '#059669',
      textPrimary: '#ecfdf5',
      textSecondary: '#a7f3d0',
    },
    previewColors: ['#061712', '#0c241d', '#10b981', '#1b4a3c'],
  },
  {
    id: 'amethyst-twilight',
    name: 'Amethyst Twilight',
    description: 'Dusky nocturnal plum and soothing lavender mist for twilight recall.',
    category: 'cosmic',
    palette: {
      bgBase: '#120c1f',
      bgSurface: '#1c1330',
      bgSurfaceRaised: '#281c44',
      borderSubtle: '#37275e',
      borderStrong: '#4c3682',
      accentPrimary: '#a855f7',
      accentHover: '#9333ea',
      textPrimary: '#faf5ff',
      textSecondary: '#d8b4fe',
    },
    previewColors: ['#120c1f', '#1c1330', '#a855f7', '#37275e'],
  },
  {
    id: 'solar-eclipse',
    name: 'Solar Eclipse',
    description: 'Cosmic shadow slate illuminated by a warm stellar golden corona.',
    category: 'cosmic',
    palette: {
      bgBase: '#13110d',
      bgSurface: '#1f1a14',
      bgSurfaceRaised: '#2c251c',
      borderSubtle: '#3d3326',
      borderStrong: '#534533',
      accentPrimary: '#f59e0b',
      accentHover: '#d97706',
      textPrimary: '#fffbeb',
      textSecondary: '#fde68a',
    },
    previewColors: ['#13110d', '#1f1a14', '#f59e0b', '#3d3326'],
  },
  {
    id: 'crimson-nebula',
    name: 'Crimson Nebula',
    description: 'Deep celestial maroon with rose starlight highlights.',
    category: 'cosmic',
    palette: {
      bgBase: '#190a11',
      bgSurface: '#26101a',
      bgSurfaceRaised: '#361625',
      borderSubtle: '#4b1e34',
      borderStrong: '#672948',
      accentPrimary: '#f43f5e',
      accentHover: '#e11d48',
      textPrimary: '#fff1f2',
      textSecondary: '#fecdd3',
    },
    previewColors: ['#190a11', '#26101a', '#f43f5e', '#4b1e34'],
  },
  {
    id: 'cyberspace-slate',
    name: 'Cyberspace Slate',
    description: 'Clean industrial graphite with high-precision electric sapphire.',
    category: 'nocturnal',
    palette: {
      bgBase: '#0b111c',
      bgSurface: '#111929',
      bgSurfaceRaised: '#18243b',
      borderSubtle: '#223252',
      borderStrong: '#304673',
      accentPrimary: '#3b82f6',
      accentHover: '#2563eb',
      textPrimary: '#f8fafc',
      textSecondary: '#bfdbfe',
    },
    previewColors: ['#0b111c', '#111929', '#3b82f6', '#223252'],
  },
  {
    id: 'nocturnal-moss',
    name: 'Nocturnal Moss',
    description: 'Restful muted sage and olive charcoal for ultra-low eye fatigue.',
    category: 'earthy',
    palette: {
      bgBase: '#0d1511',
      bgSurface: '#15211b',
      bgSurfaceRaised: '#1e2f27',
      borderSubtle: '#2a4136',
      borderStrong: '#39594a',
      accentPrimary: '#34d399',
      accentHover: '#10b981',
      textPrimary: '#f0fdf4',
      textSecondary: '#bbf7d0',
    },
    previewColors: ['#0d1511', '#15211b', '#34d399', '#2a4136'],
  },
  {
    id: 'deep-oceanic',
    name: 'Deep Oceanic (Mariana)',
    description: 'Abyssal trench marine navy with phosphorescent aquamarine.',
    category: 'nocturnal',
    palette: {
      bgBase: '#05141e',
      bgSurface: '#0a2030',
      bgSurfaceRaised: '#0f2d44',
      borderSubtle: '#163e5e',
      borderStrong: '#205682',
      accentPrimary: '#0ea5e9',
      accentHover: '#0284c7',
      textPrimary: '#f0f9ff',
      textSecondary: '#bae6fd',
    },
    previewColors: ['#05141e', '#0a2030', '#0ea5e9', '#163e5e'],
  },
  {
    id: 'velvet-espresso',
    name: 'Velvet Espresso',
    description: 'Rich dark-roasted cocoa and warm soothing bronze night tones.',
    category: 'earthy',
    palette: {
      bgBase: '#15100d',
      bgSurface: '#201814',
      bgSurfaceRaised: '#2d221c',
      borderSubtle: '#3e2f27',
      borderStrong: '#554035',
      accentPrimary: '#d97706',
      accentHover: '#b45309',
      textPrimary: '#fef3c7',
      textSecondary: '#fde68a',
    },
    previewColors: ['#15100d', '#201814', '#d97706', '#3e2f27'],
  },
  {
    id: 'bioluminescent',
    name: 'Bioluminescent Abyss',
    description: 'Deep void blue paired with high-clarity electric cyan signals.',
    category: 'nocturnal',
    palette: {
      bgBase: '#070d22',
      bgSurface: '#0e183c',
      bgSurfaceRaised: '#142254',
      borderSubtle: '#1d3175',
      borderStrong: '#28439e',
      accentPrimary: '#00d2ff',
      accentHover: '#00b4db',
      textPrimary: '#f0fdff',
      textSecondary: '#a5f3fc',
    },
    previewColors: ['#070d22', '#0e183c', '#00d2ff', '#1d3175'],
  },
  {
    id: 'monochrome-matrix',
    name: 'Monochrome Matrix',
    description: 'Subtle retro-analytical phosphor terminal with calm mint greens.',
    category: 'nocturnal',
    palette: {
      bgBase: '#0b120d',
      bgSurface: '#121c15',
      bgSurfaceRaised: '#1a291f',
      borderSubtle: '#243a2b',
      borderStrong: '#32523d',
      accentPrimary: '#4ade80',
      accentHover: '#22c55e',
      textPrimary: '#f0fdf4',
      textSecondary: '#86efac',
    },
    previewColors: ['#0b120d', '#121c15', '#4ade80', '#243a2b'],
  },
  {
    id: 'astral-dusk',
    name: 'Astral Dusk',
    description: 'Atmospheric deep indigo blending with nocturnal starlight.',
    category: 'cosmic',
    palette: {
      bgBase: '#0f0e26',
      bgSurface: '#17163c',
      bgSurfaceRaised: '#212054',
      borderSubtle: '#2d2c73',
      borderStrong: '#3d3c9a',
      accentPrimary: '#818cf8',
      accentHover: '#6366f1',
      textPrimary: '#eef2ff',
      textSecondary: '#c7d2fe',
    },
    previewColors: ['#0f0e26', '#17163c', '#818cf8', '#2d2c73'],
  },
  {
    id: 'vaporwave-night',
    name: 'Vaporwave Night',
    description: 'Dusk neon shadows with restrained synthwave violet-rose highlights.',
    category: 'cosmic',
    palette: {
      bgBase: '#150a22',
      bgSurface: '#211036',
      bgSurfaceRaised: '#2e174c',
      borderSubtle: '#41206b',
      borderStrong: '#5a2d94',
      accentPrimary: '#e879f9',
      accentHover: '#d946ef',
      textPrimary: '#fdf4ff',
      textSecondary: '#f0abfc',
    },
    previewColors: ['#150a22', '#211036', '#e879f9', '#41206b'],
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'midnight';
