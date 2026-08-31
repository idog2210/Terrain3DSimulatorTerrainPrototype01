# פרומפטים ליצירת תמונות "כך זה נראה על מפה טופוגרפית"

התיקייה הזאת (`public/concepts/`) היא היעד הסופי: גם קובץ ההנחיות הזה וגם 7 קבצי
התמונה שתייצרו צריכים לשבת כאן, זה לצד זה. ה-`TaskPanel` באתר טוען אוטומטית תמונה
בשם `/concepts/<id>.png` עבור תוואי השטח שנבחר, ובודק קודם שהקובץ אכן קיים — כך
שאין צורך בשום שינוי קוד: ברגע שקובץ מסוים נשמר כאן בשם הנכון, הוא יופיע באתר,
מתחת לפסקת "על מפה טופוגרפית" בפאנל הימני.

## עדכון סגנון (v2)

בגרסה הקודמת הפרומפטים ביקשו גוון "כתום-ענברי" חם על כל פני התמונה — התברר שזה
יוצא מבלבל לקריאה. הפרומפטים כאן עודכנו לסגנון **קלאסי של מפה טופוגרפית אמיתית**:
רקע לבן/קרם כמעט נקי, בלי שום צביעה לפי גובה (בלי כתום, בלי ירוק, בלי שום
"hypsometric tint"), ורק **קווי חום** מציירים את קווי הגובה עצמם — בדיוק כמו במפת
טיולים/סקר מודפסת קלאסית. כך תשומת הלב הולכת ישירות לצורת הקווים (הטבעות, ה-U/V
וכו') ולא מוסחת על ידי צבע.

## איך לייצר את התמונות

1. פתחו שיחה חדשה ב-ChatGPT (או כל כלי אחר שמייצר תמונות, למשל DALL·E / GPT
   image) והדביקו את שבעת הפרומפטים **ברצף, באותה שיחה** — כך המודל נוטה לשמור על
   עקביות סגנון בין תמונה לתמונה.
2. הפרומפטים כתובים בכוונה באנגלית, גם אם ההסברים כאן בעברית — זה נותן תוצאות
   עקביות וצפויות יותר מול מודלים ליצירת תמונות. אפשר להדביק כל פרומפט בדיוק כפי
   שהוא, בלי לתרגם.
3. כל פרומפט הוא **עצמאי ומלא** (כולל תיאור הסגנון החוזר על עצמו בכל פעם בכוונה),
   כך שאפשר גם להשתמש בו לבד, בשיחה נפרדת, ועדיין לקבל תוצאה עקבית לשאר הסדרה.
4. יחס גובה-רוחב: **ריבועי (1:1)**, רזולוציה של 1024×1024 פיקסלים ומעלה (תואם את
   מסגרת המיני-מפה הריבועית שכבר קיימת באתר, בפינה השמאלית-תחתונה).
5. אם תמונה כלשהי חוזרת עם גוון כתום/ירוק/צהוב בולט למרות ההנחיות — בקשו מהמודל
   במפורש "remove all color tint, keep it pure cream paper with only brown
   contour lines" ונסו שוב; לפעמים נדרש ניסיון נוסף אחד כדי שהמודל "יצייתי"
   לחלוטין להיעדר הצבע.
6. שמרו כל תמונה בדיוק תחת השם המצוין מתחת לפרומפט שלה, בתוך `public/concepts/`.

## טבלת קבצים

| תוואי שטח (Concept) | שם קובץ ליעד |
| --- | --- |
| פסגה — Hilltop | `hilltop.png` |
| קו רכס — Ridge | `ridge.png` |
| מדרון — Slope | `slope.png` |
| עמק — Valley | `valley.png` |
| אוכף — Saddle | `saddle.png` |
| ערוץ נחל — Stream channel | `stream.png` |
| אזור סלעי — Rocky area | `rocky.png` |

---

## 1. פסגה — Hilltop → `hilltop.png`

```
Create a flat, vector-style cartographic illustration of a topographic
contour map, in the classic style of a real printed hiking / survey
topographic map — the kind found in outdoor guides and geography textbooks.
Viewed directly from above (a true top-down / nadir orthographic view — the
camera faces straight down, not at an angle, and there is no 3D perspective
or isometric tilt). North is oriented toward the top of the frame. The image
is square, 1:1 aspect ratio.

Base color: a plain, light cream / off-white paper background (approximately
#f7f3e8), with NO elevation-based color tinting whatsoever — do not shade
high ground orange, tan, yellow, or brown, and do not shade low ground
green. Do not use any hypsometric color ramp at all. The only variation
allowed on the base is an extremely subtle, faint light-gray relief shading
(a barely-there hillshade, light source from the upper-left) to gently hint
at the 3D form — kept so faint that the page still reads as essentially a
plain, uncolored light background at a glance.

Contour lines: thin, dark brown ink lines (like a classic printed
topographic contour line, approximately #6b4a2b) tracing lines of equal
elevation, evenly spaced according to the terrain shape described below.
Every fourth contour line (the "index contour") is drawn bolder and darker
than the others, exactly as on a real topographic survey map. All lines must
be smooth, continuous, and geometrically correct for the landform described
below — not decorative or random squiggles.

Composition: the landform feature fills most of the frame and is centered,
at a scale where its defining contour pattern is unmistakably legible at a
glance.

Absolutely do NOT include: any text, numbers, elevation labels, legends,
scale bars, compass rose graphics, grid lines, borders or frames,
watermarks, logos, people, animals, buildings, roads, trees, green
vegetation color, blue water color, or any bright or saturated colors of any
kind. No orange wash, no green wash, no photorealism, no 3D perspective, no
isometric angle — strictly a flat, minimal, two-tone (cream paper + brown
contour lines) top-down 2D illustration, exactly like a classic printed
topographic map.

Landform for THIS image: a HILLTOP (a summit — the highest point of a hill,
where the ground falls away on every side). Draw a set of tight,
closely-spaced, perfectly closed contour rings, nested one inside another
like an archery target, concentric and roughly circular-to-oval in shape.
The innermost, smallest ring sits at the exact center of the frame,
representing the highest point of the hill. There must be no gaps, spurs, or
branches in the rings — they are simple closed loops, all sharing the same
center point, exactly matching how a real summit appears on a topographic
map.
```

---

## 2. קו רכס — Ridge → `ridge.png`

```
Create a flat, vector-style cartographic illustration of a topographic
contour map, in the classic style of a real printed hiking / survey
topographic map — the kind found in outdoor guides and geography textbooks.
Viewed directly from above (a true top-down / nadir orthographic view — the
camera faces straight down, not at an angle, and there is no 3D perspective
or isometric tilt). North is oriented toward the top of the frame. The image
is square, 1:1 aspect ratio.

Base color: a plain, light cream / off-white paper background (approximately
#f7f3e8), with NO elevation-based color tinting whatsoever — do not shade
high ground orange, tan, yellow, or brown, and do not shade low ground
green. Do not use any hypsometric color ramp at all. The only variation
allowed on the base is an extremely subtle, faint light-gray relief shading
(a barely-there hillshade, light source from the upper-left) to gently hint
at the 3D form — kept so faint that the page still reads as essentially a
plain, uncolored light background at a glance.

Contour lines: thin, dark brown ink lines (like a classic printed
topographic contour line, approximately #6b4a2b) tracing lines of equal
elevation, evenly spaced according to the terrain shape described below.
Every fourth contour line (the "index contour") is drawn bolder and darker
than the others, exactly as on a real topographic survey map. All lines must
be smooth, continuous, and geometrically correct for the landform described
below — not decorative or random squiggles.

Composition: the landform feature fills most of the frame and is centered,
at a scale where its defining contour pattern is unmistakably legible at a
glance.

Absolutely do NOT include: any text, numbers, elevation labels, legends,
scale bars, compass rose graphics, grid lines, borders or frames,
watermarks, logos, people, animals, buildings, roads, trees, green
vegetation color, blue water color, or any bright or saturated colors of any
kind. No orange wash, no green wash, no photorealism, no 3D perspective, no
isometric angle — strictly a flat, minimal, two-tone (cream paper + brown
contour lines) top-down 2D illustration, exactly like a classic printed
topographic map.

Landform for THIS image: a RIDGE (a continuous line of high ground
connecting summits, with the land sloping down on both sides). Draw contour
lines that bend into long, elongated "U" or "V" shapes whose closed, rounded
tips point AWAY from the high ground — that is, downhill and outward from a
central ridge line. The contours should form a series of nested, elongated
U/V shapes stacked parallel to one another along a spine running diagonally
or vertically through the frame, all opening toward the ridge crest and
curving away on both flanks, so the crest line itself reads as one
unbroken high spine of ground with the terrain visibly dropping away on
both the left and right sides of it — the mirror opposite of how a valley's
contours bend.
```

---

## 3. מדרון — Slope → `slope.png`

```
Create a flat, vector-style cartographic illustration of a topographic
contour map, in the classic style of a real printed hiking / survey
topographic map — the kind found in outdoor guides and geography textbooks.
Viewed directly from above (a true top-down / nadir orthographic view — the
camera faces straight down, not at an angle, and there is no 3D perspective
or isometric tilt). North is oriented toward the top of the frame. The image
is square, 1:1 aspect ratio.

Base color: a plain, light cream / off-white paper background (approximately
#f7f3e8), with NO elevation-based color tinting whatsoever — do not shade
high ground orange, tan, yellow, or brown, and do not shade low ground
green. Do not use any hypsometric color ramp at all. The only variation
allowed on the base is an extremely subtle, faint light-gray relief shading
(a barely-there hillshade, light source from the upper-left) to gently hint
at the 3D form — kept so faint that the page still reads as essentially a
plain, uncolored light background at a glance.

Contour lines: thin, dark brown ink lines (like a classic printed
topographic contour line, approximately #6b4a2b) tracing lines of equal
elevation, evenly spaced according to the terrain shape described below.
Every fourth contour line (the "index contour") is drawn bolder and darker
than the others, exactly as on a real topographic survey map. All lines must
be smooth, continuous, and geometrically correct for the landform described
below — not decorative or random squiggles.

Composition: the landform feature fills most of the frame and is centered,
at a scale where its defining contour pattern is unmistakably legible at a
glance.

Absolutely do NOT include: any text, numbers, elevation labels, legends,
scale bars, compass rose graphics, grid lines, borders or frames,
watermarks, logos, people, animals, buildings, roads, trees, green
vegetation color, blue water color, or any bright or saturated colors of any
kind. No orange wash, no green wash, no photorealism, no 3D perspective, no
isometric angle — strictly a flat, minimal, two-tone (cream paper + brown
contour lines) top-down 2D illustration, exactly like a classic printed
topographic map.

Landform for THIS image: a SLOPE (the inclined face of the terrain, where
steepness — how quickly elevation changes — is the key property a map lets
you measure). Draw a set of roughly parallel, straight-to-gently-curving
contour lines running across the frame, all trending in the same general
direction (e.g. diagonally from one corner toward the other). On one portion
of the image, draw the lines very closely and densely packed together,
indicating a steep slope; smoothly transitioning across the frame toward the
opposite portion, draw the lines widely and generously spaced apart,
indicating gentle, easy terrain. The gradient from tightly-packed lines to
widely-spaced lines must be smooth, continuous, and unmistakable, so the
whole image reads clearly as one continuous slope changing steadily in
steepness from one side to the other — with no closed rings, no U/V bends,
just a simple family of lines varying only in spacing.
```

---

## 4. עמק — Valley → `valley.png`

```
Create a flat, vector-style cartographic illustration of a topographic
contour map, in the classic style of a real printed hiking / survey
topographic map — the kind found in outdoor guides and geography textbooks.
Viewed directly from above (a true top-down / nadir orthographic view — the
camera faces straight down, not at an angle, and there is no 3D perspective
or isometric tilt). North is oriented toward the top of the frame. The image
is square, 1:1 aspect ratio.

Base color: a plain, light cream / off-white paper background (approximately
#f7f3e8), with NO elevation-based color tinting whatsoever — do not shade
high ground orange, tan, yellow, or brown, and do not shade low ground
green. Do not use any hypsometric color ramp at all. The only variation
allowed on the base is an extremely subtle, faint light-gray relief shading
(a barely-there hillshade, light source from the upper-left) to gently hint
at the 3D form — kept so faint that the page still reads as essentially a
plain, uncolored light background at a glance.

Contour lines: thin, dark brown ink lines (like a classic printed
topographic contour line, approximately #6b4a2b) tracing lines of equal
elevation, evenly spaced according to the terrain shape described below.
Every fourth contour line (the "index contour") is drawn bolder and darker
than the others, exactly as on a real topographic survey map. All lines must
be smooth, continuous, and geometrically correct for the landform described
below — not decorative or random squiggles.

Composition: the landform feature fills most of the frame and is centered,
at a scale where its defining contour pattern is unmistakably legible at a
glance.

Absolutely do NOT include: any text, numbers, elevation labels, legends,
scale bars, compass rose graphics, grid lines, borders or frames,
watermarks, logos, people, animals, buildings, roads, trees, green
vegetation color, blue water color, or any bright or saturated colors of any
kind. No orange wash, no green wash, no photorealism, no 3D perspective, no
isometric angle — strictly a flat, minimal, two-tone (cream paper + brown
contour lines) top-down 2D illustration, exactly like a classic printed
topographic map.

Landform for THIS image: a VALLEY (a low, elongated basin between higher
ground, where water and sediment would collect). Draw contour lines that
form "U" or "V" shapes whose tips point INWARD, UPSTREAM, toward the higher
ground at the center of the bend — the mirror opposite bend direction from a
ridge, where the tips instead point outward and away. The contours should be
nested and stacked along a central low-lying trough running through the
frame (e.g. diagonally from one corner to the other), with the tightest,
smallest bends near the valley floor at the center of the trough, and the
pattern widening outward in elevation on both sides, so the frame reads
clearly as one long, low basin enclosed by higher ground on both its left
and right sides.
```

---

## 5. אוכף — Saddle → `saddle.png`

```
Create a flat, vector-style cartographic illustration of a topographic
contour map, in the classic style of a real printed hiking / survey
topographic map — the kind found in outdoor guides and geography textbooks.
Viewed directly from above (a true top-down / nadir orthographic view — the
camera faces straight down, not at an angle, and there is no 3D perspective
or isometric tilt). North is oriented toward the top of the frame. The image
is square, 1:1 aspect ratio.

Base color: a plain, light cream / off-white paper background (approximately
#f7f3e8), with NO elevation-based color tinting whatsoever — do not shade
high ground orange, tan, yellow, or brown, and do not shade low ground
green. Do not use any hypsometric color ramp at all. The only variation
allowed on the base is an extremely subtle, faint light-gray relief shading
(a barely-there hillshade, light source from the upper-left) to gently hint
at the 3D form — kept so faint that the page still reads as essentially a
plain, uncolored light background at a glance.

Contour lines: thin, dark brown ink lines (like a classic printed
topographic contour line, approximately #6b4a2b) tracing lines of equal
elevation, evenly spaced according to the terrain shape described below.
Every fourth contour line (the "index contour") is drawn bolder and darker
than the others, exactly as on a real topographic survey map. All lines must
be smooth, continuous, and geometrically correct for the landform described
below — not decorative or random squiggles.

Composition: the landform feature fills most of the frame and is centered,
at a scale where its defining contour pattern is unmistakably legible at a
glance.

Absolutely do NOT include: any text, numbers, elevation labels, legends,
scale bars, compass rose graphics, grid lines, borders or frames,
watermarks, logos, people, animals, buildings, roads, trees, green
vegetation color, blue water color, or any bright or saturated colors of any
kind. No orange wash, no green wash, no photorealism, no 3D perspective, no
isometric angle — strictly a flat, minimal, two-tone (cream paper + brown
contour lines) top-down 2D illustration, exactly like a classic printed
topographic map.

Landform for THIS image: a SADDLE (a low pass on a ridge between two
summits — the lowest point along the crest, yet still higher than the
valleys on either side of it). Draw an hourglass-shaped arrangement of
contours: two separate sets of small closed concentric rings (each set
representing one of the two summits, drawn the same way a hilltop's rings
would look) positioned on opposite corners of the frame (for example
upper-left and lower-right), similar in size and shape to each other for
visual balance. Between the two ring-clusters, draw the surrounding contour
lines curving inward from both sides and pinching together into a narrow,
low "neck" at the center of the frame, so the whole composition reads as a
classic hourglass or bowtie shape: two closed high points joined by one
narrow, low waist between them.
```

---

## 6. ערוץ נחל — Stream channel → `stream.png`

```
Create a flat, vector-style cartographic illustration of a topographic
contour map, in the classic style of a real printed hiking / survey
topographic map — the kind found in outdoor guides and geography textbooks.
Viewed directly from above (a true top-down / nadir orthographic view — the
camera faces straight down, not at an angle, and there is no 3D perspective
or isometric tilt). North is oriented toward the top of the frame. The image
is square, 1:1 aspect ratio.

Base color: a plain, light cream / off-white paper background (approximately
#f7f3e8), with NO elevation-based color tinting whatsoever — do not shade
high ground orange, tan, yellow, or brown, and do not shade low ground
green. Do not use any hypsometric color ramp at all. The only variation
allowed on the base is an extremely subtle, faint light-gray relief shading
(a barely-there hillshade, light source from the upper-left) to gently hint
at the 3D form — kept so faint that the page still reads as essentially a
plain, uncolored light background at a glance.

Contour lines: thin, dark brown ink lines (like a classic printed
topographic contour line, approximately #6b4a2b) tracing lines of equal
elevation, evenly spaced according to the terrain shape described below.
Every fourth contour line (the "index contour") is drawn bolder and darker
than the others, exactly as on a real topographic survey map. All lines must
be smooth, continuous, and geometrically correct for the landform described
below — not decorative or random squiggles.

Composition: the landform feature fills most of the frame and is centered,
at a scale where its defining contour pattern is unmistakably legible at a
glance.

Absolutely do NOT include: any text, numbers, elevation labels, legends,
scale bars, compass rose graphics, grid lines, borders or frames,
watermarks, logos, people, animals, buildings, roads, or trees. No orange
wash, no green wash, no photorealism, no 3D perspective, no isometric angle,
and — importantly — no separate solid blue line or filled shape representing
water; the channel must be implied purely by how the contour lines
themselves bend, exactly as described below. Strictly a flat, minimal,
two-tone (cream paper + brown contour lines) top-down 2D illustration,
exactly like a classic printed topographic map.

Landform for THIS image: a STREAM CHANNEL (a drainage channel cut by
flowing water, threading along the lowest line of a valley). Draw a broad
family of contour lines that, as they cross a thin, gently winding
low-lying path running through the frame (not a straight line — it should
meander slightly, like a real stream would), all kink sharply inward at that
crossing point into narrow, pointed "V" shapes whose tips point UPSTREAM,
toward the higher ground. Repeat this same sharp V-kink at every single
contour line that crosses the winding path, so that stacking all of these
V-kinks together traces out the winding channel line purely through the
contours' geometry. The V-kinks should be noticeably tighter, narrower, and
more pointed than the broad, gentle U-shapes of an ordinary valley, making
this incised channel visually distinct from a plain valley at a glance.
```

---

## 7. אזור סלעי — Rocky area → `rocky.png`

```
Create a flat, vector-style cartographic illustration of a topographic
contour map, in the classic style of a real printed hiking / survey
topographic map — the kind found in outdoor guides and geography textbooks.
Viewed directly from above (a true top-down / nadir orthographic view — the
camera faces straight down, not at an angle, and there is no 3D perspective
or isometric tilt). North is oriented toward the top of the frame. The image
is square, 1:1 aspect ratio.

Base color: a plain, light cream / off-white paper background (approximately
#f7f3e8), with NO elevation-based color tinting whatsoever — do not shade
high ground orange, tan, yellow, or brown, and do not shade low ground
green. Do not use any hypsometric color ramp at all. The only variation
allowed on the base is an extremely subtle, faint light-gray relief shading
(a barely-there hillshade, light source from the upper-left) to gently hint
at the 3D form — kept so faint that the page still reads as essentially a
plain, uncolored light background at a glance.

Contour lines: thin, dark brown ink lines (like a classic printed
topographic contour line, approximately #6b4a2b) tracing lines of equal
elevation, evenly spaced according to the terrain shape described below.
Every fourth contour line (the "index contour") is drawn bolder and darker
than the others, exactly as on a real topographic survey map.

Composition: the landform feature fills most of the frame and is centered,
at a scale where its defining pattern is unmistakably legible at a glance.

Absolutely do NOT include: any text, numbers, elevation labels, legends,
scale bars, compass rose graphics, grid lines, borders or frames,
watermarks, logos, people, animals, buildings, roads, trees, green
vegetation color, blue water color, or any bright or saturated colors of any
kind. No orange wash, no green wash, no photorealism, no 3D perspective, no
isometric angle — strictly a flat, minimal, two-tone (cream paper + brown
contour lines) top-down 2D illustration, exactly like a classic printed
topographic map. The only exception to "no extra symbols" is the small,
neutral-gray rock/scree glyphs explicitly described below, which belong
specifically to this landform and appear on real topographic maps too.

Landform for THIS image: a ROCKY AREA (an exposed, broken zone of bedrock
and boulders, typical of a steep upper flank where soil cannot hold). Unlike
the other landforms in this series, the contour lines here should be drawn
closely spaced, irregular, and slightly jagged — crowding tightly together
across a steep face, with small kinks and irregularities in each line's path
(rather than smooth, clean curves) to suggest rugged, broken ground. On top
of this crowded contour pattern, scatter a sparse, evenly-distributed field
of small simple gray boulder/scree symbols — tiny irregular polygon or dot-
cluster glyphs, matching the style of a standard survey-map rock symbol,
neutral gray (not brown, not colored), and small enough that they never
fully obscure the contour lines beneath them. This is the only image in the
set that should contain these small rock symbols.
```
