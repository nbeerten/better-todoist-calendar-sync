export type JSONCalendar = {
	VCALENDAR: Array<{
		VERSION: string;
		PRODID: string;
		CALSCALE: string;
		UID: string;
		"X-WR-CALNAME": string;
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
