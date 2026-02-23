/**
 * UploadedFilesListExample - Example usage of UploadedFilesList component
 * Requirements: 3.1-3.12
 * 
 * Demonstrates:
 * - Basic usage with payment ID
 * - Usage with pre-loaded files
 * - Handling file clicks
 * - Enabling file deletion
 * - Error handling
 */

import React, { useState } from 'react';
import { UploadedFilesList } from './UploadedFilesList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, File, Image as ImageIcon } from 'lucide-react';
import type { PaymentFile } from '@/types/manual-payment';

export const UploadedFilesListExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [lastClickedFile, setLastClickedFile] = useState<PaymentFile | null>(null);
  const [deletedFiles, setDeletedFiles] = useState<string[]>([]);

  // Example files data
  const exampleFiles: PaymentFile[] = [
    {
      id: 'file-example-1',
      payment_id: 'payment-example-123',
      file_name: 'payment-confirmation.jpg',
      file_path: 'payment-example-123/uuid1.jpg',
      file_size: 2.5 * 1024 * 1024, // 2.5MB
      file_type: 'image/jpeg',
      thumbnail_path: 'payment-example-123/thumb_uuid1.jpg',
      uploaded_by: 'user-example-123',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 'file-example-2',
      payment_id: 'payment-example-123',
      file_name: 'bank-receipt.pdf',
      file_path: 'payment-example-123/uuid2.pdf',
      file_size: 1.8 * 1024 * 1024, // 1.8MB
      file_type: 'application/pdf',
      thumbnail_path: null,
      uploaded_by: 'user-example-123',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
    },
    {
      id: 'file-example-3',
      payment_id: 'payment-example-123',
      file_name: 'pix-screenshot.png',
      file_path: 'payment-example-123/uuid3.png',
      file_size: 3.2 * 1024 * 1024, // 3.2MB
      file_type: 'image/png',
      thumbnail_path: 'payment-example-123/thumb_uuid3.png',
      uploaded_by: 'user-example-123',
      created_at: new Date().toISOString() // Just now
    }
  ];

  const handleFileClick = (file: PaymentFile) => {
    setLastClickedFile(file);
    console.log('File clicked:', file);
    
    // In a real application, you might:
    // - Open a modal with the full-size image
    // - Navigate to a file viewer page
    // - Download the file
  };

  const handleFileDelete = (fileId: string) => {
    console.log('File deleted:', fileId);
    setDeletedFiles(prev => [...prev, fileId]);
    
    // In a real application, you would:
    // - Call an API to delete the file
    // - Update local state
    // - Show a success message
  };

  const resetExample = () => {
    setLastClickedFile(null);
    setDeletedFiles([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">UploadedFilesList Component Examples</h1>
        <p className="text-muted-foreground mt-2">
          Examples demonstrating different ways to use the UploadedFilesList component.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Usage</TabsTrigger>
          <TabsTrigger value="props">With Props</TabsTrigger>
          <TabsTrigger value="interactive">Interactive</TabsTrigger>
          <TabsTrigger value="empty">Empty State</TabsTrigger>
        </TabsList>

        {/* Basic Usage Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Usage with Payment ID</CardTitle>
              <CardDescription>
                The component loads files automatically using the payment ID.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadedFilesList
                paymentId="payment-example-123"
                className="max-w-2xl"
              />
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Code Example:</h4>
                <pre className="text-sm bg-black/5 p-3 rounded overflow-x-auto">
{`<UploadedFilesList
  paymentId="payment-example-123"
  className="max-w-2xl"
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* With Props Tab */}
        <TabsContent value="props" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage with Pre-loaded Files</CardTitle>
              <CardDescription>
                Pass files directly via props instead of loading by payment ID.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadedFilesList
                paymentId="payment-example-123"
                files={exampleFiles}
                className="max-w-2xl"
              />
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Code Example:</h4>
                <pre className="text-sm bg-black/5 p-3 rounded overflow-x-auto">
{`const exampleFiles: PaymentFile[] = [
  {
    id: 'file-example-1',
    payment_id: 'payment-example-123',
    file_name: 'payment-confirmation.jpg',
    file_path: 'payment-example-123/uuid1.jpg',
    file_size: 2.5 * 1024 * 1024,
    file_type: 'image/jpeg',
    thumbnail_path: 'payment-example-123/thumb_uuid1.jpg',
    uploaded_by: 'user-example-123',
    created_at: new Date().toISOString()
  },
  // ... more files
];

<UploadedFilesList
  paymentId="payment-example-123"
  files={exampleFiles}
  className="max-w-2xl"
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interactive Tab */}
        <TabsContent value="interactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Features</CardTitle>
              <CardDescription>
                Demonstrates file click handling and deletion functionality.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <UploadedFilesList
                    paymentId="payment-example-123"
                    files={exampleFiles.filter(f => !deletedFiles.includes(f.id))}
                    onFileClick={handleFileClick}
                    showDelete={true}
                    onFileDelete={handleFileDelete}
                    className="h-full"
                  />
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Interaction Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {lastClickedFile ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            {lastClickedFile.file_type.startsWith('image/') ? (
                              <ImageIcon className="h-5 w-5 text-blue-500" />
                            ) : (
                              <File className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium">{lastClickedFile.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Clicked at {new Date().toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Type:</span> {lastClickedFile.file_type}</p>
                            <p><span className="font-medium">Size:</span> {Math.round(lastClickedFile.file_size / 1024)} KB</p>
                            <p><span className="font-medium">Uploaded:</span> {new Date(lastClickedFile.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          Click on a file to see details here
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {deletedFiles.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium">Deleted Files:</p>
                        <ul className="list-disc list-inside mt-1">
                          {deletedFiles.map(fileId => {
                            const file = exampleFiles.find(f => f.id === fileId);
                            return (
                              <li key={fileId} className="text-sm">
                                {file?.file_name || fileId}
                              </li>
                            );
                          })}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="outline"
                    onClick={resetExample}
                    className="w-full"
                  >
                    Reset Example
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Code Example:</h4>
                <pre className="text-sm bg-black/5 p-3 rounded overflow-x-auto">
{`const [lastClickedFile, setLastClickedFile] = useState<PaymentFile | null>(null);
const [deletedFiles, setDeletedFiles] = useState<string[]>([]);

const handleFileClick = (file: PaymentFile) => {
  setLastClickedFile(file);
  // Open modal, download, or other action
};

const handleFileDelete = (fileId: string) => {
  setDeletedFiles(prev => [...prev, fileId]);
  // Call API to delete file
};

<UploadedFilesList
  paymentId="payment-example-123"
  files={exampleFiles}
  onFileClick={handleFileClick}
  showDelete={true}
  onFileDelete={handleFileDelete}
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Empty State Tab */}
        <TabsContent value="empty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empty and Loading States</CardTitle>
              <CardDescription>
                Demonstrates the component's behavior when there are no files or when loading.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Empty State</h3>
                  <UploadedFilesList
                    paymentId="payment-with-no-files"
                    files={[]}
                    className="h-full"
                  />
                </div>

                <div>
                  <h3 className="font-medium mb-3">Loading State</h3>
                  <UploadedFilesList
                    paymentId="payment-loading"
                    isLoading={true}
                    className="h-full"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Code Example:</h4>
                <pre className="text-sm bg-black/5 p-3 rounded overflow-x-auto">
{`// Empty state
<UploadedFilesList
  paymentId="payment-with-no-files"
  files={[]}
/>

// Loading state  
<UploadedFilesList
  paymentId="payment-loading"
  isLoading={true}
/>

// Error state (handled automatically by component)
<UploadedFilesList
  paymentId="payment-error"
  // Component will show error if loading fails
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Component Features</CardTitle>
          <CardDescription>
            Key features of the UploadedFilesList component
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium">Image Thumbnails</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically displays thumbnails for image files with "View full size" button.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <File className="h-5 w-5 text-red-500" />
                <h4 className="font-medium">PDF Support</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Shows file icon for PDFs with "Download" button for easy access.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <h4 className="font-medium">Status Indicators</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Shows upload status (ready, loading, unavailable) and file type badges.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">File Information</h4>
              <p className="text-sm text-muted-foreground">
                Displays file name, size, upload date, and formatted file type.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Flexible Data Source</h4>
              <p className="text-sm text-muted-foreground">
                Can load files by payment ID or accept pre-loaded files via props.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Interactive Features</h4>
              <p className="text-sm text-muted-foreground">
                Supports file click handling, deletion, and custom actions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements Coverage</CardTitle>
          <CardDescription>
            This component addresses the following requirements from the manual payment system:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>
              <span className="font-medium">Requirement 3.1:</span> Accept file uploads in formats: JPG, PNG, PDF
            </li>
            <li>
              <span className="font-medium">Requirement 3.7:</span> Store files in Supabase Storage bucket 'payment-proofs'
            </li>
            <li>
              <span className="font-medium">Requirement 3.8:</span> Generate thumbnails for image files
            </li>
            <li>
              <span className="font-medium">Requirement 3.10:</span> Generate secure URLs with expiration for accessing payment proof files
            </li>
            <li>
              <span className="font-medium">Requirement 6.3:</span> Display thumbnails with option to view full size for images
            </li>
            <li>
              <span className="font-medium">Requirement 6.4:</span> Display PDF icon with option to download for PDFs
            </li>
            <li>
              <span className="font-medium">Requirement 6.7:</span> Allow downloading of payment proof files
            </li>
            <li>
              <span className="font-medium">Requirement 13.7:</span> Display all uploaded payment proofs in customer payment details
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};