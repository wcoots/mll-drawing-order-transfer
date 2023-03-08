interface SourceFileDrawOrderDictionary {
    [identifier: number]: string;
}

const mmlFilePattern = /^.+<Compact_Sonar_Files>.+<\/Compact_Sonar_Files>.+$/s;
const csfRowPattern =
    /<CSFFILE[0-9]+>[0-9,.]+&quot;.*\.CSF&quot;.*&quot;.*\.jsf&quot;.*&quot;.*&quot;,[0-9]+,[0-9]+<\/CSFFILE[0-9]+>/;

const csfIdentifierPattern = /[A-Z_.0-9]+\.jsf/;
const csfDrawOrderPattern = /,[0-9]+<\/CSFFILE/;

export function processSourceFile(fileText: string): SourceFileDrawOrderDictionary {
    if (!mmlFilePattern.test(fileText)) {
        throw new Error('Unrecognised MML file structure');
    }

    const fileTextByLine = fileText.split('\n');

    return fileTextByLine.reduce(
        (sourceFileDrawOrderDictionary: SourceFileDrawOrderDictionary, line) => {
            const isRecognisedCsfRow = csfRowPattern.test(line);

            if (!isRecognisedCsfRow) {
                if (line.includes('<CSFFILE')) throw new Error('Unrecognised CSF row pattern');
                else return sourceFileDrawOrderDictionary;
            }

            // @ts-ignore
            const [identifier] = csfIdentifierPattern.exec(line);

            // @ts-ignore
            const [drawOrderSection] = csfDrawOrderPattern.exec(line);

            const drawOrder = drawOrderSection.replace(/[^0-9]/g, '');

            return { ...sourceFileDrawOrderDictionary, [identifier]: drawOrder };
        },
        {}
    );
}

export function processDestionationFile(
    fileText: string,
    sourceFileDrawOrderDictionary: SourceFileDrawOrderDictionary
) {
    if (!mmlFilePattern.test(fileText)) {
        throw new Error('Unrecognised MML file structure');
    }

    const fileTextByLine = fileText.split('\n');
    let linesAffected = 0;

    const processedFileText = fileTextByLine
        .map((line) => {
            const isRecognisedCsfRow = csfRowPattern.test(line);

            if (!isRecognisedCsfRow) {
                if (line.includes('<CSFFILE')) throw new Error('Unrecognised CSF row pattern');
                else return line;
            }

            // @ts-ignore
            const [identifier] = csfIdentifierPattern.exec(line);

            const sourceFileDrawOrder = sourceFileDrawOrderDictionary[identifier];

            if (typeof sourceFileDrawOrder === 'undefined') return line;

            linesAffected += 1;
            return line.replace(/,[0-9]+<\/CSFFILE/, `,${sourceFileDrawOrder}</CSFFILE`);
        })
        .join('\n');

    return { processedFileText, linesAffected };
}
