# Transform Todoist
Initially developed as a tool to convert the Todoist iCal into a more comprehensible format, the application now utilizes the API to retrieve all tasks.
This tool allows you to use an API token to create a link that creates an event for each day with tasks, and groups those tasks together in a nice overview.
It works best on proton calendar, which I use, but it also works on Google Calendar. 
The description of the event needs to support simple HTML to use this calendar.

Currently, it's only available in Dutch and English.

Usage is as follows:
Go to your Todoist settings, then navigate to the Integrations tab. Head to the "Developer" section, then copy your API Token.
Then add the API token to the following URL: `https://transform-todoist.nilsbeerten.nl/ical?apiToken={your_api_token}`.
Additionally you should add the `lang` and `timeZone` query (add: `&lang=nl&timeZone=Europe/Amsterdam`). English (`en`) and Dutch (`nl`)
are supported. The default timeZone is `Etc/Utc`.
This URL can now be added to your calendar, by clicking an option along the lines of "Via URL" or "Subscribe to a calendar".
