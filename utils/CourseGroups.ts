import { config } from "../config";

export const sessionTypes = ["TD", "TP", "TME"] as const;
export type SessionType = typeof sessionTypes[number];
export type CourseGroups = Partial<Record<SessionType, string[]>>;
export type GroupSelection = Record<string, Partial<Record<SessionType, string>>>;

// Only explicit group markers are interpreted. Dates and session numbers such
// as "TD (n°7)" must not be mistaken for groups.
export function getCourseGroups(summary: string): CourseGroups {
    const result: CourseGroups = {};
    const course = summary.match(config.regexCourseCode);
    if (!course) return result;
    const title = summary.slice((course.index ?? 0) + course[1].length).toUpperCase();
    const numberList = "(\\d+(?:\\s*(?:ET|&|/|,|\\+)\\s*\\d+)*)";
    const marker = "(?:GROUPES?|GPE|GR)\\s*[-_:]?\\s*";
    const sessions = /(?:^|[^A-Z0-9])(TME|TD|TP)(?:\s*\/\s*(TME|TD|TP))?(?=$|[^A-Z])/g;
    for (const match of title.matchAll(sessions)) {
        const suffix = title.slice(match.index! + match[0].length);
        const numbered = suffix.match(new RegExp("^\\s*[-_:]?\\s*(?:\\(\\s*" + marker + "|" + marker + ")?" + numberList + "(?![A-Z0-9])"));
        if (!numbered) continue;
        const groups = [...new Set(numbered[1].match(/\d+/g)!.map(n => String(Number(n))))];
        for (const type of [match[1], match[2]].filter(Boolean) as SessionType[]) {
            result[type] = [...new Set([...(result[type] ?? []), ...groups])];
        }
    }
    return result;
}

export function matchesGroups(summary: string, selection?: Partial<Record<SessionType, string>>): boolean {
    if (!selection) return true;
    const groups = getCourseGroups(summary);
    return sessionTypes.every(type => !selection[type] || !groups[type]?.length || groups[type]!.includes(selection[type]!));
}

export function parseGroupSelection(value: unknown, courses: string[]): GroupSelection {
    if (value === undefined) return {};
    if (typeof value !== "string" || value.length > 4096) throw new Error("Invalid groups parameter.");
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { throw new Error("Groups must be a JSON object."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Groups must be a JSON object.");
    const result: GroupSelection = Object.create(null);
    for (const [course, selection] of Object.entries(parsed)) {
        if (!courses.includes(course) || !selection || typeof selection !== "object" || Array.isArray(selection)) {
            throw new Error("Groups must refer to selected courses.");
        }
        result[course] = {};
        for (const [type, group] of Object.entries(selection)) {
            if (!sessionTypes.includes(type as SessionType) || typeof group !== "string" || !/^(0|[1-9]\d{0,3})$/.test(group)) {
                throw new Error("Invalid session type or group number.");
            }
            result[course][type as SessionType] = group;
        }
    }
    return result;
}
