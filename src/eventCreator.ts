import type { TaskObject, UserPreferences } from "./types";

export class EventCreatorClass {
	protected nowDate = "";
	protected userPreferences: UserPreferences;

	get userPref() {
		return this.userPreferences;
	}

	constructor(userPreferences: UserPreferences) {
		this.userPreferences = userPreferences;
		this.nowDate = `${new Date().toLocaleDateString(this.userPref.locale, { dateStyle: "short", timeZone: this.userPref.timeZone })} ${this.userPref.lang === "en" ? "at" : "om"} ${new Date().toLocaleTimeString(this.userPref.locale, { timeStyle: "long", timeZone: this.userPref.timeZone })}`;
	}

	public generateEvent(
		[date, events]: [string, TaskObject[]],
		taskText: string,
	) {
		const eventAmount = events.length;

		let SUMMARY: string;
		if (this.userPref.lang === "nl") {
			SUMMARY = `${eventAmount} ${eventAmount === 1 ? "taak" : "taken"}`;
		} else {
			SUMMARY = `${eventAmount} ${eventAmount === 1 ? "task" : "tasks"}`;
		}

		let description = "";

		description += taskText;

		if (this.userPref.lang === "nl") {
			description += `<i>Laatst gesynchroniseerd op ${this.nowDate}</i>`;
		} else {
			description += `<i>Last synced on ${this.nowDate}</i>`;
		}

		return {
			SUMMARY: SUMMARY,
			UID: events[0].uid,
			DESCRIPTION: description,
			"DTSTART;VALUE=DATE": events[0].date[0],
			"DTEND;VALUE=DATE": events[0].date[1],
			DTSTAMP: new Date()
				.toISOString()
				.replaceAll("-", "")
				.replace(/\.[0-9]{3}/, "")
				.replaceAll(":", ""),
		};
	}

	public generateTaskText(
		activity: TaskObject,
		projectIdMap: Map<string, { name: string; url: string }>,
		sectionIdMap: Map<string, string>,
	) {
		let description = "";
		if (activity.projectId) {
			const projectInfo = projectIdMap.get(activity.projectId);
			if (!projectInfo)
				throw new Error(`Project ${activity.projectId} not found`);
			const projectText = `# <a href="${projectInfo.url}">${projectInfo.name}</a>`;
			if (activity.sectionId) {
				const sectionName = sectionIdMap.get(activity.sectionId);
				if (!sectionName)
					throw new Error(`Section ${activity.sectionId} not found`);
				description += `${projectText}  /  ${sectionName}<br>`;
			} else {
				description += `${projectText}<br>`;
			}
		}
		description += `<a href="${activity.url}"><b>${activity.summary}</b></a><br>`;
		if (activity.labels.length > 0)
			description += `🏷️ <i>${activity.labels.join(", ")}</i><br>`;
		if (activity.description)
			description += `${activity.description.replaceAll("\n", " ")}<br>`;
		description += "<br>";

		return description;
	}
}
