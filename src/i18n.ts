import type { Lang } from './utils/terrainTypes';

/**
 * All interface strings in English and Hebrew. The Hebrew is written naturally
 * for an adult learner, not machine-translated. Components read `UI[lang]`.
 */
export interface UIStrings {
  dir: 'ltr' | 'rtl';

  // Modes
  modeFree: string;
  modeGuided: string;
  langName: string; // label shown on the language toggle (the OTHER language)

  // Onboarding
  onbWelcome: string;
  onbIntro: string;
  onbControlsTitle: string;
  ctlMoveKeys: string;
  ctlMove: string;
  ctlLookKeys: string;
  ctlLook: string;
  ctlQuickMenuKeys: string;
  ctlQuickMenu: string;
  onbInteractTitle: string;
  onbInteractDesc: string;
  objectivesTitle: string;
  objectives: string[];
  startBtn: string;
  startGuidedBtn: string;

  // Free-mode prompt
  enterPrompt: string;
  enterHint: string;

  // Task panel
  taskEmpty: string;
  hudRecognize: string;
  hudMapView: string;
  mapImageAlt: (title: string) => string;

  // Menus
  radialHint: string;

  // Guided
  prev: string;
  next: string;
  finish: string;

  // Layers
  layersTitle: string;
  layerContours: string;
  layerContoursDesc: string;
  layerSlope: string;
  layerSlopeDesc: string;

  // Mini-map
  mapTitle: string;
  mapCaption: string;
  mapNorth: string;
  mapYou: string;

  // Azimuth / range readout
  azRangeTitle: string;
  azimuthLabel: string;
  rangeLabel: string;
  azRangeUnit: string;
}

const en: UIStrings = {
  dir: 'ltr',

  modeFree: 'Free explore',
  modeGuided: 'Guided mode',
  langName: 'עברית',

  onbWelcome: 'Terrain Field Simulator',
  onbIntro:
    'Walk through a realistic 3D landscape and learn to read terrain. Explore freely, or take the guided tour through seven core landform concepts — then see how each one appears on a topographic map.',
  onbControlsTitle: 'Buttons',
  ctlMoveKeys: 'WASD / Arrows',
  ctlMove: 'Move across the terrain',
  ctlLookKeys: 'Mouse',
  ctlLook: 'Look around',
  ctlQuickMenuKeys: 'Hold Tab',
  ctlQuickMenu: 'Switch mode / view without leaving the field',
  onbInteractTitle: 'Interacting with the field',
  onbInteractDesc:
    'Click a beacon to open an explanation of the landform at that spot, and use the layer toggles in the quick menu to overlay a visual analysis — contour lines and a slope heat-map.',
  objectivesTitle: "Simulator's purpose",
  objectives: [
    'Identify major landforms — hills, ridges, valleys and saddles — in a 3D environment.',
    'Connect what you see in the terrain to how it appears on a topographic map.',
    'Read slope, drainage and elevation from contour lines and relief.',
  ],
  startBtn: 'Start simulation',
  startGuidedBtn: 'Begin guided tour',

  enterPrompt: 'Click to enter the field',
  enterHint: 'Mouse to look · WASD / Arrows to move · Shift to run · Esc to release',

  taskEmpty: 'Aim at a beacon and click it to open your first task.',
  hudRecognize: 'Spot it in the 3D terrain',
  hudMapView: 'On a topographic map',
  mapImageAlt: (title) => `Topographic map illustration of a ${title.toLowerCase()}`,

  radialHint: 'Hold Tab for the quick menu',

  prev: 'Previous',
  next: 'Next',
  finish: 'Finish',

  layersTitle: 'Visualization layers',
  layerContours: 'Contour lines',
  layerContoursDesc: 'Lines of equal elevation',
  layerSlope: 'Slope visualization',
  layerSlopeDesc: 'Steepness heat-map',

  mapTitle: 'Map view',
  mapCaption: 'Top-down · contour relief',
  mapNorth: 'N',
  mapYou: 'You',

  azRangeTitle: 'Azimuth / range',
  azimuthLabel: 'Azimuth',
  rangeLabel: 'Range',
  azRangeUnit: 'm',
};

const he: UIStrings = {
  dir: 'rtl',

  modeFree: 'חקירה חופשית',
  modeGuided: 'מצב מודרך',
  langName: 'English',

  onbWelcome: 'סימולטור תוואי שטח',
  onbIntro:
    'מטיילים בנוף תלת-ממדי ריאליסטי ולומדים לקרוא תוואי שטח. אפשר לחקור באופן חופשי, או לצאת לסיור מודרך בין שבעה מושגי יסוד של תוואי שטח — ולראות כיצד כל אחד מהם נראה על מפה טופוגרפית.',
  onbControlsTitle: 'כפתורים',
  ctlMoveKeys: 'WASD / חיצים',
  ctlMove: 'תנועה בשטח',
  ctlLookKeys: 'עכבר',
  ctlLook: 'התבוננות מסביב',
  ctlQuickMenuKeys: 'החזקת Tab',
  ctlQuickMenu: 'החלפת מצב/תצוגה בלי לצאת מהשטח',
  onbInteractTitle: 'פעולות בשטח',
  onbInteractDesc:
    'לחיצה על סמן שטח פותחת הסבר על המושג הגאומורפולוגי במיקום הזה, ומתגי השכבות בתפריט המהיר מציגים ניתוח ויזואלי — קווי גובה ומפת שיפועים.',
  objectivesTitle: 'מטרת הסימולטור',
  objectives: [
    'לזהות תוואי שטח עיקריים — גבעות, רכסים, עמקים ואוכפים — בסביבה תלת-ממדית.',
    'לקשר בין מה שרואים בשטח לבין אופן הופעתו על מפה טופוגרפית.',
    'לקרוא שיפוע, ניקוז וגובה מתוך קווי גובה ותבליט.',
  ],
  startBtn: 'התחלת הסימולציה',
  startGuidedBtn: 'התחלת סיור מודרך',

  enterPrompt: 'לחצו כדי להיכנס לשטח',
  enterHint: 'עכבר להבטה · WASD / חיצים לתנועה · Shift לריצה · Esc לשחרור',

  taskEmpty: 'כוונו לעבר סמן ולחצו עליו כדי לפתוח את המשימה הראשונה.',
  hudRecognize: 'זיהוי בשטח התלת-ממדי',
  hudMapView: 'על מפה טופוגרפית',
  mapImageAlt: (title) => `המחשה של ${title} על מפה טופוגרפית`,

  radialHint: 'החזיקו Tab לתפריט מהיר',

  prev: 'הקודם',
  next: 'הבא',
  finish: 'סיום',

  layersTitle: 'שכבות ניתוח',
  layerContours: 'קווי גובה',
  layerContoursDesc: 'קווים של גובה שווה',
  layerSlope: 'המחשת שיפועים',
  layerSlopeDesc: 'מפת חום של תלילות',

  mapTitle: 'תצוגת מפה',
  mapCaption: 'מבט-על · תבליט וקווי גובה',
  mapNorth: 'צ',
  mapYou: 'אתם',

  azRangeTitle: 'אזימוט / טווח',
  azimuthLabel: 'אזימוט',
  rangeLabel: 'טווח',
  azRangeUnit: 'מ׳',
};

export const UI: Record<Lang, UIStrings> = { en, he };
