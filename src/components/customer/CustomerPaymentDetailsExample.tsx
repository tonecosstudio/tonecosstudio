/**
 * CustomerPaymentDetailsExample Component
 * 
 * Example usage of the CustomerPaymentDetails component.
 * This component demonstrates how to integrate CustomerPaymentDetails
 * into different parts of the application.
 * 
 * Requirements: 13.1-13.15
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  FileText, 
  Eye, 
  Download, 
  MessageSquare,
  Info,
  ArrowRight
} from 'lucide-react';
import { CustomerPaymentDetails } from './CustomerPaymentDetails';

export const CustomerPaymentDetailsExample: React.FC = () => {
  const [activeExample, setActiveExample] = useState<'basic' | 'with-files' | 'rejected' | 'approved'>('basic');
  
  // Example payment IDs for demonstration
  const examplePaymentIds = {
    basic: 'payment-basic-123',
    withFiles: 'payment-with-files-456',
    rejected: 'payment-rejected-789',
    approved: 'payment-approved-012',
  };

  const getCurrentPaymentId = () => {
    switch (activeExample) {
      case 'basic': return examplePaymentIds.basic;
      case 'with-files': return examplePaymentIds.withFiles;
      case 'rejected': return examplePaymentIds.rejected;
      case 'approved': return examplePaymentIds.approved;
      default: return examplePaymentIds.basic;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">CustomerPaymentDetails Example</h1>
        <p className="text-muted-foreground mt-2">
          Example usage of the CustomerPaymentDetails component with different payment states.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Examples selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Example Scenarios
              </CardTitle>
              <CardDescription>
                Select a scenario to see the component in different states
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Payment Status Examples</h3>
                  
                  <div className="space-y-2">
                    <Button
                      variant={activeExample === 'basic' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setActiveExample('basic')}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>Basic Payment (Pending)</span>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                    </Button>

                    <Button
                      variant={activeExample === 'with-files' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setActiveExample('with-files')}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>With Uploaded Files</span>
                        </div>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                          Under Review
                        </Badge>
                      </div>
                    </Button>

                    <Button
                      variant={activeExample === 'rejected' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setActiveExample('rejected')}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>Rejected Payment</span>
                        </div>
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                          Rejected
                        </Badge>
                      </div>
                    </Button>

                    <Button
                      variant={activeExample === 'approved' ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setActiveExample('approved')}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span>Approved Payment</span>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Approved
                        </Badge>
                      </div>
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Component Features</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CreditCard className="h-3 w-3" />
                      <span>Payment information display</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      <span>Status indicators with colors</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>File upload and display</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      <span>Support conversation link</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Download className="h-3 w-3" />
                      <span>Receipt download (approved only)</span>
                    </li>
                  </ul>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    This is a demonstration component. In a real application, 
                    payment data would come from your backend API.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Component display */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>CustomerPaymentDetails Component</CardTitle>
                  <CardDescription>
                    Showing example for: {activeExample === 'basic' ? 'Basic Payment (Pending)' :
                                        activeExample === 'with-files' ? 'Payment with Uploaded Files' :
                                        activeExample === 'rejected' ? 'Rejected Payment' :
                                        'Approved Payment'}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  Payment ID: {getCurrentPaymentId()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/50">
                <CustomerPaymentDetails
                  paymentId={getCurrentPaymentId()}
                  onBack={() => console.log('Back clicked')}
                />
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-3">Integration Notes</h3>
                
                <Tabs defaultValue="usage">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="usage">Usage</TabsTrigger>
                    <TabsTrigger value="props">Props</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="usage" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Basic Integration</h4>
                      <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
{`import { CustomerPaymentDetails } from '@/components/customer/CustomerPaymentDetails';

function PaymentDetailsPage() {
  const { paymentId } = useParams(); // Get payment ID from URL
  
  return (
    <CustomerPaymentDetails 
      paymentId={paymentId}
      onBack={() => navigate('/pagamentos')}
    />
  );
}`}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">With MyPaymentsPage Integration</h4>
                      <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
{`// In MyPaymentsPage.tsx
const handlePaymentClick = (paymentId: string) => {
  navigate(\`/pagamentos/\${paymentId}\`);
};

// In your router
{
  path: '/pagamentos/:paymentId',
  element: <CustomerPaymentDetails />,
}`}
                      </pre>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="props" className="space-y-4 pt-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">Required Props</h4>
                        <ul className="text-sm space-y-2 mt-2">
                          <li className="flex items-start gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs">paymentId: string</code>
                            <span className="text-muted-foreground">The ID of the payment to display</span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium">Optional Props</h4>
                        <ul className="text-sm space-y-2 mt-2">
                          <li className="flex items-start gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs">onBack?: () => void</code>
                            <span className="text-muted-foreground">Callback for back button click</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="features" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Core Features</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Payment information display</li>
                          <li>• Status indicators with visual feedback</li>
                          <li>• File upload and management</li>
                          <li>• Status history timeline</li>
                          <li>• Support conversation integration</li>
                          <li>• Receipt download for approved payments</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Status Support</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• <span className="text-yellow-600">Pending</span> - Awaiting proof</li>
                          <li>• <span className="text-blue-600">Under Review</span> - In analysis</li>
                          <li>• <span className="text-orange-600">Requires Info</span> - Needs more info</li>
                          <li>• <span className="text-green-600">Approved</span> - Payment approved</li>
                          <li>• <span className="text-red-600">Rejected</span> - Payment rejected</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">File Upload Rules</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Allowed formats: JPG, PNG, PDF</li>
                        <li>• Maximum size: 5MB per file</li>
                        <li>• Maximum files: 5 per payment</li>
                        <li>• Upload allowed for: Pending, Rejected, Requires Info</li>
                        <li>• Upload disabled for: Under Review, Approved</li>
                      </ul>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Implementation Requirements</CardTitle>
            <CardDescription>
              Based on Requirements 13.1-13.15 from the Manual Payment System specification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Customer Self-Service</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Display payment reference, amount, method, status, date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Show payment instructions and current status</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Display status history timeline</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">File Management</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Show uploaded payment proof files</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Allow file upload when status permits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Show rejection reason for rejected payments</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Support & Actions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Show admin message for requires_info status</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Link to support conversation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Download receipt for approved payments</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerPaymentDetailsExample;