export type JSONCalendar = {
	VCALENDAR: Array<{
		VERSION: string;
		PRODID: string;
		CALSCALE: string;
		UID: string;
		"X-WR-CALNAME": string;
		"X-WR-CALDESC": string;
		"X-WR-TIMEZONE": string;
		"X-PUBLISHED-TTL": string;
		"X-APPLE-CALENDAR-COLOR": string;
		"REFRESH-INTERVAL;VALUE=DURATION": string;
		VEVENT: VEVENT[];
	}>;
};

export type VEVENT = {
	SUMMARY: string;
	UID: string;
	"DTSTART;VALUE=DATE"?: string;
	"DTEND;VALUE=DATE"?: string;
	DESCRIPTION: string;
	"DTSTART;VALUE=DATE-TIME"?: string;
	"DTEND;VALUE=DATE-TIME"?: string;
};

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
