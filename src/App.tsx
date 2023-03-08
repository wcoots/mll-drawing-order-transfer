import { useState, useEffect } from 'react';
import FileUpload from './FileUpload';
import { processSourceFile, processDestionationFile } from './processers';
import './index.css';

function App() {
    const [sourceFile, setSourceFile] = useState<File>();
    const [destinationFile, setDestinationFile] = useState<File>();
    const [processedDestinationFileText, setProcessedDestinationFileText] = useState<string>();

    const [filesProcessable, setFilesProcessable] = useState(false);
    const [fileDownloadable, setFileDownloadable] = useState(false);

    const [successMessage, setSuccessMessage] = useState<string>();
    const [errorMessage, setErrorMessage] = useState<string>();

    useEffect(() => {
        setFilesProcessable(false);
        setFileDownloadable(false);
        setSuccessMessage(undefined);
        setErrorMessage(undefined);

        if (sourceFile && destinationFile) {
            if (sourceFile.name.endsWith('.mml') && destinationFile.name.endsWith('.mml')) {
                setFilesProcessable(true);
            } else {
                setErrorMessage('Unrecongnised file type');
            }
        }
    }, [sourceFile, destinationFile]);

    async function processFiles() {
        try {
            setFileDownloadable(false);
            setSuccessMessage(undefined);
            setErrorMessage(undefined);

            if (!sourceFile || !destinationFile) {
                setFilesProcessable(false);
                return;
            }

            const [sourceFileText, destinationFileText] = await Promise.all([
                sourceFile.text(),
                destinationFile.text()
            ]);

            const sourceFileDrawOrderDictionary = processSourceFile(sourceFileText);

            const { processedFileText, linesAffected } = processDestionationFile(
                destinationFileText,
                sourceFileDrawOrderDictionary
            );

            setProcessedDestinationFileText(processedFileText);
            setSuccessMessage(`${linesAffected} lines affected`);
            setFileDownloadable(true);
        } catch (error) {
            setSuccessMessage(undefined);
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
        element.setAttribute('download', destinationFile?.name ?? 'destination.mml');

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
                    <img src="github.svg" alt="My Happy SVG" />
                </a>
            </div>
            <div className="sub-container">
                <div className="upload">
                    <b>Source file</b>
                    {FileUpload(setSourceFile)}
                </div>
                <div className="upload">
                    <b>Destination file</b>
                    {FileUpload(setDestinationFile)}
                </div>
            </div>
            <hr className="divider" />
            <div className="sub-container">
                <button
                    className="action-button"
                    onClick={async () => await processFiles()}
                    disabled={!filesProcessable}>
                    Sync files
                </button>
                {successMessage ? <b className="success-text">{successMessage}</b> : null}
                {errorMessage ? <b className="error-text">{errorMessage}</b> : null}
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
