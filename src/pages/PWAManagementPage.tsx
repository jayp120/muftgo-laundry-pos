import React, { useState } from 'react';
import { Smartphone, Settings, ArrowLeft, Download, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PWAManualInstall } from '@/components/ui/PWAManualInstall';
import { PWADiagnostics } from '@/components/ui/PWADiagnostics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageMeta } from '@/hooks/usePageMeta';
import { APK_DOWNLOAD_URL, APK_SHORT_URL, GITHUB_RELEASES_URL } from '@/lib/app-links';

interface PWAManagementPageProps {
  onBack?: () => void;
}

export const PWAManagementPage: React.FC<PWAManagementPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('install');

  usePageMeta({
    title: 'How to Install the MuftGo Laundry POS App - Android, iOS, Desktop',
    description:
      'Guide to installing MuftGo Laundry POS as an app (PWA) on Android, iOS, Windows, and Mac. Offline access and a native-like experience right from the home screen.',
    path: '/install',
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Smartphone className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Install the MuftGo Laundry POS App
            </h1>
            <p className="text-gray-600">
              Install the app for a better experience and offline access
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="install" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Install App
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Diagnostics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="install" className="mt-6">
            <PWAManualInstall />
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-6">
            <PWADiagnostics />
          </TabsContent>
        </Tabs>

        {/* Android APK - secondary to PWA, for shops that prefer a native install */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Android APK (alternative)
            </CardTitle>
            <CardDescription>
              Prefer the Play-Store style install? Download the signed release APK. PWA above is
              still the recommended option - it updates automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="flex-1">
                <a href={APK_DOWNLOAD_URL}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Latest APK
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4 mr-2" />
                  All Versions
                </a>
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Signed release · updates in-place · enable "Install unknown apps" when prompted.
              Same-origin alias: <a href={APK_SHORT_URL} className="underline">{APK_SHORT_URL}</a> (works
              when this app serves the domain). If the download 404s, no tagged release has been
              published yet - ask the owner to push a version tag (e.g. v1.0.0).
            </p>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            If you run into trouble, please contact support or use the Diagnostics tab
            to troubleshoot PWA issues.
          </p>
        </div>
      </div>
    </div>
  );
};
