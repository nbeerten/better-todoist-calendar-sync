import type { JSONCalendar, VEVENT } from "./types";
import baseCalendar from "./base.json";
import { revert } from "./ical2json";

const apiBaseURL = new URL("https://api.todoist.com/rest/v2");

export type TasksResponse = Array<{
	id: string;
	assigner_id: null;
	assignee_id: null;
	project_id: string;
	section_id?: string;
	parent_id: null;
	order: number;
	content: string;
	description: string;
	is_completed: boolean;
	labels: Array<string>;
	priority: number;
	comment_count: number;
	creator_id: string;
	created_at: string;
	due: {
		date: string;
		string: string;
		lang: string;
		is_recurring: boolean;
		datetime?: string;
	} | null;
	url: string;
	duration: null;
	deadline: null;
}>;

const cyrb64 = (str: string, seed = 0) => {
	let h1 = 0xdeadbeef ^ seed;
	let h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch: number; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	// For a single 53-bit numeric return value we could return
	// 4294967296 * (2097151 & h2) + (h1 >>> 0);
	// but we instead return the full 64-bit value:
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export async function handle(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	const path = new URL(request.url).pathname;

	let expects: "text/calendar" | "application/json" | "text/plain" =
		"text/calendar";
	if (path === "/") expects = "text/calendar";
	else if (path === "/json") expects = "application/json";
	else if (path === "/text") expects = "text/plain";
	else if (path === "/ical") expects = "text/calendar";

	const { apiToken } = Object.fromEntries(
		new URL(request.url).searchParams.entries(),
	);

	const requestUrl = new Request(`${apiBaseURL}/tasks`, {
		headers: {
			Authorization: `Bearer ${apiToken}`,
		},
	});

	const res = (await fetch(requestUrl).then((res) =>
		res.json(),
	)) as TasksResponse;

	const activitiesByDate: Record<
		string,
		{
			summary: string;
			description: string;
			labels: Array<string>;
			url: string;
			uid: string;
			date: [string, string];
		}[]
	> = {};

	for (const task of res) {
		if (task.due === null) continue;
		const dateObj = new Date(task.due.date);
		const nextDayDateObj = new Date(task.due.date);
		nextDayDateObj.setDate(dateObj.getDate() + 1);
		const dateEnd = nextDayDateObj
			.toISOString()
			.split("T")[0]
			.replaceAll("-", "");
		const date = task.due.date.replaceAll("-", "");

		activitiesByDate[date] = activitiesByDate[date] || [];
		activitiesByDate[date].push({
			summary: task.content,
			description: task.description,
			labels: task.labels,
			url: task.url,
			uid: task.id,
			date: [date, dateEnd],
		});
	}

	const nowDate = `${new Date().toLocaleDateString("nl-NL", { dateStyle: "short", timeZone: "Europe/Amsterdam" })} om ${new Date().toLocaleTimeString("nl-NL", { timeStyle: "long", timeZone: "Europe/Amsterdam" })}`;

	const vevents: VEVENT[] = [];
	for (const [date, events] of Object.entries(activitiesByDate)) {
		const eventAmount = events.length;
		const SUMMARY = `${eventAmount} ${eventAmount === 1 ? "taak" : "taken"}`;

		let description = "";

		for (const event of events) {
			description += `<a href="${event.url}">${event.summary}</a><br><i>${event.labels.join(", ")}</i>`;
			if (event.description)
				description += `<br>${event.description.replaceAll("\n", " ")}`;
			description += "<br><br>";
		}

		description += `<i>Laatst gesynchroniseerd op ${nowDate}</i>`;

		vevents.push({
			SUMMARY: SUMMARY,
			UID: events[0].uid,
			DESCRIPTION: description,
			"DTSTART;VALUE=DATE": events[0].date[0],
			"DTEND;VALUE=DATE": events[0].date[1],
		});
	}

	const jsonCalendar = baseCalendar as JSONCalendar;
	jsonCalendar.VCALENDAR[0].VEVENT = vevents;
	jsonCalendar.VCALENDAR[0].UID = cyrb64(apiToken).toString();
	jsonCalendar.VCALENDAR[0]["X-WR-CALNAME"] = "Todoist Tasks";

	if (expects === "text/calendar") {
		return new Response(revert(jsonCalendar), {
			headers: {
				"content-type": "text/calendar",
			},
		});
	}
	if (expects === "application/json") {
		return new Response(JSON.stringify(jsonCalendar, null, 4), {
			headers: {
				"content-type": "application/json",
			},
		});
	}
	if (expects === "text/plain") {
		return new Response(revert(jsonCalendar), {
			headers: {
				"content-type": "text/plain",
			},
		});
	}

	return new Response(
		"Please use either the json, text or ical endpoint. Use one of /json, /text, /ical",
		{ status: 501 },
	);
}
