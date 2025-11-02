import { Card, CardContent } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Manage your account preferences</p>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium">Full Name</Label>
                  <Input placeholder="Andrew Garfield" className="bg-gray-50 border-gray-200 mt-2" />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium">Email</Label>
                  <Input placeholder="andrew@example.com" type="email" className="bg-gray-50 border-gray-200 mt-2" />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium">Phone</Label>
                  <Input placeholder="+1 (555) 000-0000" className="bg-gray-50 border-gray-200 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Email Notifications</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">SMS Notifications</span>
                  <input type="checkbox" className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
            <Button variant="secondary" className="border-gray-300 text-gray-900 hover:bg-gray-100">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
