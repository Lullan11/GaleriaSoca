// Configuración de Cloudinary
export const cloudinaryConfig = {
    cloudName: "dgfwocwsq",
    uploadPreset: "soca_upload",
    folder: "soca_pedidos"
};

export async function subirImagenes(files) {
    const urls = [];
    
    for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", cloudinaryConfig.uploadPreset);
        
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );
            
            const data = await response.json();
            if (data.secure_url) {
                urls.push(data.secure_url);
            }
        } catch (error) {
            console.error("Error subiendo imagen:", error);
        }
    }
    
    return urls;
}