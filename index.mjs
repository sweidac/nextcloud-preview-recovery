import { readFileSync, writeFileSync } from "fs";
import * as csv from 'csv';

const FILE_ID_FROM_PREVIEW_PATH_REGEX = /^(?:.*\/)?(\d+)\/.+$/;
const NAME_FROM_PATH_REGEX = /^.*\/(.+\.jpg)$/;

/**
 * To be called wit three arguments: 
 * 1. path to the file containing all available hashsums
 * 2. path to the file containing the desired previews hashsums
 * 3. path to the file contianing the CSV mapping: fileId -> path
 * 
 * Result:
 * A file `mapped-everything.awkcompatible` that contains the mapping previewFileName -> pathInNextcloud
 */

// parse args

const allPreviewHashesPath     = process.argv[2],
      desiredPreviewHashesPath = process.argv[3],
      previewIdPathMappingPath = process.argv[4];

// read hashes

const sums = readHashes(allPreviewHashesPath),
      querySums = readHashes(desiredPreviewHashesPath);

console.log(`Have read ${Object.keys(sums).length} available preview hashes`);
console.log(`Have read ${Object.keys(querySums).length} query hashes`);

// map (previewHash -> previewPath -> fileId -> filePath)

const fileIdNameMapping = mapFileIdToImageName(),
      mappedEverything = await mapPreviewsToOriginals();

console.log(`Mapped ${mappedEverything.length} previews to their filepaths.`);

// write the result as (previewFileName --> filePath)

write(mappingToAwkCompatible(mappedEverything), 'mapped-everything.awkcompatible');

//
// Utility
//

async function mapPreviewsToOriginals() {
	const mappedEverything = [];

	const previewIdPathMapping = csv.parse(readFileSync(previewIdPathMappingPath), { bom: true, columns: true });

	await previewIdPathMapping.forEach((data) => {
		const fileId = data.fileid, path = data.path, name = fileIdNameMapping[fileId];

		if (name) {
			mappedEverything.push({
				fileId,
				path,
				name
			});
		}
	});
	return mappedEverything;
}

function mapFileIdToImageName(desiredHashes, allPreviewHashes) {
	const joined = join(desiredHashes, allPreviewHashes), fileIdNameMapping = {};

	let matched = [], unmatched = [];

	for (const key in joined) {
		const previewId = joined[key];

		if (previewId) {
			matched.push(previewId);

			fileIdNameMapping[getFileIdFromPreviewPath(previewId)] = getNameFromPath(key);
		} else {
			unmatched.push(key);
		}
	}

	console.log(`Matched ${matched.length} hashes. ${unmatched.length} remain unmatched. Total ${matched.length + unmatched.length}`);
	console.log(`Unmatched: `, unmatched);

	return fileIdNameMapping;
}

function mappingToAwkCompatible(mappedEverything) {
	let str = '';

	mappedEverything.forEach(entry => {
		str += `${entry.name}:${entry.path}\n`;
	});

	return str;
}

function getFileIdFromPreviewPath(path) {
	const matches = FILE_ID_FROM_PREVIEW_PATH_REGEX.exec(path);

	if (! matches) {
		return null;
	}

	return matches[1];
}

function getNameFromPath(path) {
	const matches = NAME_FROM_PATH_REGEX.exec(path);

	if (! matches) {
		return null;
	}

	return matches[1];
}


function join(query, data) {
	const result = {};

	for (const key in query) {
		result[query[key]] = data[key];
	}

	return result;
}

function readHashes(path) {
	const sums = {};

	readFileSync(path)
		.toString()
		.split('\n')
		.forEach(sumline => {
				const split = sumline.split('  ');

				sums[split[0]] = split[1];
			});

	return sums;
}

function write(text, fileName) {
	writeFileSync(fileName, text);
}