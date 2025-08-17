'use client';

import { useState } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  RefreshCw, 
  Save, 
  RotateCcw,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Mail,
  CreditCard,
  Cloud,
  Shield,
  Globe
} from "lucide-react";
import { 
  systemSettings, 
  systemStats, 
  SystemSetting,
  SystemStats 
} from "@/data/admin-settings";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState(systemSettings);
  const [lastSaved, setLastSaved] = useState(new Date());

  const handleSettingChange = (key: string, value: string | number | boolean) => {
    setSettings(prevSettings => 
      prevSettings.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLastSaved(new Date());
    setHasChanges(false);
    setLoading(false);
  };

  const handleReset = () => {
    setSettings(systemSettings);
    setHasChanges(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const renderSettingInput = (setting: SystemSetting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <Switch
            checked={setting.value as boolean}
            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={setting.value as number}
            onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value) || 0)}
            className="w-32"
          />
        );
      case 'select':
        return (
          <Select 
            value={setting.value as string}
            onValueChange={(value) => handleSettingChange(setting.key, value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            type="text"
            value={setting.value as string}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="w-64"
          />
        );
    }
  };

  const getStatIcon = (statKey: string) => {
    switch (statKey) {
      case 'cpuUsage':
        return <Cpu className="w-4 h-4 text-blue-500" />;
      case 'memoryUsage':
        return <Activity className="w-4 h-4 text-green-500" />;
      case 'diskUsage':
        return <HardDrive className="w-4 h-4 text-orange-500" />;
      default:
        return <Server className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'text-green-600';
    if (usage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general':
        return <Globe className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'payment':
        return <CreditCard className="w-5 h-5" />;
      case 'storage':
        return <Cloud className="w-5 h-5" />;
      case 'security':
        return <Shield className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const settingsByCategory = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Sistem Ayarları
            </h1>
            <p className="text-muted-foreground">
              Platform yapılandırması ve sistem durumu
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
            {hasChanges && (
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Sıfırla
              </Button>
            )}
            <Button 
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Kaydet
            </Button>
          </div>
        </div>

        {/* System Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sunucu Çalışma Süresi</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.serverUptime}</div>
              <p className="text-xs text-muted-foreground">
                Kesintisiz çalışma
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Kullanımı</CardTitle>
              {getStatIcon('cpuUsage')}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getUsageColor(systemStats.cpuUsage)}`}>
                %{systemStats.cpuUsage}
              </div>
              <p className="text-xs text-muted-foreground">
                Ortalama kullanım
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bellek Kullanımı</CardTitle>
              {getStatIcon('memoryUsage')}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getUsageColor(systemStats.memoryUsage)}`}>
                %{systemStats.memoryUsage}
              </div>
              <p className="text-xs text-muted-foreground">
                RAM kullanımı
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disk Kullanımı</CardTitle>
              {getStatIcon('diskUsage')}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getUsageColor(systemStats.diskUsage)}`}>
                %{systemStats.diskUsage}
              </div>
              <p className="text-xs text-muted-foreground">
                Depolama alanı
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Save Status */}
        {hasChanges && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Settings className="w-4 h-4" />
                <span className="font-medium">Kaydedilmemiş değişiklikler var</span>
                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                  {hasChanges ? 'Değiştirildi' : 'Kaydedildi'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Genel</TabsTrigger>
            <TabsTrigger value="email">E-posta</TabsTrigger>
            <TabsTrigger value="payment">Ödeme</TabsTrigger>
            <TabsTrigger value="storage">Depolama</TabsTrigger>
            <TabsTrigger value="security">Güvenlik</TabsTrigger>
          </TabsList>

          {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
            <TabsContent key={category} value={category}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {category === 'general' ? 'Genel Ayarlar' :
                     category === 'email' ? 'E-posta Ayarları' :
                     category === 'payment' ? 'Ödeme Ayarları' :
                     category === 'storage' ? 'Depolama Ayarları' :
                     'Güvenlik Ayarları'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {categorySettings.map((setting, index) => (
                    <div key={setting.key}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{setting.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {setting.description}
                          </div>
                        </div>
                        {renderSettingInput(setting)}
                      </div>
                      {index < categorySettings.length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* System Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Sistem Performansı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Aktif Bağlantılar</span>
                  <span className="text-sm text-muted-foreground">
                    {systemStats.activeConnections}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((systemStats.activeConnections / 200) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Toplam İstek</span>
                  <span className="text-sm text-muted-foreground">
                    {systemStats.totalRequests.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: '75%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Son kaydetme: {formatDistanceToNow(lastSaved, { 
                  addSuffix: true, 
                  locale: tr 
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick System Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Hızlı Sistem İşlemleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 h-16"
                onClick={() => alert('Sistem önbelleği temizlendi')}
              >
                <RefreshCw className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Önbellek Temizle</div>
                  <div className="text-xs text-muted-foreground">Sistem önbelleğini temizle</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 h-16"
                onClick={() => alert('Sistem yeniden başlatılıyor...')}
              >
                <Server className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Sistem Yeniden Başlat</div>
                  <div className="text-xs text-muted-foreground">Güvenli yeniden başlatma</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 h-16"
                onClick={handleRefresh}
                disabled={loading}
              >
                <Activity className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Durum Kontrolü</div>
                  <div className="text-xs text-muted-foreground">Sistem durumunu kontrol et</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}