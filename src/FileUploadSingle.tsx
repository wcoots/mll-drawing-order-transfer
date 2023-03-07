import { ChangeEvent } from 'react';

function FileUploadSingle(setFile: React.Dispatch<React.SetStateAction<File | undefined>>) {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
        </div>
    );
}

export default FileUploadSingle;
