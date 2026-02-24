/**
 * FileUploadComponent Example - Demonstration of how to use the FileUploadComponent
 *
 * This example shows:
 * 1. Basic usage with required props
 * 2. Handling upload completion
 * 3. Handling errors
 * 4. Custom configuration (max files, file size)
 * 5. Integration with payment flow
 */

import React, { useState } from "react";
import { FileUploadComponent } from "./FileUploadComponent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Upload } from "lucide-react";
import type { PaymentFile } from "@/types/manual-payment";

export const FileUploadComponentExample: React.FC = () => {
  const [paymentId] = useState("example-payment-123");
  const [uploadedFiles, setUploadedFiles] = useState<PaymentFile[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = (files: PaymentFile[]) => {
    console.log("Upload complete:", files);
    setUploadedFiles((prev) => [...prev, ...files]);
    setUploadErrors([]);
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    setUploadErrors((prev) => [...prev, error.message]);
  };

  const handleClearAll = () => {
    setUploadedFiles([]);
    setUploadErrors([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">FileUploadComponent Example</h1>
        <p className="text-muted-foreground">
          This example demonstrates how to use the FileUploadComponent in a payment proof upload
          flow.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Component Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Payment Proof Upload
            </CardTitle>
            <CardDescription>
              Upload images or PDFs of your payment confirmation. This component supports:
            </CardDescription>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Drag-and-drop file upload</li>
              <li>File validation (type, size, MIME matching)</li>
              <li>Image preview and PDF file info</li>
              <li>Upload progress tracking</li>
              <li>Multiple file selection (up to 5)</li>
              <li>Mobile camera capture support</li>
            </ul>
          </CardHeader>
          <CardContent>
            <FileUploadComponent
              paymentId={paymentId}
              maxFiles={3} // Custom limit for example
              maxSizeBytes={2 * 1024 * 1024} // 2MB for example
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
            />
          </CardContent>
        </Card>

        {/* Right Column: Results and State */}
        <div className="space-y-6">
          {/* Uploaded Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Uploaded Files
                </span>
                {uploadedFiles.length > 0 && (
                  <Badge variant="secondary">
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Files that have been successfully uploaded to the payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No files uploaded yet</p>
                  <p className="text-sm">Upload files using the component on the left</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        {file.file_type.startsWith("image/") ? (
                          <div className="text-xs font-medium">IMG</div>
                        ) : (
                          <div className="text-xs font-medium">PDF</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{Math.round(file.file_size / 1024)} KB</span>
                          <span>•</span>
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {uploadedFiles.length > 0 && (
                    <div className="pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        className="w-full"
                      >
                        Clear All Uploaded Files
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Errors */}
          {uploadErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Upload Errors
                </CardTitle>
                <CardDescription>Errors that occurred during file upload.</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {uploadErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Usage Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Instructions</CardTitle>
              <CardDescription>
                How to integrate FileUploadComponent in your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Basic Usage</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {`<FileUploadComponent
  paymentId="your-payment-id"
  onUploadComplete={(files) => console.log('Uploaded:', files)}
  onError={(error) => console.error('Error:', error)}
/>`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">Custom Configuration</h4>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {`<FileUploadComponent
  paymentId="your-payment-id"
  maxFiles={3} // Custom file limit
  maxSizeBytes={2 * 1024 * 1024} // 2MB limit
  acceptedTypes={['image/*', 'application/pdf']}
  disabled={isProcessing} // Disable during processing
  onUploadComplete={handleUploadComplete}
  onError={handleUploadError}
/>`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">Integration with Payment Flow</h4>
                <p className="text-sm text-muted-foreground">The component automatically:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                  <li>Validates file types (JPG, PNG, PDF only)</li>
                  <li>Checks file size (default 5MB max)</li>
                  <li>Generates thumbnails for images</li>
                  <li>Tracks upload progress</li>
                  <li>Handles errors with user-friendly messages</li>
                  <li>Supports mobile camera capture</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
