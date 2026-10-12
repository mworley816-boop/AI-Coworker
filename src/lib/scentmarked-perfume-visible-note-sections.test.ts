import assert from "node:assert/strict";
import {test} from "node:test";
import {extractVisibleFragranceNotes} from "./scentmarked-perfume-visible-note-sections.ts";
test("parses Lattafa-style labeled note sections",()=>{
 const text="Khamrah\nFragrance Notes:\nTop: Bergamot, Cinnamon, Nutmeg\nHeart: Dates Accord, Praline\nBase: Vanilla, Amber Wood\nProduct Information\nTop: Fake";
 assert.deepEqual(extractVisibleFragranceNotes(text),["Bergamot","Cinnamon","Nutmeg","Dates Accord","Praline","Vanilla","Amber Wood"]);
});
test("parses Arabiyat-style labeled note sections",()=>{
 const text="FRAGRANCE NOTES:\nTop Notes : Elemi, Pepper\nMiddle Notes : Patchouli, Saffron\nBase Notes : Vanilla, Benzoin\nUPC Barcode: 123";
 assert.deepEqual(extractVisibleFragranceNotes(text),["Elemi","Pepper","Patchouli","Saffron","Vanilla","Benzoin"]);
});
test("does not infer from descriptions or lone labels",()=>{
 assert.deepEqual(extractVisibleFragranceNotes("Product Information\nTop: Vanilla\nHeart: Rose"),[]);
 assert.deepEqual(extractVisibleFragranceNotes("Fragrance Notes:\nTop: Vanilla"),[]);
});
