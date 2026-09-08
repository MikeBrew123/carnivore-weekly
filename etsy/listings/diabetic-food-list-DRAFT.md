# DIABETIC FOOD LIST SET (DRAFT, NOT PUBLISHED)

Draft listing copy for the sheets built by
`etsy/products/templates/build_diabetic_food_list.py`.

**Status: DRAFT.** Nothing here has been sent to Etsy. Publishing is Brew's own
hands. Brand and price were settled by Brew on 2026-09-07 and applied on
2026-09-08. **One item still blocks listing: the images are not built.** Full
state at the bottom.

Approved by Brew 2026-09-02 by voice: build diabetic food list products for
Etsy only. Not for carnivoreweekly.com. Not for ketodial.com.

## The rule this copy is written under

Informational only. No treatment claim, no blood sugar claim, nothing that says
or implies the product manages, controls, lowers or treats diabetes or blood
sugar. Every sheet carries one small line of fine print at the very bottom and
nothing more. The word "diabetic" appears as an audience label, which is how
Etsy shoppers search, and never as a promise about what the sheets do.

Audience is women 45 and over who want fat loss. The copy speaks to the
grocery store and the fridge door, in plain words, without a lecture.

## Title

140 character cap, enforced at `etsy/starter-kit-keyword-apply.mjs:60`. This
draft is 116 characters.

Diabetic Food List Printable | Foods Sorted By Carbohydrate + Grocery List +
Lower Carb Swaps | US Letter and A4 PDF

## Price

**CA$4.99. Settled 2026-09-07.** Brew was asked and declined to call it: "499
Canadian. I don't know. I have no idea. Currently nothing's selling." Standing
instruction is not to re-ask the question as posed, so this defaults to $4.99
CAD, matching the 2026-09-04 poster ruling and the comparable keto food list
bundle in `etsy/listings/keto-food-list-bundle.md`. Reversible.

Enter as **4.99 CAD**, quantity **999** (house pattern for digital listings).

## Brand

**KetoDial.com. Ruled by Brew 2026-09-07 by voice:** "if the list contains beans
and oats and rice and quinoa, those are all not carnivore foods. So you're
right; those should be under the keto brand."

Applied 2026-09-08: `BRAND` in `build_diabetic_food_list.py` is now
`KetoDial.com` and all six sheets were re-rendered. Spelling and casing copied
from the existing KetoDial shop assets (`build_trackers.py`,
`mealplans/build_mealplans.py`), not invented. The footer line on every sheet
now reads:

    KetoDial.com  ·  For informational purposes only. Please talk with your doctor.

No other product's branding was touched.

## Tags (13 max, 20 characters each)

Both limits are enforced in the repo, not remembered:
`etsy/starter-kit-keyword-apply.mjs:61` and `:63`. All 13 below are 20 characters or
fewer and none repeat.

diabetic food list, diabetic food chart, low carb food list, carb chart
printable, diabetic printable, food list pdf, grocery printable,
kitchen printable, meal planner pdf, carb counting chart,
low carb printable, fridge printable, women over 50

## Files (6, upload these exact names)

Built 2026-09-08 with `python3 build_diabetic_food_list.py --final`. The
filename is buyer-facing, so the upload copies carry no -DRAFT suffix. The
-DRAFT copies still sit beside them in `etsy/products/pdfs/`; do not upload
those.

- diabetic-food-list-letter.pdf
- diabetic-food-list-a4.pdf
- diabetic-grocery-list-letter.pdf
- diabetic-grocery-list-a4.pdf
- diabetic-lower-carb-swaps-letter.pdf
- diabetic-lower-carb-swaps-a4.pdf

I could not verify Etsy's per-listing file cap anywhere in this repo, so I am
not going to assert one. What the repo does show: the largest existing listing,
`etsy/listings/bundle.md`, ships 6 files. Six is therefore known to be
achievable. If Etsy refuses them, the fallback is one combined PDF per page
size or a zip, both of which the shop already uses
(`keto-food-list-bundle.pdf`, `mega-bundle-9-pdfs.zip`).

## Images

Not built. The house pattern is `etsy/products/listing-images/<product>/` plus
`etsy/build-foodlist-listing-images.py`. Needs a pass before listing.

## Description

You already know what you are supposed to eat. You want it on one page, in
words a normal person uses, where you can actually see it.

That is all this is. Three printable sheets for the fridge door and the
grocery cart. No app to download, nothing to log, no numbers to add up at the
end of the day.

WHAT YOU GET

1. The Food List. Every food sorted into three plain columns: lower carb,
moderate carb, higher carb. That is the only thing the columns tell you, and
it is the thing that is hardest to keep straight in your head at 5pm on a
Tuesday. Over 100 foods across meat, fish, eggs, dairy, vegetables, fruit,
grains, beans, nuts and the sweet shelf.

2. The Grocery List. The same foods again, but in the order you actually walk
the store. Tick boxes, aisle by aisle, and blank rows in every section so you
can add what your own household eats.

3. Lower Carb Swaps. Sixteen swaps that keep the meal you already like. Rice
becomes cauliflower rice. The sandwich becomes the same filling in lettuce.
Sugar in the coffee becomes cinnamon in the coffee. You are not giving up
dinner, you are trading one part of it.

WHY THESE THREE

Because the hard part was never the information. It was having it in front of
you at the moment you were deciding. One sheet on the fridge, one in your bag,
one to read once and remember.

FILE DETAILS

Instant digital download. US Letter and A4 versions of all three sheets, so
they print correctly wherever you are. Print at home or at any print shop.
Designed to still be readable across a kitchen.

WHAT THIS IS NOT

It is not a meal plan, not a program, and not a diet you have to start on a
Monday. It is a list. Read it, print it, get on with your day.

All sales are final. Because this is a digital product, refunds and exchanges
are not available. Please read the listing before you buy.

For personal use only. Digital download, no physical item is shipped. For
informational purposes only. Please talk with your doctor.

## Needs Brew before this can be listed

Verified 2026-09-08 against the live shop, read only, no listing touched.

**RESOLVED since the 09-06 draft:** the brand line (KetoDial.com, his ruling)
and the price (CA$4.99, defaulted per his ruling).

**STILL BLOCKING, and it is one thing:**

1. **Listing images. Not built.** `etsy/products/listing-images/` has no
   diabetic folder. Etsy will not accept a listing without at least one image,
   so this is a hard stop. The house pattern is
   `etsy/products/listing-images/<product>/` plus
   `etsy/build-foodlist-listing-images.py`. Needs its own pass, and needs his
   eye on the result. The comparable live listing (4482132169, Mediterranean
   food list) ships 2 images.

**WORTH A LOOK WHEN HE UPLOADS, not blocking:**

2. **Six files on one listing.** Known achievable: `etsy/listings/bundle.md`
   ships six. If Etsy pushes back, the fallback is one combined PDF per page
   size or a zip, both of which the shop already uses.
3. **Which bonus insert.** Every existing listing carries
   `bonus-insert-carnivore-weekly.pdf` as a seventh file. These sheets are now
   KetoDial-branded, and the ETSY50 card `bonus-insert-calculator.pdf` was
   verified working end to end on 2026-09-07. His call which one rides along,
   or neither.
4. **Shop section.** The comparable listing has `shop_section_id: null`, so
   leaving it unset matches the shop.

## Listing configuration (what "digital download" means in this shop)

Read off live listing 4482132169 on 2026-09-08, the closest comparable ($4.99
CAD single-sheet food list printable). Match these when creating the listing:

| Field | Value |
|---|---|
| listing_type | download (Etsy: "A digital file that buyers will download") |
| price | 4.99 CAD |
| quantity | 999 |
| taxonomy_id | 2078 |
| who_made | i_did |
| when_made | 2020_2026 |
| is_supply | false |
| is_personalizable | false |
| materials | none |
| shop_section_id | none |

Shop-wide check run the same day: 68 listings across all states, 62 of them
`download` and 6 `physical`. All six physical ones are the retired apparel and
sticker listings, every one of them inactive or expired. There is nothing in
the shop that is wrongly typed.
