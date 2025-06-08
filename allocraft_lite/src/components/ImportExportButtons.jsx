import React, { useRef } from "react";
import { Button } from "@/components/ui/button";

export default function ImportExportButtons({ section }) {
    const fileInputRef = useRef();

    const handleDownloadTemplate = () => {
        window.location.href = `/${section}/template`;
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`/${section}/upload`, {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            alert("Upload successful!");
            window.location.reload(); // Or call a reload function
        } catch (err) {
            alert("Upload failed");
        }
        fileInputRef.current.value = "";
    };

    return (
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
                Export Template
            </Button>
            <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
            />
            <Button variant="outline" onClick={handleUploadClick}>
                Import CSV
            </Button>
        </div>
    );
}