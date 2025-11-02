"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/auth-utils';

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, userProfile, loading } = useAuth();

  const derivedName = useMemo(() => {
    if (userProfile?.displayName && userProfile.displayName.trim()) return userProfile.displayName;
    const email = currentUser?.email || userProfile?.email;
    if (!email) return '';
    const local = email.split('@')[0] || '';
    return local
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }, [currentUser?.email, userProfile?.displayName, userProfile?.email]);

  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [loading, currentUser, router]);

  useEffect(() => {
    setDisplayName(derivedName || '');
    setBio(userProfile?.bio || '');
  }, [derivedName, userProfile?.bio]);

  const initials = useMemo(() => {
    const base = displayName || derivedName || currentUser?.email || 'U';
    const parts = base.split(/[\s@]+/);
    const letters = parts[0]?.[0] || 'U';
    const letters2 = parts[1]?.[0] || '';
    return (letters + letters2).toUpperCase();
  }, [displayName, derivedName, currentUser?.email]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, {
        displayName: displayName || derivedName || '',
        bio: bio || '',
      });
      toast({ title: 'Profile updated', description: 'Your details have been saved.' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your profile information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={currentUser?.photoURL || undefined} alt={displayName || 'User'} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-gray-900 font-medium">{displayName || derivedName || 'Your Name'}</div>
                <div className="text-sm text-gray-500">{currentUser?.email || userProfile?.email || 'you@example.com'}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Display name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label className="mb-2 block">Email</Label>
                <Input value={currentUser?.email || ''} disabled />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">About you</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A few words about yourself"
              />
              <p className="text-xs text-gray-500 mt-1">This appears on your profile and in trip collaborations.</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
