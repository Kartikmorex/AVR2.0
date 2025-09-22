"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { setUserIdCookie, getUserIdFromClientCookies, DEFAULT_USER_ID } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'

export function UserSettings() {
  const [userId, setUserId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Load current user ID from cookies - don't use default if no cookie
    const currentUserId = getUserIdFromClientCookies() || ''
    console.log('🔧 UserSettings useEffect - Loading user ID:', currentUserId)
    setUserId(currentUserId)
  }, [])

  const handleSave = async () => {
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "User ID cannot be empty",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      console.log('💾 Saving user ID:', userId.trim())
      setUserIdCookie(userId.trim())
      toast({
        title: "Success",
        description: "User ID updated successfully. Please refresh the page to apply changes.",
      })
    } catch (error) {
      console.error('❌ Error saving user ID:', error)
      toast({
        title: "Error",
        description: "Failed to save User ID",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setUserId(DEFAULT_USER_ID)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>User Settings</CardTitle>
        <CardDescription>
          Configure your IOSense User ID for API access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userId">IOSense User ID</Label>
          <Input
            id="userId"
            type="text"
            placeholder={`Enter your IOSense User ID (e.g., ${DEFAULT_USER_ID})`}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            This ID will be used for all API requests to IOSense services. <strong>Required</strong> - the app will not work without a valid User ID.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset to Default
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>Default: {DEFAULT_USER_ID}</p>
          <p>Current: {userId || 'Not set'}</p>
        </div>
      </CardContent>
    </Card>
  )
}