// Writes test-vault/Daily/<today>.md with one task per time format from the design,
// plus lines that must NOT render (nested checkbox, plain bullet, untimed task).
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const dir = join("test-vault", "Daily");
const file = join(dir, `${today}.md`);

const note = `# ${today}

## Schedule
- [ ] 12pm Lunch (hour + am/pm, default 30 min)
- [ ] 1:30pm Dentist (h:mm + am/pm)
- [ ] 13:30 Overlaps the dentist (24-hour, single time)
- [x] 12pm-1pm Done item, overlaps lunch
- [ ] 12:30pm-1:30pm Overlaps lunch and dentist
- [ ] 12pm-1:30pm Third column in the noon cluster
- [ ] 12:30pm-1:00pm Fourth column in the noon cluster
- [ ] 4-5pm Meridiem carries over to the start
- [ ] 13:00-15:00 Focus block (24-hour range)
- [ ] 9am - Standup (separator dash before the title)
- [ ] 9:15am: Triage (separator colon before the title)
- [ ] 11am-1 Inherited end flips to 1pm
- [ ] 11pm-1am Crosses midnight, clamped to end of day
- [ ] 6:05am Five-minute item still gets a minimum height
- [ ] 8am Coffee
	- [ ] 8:15am Nested checkbox: must NOT render
- 10am Plain bullet, not a checkbox: must NOT render
- [ ] Buy milk (no time): must NOT render
- [ ] 4 things to do (bare number is not a time): must NOT render

## Notes
Some prose with 3pm in it that is not a task.
`;

mkdirSync(dir, { recursive: true });
writeFileSync(file, note, "utf8");
console.log(`wrote ${file}`);
