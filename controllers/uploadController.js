import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

export const uploadSingleImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const category = req.body.category || 'general';
    const fileUrl = `/uploads/${category}/${req.file.filename}`;
    
    console.log('Image uploaded successfully:', fileUrl);
    console.log('File saved to:', req.file.path);
    
    res.json({ 
      success: true, 
      message: 'Image uploaded successfully', 
      data: { 
        url: fileUrl,
        id: req.file.filename // Return the full filename
      } 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

export const deleteImage = (req, res) => {
  try {
    const { category, filename } = req.params;
    const filePath = path.join(uploadsDir, category, filename);

    console.log('Attempting to delete:', filePath);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('File deleted successfully');
        res.json({ success: true, message: 'Image deleted successfully' });
    } else {
        console.log('File not found:', filePath);
        res.status(404).json({ success: false, message: 'File not found' });
    }
  } catch (error)
  {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};