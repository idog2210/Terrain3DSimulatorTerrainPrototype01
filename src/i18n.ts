import type { Lang } from './utils/terrainTypes';

/**
 * All interface strings in English and Hebrew. The Hebrew is written naturally
 * for an adult learner, not machine-translated. Components read `UI[lang]`.
 */
export interface UIStrings {
  dir: 'ltr' | 'rtl';
  appTitle: string;
  appSubtitle: string;

  // Modes
  modeFree: string;
  modeGuided: string;
  modeDemo: string;
  reset: string;
  langName: string; // label shown on the language toggle (the OTHER language)

  // Onboarding
  onbWelcome: string;
  onbIntro: string;
  onbControlsTitle: string;
  ctlMoveKeys: string;
  ctlMove: string;
  ctlLookKeys: string;
  ctlLook: string;
  ctlClickKeys: string;
  ctlClick: string;
  ctlLayersKeys: string;
  ctlLayers: string;
  objectivesTitle: string;
  objectives: string[];
  startBtn: string;
  startGuidedBtn: string;

  // Free-mode prompt
  enterPrompt: string;
  enterHint: string;

  // Task panel
  taskLabel: string;
  taskEmpty: string;
  taskGoalLabel: string;
  moreDetails: string;
  hudRecognize: string;
  hudMapView: string;
  closeBtn: string;

  // Menus
  menuLabel: string;
  viewLabel: string;

  // Guided
  guidedCounter: (n: number, total: number) => string;
  prev: string;
  next: string;
  exitGuided: string;

  // Demo
  demoBadge: string;
  exitDemo: string;

  // Layers
  layersTitle: string;
  layerContours: string;
  layerContoursDesc: string;
  layerSlope: string;
  layerSlopeDesc: string;
  layerLabels: string;
  layerLabelsDesc: string;

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
  appTitle: 'Terrain Field Simulator',
  appSubtitle: 'Interactive geomorphology · landform analysis',

  modeFree: 'Free explore',
  modeGuided: 'Guided mode',
  modeDemo: 'Demo',
  reset: 'Reset position',
  langName: 'עברית',

  onbWelcome: 'Terrain Field Simulator',
  onbIntro:
    'Walk through a realistic 3D landscape and learn to read terrain. Explore freely, or take the guided tour through seven core landform concepts — then see how each one appears on a topographic map.',
  onbControlsTitle: 'Controls',
  ctlMoveKeys: 'WASD / Arrows',
  ctlMove: 'Move across the terrain',
  ctlLookKeys: 'Mouse',
  ctlLook: 'Look around',
  ctlClickKeys: 'Click a beacon',
  ctlClick: 'Learn the concept',
  ctlLayersKeys: 'Layer toggles',
  ctlLayers: 'Show terrain analysis',
  objectivesTitle: 'Learning objectives',
  objectives: [
    'Identify major landforms — hills, ridges, valleys and saddles — in a 3D environment.',
    'Connect what you see in the terrain to how it appears on a topographic map.',
    'Read slope, drainage and elevation from contour lines and relief.',
  ],
  startBtn: 'Start simulation',
  startGuidedBtn: 'Begin guided tour',

  enterPrompt: 'Click to enter the field',
  enterHint: 'Mouse to look · WASD / Arrows to move · Shift to run · Esc to release',

  taskLabel: 'Current task',
  taskEmpty: 'Aim at a beacon and click it to open your first task.',
  taskGoalLabel: 'Task goal',
  moreDetails: 'More detail',
  hudRecognize: 'Spot it in the 3D terrain',
  hudMapView: 'On a topographic map',
  closeBtn: 'Close',

  menuLabel: 'Menu',
  viewLabel: 'View',

  guidedCounter: (n, total) => `Concept ${n} of ${total}`,
  prev: 'Previous',
  next: 'Next',
  exitGuided: 'Exit tour',

  demoBadge: 'Demo mode · automatic tour',
  exitDemo: 'Exit demo',

  layersTitle: 'Visualization layers',
  layerContours: 'Contour lines',
  layerContoursDesc: 'Lines of equal elevation',
  layerSlope: 'Slope visualization',
  layerSlopeDesc: 'Steepness heat-map',
  layerLabels: 'Landform labels',
  layerLabelsDesc: 'Names floating on the terrain',

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
  appTitle: 'סימולטור תוואי שטח',
  appSubtitle: 'גאומורפולוגיה אינטראקטיבית · ניתוח תוואי שטח',

  modeFree: 'חקירה חופשית',
  modeGuided: 'מצב מודרך',
  modeDemo: 'הדגמה',
  reset: 'איפוס מיקום',
  langName: 'English',

  onbWelcome: 'סימולטור תוואי שטח',
  onbIntro:
    'מטיילים בנוף תלת-ממדי ריאליסטי ולומדים לקרוא תוואי שטח. אפשר לחקור באופן חופשי, או לצאת לסיור מודרך בין שבעה מושגי יסוד של תוואי שטח — ולראות כיצד כל אחד מהם נראה על מפה טופוגרפית.',
  onbControlsTitle: 'בקרות',
  ctlMoveKeys: 'WASD / חיצים',
  ctlMove: 'תנועה בשטח',
  ctlLookKeys: 'עכבר',
  ctlLook: 'התבוננות מסביב',
  ctlClickKeys: 'לחיצה על סמן',
  ctlClick: 'ללמוד את המושג',
  ctlLayersKeys: 'מתגי שכבות',
  ctlLayers: 'הצגת ניתוח שטח',
  objectivesTitle: 'יעדי למידה',
  objectives: [
    'לזהות תוואי שטח עיקריים — גבעות, רכסים, עמקים ואוכפים — בסביבה תלת-ממדית.',
    'לקשר בין מה שרואים בשטח לבין אופן הופעתו על מפה טופוגרפית.',
    'לקרוא שיפוע, ניקוז וגובה מתוך קווי גובה ותבליט.',
  ],
  startBtn: 'התחלת הסימולציה',
  startGuidedBtn: 'התחלת סיור מודרך',

  enterPrompt: 'לחצו כדי להיכנס לשטח',
  enterHint: 'עכבר להבטה · WASD / חיצים לתנועה · Shift לריצה · Esc לשחרור',

  taskLabel: 'משימה נוכחית',
  taskEmpty: 'כוונו לעבר סמן ולחצו עליו כדי לפתוח את המשימה הראשונה.',
  taskGoalLabel: 'יעד למשימה',
  moreDetails: 'עוד פרטים',
  hudRecognize: 'זיהוי בשטח התלת-ממדי',
  hudMapView: 'על מפה טופוגרפית',
  closeBtn: 'סגירה',

  menuLabel: 'תפריט',
  viewLabel: 'תצוגה',

  guidedCounter: (n, total) => `מושג ${n} מתוך ${total}`,
  prev: 'הקודם',
  next: 'הבא',
  exitGuided: 'סיום הסיור',

  demoBadge: 'מצב הדגמה · סיור אוטומטי',
  exitDemo: 'סיום הדגמה',

  layersTitle: 'שכבות ניתוח',
  layerContours: 'קווי גובה',
  layerContoursDesc: 'קווים של גובה שווה',
  layerSlope: 'המחשת שיפועים',
  layerSlopeDesc: 'מפת חום של תלילות',
  layerLabels: 'תוויות תוואי שטח',
  layerLabelsDesc: 'שמות הצפים מעל השטח',

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
