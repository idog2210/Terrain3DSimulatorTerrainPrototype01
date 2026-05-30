import type { TerrainConcept } from '../utils/terrainTypes';
import { FEATURES } from '../utils/terrainHeight';

/**
 * The educational content. Each concept is anchored to a real location on the
 * terrain (via FEATURES) where that landform genuinely exists, carries a curated
 * `view` camera vantage used by guided mode, and provides bilingual EN/HE text
 * in three teaching dimensions: what it is, how to spot it in 3D, and how it
 * looks on a topographic map.
 *
 * Order is the guided teaching sequence:
 *   Hilltop → Ridge → Slope → Valley → Saddle → Stream channel → Rocky area.
 */
export const TERRAIN_CONCEPTS: TerrainConcept[] = [
  {
    id: 'hilltop',
    title: { en: 'Hilltop', he: 'פסגה' },
    meaning: {
      en: 'The summit — the highest point of a hill, where the ground falls away on every side.',
      he: 'הנקודה הגבוהה ביותר של גבעה או הר, שממנה השטח יורד לכל הכיוונים.',
    },
    recognize: {
      en: 'Climb until the ground drops away all around you and nothing in view is higher. The horizon opens up in every direction.',
      he: 'מטפסים עד שהקרקע יורדת מכל העברים ואין נקודה גבוהה יותר בסביבה. האופק נפתח לכל הכיוונים.',
    },
    mapView: {
      en: 'A set of tight, closed contour rings nested one inside another, with the highest elevation at the centre.',
      he: 'קבוצת קווי גובה סגורים וצפופים, האחד בתוך השני, כשהגובה הרב ביותר במרכז.',
    },
    position: FEATURES.hilltop,
    view: { x: -24, z: -40 },
    accent: '#e8b24c',
  },
  {
    id: 'ridge',
    title: { en: 'Ridge', he: 'קו רכס' },
    meaning: {
      en: 'A continuous line of high ground connecting summits, with the land sloping down on both sides.',
      he: 'ציר רציף של קרקע גבוהה המחבר פסגות, כאשר השטח יורד משני צדדיו.',
    },
    recognize: {
      en: 'Walk the crest line: it stays high while the slopes fall away to your left and to your right.',
      he: 'הולכים לאורך קו הרכס: הוא נשאר גבוה בעוד המדרונות יורדים מימין ומשמאל.',
    },
    mapView: {
      en: "Contour lines bend into long 'U' or 'V' shapes whose tips point downhill, away from the high ground.",
      he: "קווי הגובה מתעקלים לצורות 'U' או 'V' מוארכות, שקצותיהן פונות במורד, הרחק מהקרקע הגבוהה.",
    },
    position: FEATURES.ridge,
    view: { x: -22, z: -48 },
    accent: '#d99a45',
  },
  {
    id: 'slope',
    title: { en: 'Slope', he: 'מדרון' },
    meaning: {
      en: 'The inclined face of the terrain. Its steepness is the key property a map lets you measure.',
      he: 'פני השטח המשופעים. מידת התלילות היא התכונה המרכזית שניתן למדוד ממפה.',
    },
    recognize: {
      en: 'Face downhill: a steep slope drops quickly beneath your feet, while a gentle slope eases away slowly.',
      he: 'מסתכלים במורד: מדרון תלול יורד במהירות מתחת לרגליים, ומדרון מתון יורד בהדרגה.',
    },
    mapView: {
      en: 'Closely spaced contour lines mean a steep slope; widely spaced lines mean gentle ground.',
      he: 'קווי גובה צפופים מציינים מדרון תלול; קווים מרוחקים זה מזה מציינים שטח מתון.',
    },
    position: FEATURES.slope,
    view: { x: 34, z: -16 },
    accent: '#d9a64a',
  },
  {
    id: 'valley',
    title: { en: 'Valley', he: 'עמק' },
    meaning: {
      en: 'A low, elongated basin between higher ground, where water and sediment collect.',
      he: 'אגן נמוך ומוארך בין אזורים גבוהים, שבו מתנקזים מים וסחף.',
    },
    recognize: {
      en: 'Stand on the low ground and look up: higher land encloses you on the sides and opens out along the valley floor.',
      he: 'עומדים בשטח הנמוך ומביטים מעלה: קרקע גבוהה סוגרת עליכם מהצדדים ונפתחת לאורך קרקעית העמק.',
    },
    mapView: {
      en: "Contours form 'U' or 'V' shapes that point upstream, toward the higher ground — the opposite of a ridge.",
      he: "קווי הגובה יוצרים צורות 'U' או 'V' שקצותיהן פונות במעלה הזרם, לעבר הקרקע הגבוהה — בניגוד לרכס.",
    },
    position: FEATURES.valley,
    view: { x: 6, z: 54 },
    accent: '#e3c886',
  },
  {
    id: 'saddle',
    title: { en: 'Saddle', he: 'אוכף' },
    meaning: {
      en: 'A low pass on a ridge between two summits — the lowest point along the crest, yet higher than the valleys on either side.',
      he: 'מעבר נמוך על קו רכס בין שתי פסגות — הנקודה הנמוכה ביותר לאורך הרכס, אך גבוהה מהעמקים שמשני צדדיה.',
    },
    recognize: {
      en: 'It dips down as you walk along the ridge, but rises as you step across it — like sitting in the seat of a saddle.',
      he: 'השטח יורד כשהולכים לאורך הרכס, אך עולה כשחוצים אותו לרוחב — כמו הישיבה במרכז אוכף.',
    },
    mapView: {
      en: 'An hourglass of contours: two sets of closed rings (the summits) pinched together by a narrow low neck between them.',
      he: 'צורת שעון-חול של קווי גובה: שתי קבוצות טבעות סגורות (הפסגות) שנפגשות במותן נמוך וצר ביניהן.',
    },
    position: FEATURES.saddle,
    view: { x: -2, z: -44 },
    accent: '#e6c071',
  },
  {
    id: 'stream',
    title: { en: 'Stream channel', he: 'ערוץ נחל' },
    meaning: {
      en: 'A drainage channel cut by flowing water, threading along the lowest line of the valley.',
      he: 'תעלת ניקוז שנחתכה על-ידי זרימת מים, המתפתלת לאורך הקו הנמוך ביותר של העמק.',
    },
    recognize: {
      en: 'Follow the incised channel along the valley floor — it always takes the lowest possible path downhill.',
      he: 'עוקבים אחר הערוץ החתוך לאורך קרקעית העמק — הוא תמיד בוחר את הנתיב הנמוך ביותר במורד.',
    },
    mapView: {
      en: "Contour lines crossing the channel kink sharply into 'V's that point upstream, marking the line of flow.",
      he: "קווי גובה החוצים את הערוץ מתעקלים בחדות לצורות 'V' שקצן פונה במעלה הזרם, ומסמנים את קו הזרימה.",
    },
    position: FEATURES.stream,
    view: { x: 18, z: 48 },
    accent: '#cf9a5c',
  },
  {
    id: 'rocky',
    title: { en: 'Rocky area', he: 'אזור סלעי' },
    meaning: {
      en: 'An exposed, broken zone of bedrock and boulders, typical of steep upper flanks where soil cannot hold.',
      he: 'אזור חשוף ומחורץ של סלע-אם ובולדרים, אופייני למדרונות עליונים תלולים שבהם הקרקע אינה נאחזת.',
    },
    recognize: {
      en: 'The surface turns grey and rugged, scattered with rock clusters, and lines up with the steepest ground.',
      he: 'פני השטח הופכים אפורים ומחוספסים, זרועים מקבצי סלעים, ותואמים את השטח התלול ביותר.',
    },
    mapView: {
      en: 'Often shown with rock or scree symbols, where contour lines turn irregular and crowd together on steep faces.',
      he: 'מסומן לרוב בסמלי סלע או גרוסת, במקומות שבהם קווי הגובה הופכים בלתי-סדירים ומצטופפים על מדרונות תלולים.',
    },
    position: FEATURES.rocky,
    view: { x: 28, z: -58 },
    accent: '#c98a44',
  },
];

/** Lookup by id for the HUD and highlight logic. */
export const CONCEPTS_BY_ID: Record<string, TerrainConcept> = Object.fromEntries(
  TERRAIN_CONCEPTS.map((c) => [c.id, c]),
);
