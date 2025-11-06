'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/header';
import { User, Mail, Phone, CreditCard, Lock, Settings, Bell, Upload, Save, Camera } from 'lucide-react';
import { useNotification } from '@/contexts/notification-context';

export default function ProfilePage() {
  const { showSuccess, showError } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences'>('profile');
  
  // Profile fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [profileImage, setProfileImage] = useState('');
  
  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Preferences
  const [currency, setCurrency] = useState('INR');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [expenseNotifications, setExpenseNotifications] = useState(true);
  const [paymentNotifications, setPaymentNotifications] = useState(true);
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const userData = getUser();
    if (!userData) {
      router.push('/login');
    } else {
      setUser(userData);
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const profile = data.data;
      setName(profile.name);
      setPhone(profile.phone || '');
      setUpiId(profile.upiId || '');
      setCurrency(profile.currencyPreference || 'INR');
      setProfileImage(profile.profileImageUrl || '');
      setEmailNotifications(profile.emailNotifications ?? true);
      setExpenseNotifications(profile.expenseNotifications ?? true);
      setPaymentNotifications(profile.paymentNotifications ?? true);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.put('/user/profile', { 
        name, 
        phone, 
        upiId, 
        currencyPreference: currency,
        profileImageUrl: profileImage 
      });
      showSuccess('Profile Updated', 'Your profile has been updated successfully');
      setMessage('Profile updated successfully! ✓');
      localStorage.setItem('user', JSON.stringify({ ...user, name }));
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to update profile';
      setError(errorMsg);
      showError('Update Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      showError('Validation Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      showError('Validation Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await api.put('/user/password', { currentPassword, newPassword });
      showSuccess('Password Changed', 'Your password has been updated successfully');
      setMessage('Password changed successfully! ✓');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to change password';
      setError(errorMsg);
      showError('Password Change Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotifications = async (preferences: { 
    emailNotifications?: boolean;
    expenseNotifications?: boolean;
    paymentNotifications?: boolean;
  }) => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.put('/user/notifications', preferences);
      showSuccess('Preferences Updated', 'Your notification preferences have been saved');
      setMessage('Notification preferences updated! ✓');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to update preferences';
      setError(errorMsg);
      showError('Update Failed', errorMsg);
      // Revert the change
      await fetchProfile();
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Manage your profile and preferences</p>
        </div>

        {/* Status Messages */}
        {message && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg flex items-center gap-2 text-sm sm:text-base">
            <span className="flex-1">{message}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm sm:text-base">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
          {/* Sidebar Navigation - Horizontal on Mobile, Vertical on Desktop */}
          <div className="md:col-span-1">
            <Card className="md:sticky md:top-24">
              <CardContent className="p-2 sm:p-4">
                <nav className="flex md:flex-col md:space-y-2 gap-2 md:gap-0 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap ${
                      activeTab === 'profile' 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base font-medium">Profile</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap ${
                      activeTab === 'password' 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base font-medium">Security</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('preferences')}
                    className={`flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors whitespace-nowrap ${
                      activeTab === 'preferences' 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base font-medium">Preferences</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-4 sm:space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <CardHeader className="relative z-10 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6">
                    {/* Profile Picture */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                      <div className="relative">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-primary/20"
                          />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold border-4 border-primary/20">
                            {getInitials(name)}
                          </div>
                        )}
                        <button
                          type="button"
                          className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="font-semibold text-base sm:text-lg">{name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground break-all">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Email (Read-only) */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-sm sm:text-base">
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="bg-muted text-sm sm:text-base"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2 text-sm sm:text-base">
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="text-sm sm:text-base"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-sm sm:text-base">
                        <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="text-sm sm:text-base"
                      />
                    </div>

                    {/* UPI ID */}
                    <div className="space-y-2">
                      <Label htmlFor="upiId" className="flex items-center gap-2 text-sm sm:text-base">
                        <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        UPI ID
                      </Label>
                      <Input
                        id="upiId"
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@paytm"
                        className="text-sm sm:text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        Required to receive payments via UPI
                      </p>
                    </div>

                    <Button type="submit" className="w-full text-sm sm:text-base" disabled={loading}>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
                <CardHeader className="relative z-10 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-6">
                    <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                        💡 <strong>Password Requirements:</strong> At least 8 characters long
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm sm:text-base">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="text-sm sm:text-base"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm sm:text-base">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="text-sm sm:text-base"
                        minLength={8}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="text-sm sm:text-base"
                        minLength={8}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full text-sm sm:text-base" disabled={loading}>
                      <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                      {loading ? 'Changing Password...' : 'Update Password'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
                  <CardHeader className="relative z-10 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                      General Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-sm sm:text-base">Default Currency</Label>
                      <select
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                      >
                        <option value="INR">🇮🇳 INR (₹)</option>
                        <option value="USD">🇺🇸 USD ($)</option>
                        <option value="EUR">🇪🇺 EUR (€)</option>
                        <option value="GBP">🇬🇧 GBP (£)</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Your preferred currency for expenses
                      </p>
                    </div>

                    <Button onClick={handleUpdateProfile} className="w-full text-sm sm:text-base" disabled={loading}>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                  <CardHeader className="relative z-10 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                      Email Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                        💡 <strong>Tip:</strong> Control which email notifications you receive. You can always change these settings later.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1 pr-3">
                        <p className="font-medium text-sm sm:text-base">Email Notifications</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Receive all email notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={(e) => {
                            setEmailNotifications(e.target.checked);
                            handleUpdateNotifications({ emailNotifications: e.target.checked });
                          }}
                          className="sr-only peer"
                          disabled={loading}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1 pr-3">
                        <p className="font-medium text-sm sm:text-base">Expense Notifications</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Get notified when expenses are added</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={expenseNotifications}
                          onChange={(e) => {
                            setExpenseNotifications(e.target.checked);
                            handleUpdateNotifications({ expenseNotifications: e.target.checked });
                          }}
                          className="sr-only peer"
                          disabled={loading || !emailNotifications}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1 pr-3">
                        <p className="font-medium text-sm sm:text-base">Payment Notifications</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Get notified about payments</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={paymentNotifications}
                          onChange={(e) => {
                            setPaymentNotifications(e.target.checked);
                            handleUpdateNotifications({ paymentNotifications: e.target.checked });
                          }}
                          className="sr-only peer"
                          disabled={loading || !emailNotifications}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
