# Better Todoist Calendar Sync (todoist-sync)
This tool helps you see your Todoist tasks in a calendar format, making them easier to manage. Here's how it works:

* **Retrieves Todoist Tasks:** It grabs all your Todoist tasks using your API token.
* **Creates Daily Events:** It creates a daily calendar event with all your tasks for that day, nicely grouped together with information like labels, description, and project + section.
* **Works with Popular Calendars:** Initially optimized for use with Proton Calendar. From testing, it also seems to work with Google Calendar.

## Setup

1. **Get your Todoist API Token:**
    * Go to Todoist settings -> Integrations -> Developer.
    * Copy the API token shown there.

2. **Build Your Calendar Link:**
    * Take this base URL: `https://todoist-sync.nilsbeerten.nl/ical?apiToken={your_api_token}`
    * Replace `{your_api_token}` with your actual API token you copied.

3. **Set Your Language and Time Zone (Optional):**
    * Want your calendar in Dutch (nl) or English (en)? Add `&lang={language}` to the URL after `apiToken`.
    * Need a specific time zone? Add `&timeZone={your_timezone}` (e.g., `Europe/Amsterdam`). By default, it uses UTC.

### Adding the Link to Your Calendar:

* Look for an option in your calendar app like adding a calendar "Via URL" or "Subscribe to calendar".
* Paste the completed URL you built in step 2 (and 3, if you added language/timezone).

**Now you'll see your Todoist tasks neatly organized in your calendar!**

> [!NOTE] 
> This tool is currently only available in Dutch and English.

## Future features
* Project filtering: You'll be able to create calendar links that only show tasks from a specific project or multiple projects. This is perfect for focusing on tasks related to a particular project without getting overwhelmed by other tasks that you don't want in your calendar.
* Task Sorting
