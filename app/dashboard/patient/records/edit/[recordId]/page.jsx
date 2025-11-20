'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Save,
  ArrowLeft,
  Loader2,
  FileText,
  AlertCircle,
  Trash2,
  Download,
  Eye,
  Image,
  File,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadFromCloudinary } from '@/lib/fileDownload';

export default function EditRecord({ params }) {
  const { user } = useAuth();
  const router = useRouter();
  const { recordId } = params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [files, setFiles] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [downloadingFile, setDownloadingFile] = useState(null);

  const [record, setRecord] = useState({
    title: '',
    description: '',
    category: 'general',
    recordDate: '',
    isEmergencyVisible: false,
  });

  useEffect(() => {
    fetchRecord();
  }, [recordId]);

  const fetchRecord = async () => {
    try {
      const response = await fetch(`/api/auth/patient/records/${recordId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const recordData = data.record;
        setRecord({
          title: recordData.title || '',
          description: recordData.description || '',
          category: recordData.category || 'general',
          recordDate: recordData.metadata?.recordDate
            ? new Date(recordData.metadata.recordDate).toISOString().split('T')[0]
            : '',
          isEmergencyVisible: recordData.metadata?.isEmergencyVisible || false,
        });
        setFiles(recordData.files || []);
      } else {
        throw new Error('Failed to fetch record');
      }
    } catch (error) {
      toast.error('Failed to load record');
      router.push('/dashboard/patient/records');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/auth/patient/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });

      if (response.ok) {
        toast.success('Record updated successfully');
        router.push('/dashboard/patient/records');
      } else {
        throw new Error('Failed to update record');
      }
    } catch (error) {
      toast.error('Failed to update record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/auth/patient/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast.success('Record deleted successfully');
        router.push('/dashboard/patient/records');
      } else {
        throw new Error('Failed to delete record');
      }
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadFile = async (file) => {
    setDownloadingFile(file.filename);
    try {
      if (file.cloudinaryUrl) {
        // Download directly from Cloudinary URL
        downloadFromCloudinary(file.cloudinaryUrl, file.originalName);
        toast.success(`Downloading ${file.originalName}`);
      } else {
        // Fallback to API endpoint
        const response = await fetch(`/api/files/download/${file.filename}?recordId=${recordId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.file.cloudinaryUrl) {
            downloadFromCloudinary(data.file.cloudinaryUrl, file.originalName);
          }
          toast.success(`Download initiated for ${file.originalName}`);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleViewFile = async (file) => {
    try {
      if (file.cloudinaryUrl) {
        setViewingFile({ ...file, url: file.cloudinaryUrl });
      } else {
        const response = await fetch(`/api/files/view/${file.filename}?recordId=${recordId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setViewingFile({ ...file, preview: data.preview });
        }
      }
    } catch (error) {
      console.error('View error:', error);
      toast.error('Failed to load file preview');
    }
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) return Image;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/patient/records')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Records
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Medical Record</h1>
          <p className="text-muted-foreground">
            Update your medical record information
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Record Information
              </CardTitle>
              <CardDescription>
                Edit the details of your medical record
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Record Title</Label>
                  <Input
                    id="title"
                    value={record.title}
                    onChange={(e) => setRecord({ ...record, title: e.target.value })}
                    placeholder="e.g., Blood Test Results - January 2024"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={record.category}
                    onValueChange={(value) => setRecord({ ...record, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="lab-results">Lab Results</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recordDate">Record Date</Label>
                  <Input
                    id="recordDate"
                    type="date"
                    value={record.recordDate}
                    onChange={(e) => setRecord({ ...record, recordDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={record.description}
                    onChange={(e) => setRecord({ ...record, description: e.target.value })}
                    placeholder="Describe the record contents, symptoms, or relevant notes..."
                    rows={6}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="emergency"
                    checked={record.isEmergencyVisible}
                    onCheckedChange={(checked) => setRecord({ ...record, isEmergencyVisible: checked })}
                  />
                  <Label htmlFor="emergency">Make visible in emergency situations</Label>
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Files Section */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Attached Files
                </CardTitle>
                <CardDescription>
                  {files.length} file{files.length > 1 ? 's' : ''} attached to this record
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {files.map((file) => {
                  const FileIcon = getFileIcon(file.mimetype);
                  return (
                    <div key={file.filename} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewFile(file)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>File Preview</DialogTitle>
                              <DialogDescription>
                                {file.originalName}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {viewingFile?.url && file.mimetype?.startsWith('image/') && (
                                <img src={viewingFile.url} alt={file.originalName} className="max-w-full h-auto rounded-lg" />
                              )}
                              {viewingFile?.url && file.mimetype === 'application/pdf' && (
                                <div className="text-center py-8">
                                  <a href={viewingFile.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Open PDF in new tab
                                  </a>
                                </div>
                              )}
                              {!file.mimetype?.startsWith('image/') && file.mimetype !== 'application/pdf' && (
                                <div className="text-center py-8">
                                  <FileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                  <p className="text-muted-foreground">Preview not available for this file type</p>
                                  <Button className="mt-4" onClick={() => handleDownloadFile(file)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download to view
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadFile(file)}
                          disabled={downloadingFile === file.filename}
                        >
                          {downloadingFile === file.filename ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Edit Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Accurate Information</p>
                  <p className="text-xs text-muted-foreground">
                    Ensure all information is accurate and up-to-date
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Emergency Visibility</p>
                  <p className="text-xs text-muted-foreground">
                    Mark critical records as emergency visible
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Proper Categorization</p>
                  <p className="text-xs text-muted-foreground">
                    Choose the most appropriate category for easy organization
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Changes to medical records are logged for security and audit purposes.
              Only edit records to correct errors or add important information.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
