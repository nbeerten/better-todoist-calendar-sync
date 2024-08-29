/* The MIT License (MIT)
Copyright (c) 2017 Adrian Lee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

https://github.com/adrianlee44/ical2json/blob/main/src/ical2json.ts
*/

/* Edited by nbeerten */

// Make sure lines are splited correctly
// http://stackoverflow.com/questions/1155678/javascript-string-newline-character
const NEW_LINE = /\r\n|\n|\r/;
const COLON = ":";
// const COMMA = ",";
// const DQUOTE = "\"";
// const SEMICOLON = ";";
const SPACE = " ";

export interface IcalObject {
	[key: string]: string | string[] | IcalObject[];
}

/**
 * Take ical string data and convert to JSON
 */
function convert(source: string): IcalObject {
	const output: IcalObject = {};
	const lines = source.split(NEW_LINE);

	let parentObj: IcalObject = {};
	let currentObj: IcalObject = output;
	const parents: IcalObject[] = [];

	let currentKey = "";

	for (let i = 0; i < lines.length; i++) {
		let currentValue = "";

		const line = lines[i];
		if (line.charAt(0) === SPACE) {
			currentObj[currentKey] += line.substring(1);
		} else {
			const splitAt = line.indexOf(COLON);

			if (splitAt < 0) {
				continue;
			}

			currentKey = line.substring(0, splitAt);
			currentValue = line.substring(splitAt + 1);

			switch (currentKey) {
				case "BEGIN":
					parents.push(parentObj);
					parentObj = currentObj;
					if (parentObj[currentValue] == null) {
						parentObj[currentValue] = [];
					}
					// Create a new object, store the reference for future uses
					currentObj = {};
					(parentObj[currentValue] as IcalObject[]).push(currentObj);
					break;
				case "END":
					currentObj = parentObj;
					parentObj = parents.pop() as IcalObject;
					break;
				default:
					if (currentObj[currentKey]) {
						if (!Array.isArray(currentObj[currentKey])) {
							currentObj[currentKey] = [currentObj[currentKey]] as string[];
						}
						(currentObj[currentKey] as string[]).push(currentValue);
					} else {
						(currentObj[currentKey] as string) = currentValue;
					}
			}
		}
	}
	return output;
}

/**
 * Take JSON, revert back to ical
 */
function revert(object: IcalObject): string {
	const lines = [];

	for (const key in object) {
		const value = object[key];
		if (Array.isArray(value)) {
			if (key === "RDATE") {
				for (const item of value as string[]) {
					lines.push(`${key}:${item}`);
				}
			} else {
				for (const item of value as IcalObject[]) {
					lines.push(`BEGIN:${key}`);
					lines.push(revert(item));
					lines.push(`END:${key}`);
				}
			}
		} else {
			let fullLine = `${key}:${value}`;
			do {
				// According to ical spec, lines of text should be no longer
				// than 75 octets
				lines.push(fullLine.substring(0, 75));
				fullLine = SPACE + fullLine.substring(75);
			} while (fullLine.length > 1);
		}
	}

	return lines.join("\n");
}

export { revert, convert };
