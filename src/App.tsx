import { useState, useEffect } from 'react';
import FileUploadSingle from './FileUploadSingle';
import './App.css';

type BaseFileDictionary = { identifier: string; value: string }[];

const csfRowPattern =
    /<CSFFILE[0-9]+>[0-9,.]+&quot;.*\.CSF&quot;.*&quot;.*\.jsf&quot;.*&quot;.*&quot;,[0-9]+,[0-9]+<\/CSFFILE[0-9]+>/;

const csfIdentifierPattern = /[A-Z_.0-9]+\.jsf/;
const csfValuePattern = /,[0-9]+<\/CSFFILE/;

function App() {
    const [baseFile, setBaseFile] = useState<File>();
    const [targetFile, setTargetFile] = useState<File>();
    const [processedTargetFileText, setProcessedTargetFileText] = useState<string>();

    const [filesProcessable, setFilesProcessable] = useState(false);
    const [fileProcessError, setFileProcessError] = useState<string>();
    const [fileDownloadable, setFileDownloadable] = useState(false);

    function processBaseFile(fileText: string): BaseFileDictionary {
        const fileTextByLine = fileText.split('\n');

        return fileTextByLine.reduce((baseFileDictionary: BaseFileDictionary, line) => {
            const isRecognisedCsfRow = csfRowPattern.test(line);

            if (!isRecognisedCsfRow) {
                if (line.includes('<CSFFILE')) throw new Error('Unrecognised CSF row pattern');
                else return baseFileDictionary;
            }

            // @ts-ignore
            const [identifier] = csfIdentifierPattern.exec(line);

            // @ts-ignore
            const [valueSection] = csfValuePattern.exec(line);

            const value = valueSection.replace(/[^0-9]/g, '');

            return [...baseFileDictionary, { identifier, value }];
        }, []);
    }

    function processTargetFile(fileText: string, baseFileDictionary: BaseFileDictionary) {
        const fileTextByLine = fileText.split('\n');

        const processedFileText = fileTextByLine
            .map((line) => {
                const isRecognisedCsfRow = csfRowPattern.test(line);

                if (!isRecognisedCsfRow) {
                    if (line.includes('<CSFFILE')) throw new Error('Unrecognised CSF row pattern');
                    else return line;
                }

                // @ts-ignore
                const [identifier] = csfIdentifierPattern.exec(line);

                const baseFileRow = baseFileDictionary.find((row) => row.identifier === identifier);

                if (!baseFileRow) return line;

                return line.replace(/,[0-9]+<\/CSFFILE/, `,${baseFileRow.value}</CSFFILE`);
            })
            .join('\n');

        setProcessedTargetFileText(processedFileText);
    }

    function downloadProcessedFile() {
        if (!processedTargetFileText) {
            return;
        }

        const element = document.createElement('a');
        element.setAttribute(
            'href',
            'data:text/plain;charset=utf-8,' + encodeURIComponent(processedTargetFileText)
        );
        element.setAttribute('download', 'target.mml');

        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    async function processFiles() {
        try {
            setFileDownloadable(false);
            setFileProcessError(undefined);

            if (!baseFile || !targetFile) {
                setFilesProcessable(false);
                return;
            }

            const [baseFileText, targetFileText] = await Promise.all([
                baseFile.text(),
                targetFile.text()
            ]);

            const baseFileDictionary = processBaseFile(baseFileText);

            processTargetFile(targetFileText, baseFileDictionary);
            setFileDownloadable(true);
        } catch (error) {
            setFileProcessError((error as Error).message);
        }
    }

    useEffect(() => {
        if (baseFile && targetFile) {
            if (baseFile.name.endsWith('.mml') && targetFile.name.endsWith('.mml')) {
                setFilesProcessable(true);
                setFileProcessError(undefined);
            } else {
                setFileProcessError('Unrecongnised file type');
                setFilesProcessable(false);
                setFileDownloadable(false);
            }
        }
    }, [baseFile, targetFile]);

    return (
        <div className="App">
            <h1>.mml file draw order transfer tool</h1>
            <hr />
            <p>Base file</p>
            {FileUploadSingle(setBaseFile)}
            <hr />
            <p>Target file</p>
            {FileUploadSingle(setTargetFile)}
            <hr />
            <button onClick={async () => await processFiles()} disabled={!filesProcessable}>
                Merge files
            </button>
            {fileProcessError ? <p className="error-text">{fileProcessError}</p> : <span />}
            <hr />
            <button onClick={downloadProcessedFile} disabled={!fileDownloadable}>
                Download
            </button>
        </div>
    );
}

export default App;
