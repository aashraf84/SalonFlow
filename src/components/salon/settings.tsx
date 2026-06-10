'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  Shield,
  Clock,
  Globe,
  Save,
  DollarSign,
  CalendarDays,
  Lock,
  Smartphone,
  Mail,
  MessageSquare,
  Heart,
  Eye,
  Key,
  LogOut,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export default function SettingsModule() {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [auditLogs, setAuditLogs] = useState<{id: string; action: string; entity: string; userId: string | null; createdAt: string; details: string | null}[]>([])

  // General Settings State
  const [general, setGeneral] = useState({
    salonName: 'SalonFlow Premium',
    address: '123 Main Boulevard, Gulberg III, Lahore',
    phone: '+92 300 1234567',
    email: 'info@salonflow.pk',
    timezone: 'Asia/Karachi',
    openTime: '09:00',
    closeTime: '21:00',
  })

  // Business Settings State
  const [business, setBusiness] = useState({
    currency: 'PKR',
    taxRate: '16',
    bookingBuffer: '15',
    maxAdvanceBooking: '30',
    cancellationPolicy: 'Cancellations must be made at least 2 hours before the appointment. Late cancellations may incur a fee of 50% of the service cost.',
    minBookingNotice: '2',
    allowOnlineBooking: true,
    requireDeposit: false,
    depositPercentage: '25',
  })

  // Notifications Settings State
  const [notifications, setNotifications] = useState({
    appointmentReminders: true,
    reminderHoursBefore: '2',
    marketingEmails: false,
    smsNotifications: true,
    loyaltyAlerts: true,
    staffShiftReminders: true,
    lowStockAlerts: true,
    dailySummary: false,
  })

  // Security Settings State
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorAuth: false,
    sessionTimeout: '30',
    loginNotifications: true,
  })

  // Load settings from API on mount
  const loadSettings = useCallback(async () => {
    try {
      const [settingsRes, auditRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/audit-logs?take=20'),
      ])
      const settingsJson = await settingsRes.json()
      const auditJson = await auditRes.json()

      if (settingsJson.success) {
        const d = settingsJson.data as Record<string, Record<string, string>>
        if (d.general) {
          setGeneral(prev => ({
            ...prev,
            salonName: d.general.general_salonName || prev.salonName,
            address: d.general.general_address || prev.address,
            phone: d.general.general_phone || prev.phone,
            email: d.general.general_email || prev.email,
            timezone: d.general.general_timezone || prev.timezone,
            openTime: d.general.general_openTime || prev.openTime,
            closeTime: d.general.general_closeTime || prev.closeTime,
          }))
        }
        if (d.business) {
          setBusiness(prev => ({
            ...prev,
            currency: d.business.business_currency || prev.currency,
            taxRate: d.business.business_taxRate || prev.taxRate,
            bookingBuffer: d.business.business_bookingBuffer || prev.bookingBuffer,
            maxAdvanceBooking: d.business.business_maxAdvanceBooking || prev.maxAdvanceBooking,
            cancellationPolicy: d.business.business_cancellationPolicy || prev.cancellationPolicy,
            minBookingNotice: d.business.business_minBookingNotice || prev.minBookingNotice,
            allowOnlineBooking: d.business.business_allowOnlineBooking === 'true',
            requireDeposit: d.business.business_requireDeposit === 'true',
            depositPercentage: d.business.business_depositPercentage || prev.depositPercentage,
          }))
        }
        if (d.notifications) {
          setNotifications(prev => ({
            ...prev,
            appointmentReminders: d.notifications.notifications_appointmentReminders === 'true' || prev.appointmentReminders,
            reminderHoursBefore: d.notifications.notifications_reminderHoursBefore || prev.reminderHoursBefore,
            marketingEmails: d.notifications.notifications_marketingEmails === 'true',
            smsNotifications: d.notifications.notifications_smsNotifications === 'true' || prev.smsNotifications,
            loyaltyAlerts: d.notifications.notifications_loyaltyAlerts === 'true' || prev.loyaltyAlerts,
            staffShiftReminders: d.notifications.notifications_staffShiftReminders === 'true' || prev.staffShiftReminders,
            lowStockAlerts: d.notifications.notifications_lowStockAlerts === 'true' || prev.lowStockAlerts,
            dailySummary: d.notifications.notifications_dailySummary === 'true',
          }))
        }
        if (d.security) {
          setSecurity(prev => ({
            ...prev,
            twoFactorAuth: d.security.security_twoFactorAuth === 'true',
            sessionTimeout: d.security.security_sessionTimeout || prev.sessionTimeout,
            loginNotifications: d.security.security_loginNotifications === 'true' || prev.loginNotifications,
          }))
        }
      }

      if (auditJson.success) {
        setAuditLogs(auditJson.data)
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ general: general, business: business, notifications: notifications, security: security }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Settings saved successfully')
      } else {
        toast.error(json.error || 'Failed to save settings')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm">
              Manage your salon configuration and preferences
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="general" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Salon Information</CardTitle>
              <CardDescription>
                Basic details about your salon business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salon-name">Salon Name</Label>
                  <Input
                    id="salon-name"
                    value={general.salonName}
                    onChange={(e) =>
                      setGeneral({ ...general, salonName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salon-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="salon-email"
                      type="email"
                      value={general.email}
                      onChange={(e) =>
                        setGeneral({ ...general, email: e.target.value })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salon-address">Address</Label>
                <Textarea
                  id="salon-address"
                  value={general.address}
                  onChange={(e) =>
                    setGeneral({ ...general, address: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salon-phone">Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="salon-phone"
                      value={general.phone}
                      onChange={(e) =>
                        setGeneral({ ...general, phone: e.target.value })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Select
                      value={general.timezone}
                      onValueChange={(v) =>
                        setGeneral({ ...general, timezone: v })
                      }
                    >
                      <SelectTrigger className="pl-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Karachi">Asia/Karachi (UTC+5)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (UTC+4)</SelectItem>
                        <SelectItem value="Asia/Riyadh">Asia/Riyadh (UTC+3)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Operating Hours
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="open-time" className="text-xs text-muted-foreground">
                      Opening Time
                    </Label>
                    <Input
                      id="open-time"
                      type="time"
                      value={general.openTime}
                      onChange={(e) =>
                        setGeneral({ ...general, openTime: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="close-time" className="text-xs text-muted-foreground">
                      Closing Time
                    </Label>
                    <Input
                      id="close-time"
                      type="time"
                      value={general.closeTime}
                      onChange={(e) =>
                        setGeneral({ ...general, closeTime: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency & Tax</CardTitle>
              <CardDescription>
                Configure currency and tax settings for invoicing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={business.currency}
                    onValueChange={(v) =>
                      setBusiness({ ...business, currency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                      <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                      <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    value={business.taxRate}
                    onChange={(e) =>
                      setBusiness({ ...business, taxRate: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
              <CardDescription>
                Configure how appointments are booked
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Online Booking</Label>
                  <p className="text-xs text-muted-foreground">
                    Let customers book appointments online
                  </p>
                </div>
                <Switch
                  checked={business.allowOnlineBooking}
                  onCheckedChange={(v) =>
                    setBusiness({ ...business, allowOnlineBooking: v })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Deposit</Label>
                  <p className="text-xs text-muted-foreground">
                    Require a deposit for booking
                  </p>
                </div>
                <Switch
                  checked={business.requireDeposit}
                  onCheckedChange={(v) =>
                    setBusiness({ ...business, requireDeposit: v })
                  }
                />
              </div>

              {business.requireDeposit && (
                <div className="ml-4 space-y-2">
                  <Label htmlFor="deposit-percentage">Deposit Percentage (%)</Label>
                  <Input
                    id="deposit-percentage"
                    type="number"
                    value={business.depositPercentage}
                    onChange={(e) =>
                      setBusiness({ ...business, depositPercentage: e.target.value })
                    }
                    className="w-32"
                  />
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="booking-buffer">Booking Buffer (min)</Label>
                  <Input
                    id="booking-buffer"
                    type="number"
                    value={business.bookingBuffer}
                    onChange={(e) =>
                      setBusiness({ ...business, bookingBuffer: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-advance">Max Advance Booking (days)</Label>
                  <Input
                    id="max-advance"
                    type="number"
                    value={business.maxAdvanceBooking}
                    onChange={(e) =>
                      setBusiness({ ...business, maxAdvanceBooking: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-notice">Min Booking Notice (hours)</Label>
                  <Input
                    id="min-notice"
                    type="number"
                    value={business.minBookingNotice}
                    onChange={(e) =>
                      setBusiness({ ...business, minBookingNotice: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cancellation Policy</CardTitle>
              <CardDescription>
                Set the policy for appointment cancellations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={business.cancellationPolicy}
                onChange={(e) =>
                  setBusiness({ ...business, cancellationPolicy: e.target.value })
                }
                rows={4}
                placeholder="Enter your cancellation policy..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Notifications</CardTitle>
              <CardDescription>
                Configure how and when appointment notifications are sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label>Appointment Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      Send reminders to customers before appointments
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.appointmentReminders}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, appointmentReminders: v })
                  }
                />
              </div>

              {notifications.appointmentReminders && (
                <div className="ml-12 space-y-2">
                  <Label htmlFor="reminder-hours" className="text-xs">
                    Remind hours before
                  </Label>
                  <Select
                    value={notifications.reminderHoursBefore}
                    onValueChange={(v) =>
                      setNotifications({ ...notifications, reminderHoursBefore: v })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label>Staff Shift Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      Notify staff about upcoming shifts
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.staffShiftReminders}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, staffShiftReminders: v })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketing & Communication</CardTitle>
              <CardDescription>
                Manage marketing and communication preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <Mail className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-xs text-muted-foreground">
                      Send promotional emails to customers
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.marketingEmails}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, marketingEmails: v })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Send SMS alerts for important updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.smsNotifications}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, smsNotifications: v })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950">
                    <Heart className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label>Loyalty Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Notify customers about loyalty rewards and tier changes
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.loyaltyAlerts}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, loyaltyAlerts: v })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                Internal notifications for staff and management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950">
                    <Eye className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label>Low Stock Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when inventory is running low
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.lowStockAlerts}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, lowStockAlerts: v })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950">
                    <CalendarDays className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label>Daily Summary Email</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive a daily summary of business activity
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.dailySummary}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, dailySummary: v })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type="password"
                    value={security.currentPassword}
                    onChange={(e) =>
                      setSecurity({ ...security, currentPassword: e.target.value })
                    }
                    className="pl-9"
                    placeholder="Enter current password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      value={security.newPassword}
                      onChange={(e) =>
                        setSecurity({ ...security, newPassword: e.target.value })
                      }
                      className="pl-9"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      value={security.confirmPassword}
                      onChange={(e) =>
                        setSecurity({ ...security, confirmPassword: e.target.value })
                      }
                      className="pl-9"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled={!security.currentPassword || !security.newPassword}>
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                    <Shield className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label>Enable Two-Factor Authentication</Label>
                    <p className="text-xs text-muted-foreground">
                      Require a verification code in addition to your password
                    </p>
                  </div>
                </div>
                <Switch
                  checked={security.twoFactorAuth}
                  onCheckedChange={(v) =>
                    setSecurity({ ...security, twoFactorAuth: v })
                  }
                />
              </div>

              {security.twoFactorAuth && (
                <div className="mt-4 p-4 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/50">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                      Enabled
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Two-factor authentication is active
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>
                Control your active sessions and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Select
                    value={security.sessionTimeout}
                    onValueChange={(v) =>
                      setSecurity({ ...security, sessionTimeout: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Login Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when a new device logs into your account
                  </p>
                </div>
                <Switch
                  checked={security.loginNotifications}
                  onCheckedChange={(v) =>
                    setSecurity({ ...security, loginNotifications: v })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Active Sessions</Label>
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Current Session</p>
                        <p className="text-xs text-muted-foreground">
                          Chrome on macOS • Lahore, PK
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Mobile App</p>
                        <p className="text-xs text-muted-foreground">
                          SalonFlow App on iOS • Last active 2h ago
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600">
                      <LogOut className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                Recent activity log for security monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {auditLogs.length > 0 ? auditLogs.map((log) => {
                  const diffMs = Date.now() - new Date(log.createdAt).getTime()
                  const diffMins = Math.floor(diffMs / 60000)
                  const timeStr = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : diffMins < 1440 ? `${Math.floor(diffMins / 60)}h ago` : `${Math.floor(diffMins / 1440)}d ago`
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <div>
                          <p className="text-sm">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.userId || 'System'} · {log.entity}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{timeStr}</span>
                    </div>
                  )
                }) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No audit logs found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
