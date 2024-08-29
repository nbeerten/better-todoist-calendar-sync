/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { convert, revert } from "./ical2json";
import type { JSONCalendar, VEVENT } from "./types";

const baseURL = new URL("https://ext.todoist.com/export/ical/todoist");

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const path = new URL(request.url).pathname;

		let expects: "text/calendar" | "application/json" | "text/plain" =
			"text/calendar";
		if (path === "/") expects = "text/calendar";
		else if (path === "/json") expects = "application/json";
		else if (path === "/text") expects = "text/plain";
		else if (path === "/ical") expects = "text/calendar";

		const { user_id, ical_token, r_factor } = Object.fromEntries(
			new URL(request.url).searchParams.entries(),
		);

		const requestUrl = new URL(baseURL);
		requestUrl.searchParams.set("user_id", user_id);
		requestUrl.searchParams.set("ical_token", ical_token);
		requestUrl.searchParams.set("r_factor", r_factor);

		const todoistIcal = await fetch(requestUrl).then((res) => res.text());

		const converted = convert(todoistIcal) as JSONCalendar;

		const events = converted.VCALENDAR[0].VEVENT;

		const activitiesByDate: Record<
			string,
			{
				summary: string;
				description: string;
				uid: string;
				date: [string, string];
			}[]
		> = {};

		for (const event of events) {
			let date = "";
			let dateEnd = "";
			if (event["DTSTART;VALUE=DATE-TIME"] && event["DTEND;VALUE=DATE-TIME"]) {
				date = event["DTSTART;VALUE=DATE-TIME"].split("T")[0];
				dateEnd = event["DTEND;VALUE=DATE-TIME"].split("T")[0];
			} else if (event["DTSTART;VALUE=DATE"] && event["DTEND;VALUE=DATE"]) {
				date = event["DTSTART;VALUE=DATE"];
				dateEnd = event["DTEND;VALUE=DATE"];
			} else {
				continue;
			}
			activitiesByDate[date] = activitiesByDate[date] || [];
			activitiesByDate[date].push({
				summary: event.SUMMARY,
				description: event.DESCRIPTION,
				uid: event.UID,
				date: [date, dateEnd],
			});
		}

		const nowDate = new Date().toLocaleDateString("nl-NL", { dateStyle: "short", timeZone: "Europe/Amsterdam" }) + " om " + new Date().toLocaleTimeString("nl-NL", { timeStyle: "long", timeZone: "Europe/Amsterdam" });
		console.log(nowDate);

		const reshapedVEvents: VEVENT[] = [];
		for (const [date, events] of Object.entries(activitiesByDate)) {
			const eventAmount = events.length;
			const SUMMARY = `${eventAmount} ${eventAmount === 1 ? "taak" : "taken"}`;

			let DESCRIPTION = `Taken van vandaag (${eventAmount}):\\n\\n`;

			for (const event of events) {
				DESCRIPTION += `- ${event.summary}\\n`;
			}

			DESCRIPTION += `\\n\\nLaatst gesynchroniseerd op ${nowDate}`;

			const dateObj = new Date(
				date.replace(/^(.{4})(.{2})/, "$1" + "-" + "$2" + "-"),
			);
			const newDateEnd = new Date(dateObj);
			newDateEnd.setDate(newDateEnd.getDate() + 1);
			const newDateEndStr = newDateEnd
				.toISOString()
				.split("T")[0]
				.replaceAll("-", "");

			reshapedVEvents.push({
				SUMMARY,
				UID: events[0].uid,
				"DTSTART;VALUE=DATE": events[0].date[0],
				"DTEND;VALUE=DATE": newDateEndStr,
				DESCRIPTION,
			});
		}

		const newCalendar = structuredClone(converted);

		newCalendar.VCALENDAR[0].VEVENT = reshapedVEvents;

		if (expects === "text/calendar") {
			return new Response(revert(newCalendar), {
				headers: {
					"content-type": "text/calendar",
				},
			});
		}
		if (expects === "application/json") {
			return new Response(JSON.stringify(newCalendar, null, 4), {
				headers: {
					"content-type": "application/json",
				},
			});
		}
		if (expects === "text/plain") {
			return new Response(revert(newCalendar), {
				headers: {
					"content-type": "text/plain",
				},
			});
		}

		return new Response(
			"Please use either the json, text or ical endpoint. Use one of /json, /text, /ical",
			{ status: 501 },
		);
	},
} satisfies ExportedHandler<Env>;
