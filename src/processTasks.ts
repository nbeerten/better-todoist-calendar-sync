import type { TaskObject, TasksResponse } from "./types";

export function processTasks(
	taskRespone: TasksResponse,
	projectFilter: string[] | null,
) {
	const projectIdCollector = new Set<string>();
	const sectionIdCollector = new Set<string>();

	const tasksByDate: Record<string, TaskObject[]> = {};
	const overdueTasksByDate: typeof tasksByDate = {};

	const overdueTasksTodayButNoOtherTaskToday = {
		thereIsATaskForToday: false, // Needs to be false
		thereAreOverdueTasks: false, // Needs to be true
	};

	for (const task of taskRespone) {
		if (projectFilter) {
			if (!projectFilter.includes(task.project_id)) continue;
		}

		if (task.due === null) continue;
		const dateObj = new Date(task.due.date);
		const nextDayDateObj = new Date(task.due.date);
		nextDayDateObj.setDate(dateObj.getDate() + 1);
		const dateEnd = nextDayDateObj
			.toISOString()
			.split("T")[0]
			.replaceAll("-", "");
		const date = task.due.date.replaceAll("-", "");

		if (task.project_id) projectIdCollector.add(task.project_id);
		if (task.section_id) sectionIdCollector.add(task.section_id);

		const taskObject = {
			summary: task.content,
			description: task.description,
			labels: task.labels,
			url: task.url,
			projectId: task.project_id,
			sectionId: task.section_id,
			uid: task.id,
			date: [date, dateEnd],
		} satisfies TaskObject;

		if (new Date().toISOString().split("T")[0].replaceAll("-", "") > date) {
			overdueTasksByDate[date] = overdueTasksByDate[date] || [];
			overdueTasksByDate[date].push(taskObject);
		} else {
			tasksByDate[date] = tasksByDate[date] || [];
			tasksByDate[date].push(taskObject);
		}

		// If there is a task for today, we don't need to create a new event for today to put overdue tasks in
		if (date === new Date().toISOString().split("T")[0].replaceAll("-", "")) {
			overdueTasksTodayButNoOtherTaskToday.thereIsATaskForToday = true;
		}
	}

	if (Object.entries(overdueTasksByDate).length > 0) {
		overdueTasksTodayButNoOtherTaskToday.thereAreOverdueTasks = true;
	}

	return {
		tasksByDate,
		overdueTasksByDate,
		collectedProjectIds: projectIdCollector,
		collectedSectionIds: sectionIdCollector,
		overdueTasksTodayButNoOtherTaskToday,
	};
}
