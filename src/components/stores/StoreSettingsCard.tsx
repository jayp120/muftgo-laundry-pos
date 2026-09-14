import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { authService } from '@/services/authService';
import { QrCode, Settings, Save, Star, WifiOff } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface StoreSettings {
  enable_qr: boolean;
  enable_points: boolean;
  enable_offline_mode: boolean;
}

export const StoreSettingsCard: React.FC = () => {
  const { currentStore, isOwner } = useStore();
  const [settings, setSettings] = useState<StoreSettings>({
    enable_qr: false,
    enable_points: false,
    enable_offline_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentStore?.store_id) {
      fetchStoreSettings();
    }
  }, [currentStore?.store_id]);

  const fetchStoreSettings = async () => {
    if (!currentStore?.store_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stores')
        .select('enable_qr, enable_points, enable_offline_mode')
        .eq('id', currentStore.store_id)
        .single();

      if (error) {
        console.error('Error fetching store settings:', error);
        toast({
          title: "Error",
          description: "Failed to load store settings",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setSettings({
          enable_qr: data.enable_qr || false,
          enable_points: data.enable_points || false,
          enable_offline_mode: data.enable_offline_mode || false,
        });
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
      toast({
        title: "Error",
        description: "Failed to load store settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!currentStore?.store_id || !isOwner) return;

    try {
      setSaving(true);
      // Uses a SECURITY DEFINER RPC because RLS blocks direct stores
      // updates under the app's custom auth (auth.uid() is null) - a
      // direct .update() here previously reported success while silently
      // persisting nothing (same cause as update_store, fixed in 64cf15d).
      await authService.setStoreFeatureFlags(currentStore.store_id, {
        enableQr: settings.enable_qr,
        enablePoints: settings.enable_points,
        enableOfflineMode: settings.enable_offline_mode,
      });

      toast({
        title: "Settings Saved",
        description: "Store settings updated successfully",
      });
    } catch (error) {
      console.error('Error saving store settings:', error);
      toast({
        title: "Error",
        description: "Failed to save store settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQrToggle = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      enable_qr: checked,
    }));
  };

  const handlePointsToggle = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      enable_points: checked,
    }));
  };

  const handleOfflineModeToggle = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      enable_offline_mode: checked,
    }));
  };

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No store selected</p>
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Only the store owner can change settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Store Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" variant="primary" />
          </div>
        ) : (
          <>
            {/* QR Code Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <QrCode className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="enable-qr" className="text-base font-medium">
                  Receipt QR Code
                </Label>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="enable-qr" className="font-normal">
                    Show QR Code on Receipts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show a QR code for digital payments on customer receipts
                  </p>
                </div>
                <Switch
                  id="enable-qr"
                  checked={settings.enable_qr}
                  onCheckedChange={handleQrToggle}
                  disabled={saving}
                  className="self-start sm:self-center"
                />
              </div>

              {settings.enable_qr && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <QrCode className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        QR Code Setup
                      </p>
                      <p className="text-sm text-blue-700">
                        Please upload your payment QR code image as <code>/qrcode.png</code> in the public folder.
                        The QR code will appear on all digital receipts when enabled.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Points Rewards Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-amber-500" />
                <Label htmlFor="enable-points" className="text-base font-medium">
                  Loyalty Points System
                </Label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="enable-points" className="font-normal">
                    Enable Points Rewards
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Reward customers with points for every paid order (1 point per kg/item)
                  </p>
                </div>
                <Switch
                  id="enable-points"
                  checked={settings.enable_points}
                  onCheckedChange={handlePointsToggle}
                  disabled={saving}
                  className="self-start sm:self-center"
                />
              </div>

              {settings.enable_points && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-amber-600 mt-0.5 fill-amber-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-900">
                        Points System Active
                      </p>
                      <ul className="text-sm text-amber-700 space-y-1">
                        <li>• Customers earn 1 point per kg for weight-based services</li>
                        <li>• Customers earn 1 point per item for per-item services</li>
                        <li>• Points are awarded automatically once payment is complete</li>
                        <li>• Points balance appears on receipts and customer profiles</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Offline Mode Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <WifiOff className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="enable-offline-mode" className="text-base font-medium">
                  Offline Mode
                </Label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="enable-offline-mode" className="font-normal">
                    Allow Orders While Offline
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Staff can keep creating new orders when the store's internet is down - orders are saved on the device and sync automatically once you are back online
                  </p>
                </div>
                <Switch
                  id="enable-offline-mode"
                  checked={settings.enable_offline_mode}
                  onCheckedChange={handleOfflineModeToggle}
                  disabled={saving}
                  className="self-start sm:self-center"
                />
              </div>

              {settings.enable_offline_mode && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <WifiOff className="h-5 w-5 text-slate-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">
                        Offline Mode Active
                      </p>
                      <ul className="text-sm text-slate-700 space-y-1">
                        <li>• Applies only to new order creation - order status and payments still need an internet connection</li>
                        <li>• Points redemption is unavailable for orders created offline</li>
                        <li>• Staff must log in again if their session expires while offline before creating new orders</li>
                        <li>• Offline prices follow the latest data synced while the device was still online</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" variant="white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
