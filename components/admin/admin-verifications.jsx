'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  File,
  Loader2,
  Eye,
  Download,
  Search,
  FileText,
  Image,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminVerifications({ onRefresh }) {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [allDocuments, setAllDocuments] = useState([]);

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter, page]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/admin/doctor-verification', window.location.origin);
      if (statusFilter) url.searchParams.append('status', statusFilter);
      url.searchParams.append('page', page);
      url.searchParams.append('limit', 20);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVerifications(data.verifications);
      } else {
        throw new Error('Failed to fetch verifications');
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!selectedVerification) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/doctor-verification', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationId: selectedVerification._id,
          action,
          notes: actionReason,
          reason: actionReason,
        }),
      });

      if (response.ok) {
        toast.success(`Verification ${action}ed successfully`);
        setActionDialog(null);
        setActionReason('');
        setSelectedVerification(null);
        await fetchVerifications();
        onRefresh?.();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process action');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDocumentViewer = (verification) => {
    setSelectedVerification(verification);
    setAllDocuments(verification.documents);
    setCurrentDocIndex(0);
    setViewerOpen(true);
  };

  const nextDocument = () => {
    setCurrentDocIndex((prev) => (prev + 1) % allDocuments.length);
  };

  const prevDocument = () => {
    setCurrentDocIndex((prev) => (prev - 1 + allDocuments.length) % allDocuments.length);
  };

  const getCurrentDocument = () => {
    return allDocuments[currentDocIndex];
  };

  const isImageFile = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const isPdfFile = (fileName) => {
    return fileName.split('.').pop().toLowerCase() === 'pdf';
  };

  const getStatusColor = (status) => {
    const colors = {
      'not_submitted': 'bg-gray-100 text-gray-800',
      'submitted': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'need_resubmission': 'bg-orange-100 text-orange-800',
      'verified': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'suspended': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
      case 'suspended':
        return <XCircle className="h-4 w-4" />;
      case 'under_review':
      case 'need_resubmission':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredVerifications = verifications.filter(v =>
    `${v.doctor.name} ${v.doctor.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Verifications</CardTitle>
        <CardDescription>
          Review and manage doctor identity verification submissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search doctor name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="not_submitted">Not Submitted</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="need_resubmission">Need Resubmission</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Verifications List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredVerifications.length > 0 ? (
          <div className="space-y-3">
            {filteredVerifications.map(verification => (
              <Card key={verification._id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <p className="font-semibold">{verification.doctor.name}</p>
                          <p className="text-sm text-muted-foreground">{verification.doctor.email}</p>
                          {verification.doctor.specialization && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {verification.doctor.specialization} • {verification.doctor.hospital}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Documents */}
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-medium">Documents ({verification.documents.length})</p>
                          {verification.documents.length > 0 && (
                            <Drawer open={viewerOpen && selectedVerification?._id === verification._id} onOpenChange={setViewerOpen}>
                              <DrawerTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDocumentViewer(verification)}
                                  className="h-6 text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View All
                                </Button>
                              </DrawerTrigger>
                            </Drawer>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {verification.documents.map(doc => (
                            <Badge key={doc.fileName} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                              <File className="h-3 w-3" />
                              <span>{doc.type}</span>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 hover:underline cursor-pointer"
                              >
                                <Download className="h-3 w-3" />
                              </a>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      {verification.verificationNotes && (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-sm border border-orange-200 dark:border-orange-800">
                          <p className="font-medium text-orange-900 dark:text-orange-200">Admin Notes:</p>
                          <p className="text-orange-800 dark:text-orange-300">{verification.verificationNotes.notes}</p>
                        </div>
                      )}

                      {verification.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm border border-red-200 dark:border-red-800">
                          <p className="font-medium text-red-900 dark:text-red-200">Rejection Reason:</p>
                          <p className="text-red-800 dark:text-red-300">{verification.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <Badge className={`flex items-center gap-1 ${getStatusColor(verification.status)}`}>
                        {getStatusIcon(verification.status)}
                        {verification.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>

                      {['submitted', 'under_review', 'need_resubmission'].includes(verification.status) && (
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedVerification(verification);
                                  setActionDialog('approve');
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Approve Verification</DialogTitle>
                                <DialogDescription>
                                  Confirm approval for {verification.doctor.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Notes (optional)</Label>
                                  <Textarea
                                    placeholder="Add verification notes..."
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setActionDialog(null);
                                      setActionReason('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => handleAction('approve')}
                                    disabled={submitting}
                                  >
                                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedVerification(verification);
                                  setActionDialog('request_resubmission');
                                }}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Request Changes
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Request Resubmission</DialogTitle>
                                <DialogDescription>
                                  Ask {verification.doctor.name} to resubmit documents
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Reason for Resubmission</Label>
                                  <Textarea
                                    placeholder="Specify what documents or information need to be corrected or resubmitted..."
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setActionDialog(null);
                                      setActionReason('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => handleAction('request_resubmission')}
                                    disabled={submitting || !actionReason}
                                  >
                                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Send Request
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedVerification(verification);
                                  setActionDialog('reject');
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Verification</DialogTitle>
                                <DialogDescription>
                                  Reject verification for {verification.doctor.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Rejection Reason</Label>
                                  <Textarea
                                    placeholder="Explain why the verification was rejected..."
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setActionDialog(null);
                                      setActionReason('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleAction('reject')}
                                    disabled={submitting || !actionReason}
                                  >
                                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No verifications found</p>
          </div>
        )}

        {/* Document Viewer Drawer */}
        {viewerOpen && selectedVerification && (
          <Drawer open={viewerOpen} onOpenChange={setViewerOpen}>
            <DrawerContent className="h-[90vh] flex flex-col">
              <DrawerHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DrawerTitle>Document Viewer</DrawerTitle>
                    <DrawerDescription>
                      {selectedVerification.doctor.name} - {getCurrentDocument()?.type}
                    </DrawerDescription>
                  </div>
                  <DrawerClose />
                </div>
              </DrawerHeader>

              <div className="flex-1 overflow-hidden flex flex-col p-4">
                {allDocuments.length > 0 && getCurrentDocument() && (
                  <div className="flex flex-col h-full">
                    {/* Document Display Area */}
                    <div className="flex-1 bg-muted rounded-lg p-4 mb-4 flex items-center justify-center overflow-auto">
                      {isImageFile(getCurrentDocument().fileName) ? (
                        <img
                          src={getCurrentDocument().fileUrl}
                          alt={getCurrentDocument().fileName}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : isPdfFile(getCurrentDocument().fileName) ? (
                        <div className="text-center space-y-4">
                          <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                          <div>
                            <p className="font-medium">{getCurrentDocument().fileName}</p>
                            <p className="text-sm text-muted-foreground">PDF files open in a new tab</p>
                          </div>
                          <a
                            href={getCurrentDocument().fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <Button>Open PDF</Button>
                          </a>
                        </div>
                      ) : (
                        <div className="text-center space-y-4">
                          <File className="h-16 w-16 mx-auto text-muted-foreground" />
                          <div>
                            <p className="font-medium">{getCurrentDocument().fileName}</p>
                            <p className="text-sm text-muted-foreground">File preview not available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Document Info */}
                    <Card className="mb-4">
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{getCurrentDocument().type}</p>
                            <p className="text-xs text-muted-foreground">{getCurrentDocument().fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(getCurrentDocument().fileSize / 1024 / 1024).toFixed(2)}MB • {new Date(getCurrentDocument().uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <a href={getCurrentDocument().fileUrl} download>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </a>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevDocument}
                        disabled={allDocuments.length <= 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>

                      <div className="text-sm text-muted-foreground">
                        Document {currentDocIndex + 1} of {allDocuments.length}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextDocument}
                        disabled={allDocuments.length <= 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* Document List */}
                    {allDocuments.length > 1 && (
                      <>
                        <Separator className="my-4" />
                        <div className="max-h-32 overflow-y-auto">
                          <p className="text-sm font-medium mb-2">All Documents</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {allDocuments.map((doc, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentDocIndex(idx)}
                                className={`p-2 rounded-lg border-2 text-left transition-colors ${
                                  idx === currentDocIndex
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-muted hover:border-blue-300'
                                }`}
                              >
                                <p className="text-xs font-medium truncate">{doc.type}</p>
                                <p className="text-xs text-muted-foreground">{(doc.fileSize / 1024).toFixed(0)}KB</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </CardContent>
    </Card>
  );
}
