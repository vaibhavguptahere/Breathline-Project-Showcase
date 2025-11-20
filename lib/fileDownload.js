export async function downloadFile(url, fileName) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

export function openFileInNewTab(url, fileName) {
  try {
    window.open(url, '_blank');
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
}

export async function downloadFromCloudinary(cloudinaryUrl, fileName) {
  try {
    // Add download parameter to Cloudinary URL if it's a direct URL
    const downloadUrl = cloudinaryUrl.includes('?') 
      ? `${cloudinaryUrl}&fl_attachment:${fileName}`
      : `${cloudinaryUrl}?fl_attachment:${fileName}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading from Cloudinary:', error);
    throw error;
  }
}
