![Thumbnail and example of this project, with the title: better-todoist-calendar-sync](https://github.com/user-attachments/assets/4dbafda0-f67e-48e0-b3f4-0966d81cee35)

# Better Todoist Calendar Sync
This tool helps you see your Todoist tasks in a calendar format, making them easier to manage. Here's how it works:

* **Retrieves Todoist tasks:** It grabs all your Todoist tasks using your API token.
* **Creates daily events:** It creates a daily calendar event with all your tasks for that day, nicely grouped together with information like labels, description, and project + section.
* **Works with popular calendars:** Initially optimized for use with Proton Calendar. From testing, it also seems to work with Google Calendar.

## Setup

1. **Get your Todoist API Token:**
    * Go to Todoist settings -> Integrations -> Developer.
    * Copy the API token shown there.

2. **Build your calendar link:**
    * Take this base URL: `https://todoist-sync.nilsbeerten.nl/ical?apiToken={your_api_token}`
    * Replace `{your_api_token}` with your actual API token you copied.

3. **Set your language and timezone (optional):**
    * Want your calendar in Dutch (nl) or English (en)? Add `&lang={language}` to the URL after `apiToken`.
    * Need a specific time zone? Add `&timeZone={your_timezone}` (e.g., `Europe/Amsterdam`). By default, it uses UTC.
  
4. **Filter by project (optional):**
	 * Want only tasks from specific projects to end up in your calendar? Add `&projects={project_ids}` at the end of the URL.
	 * You can find those IDs by going to [`https://app.todoist.com/app/projects`](https://app.todoist.com/app/projects), then clicking on one of your projects. Then look at the URL. In the following URL: `https://app.todoist.com/app/project/example-project-2338933933`, the project ID is the last 10 digits: `2338933933`.
	 * Once you have found all project IDs, copy them and seperate them with commas (only applicable if you want to filter by more then 1 project).
    * This is how it should end up looking: `&projects=2338933933,2338934325`.

### Adding the Link to Your Calendar:

* Look for an option in your calendar app like adding a calendar "Via URL" or "Subscribe to calendar".
* Paste the completed URL you built in step 2 (or 3 or 4, if you added language/timezone and/or filtered by project).

**Now you'll see your Todoist tasks neatly organized in your calendar!**

> [!NOTE] 
> This tool is currently only available in Dutch and English.

## Future features
* Task sorting
