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

import { handle } from "./handle";



const README = `# Transform Todoist
Initially developed as a tool to convert the Todoist iCal into a more comprehensible format, the application now utilizes the API to retrieve all tasks.
This tool allows you to use an API token to create a link that creates an event for each day with tasks, and groups those tasks together in a nice overview.
It works best on proton calendar, which I use, but it also works on Google Calendar.
The description of the event needs to support simple HTML to use this calendar.

Currently, it's only available in Dutch.

Usage is as follows:
Go to your Todoist settings, then navigate to the Integrations tab. Head to the "Developer" section, then copy your API Token.
Then add the API token to the following URL: 'https://transform-todoist.nilsbeerten.nl/ical?apiToken={Your api token}'.
This URL can now be added to your calendar, by clicking an option along the lines of "Via URL" or "Subscribe to a calendar".`;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const path = new URL(request.url).pathname;
		if(request.method !== "GET" || path === "/") {
			return new Response(README, {
				headers: {
					"content-type": "text/plain",
				},
			});
		}

		return handle(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
