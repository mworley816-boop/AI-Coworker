import assert from "node:assert/strict";
import {test} from "node:test";
import {assessDailyGraphicBudget} from "./scentmarked-graphic-daily-budget.ts";
test("allows only within daily capacity",()=>{assert.equal(assessDailyGraphicBudget({completedToday:2,reservedToday:1,requested:2,dailyLimit:5}).allowed,true);assert.equal(assessDailyGraphicBudget({completedToday:2,reservedToday:1,requested:3,dailyLimit:5}).reason,"DAILY_LIMIT_EXCEEDED")});
test("counts in-flight reservations",()=>assert.equal(assessDailyGraphicBudget({completedToday:0,reservedToday:5,requested:1,dailyLimit:5}).allowed,false));
test("rejects invalid values",()=>{assert.equal(assessDailyGraphicBudget({completedToday:-1,reservedToday:0,requested:1,dailyLimit:5}).allowed,false);assert.equal(assessDailyGraphicBudget({completedToday:0,reservedToday:0,requested:6,dailyLimit:5}).allowed,false)});
