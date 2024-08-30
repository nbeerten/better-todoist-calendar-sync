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
			projectId?: string;
			sectionId?: string;
			uid: string;
			date: [string, string];
		}[]
	> = {};

	const projectIds = new Set<string>();
	const sectionIds = new Set<string>();

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

		if (task.project_id) projectIds.add(task.project_id);
		if (task.section_id) sectionIds.add(task.section_id);

		activitiesByDate[date] = activitiesByDate[date] || [];
		activitiesByDate[date].push({
			summary: task.content,
			description: task.description,
			labels: task.labels,
			url: task.url,
			projectId: task.project_id,
			sectionId: task.section_id,
			uid: task.id,
			date: [date, dateEnd],
		});
	}

	const projectIdMap = new Map<string, { name: string; url: string }>();
	const projectFetchList: Promise<{ id: string; name: string; url: string }>[] =
		[];
	for (const projectId of projectIds) {
		projectFetchList.push(
			fetch(`${apiBaseURL}/projects/${projectId}`, {
				headers: {
					Authorization: `Bearer ${apiToken}`,
				},
				cf: {
					// Always cache this fetch regardless of content type
					// for a max of 60 * 30 = 30 minutes before revalidating the resource
					cacheTtl: 60 * 30,
					cacheEverything: true,
				},
			})
				.then(
					(res) =>
						res.json() as Promise<{
							id: string;
							name: string;
							comment_count: number;
							color: string;
							is_shared: boolean;
							order: number;
							is_favorite: boolean;
							is_inbox_project: boolean;
							is_team_inbox: boolean;
							view_style: string;
							url: string;
							parent_id: unknown;
						}>,
				)
				.then((json) => ({ id: json.id, name: json.name, url: json.url })),
		);
	}
	const projects = await Promise.all(projectFetchList);
	for (const project of projects) {
		projectIdMap.set(project.id, project);
	}

	const sectionIdMap = new Map<string, string>();
	const sectionFetchList: Promise<{
		id: string;
		project_id: string;
		order: number;
		name: string;
	}>[] = [];
	for (const sectionId of sectionIds) {
		sectionFetchList.push(
			fetch(`${apiBaseURL}/sections/${sectionId}`, {
				headers: {
					Authorization: `Bearer ${apiToken}`,
				},
				cf: {
					// Always cache this fetch regardless of content type
					// for a max of 60 * 30 = 30 minutes before revalidating the resource
					cacheTtl: 60 * 30,
					cacheEverything: true,
				},
			}).then((res) => res.json()),
		);
	}
	const sections = await Promise.all(sectionFetchList);
	for (const section of sections) {
		sectionIdMap.set(section.id, section.name);
	}

	const nowDate = `${new Date().toLocaleDateString("nl-NL", { dateStyle: "short", timeZone: "Europe/Amsterdam" })} om ${new Date().toLocaleTimeString("nl-NL", { timeStyle: "long", timeZone: "Europe/Amsterdam" })}`;

	const vevents: VEVENT[] = [];
	for (const [date, events] of Object.entries(activitiesByDate)) {
		const eventAmount = events.length;
		const SUMMARY = `${eventAmount} ${eventAmount === 1 ? "taak" : "taken"}`;

		let description = "";

		for (const event of events) {
			if (event.projectId) {
				const projectInfo = projectIdMap.get(event.projectId);
				if (!projectInfo) continue;
				const projectText = `# <a href="${projectInfo.url}">${projectInfo.name}</a>`;
				if (event.sectionId) {
					const sectionName = sectionIdMap.get(event.sectionId);
					if (!sectionName) continue;
					description += `${projectText}  /  ${sectionName}<br>`;
				} else {
					description += `${projectText}<br>`;
				}
			}
			description += `<a href="${event.url}"><b>${event.summary}</b></a><br>`;
			if (event.labels.length > 0)
				description += `🏷️ <i>${event.labels.join(", ")}</i><br>`;
			if (event.description)
				description += `${event.description.replaceAll("\n", " ")}<br>`;
			description += "<br>";
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

	const baseHeaders = {
		"Cache-Control": "private, no-cache, no-store, no-transform",
	};

	if (expects === "text/calendar") {
		return new Response(revert(jsonCalendar), {
			headers: {
				...baseHeaders,
				"content-type": "text/calendar",
			},
		});
	}
	if (expects === "application/json") {
		return new Response(JSON.stringify(jsonCalendar, null, 4), {
			headers: {
				...baseHeaders,
				"content-type": "application/json",
			},
		});
	}
	if (expects === "text/plain") {
		return new Response(revert(jsonCalendar), {
			headers: {
				...baseHeaders,
				"content-type": "text/plain",
			},
		});
	}

	return new Response(
		"Please use either the json, text or ical endpoint. Use one of /json, /text, /ical",
		{ status: 501 },
	);
}
