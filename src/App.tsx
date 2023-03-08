import { useState, useEffect } from 'react';
import FileUploadSingle from './FileUploadSingle';
import './index.css';

type SourceFileDictionary = { identifier: string; value: string }[];

const csfRowPattern =
    /<CSFFILE[0-9]+>[0-9,.]+&quot;.*\.CSF&quot;.*&quot;.*\.jsf&quot;.*&quot;.*&quot;,[0-9]+,[0-9]+<\/CSFFILE[0-9]+>/;

const csfIdentifierPattern = /[A-Z_.0-9]+\.jsf/;
const csfValuePattern = /,[0-9]+<\/CSFFILE/;

function App() {
    const [sourceFile, setSourceFile] = useState<File>();
    const [destinationFile, setDestinationFile] = useState<File>();
    const [processedDestinationFileText, setProcessedDestinationFileText] = useState<string>();

    const [filesProcessable, setFilesProcessable] = useState(false);
    const [fileDownloadable, setFileDownloadable] = useState(false);

    const [errorMessage, setErrorMessage] = useState<string>();
    useEffect(() => {
        if (sourceFile && destinationFile) {
            if (sourceFile.name.endsWith('.mml') && destinationFile.name.endsWith('.mml')) {
                setFilesProcessable(true);
                setFileDownloadable(false);
                setErrorMessage(undefined);
            } else {
                setFilesProcessable(false);
                setFileDownloadable(false);
                setErrorMessage('Unrecongnised file type');
            }
        }
    }, [sourceFile, destinationFile]);

    function processSourceFile(fileText: string): SourceFileDictionary {
        const fileTextByLine = fileText.split('\n');

        return fileTextByLine.reduce((sourceFileDictionary: SourceFileDictionary, line) => {
            const isRecognisedCsfRow = csfRowPattern.test(line);

            if (!isRecognisedCsfRow) {
                if (line.includes('<CSFFILE')) throw new Error('Unrecognised CSF row pattern');
                else return sourceFileDictionary;
            }

            // @ts-ignore
            const [identifier] = csfIdentifierPattern.exec(line);

            // @ts-ignore
            const [valueSection] = csfValuePattern.exec(line);

            const value = valueSection.replace(/[^0-9]/g, '');

            return [...sourceFileDictionary, { identifier, value }];
        }, []);
    }

    function processDestionationFile(fileText: string, sourceFileDictionary: SourceFileDictionary) {
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

                const sourceFileRow = sourceFileDictionary.find(
                    (row) => row.identifier === identifier
                );

                if (!sourceFileRow) return line;

                return line.replace(/,[0-9]+<\/CSFFILE/, `,${sourceFileRow.value}</CSFFILE`);
            })
            .join('\n');

        setProcessedDestinationFileText(processedFileText);
    }

    async function processFiles() {
        try {
            setFileDownloadable(false);
            setErrorMessage(undefined);

            if (!sourceFile || !destinationFile) {
                setFilesProcessable(false);
                return;
            }

            const [sourceFileText, destinationFileText] = await Promise.all([
                sourceFile.text(),
                destinationFile.text()
            ]);

            const sourceFileDictionary = processSourceFile(sourceFileText);

            processDestionationFile(destinationFileText, sourceFileDictionary);
            setFileDownloadable(true);
        } catch (error) {
            setErrorMessage((error as Error).message);
        }
    }

    function downloadProcessedFile() {
        if (!processedDestinationFileText) {
            return;
        }

        const element = document.createElement('a');
        element.setAttribute(
            'href',
            'data:text/plain;charset=utf-8,' + encodeURIComponent(processedDestinationFileText)
        );
        element.setAttribute('download', 'target.mml');

        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    return (
        <div className="container">
            <div className="header">
                <b>.mml file draw order sync tool</b>
                <a
                    href="https://github.com/wcoots/mml-draw-order-sync-tool"
                    target="_blank"
                    rel="noreferrer">
                    GitHub
                </a>
            </div>
            <div className="sub-container">
                <div className="upload">
                    <b>Source file</b>
                    {FileUploadSingle(setSourceFile)}
                </div>
                <div className="upload">
                    <b>Destination file</b>
                    {FileUploadSingle(setDestinationFile)}
                </div>
            </div>
            <hr className="divider" />
            <div className="sub-container">
                <button
                    className="action-button"
                    onClick={async () => await processFiles()}
                    disabled={!filesProcessable}>
                    Merge files
                </button>
                {errorMessage ? <b className="error-text">{errorMessage}</b> : <span />}
                <button
                    className="action-button"
                    onClick={downloadProcessedFile}
                    disabled={!fileDownloadable}>
                    Download
                </button>
            </div>
        </div>
    );
}

export default App;
