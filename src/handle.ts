import baseCalendar from "./base.json";
import type {
	JSONCalendar,
	VEVENT,
	TasksResponse,
	TaskObject,
	UserPreferences,
} from "./types";
import { revert } from "./ical2json";
import { cyrb64, isValidTimeZone } from "./util";
import { EventCreatorClass } from "./eventCreator";
import { processTasks } from "./processTasks";

const apiBaseURL = new URL("https://api.todoist.com/rest/v2");

export async function handle(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	/**
	 * Request Handling
	 */

	const path = new URL(request.url).pathname;

	let expects: "text/calendar" | "application/json" | "text/plain" =
		"text/calendar";
	if (path === "/") expects = "text/calendar";
	else if (path === "/json") expects = "application/json";
	else if (path === "/text") expects = "text/plain";
	else if (path === "/ical") expects = "text/calendar";

	const {
		apiToken,
		timeZone = "Etc/UTC",
		lang = "en",
		projects: filterByProjectsList = null,
	} = Object.fromEntries(new URL(request.url).searchParams.entries());

	if (isValidTimeZone(timeZone) === false) {
		return new Response(`Invalid time zone: ${timeZone}`, { status: 400 });
	}

	if (lang !== "nl" && lang !== "en") {
		return new Response(
			`Invalid language: ${lang}. Only 'nl' and 'en' (British English) are supported`,
			{ status: 400 },
		);
	}

	const userPreferences: UserPreferences = {
		lang,
		locale: new Intl.Locale(lang === "en" ? "en-GB" : "nl-NL"),
		timeZone,
	} as const;

	const filterByProjectsListArray = filterByProjectsList
		? filterByProjectsList.split(",")
		: null;
	const projectIdRegex = /[0-9]+/;
	if (filterByProjectsListArray) {
		for (const projectId of filterByProjectsListArray) {
			const isValid = projectIdRegex.test(projectId);
			if (!isValid) {
				return new Response(
					`Invalid project ID: ${JSON.stringify(projectId)}`,
					{ status: 400 },
				);
			}
		}
	}

	/**
	 * Fetch tasks
	 */

	const requestUrl = new Request(`${apiBaseURL}/tasks`, {
		headers: {
			Authorization: `Bearer ${apiToken}`,
		},
	});

	const res = await fetch(requestUrl);
	if (!res.ok)
		return new Response((await res.text()) || "", { status: res.status });

	const resJson = (await res.json()) as TasksResponse;

	const {
		tasksByDate,
		overdueTasksByDate,
		collectedProjectIds,
		collectedSectionIds,
		overdueTasksTodayButNoOtherTaskToday,
	} = processTasks(resJson, filterByProjectsListArray);

	const projectIdMap = new Map<string, { name: string; url: string }>();
	const projectFetchList: Promise<{ id: string; name: string; url: string }>[] =
		[];
	for (const projectId of collectedProjectIds) {
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
				.then((res) => {
					if (res.ok) {
						return res;
					}

					throw new Error(
						`Fetch error for project ${projectId}: ${res.statusText}`,
					);
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
	const projectFetchListResponses = await Promise.all(projectFetchList);
	for (const project of projectFetchListResponses) {
		projectIdMap.set(project.id, project);
	}

	const sectionIdMap = new Map<string, string>();
	const sectionFetchList: Promise<{
		id: string;
		project_id: string;
		order: number;
		name: string;
	}>[] = [];
	for (const sectionId of collectedSectionIds) {
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
			})
				.then((res) => {
					if (res.ok) {
						return res;
					}

					throw new Error(
						`Fetch error for section ${sectionId}: ${res.statusText}`,
					);
				})
				.then((res) => res.json()),
		);
	}
	const sections = await Promise.all(sectionFetchList);
	for (const section of sections) {
		sectionIdMap.set(section.id, section.name);
	}

	const EventCreator = new EventCreatorClass(userPreferences);

	const vevents: VEVENT[] = [];
	for (const [date, events] of Object.entries(tasksByDate)) {
		let taskText = "";
		for (const event of events) {
			taskText += EventCreator.generateTaskText(
				event,
				projectIdMap,
				sectionIdMap,
			);
		}

		vevents.push(EventCreator.generateEvent([date, events], taskText));
	}

	if (
		overdueTasksTodayButNoOtherTaskToday.thereIsATaskForToday === false &&
		overdueTasksTodayButNoOtherTaskToday.thereAreOverdueTasks === true
	) {
	}

	const jsonCalendar = baseCalendar as JSONCalendar;
	jsonCalendar.VCALENDAR[0].VEVENT = vevents;
	jsonCalendar.VCALENDAR[0].UID = cyrb64(apiToken).toString();
	jsonCalendar.VCALENDAR[0]["X-WR-CALNAME"] = "Todoist Tasks";
	jsonCalendar.VCALENDAR[0]["X-WR-CALDESC"] =
		"Calendar generated by https://github.com/nbeerten/better-todoist-calendar-sync. ";
	if (filterByProjectsListArray) {
		jsonCalendar.VCALENDAR[0]["X-WR-CALDESC"] +=
			`Calendar includes only tasks from the following projects: ${filterByProjectsListArray.map((id) => projectIdMap.get(id)?.name).join(", ")}.`;
	} else {
		jsonCalendar.VCALENDAR[0]["X-WR-CALDESC"] +=
			"Calendar includes all tasks from all projects.";
	}

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
