import { useEffect, useState } from 'react';
import { CandidateHeader } from '@/components/layout/CandidateHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  UserCog,
  Shield,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Bell,
  Lock,
  Globe,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  getCurrentUser,
  getCandidateSettings,
  updateCandidateProfile,
  updateCandidateSettings,
} from '@/services/candidateService';
import type { User } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [notifications, setNotifications] = useState({
    email: true, interview: true, reports: true, marketing: false,
  });
  const [privacy, setPrivacy] = useState({
    profileVisible: true, shareResults: false, allowAnalytics: true,
  });

  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [userResult, settingsResult] = await Promise.allSettled([
          getCurrentUser(),
          getCandidateSettings(),
        ]);

        if (userResult.status === 'fulfilled') {
          setCurrentUser(userResult.value);
          setProfileName(userResult.value.name ?? '');
        }

        if (settingsResult.status === 'fulfilled') {
          setNotifications(settingsResult.value.notification_preferences);
          setPrivacy(settingsResult.value.privacy_preferences);
        }
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-muted/30">
        <CandidateHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateHeader />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your account, privacy, and preferences.</p>
        </div>

        <Tabs defaultValue="account">
          <TabsList className="mb-6">
            <TabsTrigger value="account" className="gap-2"><UserCog className="h-4 w-4" />Account</TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2"><Shield className="h-4 w-4" />Privacy</TabsTrigger>
            <TabsTrigger value="data" className="gap-2"><Trash2 className="h-4 w-4" />Data & Deletion</TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Account Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input defaultValue={currentUser.email} disabled />
                    </div>
                  </div>
                  <Button
                    className="gap-2"
                    disabled={savingAccount || !profileName.trim()}
                    onClick={async () => {
                      setSavingAccount(true);
                      try {
                        const updated = await updateCandidateProfile({ full_name: profileName.trim() });
                        setCurrentUser(updated.user);
                        toast({ title: 'Account updated successfully' });
                      } catch (err) {
                        console.error('Failed to update account', err);
                        toast({ title: 'Failed to save changes', variant: 'destructive' });
                      } finally {
                        setSavingAccount(false);
                      }
                    }}
                  >
                    <Save className="h-4 w-4" />
                    {savingAccount ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Change Password</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-dashed border-border p-4 bg-muted/30">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Password change endpoint is pending</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This section is preserved in the UI, but the backend password update API will be added next.
                        </p>
                      </div>
                      <Badge variant="outline">Coming soon</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" disabled />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input type="password" placeholder="••••••••" disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type="password" placeholder="••••••••" disabled />
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2" disabled>
                    <Lock className="h-4 w-4" />Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={savingPreferences}
                    onClick={async () => {
                      setSavingPreferences(true);
                      try {
                        await updateCandidateSettings({ notification_preferences: notifications });
                        toast({ title: 'Notification preferences saved' });
                      } catch (err) {
                        console.error('Failed to save notification preferences', err);
                        toast({ title: 'Failed to save preferences', variant: 'destructive' });
                      } finally {
                        setSavingPreferences(false);
                      }
                    }}
                  >
                    <Save className="h-4 w-4" />
                    {savingPreferences ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive email updates about your account' },
                    { key: 'interview', label: 'Interview Reminders', desc: 'Get notified before scheduled interviews' },
                    { key: 'reports', label: 'Report Alerts', desc: 'Notification when interview results are ready' },
                    { key: 'marketing', label: 'Marketing Emails', desc: 'Receive tips and product updates' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications]}
                        onCheckedChange={(c) => setNotifications(p => ({ ...p, [item.key]: c }))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Privacy */}
          <TabsContent value="privacy">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Privacy Controls</CardTitle>
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={savingPreferences}
                    onClick={async () => {
                      setSavingPreferences(true);
                      try {
                        await updateCandidateSettings({ privacy_preferences: privacy });
                        toast({ title: 'Privacy preferences saved' });
                      } catch (err) {
                        console.error('Failed to save privacy preferences', err);
                        toast({ title: 'Failed to save preferences', variant: 'destructive' });
                      } finally {
                        setSavingPreferences(false);
                      }
                    }}
                  >
                    <Save className="h-4 w-4" />
                    {savingPreferences ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'profileVisible', label: 'Profile Visibility', desc: 'Allow organizations to view your profile', icon: Globe },
                    { key: 'shareResults', label: 'Share Results', desc: 'Allow sharing interview results with third parties', icon: Eye },
                    { key: 'allowAnalytics', label: 'Analytics', desc: 'Allow usage analytics for platform improvement', icon: Bell },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={privacy[item.key as keyof typeof privacy]}
                        onCheckedChange={(c) => setPrivacy(p => ({ ...p, [item.key]: c }))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Data Privacy Commitment</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your interview data is encrypted and stored securely. Audio/video recordings are
                        subject to configurable retention policies and will be deleted according to your
                        organization's policy. We never sell personal data.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Requests */}
          <TabsContent value="data">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Data Export</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Request a complete export of all your data including profile, interview history, scores, and recordings.
                  </p>
                  <Button variant="outline" className="gap-2" disabled>
                    <Save className="h-4 w-4" />Request Data Export
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-lg text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <h4 className="font-medium text-sm mb-1">Delete All Interview Data</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      This will permanently delete all your interview recordings, transcripts, and evaluation data. This cannot be undone.
                    </p>
                    <Button variant="destructive" size="sm" className="gap-2" disabled>
                      <Trash2 className="h-4 w-4" />Delete Interview Data
                    </Button>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <h4 className="font-medium text-sm mb-1">Delete Account</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Permanently delete your account and all associated data. This action is irreversible.
                    </p>
                    <Button variant="destructive" size="sm" className="gap-2" disabled>
                      <Trash2 className="h-4 w-4" />Delete My Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
