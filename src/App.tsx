import { useState, useEffect } from 'react';
import FileUploadSingle from './FileUploadSingle';
import './index.css';

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

    useEffect(() => {
        if (baseFile && targetFile) {
            if (baseFile.name.endsWith('.mml') && targetFile.name.endsWith('.mml')) {
                setFilesProcessable(true);
                setFileProcessError(undefined);
                setFileDownloadable(false);
            } else {
                setFileProcessError('Unrecongnised file type');
                setFilesProcessable(false);
                setFileDownloadable(false);
            }
        }
    }, [baseFile, targetFile]);

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

    return (
        <div className="container">
            <div className="header">
                <b>.mml file draw order transfer tool</b>
                <a
                    href="https://github.com/wcoots/mml-draw-order-transfer-tool"
                    target="_blank"
                    rel="noreferrer">
                    GitHub
                </a>
            </div>
            <div className="sub-container">
                <div className="upload">
                    <b>Base file</b>
                    {FileUploadSingle(setBaseFile)}
                </div>
                <div className="upload">
                    <b>Target file</b>
                    {FileUploadSingle(setTargetFile)}
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
                {fileProcessError ? <b className="error-text">{fileProcessError}</b> : <span />}
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
