---
status: wip
---
#project/one-pager

# Design
*Here we will design the project and outline technical details*

## Overview
I like the functionality of the Day Planner obsidian plugin, but it's (A) too much for my use case and (B) they didn't approve my [time format](https://github.com/ivan-lednev/obsidian-day-planner/issues/867). Essentially, I want a plugin to show my daily task/timeline on the side from my daily note.

## MVP
- Timeline on the sidebar that pulls from my notes

### V2+
- The little time thing on the bottom that shows the current task and how much time remaining:
	- ![[day-planner-taskbar.png]]
- Ability to view other days' schedules as well
- Change how long the default item is (ones with no end time)

## Technical Details
This should be pretty simple, with the following parsing algorithm:
- Take the current local date
- Find the daily note with that local date
- Parse the daily note, only considering the lines with:
	- A checkbox
	- A top-level checkbox (not nested)
	- Starting with a regexable time
- The time regex can match the following info:
	- 12pm (only hour and am/pm)
	- 1:30pm (only one time with colon and am/pm)
	- 13:30 (only one time)
	- 12pm-1pm (hour am/pm - hour am/pm)
	- 12:30pm-1:30pm
	- 12pm-1:30pm
	- 12:30pm-1:00pm
	- 4-5pm (will assume the "am/pm" carries over)
	- 13:00-15:00 (need to have minute if using 24 hour format)
- After the time string, parse the remaining characters into the "title" of the item
- Place all the items in a time-spaced diagram (basically one column with blocks for each item based on how long they are)
- If an item does not have an end time, default to 30 mins
- Be able to handle multiple overlapping items

Settings:
- Daily note folder

# Scratch
*Just a place to jot down ideas while planning this project*
