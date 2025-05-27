"use client";

import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentTextIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function SubmissionsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Submissions</h1>
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium flex items-center">
            <span className="mr-2">Development Mode</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          </div>
        </div>
        
        <Card className="mb-8 border-2 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-xl text-purple-800">Coming Soon</CardTitle>
            <CardDescription>This feature is currently under development</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              The submissions management feature is being built and will be available in the next update. 
              This page will allow students to track their submitted assignments, view feedback, and monitor grades.
            </p>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50 pointer-events-none">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Submission #{i}</CardTitle>
                    <CardDescription>Assignment {i}: Sample Assignment</CardDescription>
                  </div>
                  <Badge variant={i % 2 === 0 ? "outline" : "secondary"}>
                    {i % 2 === 0 ? "Pending Review" : "Graded"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Assignment.pdf</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Submitted: Coming Soon</span>
                  </div>
                  <div className="flex items-center text-sm">
                    {i % 2 === 0 ? (
                      <>
                        <ExclamationCircleIcon className="h-4 w-4 mr-2 text-yellow-500" />
                        <span>Awaiting feedback</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
                        <span>Grade: A</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="outline" size="sm" className="w-full">View Details</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
